import {makeAutoObservable, configure, flow} from "mobx";
import UrlJoin from "url-join";
import {ElvClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

import NFTContractABI from "../static/abi/NFTContract";
import CheckoutStore from "Stores/Checkout";

const tenantId = "itenYQbgk66W1BFEqWr95xPmHZEjmdF";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

const colors = [
  "#621B00",
  "#2F1000",
  "#108280",
  "#40798C",
  "#2a6514",
  "#626864",
  "#379164",
  "#2F2235",
  "#60495A",
  "#A37871",
  "#4B0642",
  "#1C6E8C"
];

const ProfileImage = (text, backgroundColor) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 200;
  canvas.height = 200;

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = "80px Helvetica";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 10);

  return canvas.toDataURL("image/png");
};


class RootStore {
  embedded = window.self !== window.top;

  mode = "test";

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
  authedToken = undefined;
  basePublicUrl = undefined;

  userProfile = {};

  profileData = undefined;

  nfts = [];

  marketplaceIds = ["iq__2FrA2S1XBy4zdRGQn1knakpbrBV4"];
  marketplaces = {};

  marketplaceFilters = [];

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

    this.checkoutStore = new CheckoutStore(this);
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

  NFT({tokenId, contractAddress}) {
    return this.nfts.find(nft =>
      tokenId && nft.details.TokenIdStr === tokenId ||
      contractAddress && Utils.EqualAddress(contractAddress, nft.details.ContractAddr)
    );
  }

  LoadProfileData = flow(function * () {
    this.profileData = yield this.client.ethClient.MakeProviderCall({
      methodName: "send",
      args: [
        "elv_getAccountProfile",
        [this.client.contentSpaceId, this.accountId]
      ]
    });
  });

  LoadWalletCollection = flow(function * (forceReload=false) {
    if(!this.profileData || !this.profileData.NFTs || (!forceReload && this.nfts.length > 0)) { return; }

    this.nfts = [];

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

    this.nfts = yield Utils.LimitedMap(
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
    this.checkoutStore.MarketplaceStock();

    if(this.marketplaces[marketplaceId]) { return this.marketplaces[marketplaceId]; }

    let marketplace = yield this.client.ContentObjectMetadata({
      libraryId: yield this.client.ContentObjectLibraryId({objectId: marketplaceId}),
      objectId: marketplaceId,
      metadataSubtree: "public/asset_metadata/info",
      linkDepthLimit: 2,
      resolveLinks: true,
      resolveIgnoreErrors: true,
      resolveIncludeSource: true
    });

    marketplace.versionHash = yield this.client.LatestVersionHash({objectId: marketplaceId});
    marketplace.drops = (marketplace.events || []).map(({event}, eventIndex) =>
      (event.info.drops || []).map((drop, dropIndex) => ({
        ...drop,
        eventId: Utils.DecodeVersionHash(event["."].source).objectId,
        eventHash: event["."].source,
        eventIndex,
        dropIndex
      }))
    ).flat();

    this.marketplaces[marketplaceId] = marketplace;

    return marketplace;
  });

  // Actions
  SetMarketplaceFilters(filters) {
    this.marketplaceFilters = filters || [];
  }

  BurnNFT = flow(function * ({nft}) {
    yield this.client.CallContractMethodAndWait({
      contractAddress: nft.details.ContractAddr,
      abi: NFTContractABI,
      methodName: "burn",
      methodArgs: [nft.details.TokenId]
    });
  });

  DropStatus = flow(function * ({eventId, dropId}) {
    try {
      const response = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "act", tenantId, eventId, dropId),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );

      return response.sort((a, b) => a.ts > b.ts ? 1 : -1)[0];
    } catch(error) {
      this.Log(error, true);
      return "";
    }
  });

  PurchaseStatus = flow(function * ({confirmationId}) {
    try {
      /*
      const response = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "act", tenantId, eventId, dropId),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );

      return response.sort((a, b) => a.ts > b.ts ? 1 : -1)[0];

       */

      return Math.random() > 0.7 ? { status: "complete" } : { status: "minting" };
    } catch(error) {
      this.Log(error, true);
      return "";
    }
  });

  SubmitDropVote = flow(function * ({eventId, dropId, sku}) {
    yield this.client.authClient.MakeAuthServiceRequest({
      path: UrlJoin("as", "wlt", "act", tenantId),
      method: "POST",
      body: {
        op: "vote-drop",
        evt: eventId,
        id: dropId,
        itm: sku
      },
      headers: {
        Authorization: `Bearer ${this.client.signer.authToken}`
      }
    });
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

      this.accountId = `iusr${Utils.AddressToHash(client.CurrentAccountAddress())}`;

      this.authedToken = yield client.authClient.GenerateAuthorizationToken({noAuth: true});
      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      // Parallelize load tasks
      let tasks = [];
      tasks.push((async () => this.LoadProfileData())());

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

      this.SetAuthInfo({
        token: client.signer.authToken,
        address: client.signer.address,
        user: {
          name: (user || {}).name,
          email: (user || {}).email
        }
      });

      const initials = ((user || {}).name || "").split(" ").map(s => s.substr(0, 1));
      this.userProfile = {
        address: client.signer.address,
        name: (user || {}).name || client.signer.address,
        email: (user || {}).email,
        profileImage: ProfileImage(
          initials.length <= 1 ? initials.join("") : `${initials[0]}${initials[initials.length - 1]}`,
          colors[((user || {}).email || "").length % colors.length]
        )
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
    window.location.href = UrlJoin(window.location.origin, window.location.pathname) + (this.darkMode ? "?d" : "");
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

    if(!this.embedded) {
      sessionStorage.setItem("dark-mode", enabled ? "true" : "");
    }
  }

  ToggleNavigation(enabled) {
    this.hideNavigation = !enabled;
  }
}

export const rootStore = new RootStore();
export const checkoutStore = rootStore.checkoutStore;

window.rootStore = rootStore;

