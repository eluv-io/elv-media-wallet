import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";

import {ElvClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

const PUBLIC_KEYS = {
  stripe: {
    test: "pk_test_51HpRJ7E0yLQ1pYr6m8Di1EfiigEZUSIt3ruOmtXukoEe0goAs7ZMfNoYQO3ormdETjY6FqlkziErPYWVWGnKL5e800UYf7aGp6",
    production: "pk_live_51HpRJ7E0yLQ1pYr6v0HIvWK21VRXiP7sLrEqGJB35wg6Z0kJDorQxl45kc4QBCwkfEAP3A6JJhAg9lHDTOY3hdRx00kYwfA3Ff"
  },
  paypal: {
    test: "AUDYCcmusO8HyBciuqBssSc3TX855stVQo-WqJUaTW9ZFM7MPIVbdxoYta5hHclUQ9fFDe1iedwwXlgy",
    production: "Af_BaCJU4_qQj-dbaSJ6UqslKSpfZgkFCJoMi4_zqEKZEXkT1JhPkCTTKYhJ0WGktzFm4c7_BBSN65S4"
  }
};

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  mode = "test";
  currency = "USD";

  loggingIn = false;
  loggedIn = false;
  disableCloseEvent = false;
  darkMode = window.self === window.top && sessionStorage.getItem("dark-mode");

  oauthUser = undefined;

  initialized = false;
  client = undefined;
  accountId = undefined;

  hideNavigation = false;

  staticToken = undefined;
  basePublicUrl = undefined;

  profileMetadata = { public: {} };
  profileData = undefined;

  nfts = [];

  marketplaceIds = ["iq__2FrA2S1XBy4zdRGQn1knakpbrBV4"];
  marketplaces = {};

  EVENTS = EVENTS;

  Log(message="", error=false) {
    if(typeof message === "string") {
      message = `Eluvio Media Wallet | ${message}`;
      // eslint-disable-next-line no-console
      error ? console.error(message) : console.log(message);
    } else {
      // eslint-disable-next-line no-console
      error ? console.error("Eluvio Media Wallet") : console.log("Eluvio Media Wallet");
      // eslint-disable-next-line no-console
      error ? console.error(message) : console.log(message);
    }
  }

  constructor() {
    makeAutoObservable(this);
  }

  SendEvent({event, data}) {
    SendEvent({event, data});
  }

  PublicLink({versionHash, path, queryParams={}}) {
    const url = new URL(this.basePublicUrl);
    url.pathname = UrlJoin("q", versionHash, "meta", path);

    Object.keys(queryParams).map(key => url.searchParams.append(key, queryParams[key]));

    return url.toString();
  }

  NFT(tokenId) {
    return this.nfts.find(nft => nft.details.TokenIdStr === tokenId);
  }

  LoadCollections = flow(function * () {
    if(!this.profileData || !this.profileData.NFTs || this.nfts.length > 0) { return; }

    const nfts = Object.keys(this.profileData.NFTs).map(tenantId =>
      this.profileData.NFTs[tenantId].map(details => {
        const versionHash = (details.TokenUri || "").split("/").find(s => s.startsWith("hq__"));

        if(!versionHash) { return; }

        return {
          ...details,
          versionHash
        };
      }).filter(n => n)
    ).flat();

    this.nfts = yield this.client.utils.LimitedMap(
      10,
      nfts,
      async details => {
        return {
          details,
          metadata: (await this.client.ContentObjectMetadata({
            versionHash: details.versionHash,
            metadataSubtree: "public/asset_metadata/nft"
          })) || {}
        };
      }
    );
  });

  LoadMarketplace = flow(function * (marketplaceId) {
    if(this.marketplaces[marketplaceId]) { return; }

    let marketplace = yield this.client.ContentObjectMetadata({
      libraryId: yield this.client.ContentObjectLibraryId({objectId: marketplaceId}),
      objectId: marketplaceId,
      metadataSubtree: "public/asset_metadata/info",
      linkDepthLimit: 1,
      resolveLinks: true,
      resolveIgnoreErrors: true,
      resolveIncludeSource: true
    });

    marketplace.versionHash = yield this.client.LatestVersionHash({objectId: marketplaceId});
    marketplace.drops = (marketplace.events || []).map(({event}, eventIndex) =>
      (event.info.drops || []).map((drop, dropIndex) => ({
        ...drop,
        eventId: this.client.utils.DecodeVersionHash(event["."].source).objectId,
        eventIndex,
        dropIndex
      }))
    ).flat();

    this.marketplaces[marketplaceId] = marketplace;
  });

  InitializeClient = flow(function * ({user, idToken, authToken, address, privateKey}) {
    try {
      this.loggingIn = true;
      this.loggedIn = false;
      this.initialized = false;

      const client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"]
      });

      this.staticToken = client.staticToken;

      const ethUrl = "https://host-216-66-40-19.contentfabric.io/eth";
      const asUrl = "https://host-66-220-3-86.contentfabric.io";

      client.SetNodes({
        ethereumURIs: [
          ethUrl
        ],
        authServiceURIs: [
          asUrl
        ]
      });

      this.client = client;

      if(privateKey) {
        const wallet = client.GenerateWallet();
        const signer = wallet.AddAccount({privateKey});
        client.SetSigner({signer});
      } else if(authToken) {
        yield client.SetRemoteSigner({authToken: authToken, address});
      } else if(user || idToken) {
        this.oauthUser = user;

        yield client.SetRemoteSigner({idToken: idToken || user.id_token});
      } else {
        throw Error("Neither user nor private key specified in InitializeClient");
      }

      this.accountId = `iusr${client.utils.AddressToHash(client.CurrentAccountAddress())}`;

      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      // Parallelize load tasks
      let tasks = [];
      tasks.push((async () => {
        const profileData = await client.ethClient.MakeProviderCall({
          methodName: "send",
          args: [
            "elv_getAccountProfile",
            [client.contentSpaceId, this.accountId]
          ]
        });

        runInAction(() => this.profileData = profileData);
      })());

      tasks.push((async () => {
        await Promise.all(
          this.marketplaceIds.map(async marketplaceId => {
            await this.LoadMarketplace(marketplaceId);
          })
        );
      })());

      yield Promise.all(tasks);

      this.client = client;

      this.initialized = true;
      this.loggedIn = true;

      rootStore.SetAuthInfo({
        token: client.signer.authToken,
        address: client.signer.address,
        user: {
          name: (user || {}).name,
          email: (user || {}).email
        }
      });

      this.profileMetadata.public = {
        name: (user || {}).name || client.signer.address,
        email: (user || {}).email
      };

      this.SendEvent({event: EVENTS.LOG_IN, data: { address: client.signer.address }});
    } catch(error) {
      this.Log("Failed to initialize client", true);
      this.Log(error, true);

      throw error;
    } finally {
      this.loggingIn = false;
    }
  });

  SignOut() {
    this.ClearAuthInfo();

    if(this.oauthUser && this.oauthUser.SignOut) {
      this.oauthUser.SignOut();
    }

    this.SendEvent({event: EVENTS.LOG_OUT, data: { address: this.client.signer.address }});

    this.disableCloseEvent = true;
    window.location.href = window.location.origin + window.location.pathname + (this.darkMode ? "?d" : "");
  }

  ClearAuthInfo() {
    localStorage.removeItem("auth");
  }

  SetAuthInfo({token, address, user}) {
    localStorage.setItem(
      "auth",
      Utils.B64(JSON.stringify({token, address, user}))
    );
  }

  AuthInfo() {
    try {
      const tokenInfo = localStorage.getItem("auth");

      if(tokenInfo) {
        const { token, address, user } = JSON.parse(Utils.FromB64(tokenInfo));
        const expiration = JSON.parse(atob(token)).exp;
        if(expiration - Date.now() < 4 * 3600 * 1000) {
          localStorage.removeItem("auth");
        } else {
          return { token, address, user };
        }
      }
    } catch(error) {
      this.Log("Failed to retrieve auth info", true);
      this.Log(error, true);
    }
  }

  ToggleDarkMode(enabled) {
    if(enabled) {
      document.getElementById("app").classList.add("dark");
    } else {
      document.getElementById("app").classList.remove("dark");
    }

    this.darkMode = enabled;

    if(window.self === window.top) {
      sessionStorage.setItem("dark-mode", enabled ? "true" : "");
    }
  }

  ToggleNavigation(enabled) {
    this.hideNavigation = !enabled;
  }

  PaymentServicePublicKey(service) {
    return PUBLIC_KEYS[service][this.mode];
  }
}

export const rootStore = new RootStore();

window.rootStore = rootStore;

