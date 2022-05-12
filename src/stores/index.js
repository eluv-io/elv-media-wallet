import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";
import {ElvClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

import CheckoutStore from "Stores/Checkout";
import TransferStore from "Stores/Transfer";

import NFTContractABI from "../static/abi/NFTContract";
import CryptoStore from "Stores/Crypto";
import {v4 as UUID} from "uuid";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

const searchParams = new URLSearchParams(window.location.search);

const MARKETPLACE_ORDER = [
  "dolly-marketplace",
  "oc-marketplace",
  "maskverse-marketplace",
  "emp-marketplace",
  "marketplace-elevenation",
  "indieflix-marketplace",
  "angels-airwaves-marketplace"
];

let storageSupported = true;
try {
  sessionStorage.getItem("TestStorage");
  localStorage.getItem("TestStorage");
} catch(error) {
  storageSupported = false;
}

const ProfileImage = (text) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 200;
  canvas.height = 200;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(150, 150, 150, 1)");
  gradient.addColorStop(0.5, "rgba(200, 200, 200, 0.75)");
  gradient.addColorStop(1, "rgba(150, 150, 150, 0.25)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = "80px Helvetica";
  context.fillStyle = "black";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 10);

  return canvas.toDataURL("image/png");
};

class RootStore {
  DEBUG_ERROR_MESSAGE = "";

  network = EluvioConfiguration["config-url"].includes("main.net955305") ? "main" : "demo";

  embedded = window.top !== window.self || searchParams.has("e");
  storageSupported = storageSupported;

  // Opened by embedded window for purchase redirect
  fromEmbed = searchParams.has("embed") ||
    this.GetSessionStorage("fromEmbed");

  trustedOrigins = this.GetLocalStorageJSON("trusted-origins") || {};

  mode = "test";

  pageWidth = window.innerWidth;
  activeModals = 0;

  authInfo = undefined;

  loginOnly = searchParams.has("lo") || this.GetSessionStorage("loginOnly");
  requireLogin = searchParams.has("rl") || this.GetSessionStorage("loginRequired");
  capturedLogin = this.embedded && searchParams.has("cl");
  showLogin = this.requireLogin;

  loggedIn = false;
  disableCloseEvent = false;
  darkMode = searchParams.has("dk");

  availableMarketplaces = {};

  lastMarketplaceId = undefined;
  marketplaceId = undefined;
  marketplaceHashes = {};
  tenantSlug = undefined;
  marketplaceSlug = undefined;

  drops = {};

  localAccount = false;
  auth0AccessToken = undefined;

  loaded = false;
  loginLoaded = false;
  client = undefined;
  accountId = undefined;
  funds = undefined;

  userStripeId = undefined;
  userStripeEnabled = false;
  withdrawableWalletBalance = undefined;
  availableWalletBalance = undefined;
  pendingWalletBalance = undefined;
  totalWalletBalance = undefined;

  specifiedMarketplaceId = undefined;
  hideGlobalNavigation = false;
  hideNavigation = searchParams.has("hn") || this.loginOnly;
  sidePanelMode = false;

  staticToken = undefined;
  authedToken = undefined;
  basePublicUrl = undefined;

  defaultProfileImage = ProfileImage("");
  userProfile = {};
  userAddress;

  lastProfileQuery = 0;

  nftInfo = {};
  nftData = {};


  marketplaceIds = [];
  marketplaces = {};
  marketplaceCache = {};

  marketplaceFilters = [];

  EVENTS = EVENTS;

  navigationBreadcrumbs = [];

  noItemsAvailable = false;

  get specifiedMarketplace() {
    return this.marketplaces[this.specifiedMarketplaceId];
  }

  get marketplaceHash() {
    return this.marketplaceHashes[this.marketplaceId];
  }

  get allMarketplaces() {
    let marketplaces = [];
    Object.keys((this.availableMarketplaces || {}))
      .filter(key => typeof this.availableMarketplaces[key] === "object")
      .forEach(tenantSlug =>
        Object.keys((this.availableMarketplaces[tenantSlug] || {}))
          .filter(key => typeof this.availableMarketplaces[tenantSlug][key] === "object")
          .map(marketplaceSlug =>
            marketplaces.push(this.availableMarketplaces[tenantSlug][marketplaceSlug])
          )
      );

    marketplaces = marketplaces.sort((a, b) => a.order < b.order ? -1 : 1);

    const orderedMarketplaces = marketplaces.filter(marketplace => marketplace.order >= 0);
    const unorderedMarketplaces = marketplaces.filter(marketplace => marketplace.order < 0);

    return [
      ...orderedMarketplaces,
      ...unorderedMarketplaces
    ];
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

    this.checkoutStore = new CheckoutStore(this);
    this.transferStore = new TransferStore(this);
    this.cryptoStore = new CryptoStore(this);

    window.addEventListener("resize", () => this.HandleResize());

    window.addEventListener("hashchange", () => this.SendEvent({event: EVENTS.ROUTE_CHANGE, data: UrlJoin("/", window.location.hash.replace("#", ""))}));

    this.ToggleDarkMode(this.darkMode);

    this.Initialize();
  }

  Initialize = flow(function * () {
    try {
      // Login required
      if(searchParams.has("rl") || this.GetSessionStorage("loginRequired")) {
        this.requireLogin = true;
        this.ShowLogin({requireLogin: true});
        this.SetSessionStorage("loginRequired", "true");
      }

      // Show only login screen
      if(searchParams.has("lo") || this.GetSessionStorage("loginOnly")) {
        this.loginOnly = true;
        this.requireLogin = true;
        this.ShowLogin({requireLogin: true});
        this.SetSessionStorage("loginOnly", "true");
        this.ToggleNavigation(false);
      }

      this.client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"],
        assumeV3: true
      });

      this.staticToken = this.client.staticToken;

      this.basePublicUrl = yield this.client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      const marketplace = searchParams.get("mid") || this.GetSessionStorage("marketplace") || "";
      let tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash;
      if(marketplace && marketplace.includes("/")) {
        tenantSlug = marketplace.split("/")[0];
        marketplaceSlug = marketplace.split("/")[1];
      } else if(marketplace && marketplace.startsWith("hq__")) {
        const objectId = Utils.DecodeVersionHash(marketplace).objectId;
        marketplaceHash = marketplace;
        marketplaceId = objectId.replace(/\//g, "");
      } else if(marketplace) {
        marketplaceId = marketplace.replace(/\//g, "");
      }

      if(marketplace) {
        yield this.LoadAvailableMarketplaces({tenantSlug, marketplaceSlug});
        const specifiedMarketplaceHash = this.SetMarketplace({tenantSlug, marketplaceSlug, marketplaceHash, marketplaceId});

        this.specifiedMarketplaceId = Utils.DecodeVersionHash(specifiedMarketplaceHash).objectId;

        this.SetSessionStorage("marketplace", marketplace);
      }

      try {
        const auth = searchParams.get("auth");
        if(auth) {
          this.SetAuthInfo(JSON.parse(Utils.FromB64(auth)));
        }
      } catch(error) {
        this.Log("Failed to load auth from parameter", true);
        this.Log(error, true);
      }

      if(this.AuthInfo()) {
        yield this.Authenticate(this.AuthInfo());
      }

      this.SendEvent({event: EVENTS.LOADED});
    } finally {
      this.loaded = true;
    }
  });

  Authenticate = flow(function * ({idToken, authToken, tenantId, user, saveAuthInfo=true}) {
    try {
      this.loggedIn = false;

      const client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"],
        assumeV3: true
      });

      this.staticToken = client.staticToken;

      this.client = client;

      if(!user || !user.email) {
        throw Error("No email provided in user data");
      }

      if(idToken) {
        yield client.SetRemoteSigner({idToken: idToken, tenantId, extraData: user?.userData});
      } else if(authToken) {
        yield client.SetRemoteSigner({authToken, tenantId, unsignedPublicAuth: true});
      } else {
        throw Error("Neither ID token nor auth token provided to Authenticate");
      }

      this.GetWalletBalance();

      this.SetAuthInfo({
        authToken: client.signer.authToken,
        address: client.CurrentAccountAddress(),
        user,
        save: saveAuthInfo
      });

      this.funds = parseInt((yield client.GetBalance({address: client.CurrentAccountAddress()}) || 0));
      this.userAddress = client.CurrentAccountAddress();
      this.accountId = `iusr${Utils.AddressToHash(client.CurrentAccountAddress())}`;

      this.authedToken = yield client.authClient.GenerateAuthorizationToken({noAuth: true});
      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      const initials = ((user || {}).name || "").split(" ").map(s => s.substr(0, 1));
      this.userProfile = {
        address: client.CurrentAccountAddress(),
        name: user?.name || client.CurrentAccountAddress(),
        email: user?.email,
        profileImage: ProfileImage(
          (initials.length <= 1 ? initials.join("") : `${initials[0]}${initials[initials.length - 1]}`).toUpperCase()
        )
      };

      // Clear loaded marketplaces so they will be reloaded and authorization rechecked
      this.marketplaces = {};
      this.marketplaceCache = {};

      yield this.cryptoStore.LoadConnectedAccounts();

      this.HideLogin();
      this.loggedIn = true;

      this.SendEvent({event: EVENTS.LOG_IN, data: {address: client.CurrentAccountAddress()}});
    } catch(error) {
      this.ClearAuthInfo();
      this.Log(error, true);
    }
  });

  async LoadLoginCustomization() {
    if(!this.specifiedMarketplaceId) {
      return {};
    }

    const marketplaceHash =
      this.marketplaceHashes[this.specifiedMarketplaceId] ||
      await this.client.LatestVersionHash({objectId: this.specifiedMarketplaceId});
    const marketplaceId = this.client.utils.DecodeVersionHash(marketplaceHash).objectId;

    const savedData = this.GetSessionStorageJSON(`marketplace-login-${marketplaceHash}`, true);

    if(savedData) {
      return savedData;
    }

    let metadata = (
      await this.client.ContentObjectMetadata({
        versionHash: marketplaceHash,
        metadataSubtree: UrlJoin("public", "asset_metadata", "info"),
        select: [
          "branding",
          "login_customization",
          "tenant_id",
          "terms"
        ],
        produceLinkUrls: true
      })
    ) || {};

    metadata = {
      ...(metadata.login_customization || {}),
      darkMode: metadata?.branding?.color_scheme === "Dark",
      marketplaceId,
      marketplaceHash,
      tenant_id: metadata.tenant_id,
      terms: metadata.terms
    };

    this.SetSessionStorage(`marketplace-login-${marketplaceHash}`, btoa(JSON.stringify(metadata)));

    return metadata;
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

  NFTData({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    return this.nftData[key];
  }

  NFTInfo({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    return this.nftInfo[`${contractAddress}-${tokenId}`];
  }

  LoadNFTData = flow(function * ({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    if(!this.nftData[key]) {
      let nft = this.transferStore.FormatResult(
        yield Utils.ResponseToJson(
          this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", "nft", "info", contractAddress, tokenId),
            method: "GET"
          })
        )
      );

      nft.metadata = {
        ...(
          (yield this.client.ContentObjectMetadata({
            versionHash: nft.details.VersionHash,
            metadataSubtree: "public/asset_metadata/nft",
            produceLinkUrls: true
          })) || {}
        ),
        ...(nft.metadata || {})
      };

      this.nftData[key] = nft;
    }

    return this.nftData[key];
  });

  LoadNFTInfo = flow(function * (forceReload=false) {
    if(!this.loggedIn || this.fromEmbed) { return; }

    if(!this.profileData || forceReload || Date.now() - this.lastProfileQuery > 30000) {
      this.lastProfileQuery = Date.now();

      this.profileData = yield this.client.ethClient.MakeProviderCall({
        methodName: "send",
        args: [
          "elv_getAccountProfile",
          [this.client.contentSpaceId, this.accountId]
        ]
      });
    }

    if(!this.profileData || !this.profileData.NFTs) { return; }

    let nftInfo = {};
    Object.keys(this.profileData.NFTs).map(tenantId =>
      this.profileData.NFTs[tenantId].forEach(details => {
        const versionHash = (details.TokenUri || "").split("/").find(s => s.startsWith("hq__"));

        if(!versionHash) {
          return;
        }

        if(details.TokenHold) {
          details.TokenHoldDate = new Date(parseInt(details.TokenHold) * 1000);
        }

        const contractAddress = Utils.FormatAddress(details.ContractAddr);
        const key = `${contractAddress}-${details.TokenIdStr}`;
        nftInfo[key] = {
          ...details,
          ContractAddr: Utils.FormatAddress(details.ContractAddr),
          ContractId: `ictr${Utils.AddressToHash(details.ContractAddr)}`,
          VersionHash: versionHash
        };
      })
    );

    this.nftInfo = nftInfo;
  });

  // If marketplace slug is specified, load only that marketplace. Otherwise load all
  LoadAvailableMarketplaces = flow(function * ({tenantSlug, marketplaceSlug, forceReload}={}) {
    if(!forceReload && this.availableMarketplaces["_ALL_LOADED"]) {
      return;
    }

    let metadata;

    const mainSiteId = EluvioConfiguration["main-site-id"];
    const mainSiteHash = yield this.client.LatestVersionHash({objectId: mainSiteId});

    // Loading specific marketplace
    if(marketplaceSlug) {
      if(!forceReload && this.availableMarketplaces[tenantSlug] && this.availableMarketplaces[tenantSlug][marketplaceSlug]) {
        return;
      }

      metadata = yield this.client.ContentObjectMetadata({
        versionHash: mainSiteHash,
        metadataSubtree: "public/asset_metadata/tenants",
        resolveLinks: true,
        linkDepthLimit: 2,
        resolveIncludeSource: true,
        resolveIgnoreErrors: true,
        produceLinkUrls: true,
        noAuth: true,
        select: [
          `${tenantSlug}/.`,
          `${tenantSlug}/marketplaces/${marketplaceSlug}/.`,
          `${tenantSlug}/marketplaces/${marketplaceSlug}/info/tenant_id`,
          `${tenantSlug}/marketplaces/${marketplaceSlug}/info/tenant_name`,
          `${tenantSlug}/marketplaces/${marketplaceSlug}/info/branding`,
          `${tenantSlug}/marketplaces/${marketplaceSlug}/info/terms`,
          `${tenantSlug}/marketplaces/${marketplaceSlug}/info/terms_html`
        ]
      });
    } else {
      metadata = yield this.client.ContentObjectMetadata({
        versionHash: mainSiteHash,
        metadataSubtree: "public/asset_metadata/tenants",
        resolveLinks: true,
        linkDepthLimit: 2,
        resolveIncludeSource: true,
        resolveIgnoreErrors: true,
        produceLinkUrls: true,
        noAuth: true,
        select: [
          "*/.",
          "*/marketplaces/*/.",
          "*/marketplaces/*/info/tenant_id",
          "*/marketplaces/*/info/tenant_name",
          "*/marketplaces/*/info/branding",
          "*/marketplaces/*/info/terms",
          "*/marketplaces/*/info/terms_html"
        ]
      });
    }

    let availableMarketplaces = { ...(this.availableMarketplaces || {}) };
    Object.keys(metadata || {}).forEach(tenantSlug => {
      try {
        availableMarketplaces[tenantSlug] = {
          versionHash: metadata[tenantSlug]["."].source
        };

        Object.keys(metadata[tenantSlug].marketplaces || {}).forEach(marketplaceSlug => {
          try {
            const versionHash = metadata[tenantSlug].marketplaces[marketplaceSlug]["."].source;
            const objectId = Utils.DecodeVersionHash(versionHash).objectId;

            this.marketplaceHashes[objectId] = versionHash;

            availableMarketplaces[tenantSlug][marketplaceSlug] = {
              branding: {},
              ...(metadata[tenantSlug].marketplaces[marketplaceSlug].info || {}),
              tenantId: metadata[tenantSlug].marketplaces[marketplaceSlug].info.tenant_id,
              tenantSlug,
              marketplaceSlug,
              marketplaceId: objectId,
              marketplaceHash: versionHash,
              order: MARKETPLACE_ORDER.findIndex(slug => slug === marketplaceSlug)
            };
          } catch(error) {
            this.Log(`Unable to load info for marketplace ${tenantSlug}/${marketplaceSlug}`, true);
          }
        });
      } catch(error) {
        this.Log(`Failed to load tenant info ${tenantSlug}`, true);
        this.Log(error, true);
      }
    });

    if(!marketplaceSlug) {
      availableMarketplaces["_ALL_LOADED"] = true;
    }

    this.availableMarketplaces = availableMarketplaces;
  });

  SetCustomizationOptions(marketplace) {
    let options = { font: "Hevetica Neue" };
    if(marketplace && marketplace !== "default") {
      options = {
        ...options,
        ...(marketplace.branding || {})
      };
    }

    this.hideGlobalNavigation = marketplace && this.specifiedMarketplaceId === marketplace.marketplaceId && marketplace.branding && marketplace.branding.hide_global_navigation;

    let fontImport = "";
    switch(options.font) {
      case "Inter":
        fontImport = import("Assets/fonts/Inter/inter.font.css");

        break;
      case "Selawik":
        fontImport = import("Assets/fonts/Selawik/selawik.font.css");

        break;
      default:
        break;
    }

    const fontsTag = document.getElementById("_fonts");
    if(fontImport) {
      fontImport.then(font => fontsTag.innerHTML = font.default);
    } else {
      fontsTag.innerHTML = ":root { --font-family-primary: \"Helvetica Neue\", Helvetica, sans-serif; }";
    }

    switch(options.color_scheme) {
      case "Dark":
        this.ToggleDarkMode(true);
        break;

      case "Light":
        this.ToggleDarkMode(false);
        break;
    }
  }

  ClearMarketplace() {
    this.tenantSlug = undefined;
    this.marketplaceSlug = undefined;
    this.marketplaceId = undefined;

    this.SetCustomizationOptions("default");
  }

  SetMarketplace({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
    const marketplace = this.allMarketplaces.find(marketplace =>
      (marketplaceId && Utils.EqualHash(marketplaceId, marketplace.marketplaceId)) ||
      (marketplaceSlug && marketplace.tenantSlug === tenantSlug && marketplace.marketplaceSlug === marketplaceSlug) ||
      (marketplaceHash && marketplace.marketplaceHash === marketplaceHash)
    );

    if(marketplace) {
      this.tenantSlug = marketplace.tenantSlug;
      this.marketplaceSlug = marketplace.marketplaceSlug;
      this.marketplaceId = marketplace.marketplaceId;

      this.lastMarketplaceId = marketplace.marketplaceId;

      this.SetCustomizationOptions(marketplace);

      return marketplace.marketplaceHash;
    } else {
      this.SetCustomizationOptions("default");
    }
  }

  MarketplaceInfo = flow(function * ({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash, forceReload=false}) {
    let marketplace = this.allMarketplaces.find(marketplace =>
      (marketplaceId && Utils.EqualHash(marketplaceId, marketplace.marketplaceId)) ||
      (marketplaceSlug && marketplace.tenantSlug === tenantSlug && marketplace.marketplaceSlug === marketplaceSlug) ||
      (marketplaceHash && marketplace.marketplaceHash === marketplaceHash)
    );

    if(marketplace && !forceReload) {
      return marketplace;
    } else if(marketplace) {
      tenantSlug = marketplace.tenantSlug;
      marketplaceSlug = marketplace.marketplaceSlug;
    }

    if(marketplaceSlug) {
      yield this.LoadAvailableMarketplaces({tenantSlug, marketplaceSlug, forceReload});

      marketplace = this.availableMarketplaces[tenantSlug][marketplaceSlug];

      if(!marketplace) {
        throw Error(`Invalid marketplace ${tenantSlug}/${marketplaceSlug}`);
      }

    } else if(marketplaceHash) {
      // Specific hash specified
      marketplaceId = Utils.DecodeVersionHash(marketplaceHash).objectId;
      this.marketplaceHashes[this.marketplaceId] = marketplaceHash;

      marketplace = yield this.client.ContentObjectMetadata({
        versionHash: marketplaceHash,
        metadataSubtree: "public/asset_metadata/info/branding",
        produceLinkUrls: true,
        noAuth: true
      });
    } else {
      yield this.LoadAvailableMarketplaces({forceReload});

      marketplace = this.allMarketplaces.find(marketplace => Utils.EqualHash(marketplaceId, marketplace.marketplaceId));

      if(!marketplace) {
        throw Error(`Invalid marketplace ${marketplaceId}`);
      }

      tenantSlug = marketplace.tenantSlug;
      marketplaceSlug = marketplace.marketplaceSlug;
      marketplaceId = marketplace.marketplaceId;
    }

    this.SetCustomizationOptions(marketplace);

    return {
      marketplaceId,
      marketplaceHash: this.marketplaceHashes[marketplaceId],
      tenantSlug,
      marketplaceSlug
    };
  });

  LoadEvent = flow(function * ({tenantSlug, eventSlug, eventId, eventHash}) {
    if(eventSlug) {
      if(!tenantSlug) { throw Error("Load Event: Missing required tenant slug"); }

      const mainSiteId = EluvioConfiguration["main-site-id"];
      const mainSiteHash = yield this.client.LatestVersionHash({objectId: mainSiteId});

      return (
        yield this.client.ContentObjectMetadata({
          versionHash: mainSiteHash,
          metadataSubtree: UrlJoin("public", "asset_metadata", "tenants", tenantSlug, "sites", eventSlug),
          resolveLinks: true,
          linkDepthLimit: 2,
          resolveIncludeSource: true,
          produceLinkUrls: true,
          noAuth: true,
        })
      );
    }

    return (
      yield this.client.ContentObjectMetadata({
        libraryId: yield this.client.ContentObjectLibraryId({objectId: eventId, versionHash: eventHash}),
        objectId: eventId,
        versionHash: eventHash,
        metadataSubtree: UrlJoin("public", "asset_metadata"),
        resolveLinks: true,
        linkDepthLimit: 2,
        resolveIncludeSource: true,
        produceLinkUrls: true,
        noAuth: true,
      })
    );
  });

  LoadMarketplace = flow(function * (marketplaceId, forceReload=false) {
    const cacheTimeSeconds = 300;

    let marketplaceHash = (this.marketplaces[marketplaceId] || {}).versionHash;
    let useCache = !forceReload && marketplaceHash && this.marketplaceCache[marketplaceHash] && Date.now() - this.marketplaceCache[marketplaceHash].marketplace < cacheTimeSeconds * 1000;
    if(!useCache) {
      const marketplaceInfo = yield this.MarketplaceInfo({marketplaceId, forceReload});

      if(marketplaceHash && marketplaceHash === marketplaceInfo.marketplaceHash) {
        // Marketplace object has not been updated
        useCache = true;
      }

      marketplaceHash = marketplaceInfo.marketplaceHash;
    }

    // Cache marketplace retrieval
    if(useCache) {
      // Cache stock retrieval separately
      if(this.marketplaceCache[marketplaceHash] && Date.now() - this.marketplaceCache[marketplaceHash].stock > 10000) {
        this.checkoutStore.MarketplaceStock({tenantId: this.marketplaces[marketplaceId].tenant_id});
        this.marketplaceCache[marketplaceHash].stock = Date.now();
      }

      return this.marketplaces[marketplaceId];
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
        resolveIncludeSource: true,
        produceLinkUrls: true,
        noAuth: true
      });

      const stockPromise = this.checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});

      marketplace.items = yield Promise.all(
        marketplace.items.map(async item => {
          if(this.loggedIn && item.requires_permissions) {
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
      marketplace.versionHash = marketplaceHash;

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

    Object.values(rootStore.nftInfo).filter(details => {
      const matchingItem = marketplace.items.find(item =>
        item?.nft_template?.nft?.address && Utils.EqualAddress(item.nft_template.nft.address, details.ContractAddr)
      );

      if(matchingItem) {
        items[matchingItem.sku] = items[matchingItem.sku] ? [ ...items[matchingItem.sku], details ] : [ details ];
      }
    });

    return items;
  }

  MarketplacePurchaseableItems(marketplace) {
    let purchaseableItems = {};
    ((marketplace.storefront || {}).sections || []).forEach(section =>
      section.items.forEach(sku => {
        const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
        const item = marketplace.items[itemIndex];

        // For sale / authorization
        if(!item || !item.for_sale || (item.requires_permissions && !item.authorized)) { return; }

        if(item.max_per_user && checkoutStore.stock[item.sku] && checkoutStore.stock[item.sku].current_user >= item.max_per_user) {
          // Purchase limit
          return;
        }

        purchaseableItems[sku] = {
          item,
          index: itemIndex
        };
      })
    );

    return purchaseableItems;
  }

  MarketplaceItemByTemplateId(marketplace, templateId) {
    const purchaseableItems = this.MarketplacePurchaseableItems(marketplace);
    const item = marketplace.items.find(item =>
      item.nft_template && !item.nft_template["/"] && item.nft_template.nft && item.nft_template.nft.template_id && item.nft_template.nft.template_id === templateId
    );

    if(item && purchaseableItems[item.sku]) {
      return purchaseableItems[item.sku].item;
    }
  }

  // Actions
  SetMarketplaceFilters(filters) {
    this.marketplaceFilters = (filters || []).map(filter => filter.trim()).filter(filter => filter);
  }

  OpenNFT = flow(function * ({tenantId, contractAddress, tokenId}) {
    contractAddress = Utils.FormatAddress(contractAddress);
    const confirmationId = `${contractAddress}:${tokenId}`;

    // Save as purchase so tenant ID is preserved for status
    this.checkoutStore.PurchaseInitiated({tenantId, confirmationId});

    try {
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", tenantId),
        method: "POST",
        body: {
          op: "nft-open",
          tok_addr: contractAddress,
          tok_id: tokenId
        },
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      });

      this.checkoutStore.PurchaseComplete({confirmationId, success: true});
    } catch(error) {
      this.checkoutStore.PurchaseComplete({confirmationId, success: false, message: error.message});
      throw error;
    }
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
          } else if(op === "nft-claim") {
            confirmationId = id;
            status.marketplaceId = address;

            if(status.extra?.["0"]) {
              address = status.extra.token_addr;
              tokenId = status.extra.token_id_str;
            }
          } else {
            tokenId = id;
          }

          if(op === "nft-transfer") {
            confirmationId = status?.extra?.trans_id;
          }

          return {
            ...status,
            timestamp: new Date(status.ts),
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

  LoadDrop = flow(function * ({tenantSlug, eventSlug, dropId}) {
    if(!this.drops[tenantSlug]) {
      this.drops[tenantSlug] = {};
    }

    if(!this.drops[tenantSlug][eventSlug]) {
      this.drops[tenantSlug][eventSlug] = {};
    }

    if(!this.drops[tenantSlug][eventSlug][dropId]) {
      const mainSiteId = EluvioConfiguration["main-site-id"];
      const mainSiteHash = yield this.client.LatestVersionHash({objectId: mainSiteId});
      const event = (yield this.client.ContentObjectMetadata({
        versionHash: mainSiteHash,
        metadataSubtree: UrlJoin("public", "asset_metadata", "tenants", tenantSlug, "sites", eventSlug, "info"),
        resolveLinks: true,
        linkDepthLimit: 2,
        resolveIncludeSource: true,
        produceLinkUrls: true,
        select: [".", "drops"],
        noAuth: true
      })) || [];

      const eventId = Utils.DecodeVersionHash(event["."].source).objectId;

      event.drops.forEach(drop => {
        drop = {
          ...drop,
          eventId
        };

        this.drops[tenantSlug][eventSlug][drop.uuid] = drop;
        this.drops[drop.uuid] = drop;
      });
    }

    return this.drops[dropId];
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

  ListingPurchaseStatus = flow(function * ({tenantId, confirmationId}) {
    try {
      const statuses = yield this.MintingStatus({tenantId});

      return statuses
        .find(status =>
          status.op === "nft-transfer" &&
          status.extra && status.extra[0] === confirmationId
        ) || { status: "none" };
    } catch(error) {
      this.Log(error, true);
      return { status: "unknown" };
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

      return statuses.find(status => status.op === "nft-claim" && status.marketplaceId === marketplace.marketplaceId && status.confirmationId === sku) || { status: "none" };
    } catch(error) {
      this.Log(error, true);
      return { status: "unknown" };
    }
  });

  PackOpenStatus = flow(function * ({tenantId, contractId, contractAddress, tokenId}) {
    try {
      if(contractId) {
        contractAddress = Utils.HashToAddress(contractId);
      }

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

  GetWalletBalance = flow(function * (checkOnboard=false) {
    if(!this.loggedIn) { return; }

    // eslint-disable-next-line no-unused-vars
    const { balance, seven_day_hold, thirty_day_hold, stripe_id, stripe_payouts_enabled } = yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "mkt", "bal"),
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      })
    );

    this.userStripeId = stripe_id;
    this.userStripeEnabled = stripe_payouts_enabled;
    this.totalWalletBalance = parseFloat(balance || 0);
    this.availableWalletBalance = Math.max(0, this.totalWalletBalance - parseFloat(seven_day_hold || 0));
    this.pendingWalletBalance = Math.max(0, this.totalWalletBalance - this.availableWalletBalance);
    this.withdrawableWalletBalance = Math.max(0, this.totalWalletBalance - parseFloat(thirty_day_hold || 0));

    if(checkOnboard && stripe_id && !stripe_payouts_enabled) {
      // Refresh stripe enabled flag
      const rootUrl = new URL(UrlJoin(window.location.origin, window.location.pathname)).toString();
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "onb", "stripe"),
        method: "POST",
        body: {
          country: "US",
          mode: EluvioConfiguration.mode,
          refresh_url: rootUrl.toString(),
          return_url: rootUrl.toString()
        },
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      });

      yield this.GetWalletBalance(false);

      yield this.cryptoStore.PhantomBalance();
    }

    let balances = {
      totalWalletBalance: this.totalWalletBalance,
      availableWalletBalance: this.availableWalletBalance,
      pendingWalletBalance: this.pendingWalletBalance,
      withdrawableWalletBalance: this.withdrawableWalletBalance,
    };

    if(cryptoStore.usdcConnected) {
      balances.usdcBalance = cryptoStore.phantomUSDCBalance;
    }

    return balances;
  });

  WithdrawFunds = flow(function * (amount) {
    if(amount > this.withdrawableWalletBalance) {
      throw Error("Attempting to withdraw unavailable funds");
    }

    yield Utils.ResponseToJson(
      this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "bal", "stripe"),
        method: "POST",
        body: {
          amount,
          currency: "USD",
          mode: EluvioConfiguration.mode,
        },
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      })
    );

    yield new Promise(resolve => setTimeout(resolve, 1000));

    yield this.GetWalletBalance();
  });

  StripeOnboard = flow(function * (countryCode="US") {
    yield this.Flow({
      type: "flow",
      flow: "stripe-onboard",
      parameters: {
        countryCode,
        requireAuth: true
      },
      OnCancel: () => this.GetWalletBalance()
    });
  });

  StripeLogin = flow (function * () {
    yield this.Flow({
      type: "flow",
      flow: "stripe-login",
      parameters: {
        requireAuth: true
      },
      OnCancel: () => this.GetWalletBalance()
    });
  });

  SignOut() {
    this.ClearAuthInfo();

    if(!this.embedded) {
      this.RemoveSessionStorage(`pk-${this.network}`);
    }

    this.SendEvent({event: EVENTS.LOG_OUT, data: { address: this.client.CurrentAccountAddress() }});

    if(window.auth0) {
      try {
        this.disableCloseEvent = true;
        window.auth0.logout({
          returnTo: UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, "")
        });

        return;
      } catch(error) {
        this.Log("Failed to log out of Auth0:");
        this.Log(error, true);
      }
    }

    this.disableCloseEvent = true;

    const url = new URL(UrlJoin(window.location.origin, window.location.pathname));

    if(this.marketplaceId) {
      url.searchParams.set("mid", this.marketplaceHash || this.marketplaceId);
    }

    if(this.darkMode) {
      url.searchParams.set("dk", "");
    }

    if(this.loginOnly) {
      url.searchParams.set("lo", "");
    } else if(this.requireLogin) {
      url.searchParams.set("rl", "");
    }

    // Reload page
    window.location.href = url.toString();
  }

  RequestPermission = flow(function * ({origin, requestor, action}) {
    if(this.trustedOrigins[origin]) {
      return true;
    }

    try {
      const response = yield this.Flow({
        type: "action",
        flow: "consent",
        darkMode: this.darkMode,
        parameters: {
          origin,
          requestor,
          action
        }
      });

      if(!response.accept) {
        throw { message: "User has rejected the request", error: "user_reject" };
      }

      if(response.trust) {
        this.SetTrustedOrigin(origin);
      }

      return true;
    } catch(error) {
      if(error.error === "popup_blocked") {
        throw error;
      }

      throw { message: "User has rejected the request", error: "user_reject" };
    }
  });

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

  FlowURL({type="flow", flow, parameters={}, darkMode}) {
    const url = new URL(UrlJoin(window.location.origin, window.location.pathname));
    url.hash = UrlJoin("/", type, flow, Utils.B58(JSON.stringify(parameters)));

    if(darkMode) {
      url.searchParams.set("dk", "");
    }

    return url.toString();
  }

  Flow = flow(function * ({type="flow", flow, parameters={}, darkMode=false, OnComplete, OnCancel}) {
    try {
      const popup = window.open("about:blank");

      if(!popup) {
        throw {message: "Popup Blocked", error: "popup_blocked"};
      }

      const flowId = btoa(UUID());

      parameters.flowId = flowId;

      if(!this.storageSupported && this.AuthInfo()) {
        parameters.auth = this.AuthInfo();
      }

      popup.location.href = this.FlowURL({type, flow, parameters, darkMode});

      const result = yield new Promise((resolve, reject) => {
        const closeCheck = setInterval(() => {
          if(!popup || popup.closed) {
            clearInterval(closeCheck);

            reject({message: "Popup Closed", error: "popup_closed"});
          }
        }, 1000);

        const Listener = async event => {
          if(!event || !event.data || event.origin !== window.location.origin || event.data.type !== "FlowResponse" || event.data.flowId !== flowId) {
            return;
          }

          window.removeEventListener("message", Listener);

          clearInterval(closeCheck);

          //setTimeout(() => popup.close(), 500);

          if(event.data.error) {
            reject(event.data.error);
          }

          resolve(event.data.response);
        };

        window.addEventListener("message", Listener);
      });

      OnComplete && OnComplete(result);

      return result;
    } catch(error) {
      this.Log(error, true);

      if(OnCancel) {
        OnCancel(error);
      } else {
        throw error;
      }
    }
  });

  HandleFlow = flow(function * ({history, flow, parameters}) {
    if(parameters) {
      parameters = JSON.parse(new TextDecoder().decode(Utils.FromB58(parameters)));
    }

    const Respond = ({response, error}) => {
      window.opener.postMessage({
        type: "FlowResponse",
        flowId: parameters.flowId,
        response,
        error
      });
    };

    try {
      switch(flow) {
        case "purchase":
          yield checkoutStore.CheckoutSubmit({
            ...parameters,
            fromEmbed: true
          });

          break;

        case "listing-purchase":
          yield checkoutStore.ListingCheckoutSubmit({
            ...parameters,
            fromEmbed: true
          });

          break;

        case "redirect":
          history.push(parameters.to);

          break;

        case "respond":
          Respond({response: parameters.response, error: parameters.error});

          setTimeout(() => window.close(), 5000);

          break;

        case "stripe-onboard":
          const onboardResponse = yield Utils.ResponseToJson(
            this.client.authClient.MakeAuthServiceRequest({
              path: UrlJoin("as", "wlt", "onb", "stripe"),
              method: "POST",
              body: {
                country: parameters.countryCode,
                mode: EluvioConfiguration.mode,
                return_url: this.FlowURL({type: "flow", flow: "respond", parameters: { flowId: parameters.flowId, success: true }}),
                refresh_url: window.location.href
              },
              headers: {
                Authorization: `Bearer ${this.client.signer.authToken}`
              }
            })
          );

          if(!onboardResponse.onboard_redirect) {
            throw "Response missing login URL";
          }

          window.location.href = onboardResponse.onboard_redirect;

          break;

        case "stripe-login":
          const loginResponse = yield Utils.ResponseToJson(
            this.client.authClient.MakeAuthServiceRequest({
              path: UrlJoin("as", "wlt", "login", "stripe"),
              method: "POST",
              body: {
                mode: EluvioConfiguration.mode,
              },
              headers: {
                Authorization: `Bearer ${this.client.signer.authToken}`
              }
            })
          );

          if(!loginResponse.login_url) {
            throw "Response missing login URL";
          }

          window.location.href = loginResponse.login_url;

          break;

        default:
          Respond({error: `Unknown flow: ${flow}`});

          break;
      }
    } catch(error) {
      Respond({error: Utils.MakeClonable(error)});
    }
  });

  AuthInfo() {
    try {
      if(this.authInfo) {
        return this.authInfo;
      }

      const tokenInfo = this.GetLocalStorage(`auth-${this.network}`);

      if(tokenInfo) {
        const { authToken, address, user } = JSON.parse(Utils.FromB64(tokenInfo));
        const expiration = JSON.parse(atob(authToken)).exp;
        if(expiration - Date.now() < 4 * 3600 * 1000) {
          this.ClearAuthInfo();
        } else if(!user) {
          this.ClearAuthInfo();
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

  ClearAuthInfo() {
    this.RemoveLocalStorage(`auth-${this.network}`);

    this.authInfo = undefined;
  }

  SetAuthInfo({authToken, address, user, save=true}) {
    const authInfo = { authToken, address, user: user || {} };

    if(save) {
      this.SetLocalStorage(
        `auth-${this.network}`,
        Utils.B64(JSON.stringify(authInfo))
      );

      this.SetLocalStorage("hasLoggedIn", "true");
    }

    this.authInfo = authInfo;
  }

  SetNavigationBreadcrumbs(breadcrumbs=[]) {
    this.navigationBreadcrumbs = breadcrumbs;
  }

  SetLoginLoaded() {
    this.loginLoaded = true;
  }

  ShowLogin({requireLogin=false, ignoreCapture=false}={}) {
    if(this.capturedLogin && !ignoreCapture) {
      this.SendEvent({event: EVENTS.LOG_IN_REQUESTED});
    } else {
      this.requireLogin = requireLogin;
      this.showLogin = true;
    }
  }

  HideLogin() {
    this.showLogin = false;
    this.requireLogin = false;
  }

  ToggleDarkMode(enabled) {
    const themeContainer = document.querySelector("#_theme");
    if(!enabled) {
      themeContainer.innerHTML = "";
      return;
    } else {

      import("Assets/stylesheets/themes/dark.theme.css")
        .then(theme => {
          themeContainer.innerHTML = theme.default;
        });
    }

    this.darkMode = enabled;
  }

  ToggleNavigation(enabled) {
    this.hideNavigation = !enabled;
  }

  ToggleSidePanelMode(enabled) {
    this.sidePanelMode = enabled;
  }

  // Used for disabling navigation back to main marketplace page when no items are available
  SetNoItemsAvailable() {
    this.noItemsAvailable = true;
  }

  SetTrustedOrigin(origin, trusted=true) {
    this.trustedOrigins[origin] = trusted;

    this.SetLocalStorage("trusted-origins", JSON.stringify(this.trustedOrigins));
  }

  RemoveTrustedOrigin(origin) {
    delete this.trustedOrigins[origin];

    this.SetLocalStorage("trusted-origins", JSON.stringify(this.trustedOrigins));
  }

  GetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch(error) {
      return undefined;
    }
  }

  GetLocalStorageJSON(key, b64) {
    try {
      if(b64) {
        return JSON.parse(atob(this.GetLocalStorage(key)));
      } else {
        return JSON.parse(this.GetLocalStorage(key));
      }
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

  GetSessionStorage(key) {
    try {
      return sessionStorage.getItem(key);
    } catch(error) {
      return undefined;
    }
  }

  GetSessionStorageJSON(key, b64) {
    try {
      if(b64) {
        return JSON.parse(atob(this.GetSessionStorage(key)));
      } else {
        return JSON.parse(this.GetSessionStorage(key));
      }
    } catch(error) {
      return undefined;
    }
  }

  SetSessionStorage(key, value) {
    try {
      return sessionStorage.setItem(key, value);
    } catch(error) {
      return undefined;
    }
  }

  RemoveSessionStorage(key) {
    try {
      return sessionStorage.removeItem(key);
    } catch(error) {
      return undefined;
    }
  }

  AddActiveModal() {
    this.activeModals = this.activeModals + 1;
  }

  RemoveActiveModal() {
    this.activeModals = Math.max(0, this.activeModals - 1);
  }

  HandleResize() {
    clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      if(this.pageWidth !== window.innerWidth) {
        runInAction(() => this.pageWidth = window.innerWidth);
      }
    }, 50);
  }

  SetDebugMessage(message) {
    if(typeof message === "object") {
      this.DEBUG_ERROR_MESSAGE = JSON.stringify(message, null, 2);
    } else {
      this.DEBUG_ERROR_MESSAGE = message;
    }
  }
}

export const rootStore = new RootStore();
export const checkoutStore = rootStore.checkoutStore;
export const transferStore = rootStore.transferStore;
export const cryptoStore = rootStore.cryptoStore;

window.rootStore = rootStore;

