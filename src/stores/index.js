import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";

import {ElvClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  loggingIn = false;
  loggedIn = false;
  disableCloseEvent = false;
  darkMode = window.self === window.top && sessionStorage.getItem("dark-mode");

  oauthUser = undefined;

  initialized = false;
  client = undefined;
  accountId = undefined;

  staticToken = undefined;
  basePublicUrl = undefined;

  profileMetadata = { public: {} };
  profileData = undefined;

  nfts = [];

  EVENTS = EVENTS;

  Log(message="", error=false) {
    if(typeof message === "string") {
      message = `Eluvio Media Wallet | ${message}`;
      error ? console.error(message) : console.log(message);
    } else {
      error ? console.error("Eluvio Media Wallet") : console.log("Eluvio Media Wallet");
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

    const nfts = this.profileData.NFTs.map(details => {
      const versionHash = (details.TokenUri || "").split("/").find(s => s.startsWith("hq__"));

      if(!versionHash) { return; }

      return {
        ...details,
        versionHash
      };
    }).filter(n => n);

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
    window.location.href = window.location.origin + window.location.pathname + this.darkMode ? "?d" : "";
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
}

export const rootStore = new RootStore();

window.rootStore = rootStore;

