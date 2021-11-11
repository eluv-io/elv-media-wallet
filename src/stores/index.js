import {makeAutoObservable, configure, flow, runInAction, computed} from "mobx";
import UrlJoin from "url-join";
import {ElvClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

import NFTContractABI from "../static/abi/NFTContract";
import CheckoutStore from "Stores/Checkout";

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
  network = EluvioConfiguration["config-url"].includes("main.net955305") ? "main" : "demo";

  embedded = window.self !== window.top;

  mode = "test";

  pageWidth = window.innerWidth;

  navigateToLogIn = undefined;
  walletConnectSigner = undefined;
  loggingIn = false;
  loggedIn = false;
  disableCloseEvent = false;
  darkMode = window.self === window.top && sessionStorage.getItem("dark-mode");

  marketplaceId = undefined;
  customizationMetadata = undefined;

  marketplaceHashes = {};

  oauthUser = undefined;
  localAccount = false;
  auth0AccessToken = undefined;

  initialized = false;
  client = undefined;
  accountId = undefined;
  funds = undefined;

  hideNavigation = false;
  sidePanelMode = false;

  staticToken = undefined;
  authedToken = undefined;
  basePublicUrl = undefined;

  userProfile = {};

  lastProfileQuery = 0;
  profileData = undefined;

  nfts = [];

  marketplaceIds = [];
  marketplaces = {};
  marketplaceCache = {};

  marketplaceFilters = [];

  EVENTS = EVENTS;

  navigationBreadcrumbs = [];

  noItemsAvailable = false;

  @computed get marketplaceHash() {
    return this.marketplaceHashes[this.marketplaceId];
  }

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

    const marketplace = new URLSearchParams(window.location.search).get("mid") || (window.self === window.top && sessionStorage.getItem("marketplace-id"));
    if(marketplace && marketplace.startsWith("hq__")) {
      const objectId = Utils.DecodeVersionHash(marketplace).objectId;
      this.marketplaceHashes[objectId] = marketplace;
      this.marketplaceId = objectId.replace(/\//g, "");
    } else if(marketplace) {
      this.marketplaceId = marketplace.replace(/\//g, "");
    }

    if(this.marketplaceId) {
      this.marketplaceIds = [ this.marketplaceId ];
    }

    this.checkoutStore = new CheckoutStore(this);

    window.addEventListener("resize", () => this.HandleResize());

    try {
      const auth = new URLSearchParams(window.location.search).get("auth");
      if(auth) {
        this.SetAuthInfo(JSON.parse(Utils.FromB64(auth)));
      }
    } catch(error) {
      this.Log("Failed to load auth from parameter", true);
      this.Log(error, true);
    }
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

  SetWalletConnectSigner({signer}) {
    this.walletConnectSigner = signer;
  }

  NFT({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    return this.nfts.find(nft =>
      tokenId && nft.details.TokenIdStr === tokenId &&
      contractAddress && Utils.EqualAddress(contractAddress, nft.details.ContractAddr)
    );
  }

  SetMarketplaceId({marketplaceId, marketplaceHash}) {
    if(marketplaceHash) {
      this.marketplaceId = Utils.DecodeVersionHash(marketplaceHash).objectId;
      this.marketplaceHashes[this.marketplaceId] = marketplaceHash;
    } else {
      this.marketplaceId = marketplaceId;
      this.marketplaceHashes[marketplaceId] = marketplaceHash;
    }

    this.LoadCustomizationMetadata();
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

  LoadCustomizationMetadata = flow(function * () {
    if(!this.marketplaceId || this.customizationMetadata) { return; }

    if(!this.embedded) {
      sessionStorage.setItem("marketplace-id", this.marketplaceHash || this.marketplaceId);
    }

    let client = this.client;
    if(!client) {
      client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"]
      });

      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });
    }

    if(!this.marketplaceHashes[this.marketplaceId]) {
      this.marketplaceHashes[this.marketplaceId] = yield client.LatestVersionHash({objectId: this.marketplaceId});
    }

    const customizationMetadata = yield client.ContentObjectMetadata({
      versionHash: this.marketplaceHash,
      metadataSubtree: "public/asset_metadata/info",
      select: [
        "tenant_id",
        "terms",
        "terms_html",
        "login_customization"
      ]
    });

    this.customizationMetadata = {
      tenant_id: (customizationMetadata.tenant_id),
      terms: customizationMetadata.terms,
      terms_html: customizationMetadata.terms_html,
      ...((customizationMetadata || {}).login_customization || {})
    };

    try {
      // Limit available marketplaces to just the specified marketplace
      this.marketplaceIds = [ this.marketplaceId ];
    } catch(error) {
      this.Log(error, true);
    }

    switch(this.customizationMetadata.font) {
      case "Inter":
        import("Assets/fonts/Inter/font.css");

        break;
      case "Selawik":
        import("Assets/fonts/Selawik/font.css");

        break;
      default:
        break;
    }
  });

  LoadWalletCollection = flow(function * (forceReload=false) {
    if(forceReload || Date.now() - this.lastProfileQuery > 30000) {
      this.lastProfileQuery = Date.now();
      yield this.LoadProfileData();
    }

    if(!this.profileData || !this.profileData.NFTs) { return; }

    const nfts = Object.keys(this.profileData.NFTs).map(tenantId =>
      this.profileData.NFTs[tenantId].map(details => {
        const versionHash = (details.TokenUri || "").split("/").find(s => s.startsWith("hq__"));

        if(!versionHash) { return; }

        return {
          ...details,
          ContractAddr: Utils.FormatAddress(details.ContractAddr),
          ContractId: `ictr${Utils.AddressToHash(details.ContractAddr)}`,
          versionHash
        };
      }).filter(n => n)
    ).flat();

    this.nfts = (yield Utils.LimitedMap(
      15,
      nfts,
      async details => {
        try {
          const existing = this.NFT({contractAddress: details.ContractAddr, tokenId: details.TokenIdStr});

          if(existing) {
            return existing;
          }

          return {
            details,
            metadata: (await this.client.ContentObjectMetadata({
              versionHash: details.versionHash,
              metadataSubtree: "public/asset_metadata/nft"
            })) || {}
          };
        } catch(error) {
          this.Log("Failed to load owned NFT", true);
          this.Log(error, true);
        }
      }
    )).filter(nft => nft);
  });

  SetMarketplaceHash({marketplaceId, marketplaceHash}) {
    this.marketplaceHashes[marketplaceId] = marketplaceHash;
  }

  LoadMarketplace = flow(function * (marketplaceId, forceReload=false) {
    let marketplaceHash = this.marketplaceHashes[marketplaceId];
    if(marketplaceId.startsWith("hq__")) {
      marketplaceHash = marketplaceId;
      marketplaceId = Utils.DecodeVersionHash(marketplaceId).objectId;
    } else if(!marketplaceHash) {
      marketplaceHash = yield this.client.LatestVersionHash({objectId: marketplaceId});
    }

    // Cache marketplace retrieval
    if(!forceReload && this.marketplaceCache[marketplaceHash] && Date.now() - this.marketplaceCache[marketplaceHash].marketplace < 60000) {
      // Cache stock retrieval
      if(Date.now() - this.marketplaceCache[marketplaceHash].stock > 10000) {
        this.checkoutStore.MarketplaceStock({tenantId: this.marketplaces[marketplaceId].tenant_id});
        this.marketplaceCache[marketplaceHash].stock = Date.now();
      }

      return this.marketplaces[marketplaceHash];
    }

    try {
      this.marketplaceCache[marketplaceHash] = {
        marketplace: Date.now(),
        stock: Date.now()
      };

      let marketplace = yield this.client.ContentObjectMetadata({
        versionHash: marketplaceHash,
        metadataSubtree: "public/asset_metadata/info",
        linkDepthLimit: 2,
        resolveLinks: true,
        resolveIgnoreErrors: true,
        resolveIncludeSource: true
      });

      const stockPromise = this.checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});

      marketplace.items = yield Promise.all(
        marketplace.items.map(async item => {
          if(item.requires_permissions) {
            try {
              let versionHash;
              if(item.nft_template["/"]) {
                versionHash = item.nft_template["/"].split("/").find(component => component.startsWith("hq__"));
              } else if(item.nft_template["."] && item.nft_template["."].source) {
                versionHash = item.nft_template["."].source;
              }

              await this.client.ContentObjectMetadata({
                versionHash,
                metadataSubtree: "permissioned"
              });

              item.authorized = true;
            } catch(error) {
              item.authorized = false;
            }
          }

          item.nftTemplateMetadata = ((item.nft_template || {}).nft || {});

          return item;
        })
      );

      marketplace.retrievedAt = Date.now();
      marketplace.marketplaceId = marketplaceId;
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

      // Ensure stock call has completed
      yield stockPromise;

      return marketplace;
    } catch(error) {
      delete this.marketplaceCache[marketplaceHash];
      throw error;
    }
  });

  MarketplaceOwnedItems(marketplace) {
    if(!marketplace) { return {}; }

    let items = {};

    rootStore.nfts.filter(nft => {
      const matchingItem = marketplace.items.find(item =>
        item.nft_template && !item.nft_template["/"] && item.nft_template.nft && item.nft_template.nft.template_id && item.nft_template.nft.template_id === nft.metadata.template_id
      );

      if(matchingItem) {
        items[matchingItem.sku] = items[matchingItem.sku] ? [ ...items[matchingItem.sku], nft ] : [ nft ];
      }
    });

    return items;
  }

  // Actions
  SetMarketplaceFilters(filters) {
    this.marketplaceFilters = (filters || []).map(filter => filter.trim()).filter(filter => filter);
  }

  OpenNFT = flow(function * ({nft}) {
    yield this.client.authClient.MakeAuthServiceRequest({
      path: UrlJoin("as", "wlt", "act", nft.details.TenantId),
      method: "POST",
      body: {
        op: "nft-open",
        tok_addr: nft.details.ContractAddr,
        tok_id: nft.details.TokenIdStr
      },
      headers: {
        Authorization: `Bearer ${this.client.signer.authToken}`
      }
    });
  });

  BurnNFT = flow(function * ({nft}) {
    yield this.client.CallContractMethodAndWait({
      contractAddress: nft.details.ContractAddr,
      abi: NFTContractABI,
      methodName: "burn",
      methodArgs: [nft.details.TokenId]
    });
  });

  MintingStatus = flow(function * ({tenantId}) {
    try {
      const response = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "status", "act", tenantId),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );

      return response
        .map(status => {
          let [op, address, id] = status.op.split(":");
          address = address.startsWith("0x") ? Utils.FormatAddress(address) : address;

          let confirmationId, tokenId;
          if(op === "nft-buy") {
            confirmationId = id;
          } else {
            tokenId = id;
          }

          return {
            ...status,
            state: status.state && typeof status.state === "object" ? Object.values(status.state) : status.state,
            extra: status.extra && typeof status.extra === "object" ? Object.values(status.extra) : status.extra,
            confirmationId,
            op,
            address,
            tokenId
          };
        })
        .sort((a, b) => a.ts < b.ts ? 1 : -1);
    } catch(error) {
      this.Log("Failed to retrieve minting status", true);
      this.Log(error);

      return [];
    }
  });

  DropStatus = flow(function * ({marketplace, eventId, dropId}) {
    try {
      const response = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "act", marketplace.tenant_id, eventId, dropId),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );

      return response.sort((a, b) => a.ts > b.ts ? 1 : -1)[0] || { status: "none" };
    } catch(error) {
      this.Log(error, true);
      return "";
    }
  });

  PurchaseStatus = flow(function * ({marketplace, confirmationId}) {
    try {
      const statuses = yield this.MintingStatus({tenantId: marketplace.tenant_id});

      return statuses.find(status => status.op === "nft-buy" && status.confirmationId === confirmationId) || { status: "none" };
    } catch(error) {
      this.Log(error, true);
      return { status: "unknown" };
    }
  });

  ClaimStatus = flow(function * ({marketplace, sku}) {
    try {
      const statuses = yield this.MintingStatus({tenantId: marketplace.tenant_id});

      return statuses.find(status => status.op === "nft-claim" && status.address === marketplace.marketplaceId && status.tokenId === sku) || { status: "none" };
    } catch(error) {
      this.Log(error, true);
      return { status: "unknown" };
    }
  });

  PackOpenStatus = flow(function * ({tenantId, contractId, tokenId}) {
    try {
      const contractAddress = Utils.HashToAddress(contractId);
      const statuses = yield this.MintingStatus({tenantId});

      return statuses.find(status => status.op === "nft-open" && Utils.EqualAddress(contractAddress, status.address) && status.tokenId === tokenId) || { status: "none" };
    } catch(error) {
      this.Log(error, true);
      return { status: "unknown" };
    }
  });

  SubmitDropVote = flow(function * ({marketplace, eventId, dropId, sku}) {
    yield this.client.authClient.MakeAuthServiceRequest({
      path: UrlJoin("as", "wlt", "act", marketplace.tenant_id),
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

  GetNFTDelegation = flow(function * ({tenantId, network, nft}) {
    return yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", tenantId),
        method: "POST",
        body: {
          op: "nft-transfer",
          tgt: network,
          adr: nft.details.ContractAddr,
          tok: nft.details.TokenIdStr
        },
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      })
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

      // TODO: Remove
      const ethUrl = "https://host-216-66-40-19.contentfabric.io/eth";
      const asUrl = "https://host-216-66-89-94.contentfabric.io";

      client.SetNodes({
        ethereumURIs: [
          ethUrl
        ],
        authServiceURIs: [
          asUrl
        ]
      });

      this.client = client;

      const tenantId = this.customizationMetadata ? this.customizationMetadata.tenant_id : undefined;

      if(privateKey) {
        const wallet = client.GenerateWallet();
        const signer = wallet.AddAccount({privateKey});
        client.SetSigner({signer});
        this.localAccount = true;

        if(!this.embedded) {
          sessionStorage.setItem("pk", privateKey);
        }
      } else if(authToken) {
        yield client.SetRemoteSigner({authToken, address, tenantId});
      } else if(idToken || (user && user.id_token)) {
        this.oauthUser = user;

        yield client.SetRemoteSigner({idToken: idToken || user.id_token, tenantId});
      } else {
        throw Error("Neither user nor private key specified in InitializeClient");
      }

      this.funds = parseInt((yield client.GetBalance({address: client.CurrentAccountAddress()}) || 0));
      this.accountId = `iusr${Utils.AddressToHash(client.CurrentAccountAddress())}`;

      this.authedToken = yield client.authClient.GenerateAuthorizationToken({noAuth: true});
      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      this.client = client;

      this.initialized = true;
      this.loggedIn = true;

      this.SetAuthInfo({
        authToken: client.signer.authToken,
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
      this.SendEvent({event: EVENTS.LOADED});
    } catch(error) {
      this.Log("Failed to initialize client", true);
      this.Log(error, true);

      //this.ClearAuthInfo();

      throw error;
    } finally {
      this.loggingIn = false;
    }
  });

  SignOut(auth0) {
    this.ClearAuthInfo();

    if(!this.embedded) {
      sessionStorage.removeItem("pk");
    }

    if(auth0) {
      try {
        auth0.logout({
          returnTo: UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, "")
        });

        return;
      } catch(error) {
        this.Log("Failed to log out of Auth0:");
        this.Log(error, true);
      }
    }

    this.SendEvent({event: EVENTS.LOG_OUT, data: { address: this.client.signer.address }});

    this.disableCloseEvent = true;

    const url = new URL(UrlJoin(window.location.origin, window.location.pathname));

    if(this.marketplaceId) {
      url.searchParams.set("mid", this.marketplaceHash || this.marketplaceId);
    }

    if(this.darkMode) {
      url.searchParams.set("d", "");
    }

    window.location.href = url.toString();
  }

  ClearAuthInfo() {
    this.RemoveLocalStorage(`auth-${this.network}`);
  }

  SetAuthInfo({authToken, address, user}) {
    this.SetLocalStorage(
      `auth-${this.network}`,
      Utils.B64(JSON.stringify({authToken, address, user}))
    );
    this.SetLocalStorage("hasLoggedIn", "true");
  }

  CheckEmailVerification = flow(function * (auth0) {
    try {
      if(!this.auth0AccessToken) {
        this.auth0AccessToken = yield auth0.getAccessTokenSilently();
      }

      const userProfile = (
        yield (
          yield fetch(
            "https://auth.contentfabric.io/userinfo",
            { headers: { Authorization: `Bearer ${this.auth0AccessToken}` } }
          )
        ).json()
      ) || {};

      return userProfile.email_verified;
    } catch(error) {
      this.Log(error, true);
    }

    return false;
  });

  RequestVerificationEmail = async () => {
    try {
      return true;
    } catch(error) {
      this.Log(error, true);
    }
  };

  AuthInfo() {
    try {
      const tokenInfo = this.GetLocalStorage(`auth-${this.network}`);

      if(tokenInfo) {
        const { authToken, address, user } = JSON.parse(Utils.FromB64(tokenInfo));
        const expiration = JSON.parse(atob(authToken)).exp;
        if(expiration - Date.now() < 4 * 3600 * 1000) {
          this.RemoveLocalStorage(`auth-${this.network}`);
        } else {
          return { authToken, address, user };
        }
      }
    } catch(error) {
      this.Log("Failed to retrieve auth info", true);
      this.Log(error, true);
      this.RemoveLocalStorage(`auth-${this.network}`);
    }
  }

  SetNavigationBreadcrumbs(breadcrumbs=[]) {
    this.navigationBreadcrumbs = breadcrumbs;
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

  ToggleSidePanelMode(enabled) {
    this.sidePanelMode = enabled;
  }

  SetNavigateToLogIn(initialScreen) {
    this.navigateToLogIn = initialScreen;
  }

  // Used for disabling navigation back to main marketplace page when no items are available
  SetNoItemsAvailable() {
    this.noItemsAvailable = true;
  }

  // Embedding application signalled that the wallet has become active
  WalletActivated() {
    if(this.activeLoginButton) {
      this.activeLoginButton.focus();
    }
  }

  SetActiveLoginButton(element) {
    this.activeLoginButton = element;
  }

  GetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch(error) {
      return undefined;
    }
  }

  SetLocalStorage(key, value) {
    try {
      return localStorage.setItem(key, value);
    } catch(error) {
      return undefined;
    }
  }

  RemoveLocalStorage(key) {
    try {
      return localStorage.removeItem(key);
    } catch(error) {
      return undefined;
    }
  }

  HandleResize() {
    clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      if(this.pageWidth !== window.innerWidth) {
        runInAction(() => this.pageWidth = window.innerWidth);
      }
    }, 50);
  }
}

export const rootStore = new RootStore();
export const checkoutStore = rootStore.checkoutStore;

window.rootStore = rootStore;

