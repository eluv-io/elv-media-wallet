let testTheme = undefined;
//testTheme = import("../static/stylesheets/themes/maskverse-test.theme.css");
//testTheme = import("../static/stylesheets/themes/wwe-test.theme.css");
//testTheme = import("../static/stylesheets/themes/lotr-test.theme.css");

import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";
import {ElvWalletClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";
import SanitizeHTML from "sanitize-html";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

import CheckoutStore from "Stores/Checkout";
import TransferStore from "Stores/Transfer";

import NFTContractABI from "../static/abi/NFTContract";
import CryptoStore from "Stores/Crypto";
import {v4 as UUID} from "uuid";
import ProfanityFilter from "bad-words";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));

let storageSupported = true;
try {
  window.loginOnly = searchParams.has("lo");
  window.appUUID = searchParams.get("appUUID") || sessionStorage.getItem(`app-uuid-${window.loginOnly}`);

  sessionStorage.getItem("TestStorage");
  localStorage.getItem("TestStorage");
} catch(error) {
  storageSupported = false;
}

class RootStore {
  appId = "eluvio-media-wallet";

  authOrigin = this.GetSessionStorage("auth-origin");

  salePendingDurationDays = 0;

  appUUID = window.appUUID;

  DEBUG_ERROR_MESSAGE = "";

  network = EluvioConfiguration.network;

  embedded = window.top !== window.self || searchParams.has("e");
  inFlow = (window.location.hash.startsWith("#/flow/") || window.location.hash.startsWith("#/action/")) && !window.location.hash.includes("redirect");

  storageSupported = storageSupported;

  // Opened by embedded window for purchase redirect
  fromEmbed = searchParams.has("embed") ||
    this.GetSessionStorage("fromEmbed");

  trustedOrigins = this.GetLocalStorageJSON("trusted-origins") || {};

  pageWidth = window.innerWidth;
  pageHeight = window.innerHeight;

  activeModals = 0;

  authInfo = undefined;

  loginOnly = window.loginOnly;
  requireLogin = searchParams.has("rl");
  capturedLogin = this.embedded && searchParams.has("cl");
  showLogin = this.requireLogin || searchParams.get("action") === "login";

  loggedIn = false;
  externalWalletUser = false;
  disableCloseEvent = false;
  darkMode = searchParams.has("dk") || this.GetSessionStorage("dark-mode");

  availableMarketplaces = {};

  marketplaceId = undefined;
  marketplaceHashes = {};
  tenantSlug = undefined;
  marketplaceSlug = undefined;

  auth0AccessToken = undefined;

  loaded = false;
  loginLoaded = this.embedded;
  authenticating = false;
  client = undefined;
  walletClient = undefined;
  funds = undefined;

  userStripeId = undefined;
  userStripeEnabled = false;
  withdrawableWalletBalance = undefined;
  availableWalletBalance = undefined;
  pendingWalletBalance = undefined;
  totalWalletBalance = undefined;

  specifiedMarketplaceId = undefined;
  specifiedMarketplaceHash = undefined;
  previewMarketplaceId = undefined;
  previewMarketplaceHash = undefined;

  hideGlobalNavigation = false;
  hideGlobalNavigationInMarketplace = searchParams.has("hgm") || this.GetSessionStorage("hide-global-navigation-in-marketplace");
  hideNavigation = searchParams.has("hn") || this.loginOnly;
  hideMarketplaceNavigation = false;
  sidePanelMode = false;

  appBackground = { desktop: this.GetSessionStorage("background-image"), mobile: this.GetSessionStorage("background-image") };
  centerContent = false;
  centerItems = false;

  authToken = undefined;
  staticToken = undefined;
  basePublicUrl = undefined;

  nftInfo = {};
  nftData = {};
  userProfiles = {};

  viewedMedia = {};

  marketplaces = {};
  marketplaceOwnedCache = {};

  marketplaceFilters = [];

  EVENTS = EVENTS;

  navigationBreadcrumbs = [];

  noItemsAvailable = false;

  get specifiedMarketplace() {
    return this.marketplaces[this.specifiedMarketplaceId];
  }

  get marketplaceHash() {
    return this.walletClient.marketplaceHashes[this.marketplaceId];
  }

  get allMarketplaces() {
    let marketplaces = Object.values(this.walletClient.availableMarketplacesById);

    marketplaces = marketplaces.sort((a, b) =>
      a?.branding?.preview ? -1 :
        (b?.branding?.preview ? 1 :
          (a.order < b.order ? -1 : 1))
    );

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

    if(searchParams.get("origin")) {
      this.authOrigin = searchParams.get("origin");
      this.SetSessionStorage("auth-origin", searchParams.get("origin"));
    }

    this.checkoutStore = new CheckoutStore(this);
    this.transferStore = new TransferStore(this);
    this.cryptoStore = new CryptoStore(this);

    if(this.appUUID) {
      this.SetSessionStorage(`app-uuid-${window.loginOnly}`, this.appUUID);
    }

    this.resizeHandler = new ResizeObserver(elements => {
      const {width, height} = elements[0].contentRect;

      this.HandleResize({width, height});
    });

    this.resizeHandler.observe(document.body);


    window.addEventListener("hashchange", () => this.SendEvent({event: EVENTS.ROUTE_CHANGE, data: UrlJoin("/", window.location.hash.replace("#", ""))}));

    this.ToggleDarkMode(this.darkMode);

    this.Initialize();
  }

  Initialize = flow(function * () {
    try {
      this.loaded = false;

      // Login required
      if(searchParams.has("rl")) {
        this.requireLogin = true;
        this.ShowLogin({requireLogin: true});
      }

      // Show only login screen
      if(searchParams.has("lo")) {
        this.loginOnly = true;
        this.requireLogin = true;
        this.ShowLogin({requireLogin: true});
        this.ToggleNavigation(false);
      }

      this.walletClient = yield ElvWalletClient.Initialize({
        appId: this.appId,
        network: EluvioConfiguration.network,
        mode: EluvioConfiguration.mode,
        previewMarketplaceId: (searchParams.get("preview") || (!this.embedded && this.GetSessionStorage("preview-marketplace")) || "").replaceAll("/", ""),
        storeAuthToken: false
      });

      this.previewMarketplaceId = this.walletClient.previewMarketplaceId;
      this.previewMarketplaceHash = this.walletClient.previewMarketplaceHash;

      if(this.walletClient.previewMarketplaceHash) {
        this.SetSessionStorage("preview-marketplace", this.walletClient.previewMarketplaceId);
      }

      this.walletClient.appUrl = (new URL(UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, ""))).toString();

      this.client = this.walletClient.client;

      this.staticToken = this.client.staticToken;
      this.authToken = undefined;

      this.basePublicUrl = yield this.client.FabricUrl({
        queryParams: {
          authorization: this.authToken
        },
        noAuth: true
      });

      try {
        const auth = searchParams.get("auth");

        if(auth) {
          this.SetAuthInfo(JSON.parse(Utils.FromB64(auth)));
        }
      } catch(error) {
        this.Log("Failed to load auth from parameter", true);
        this.Log(error, true);
      }

      let authenticationPromise;
      if(!this.inFlow && this.AuthInfo()) {
        authenticationPromise = this.Authenticate(this.AuthInfo());
      }

      const marketplace = decodeURIComponent(searchParams.get("mid")) || decodeURIComponent(searchParams.get("marketplace")) || this.GetSessionStorage("marketplace") || "";

      if(marketplace) {
        this.SetMarketplace({
          ...(this.ParseMarketplaceParameter(marketplace)),
          specified: true
        });
      }

      if(authenticationPromise) {
        yield authenticationPromise;
      }

      this.SendEvent({event: EVENTS.LOADED});
    } finally {
      if(this.walletClient) {
        this.loaded = true;
      }
    }
  });

  CurrentAddress() {
    if(!this.authToken) { return; }

    return this.walletClient.UserAddress();
  }

  Authenticate = flow(function * ({idToken, clientAuthToken, clientSigningToken, externalWallet, walletName, user, saveAuthInfo=true, callback}) {
    if(this.authenticating) { return; }

    try {
      this.authenticating = true;
      this.loggedIn = false;

      if(externalWallet === "Metamask" && !this.cryptoStore.MetamaskAvailable()) {
        const url = new URL(window.location.origin);
        url.pathname = window.location.pathname;

        // Show login
        url.searchParams.set("sl", "");
        // Show wallet options in login
        url.searchParams.set("swl", "");

        if(rootStore.specifiedMarketplaceId) {
          url.searchParams.set("mid", rootStore.specifiedMarketplaceId);
        }

        if(rootStore.darkMode) {
          url.searchParams.set("dk", "");
        }

        // Metamask not available, link to download or open in app
        if(this.embedded) {
          // Do flow
          return yield rootStore.Flow({
            type: "flow",
            flow: "open-metamask",
            parameters: {
              appUrl: url.toString()
            }
          });
        } else {
          const a = document.createElement("a");
          a.href = `https://metamask.app.link/dapp/${url.toString().replace("https://", "")}`;

          a.target = "_self";
          document.body.appendChild(a);
          a.click();
          a.remove();

          return;
        }
      }

      this.authToken = undefined;

      if(externalWallet) {
        const walletMethods = this.cryptoStore.WalletFunctions(externalWallet);
        clientAuthToken = yield this.walletClient.AuthenticateExternalWallet({
          address: yield walletMethods.RequestAddress(),
          Sign: walletMethods.Sign,
          walletName: walletMethods.name
        });
      } else if(idToken) {
        let tenantId;

        if(this.specifiedMarketplaceHash) {
          tenantId = (yield this.LoadLoginCustomization(this.specifiedMarketplaceHash))?.tenant_id;
        }

        const tokens = yield this.walletClient.AuthenticateOAuth({
          idToken,
          email: user?.email,
          tenantId,
          shareEmail: user?.userData?.share_email
        });

        clientAuthToken = tokens.authToken;
        clientSigningToken = tokens.signingToken;
      } else if(clientAuthToken) {
        yield this.walletClient.Authenticate({token: clientSigningToken || clientAuthToken});
      } else if(!clientAuthToken) {
        throw Error("Invalid parameters provided to Authenticate");
      }

      this.SetAuthInfo({
        clientAuthToken,
        clientSigningToken,
        save: saveAuthInfo
      });

      this.authToken = this.walletClient.AuthToken();

      const address = this.walletClient.UserAddress();

      this.client = this.walletClient.client;

      this.GetWalletBalance();
      this.UserProfile({userId: address, force: true});

      this.funds = parseFloat((yield this.client.GetBalance({address}) || 0));

      this.basePublicUrl = yield this.client.FabricUrl({
        queryParams: {
          authorization: this.authToken
        },
        noAuth: true
      });

      // Reload marketplaces so they will be reloaded and authorization rechecked
      yield Promise.all(Object.keys(this.marketplaces).map(async marketplaceId => await this.LoadMarketplace(marketplaceId)));

      this.HideLogin();

      yield this.cryptoStore.LoadConnectedAccounts();

      if(callback) {
        yield callback();
      }

      this.loggedIn = true;
      this.loginLoaded = true;
      this.externalWalletUser = externalWallet || (walletName && walletName !== "Eluvio");

      this.RemoveLocalStorage("signed-out");

      this.SendEvent({event: EVENTS.LOG_IN, data: { address }});
    } catch(error) {
      this.ClearAuthInfo();
      this.Log(error, true);

      throw error;
    } finally {
      this.authenticating = false;
    }
  });

  LoadLoginCustomization = flow(function * (marketplaceHash) {
    // Client may not be initialized yet but may not be needed
    const Client = async () => {
      while(!this.client) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return this.client;
    };

    let marketplaceId;
    if(marketplaceHash) {
      marketplaceId = Utils.DecodeVersionHash(marketplaceHash).objectId;
    } else if(this.specifiedMarketplaceId) {
      marketplaceId = this.specifiedMarketplaceId;
      marketplaceHash = this.specifiedMarketplaceHash;
    }

    marketplaceId = marketplaceId || this.specifiedMarketplaceId;

    if(!marketplaceId) {
      return {};
    }

    const savedData = this.GetSessionStorageJSON(`marketplace-login-${marketplaceHash}`, true);

    if(savedData) {
      return savedData;
    }

    let metadata = (
      yield (yield Client()).ContentObjectMetadata({
        versionHash: yield this.walletClient.LatestMarketplaceHash({marketplaceParams: {marketplaceId, marketplaceHash}}),
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
      branding: metadata?.branding || {},
      darkMode: metadata?.branding?.color_scheme === "Dark",
      marketplaceId,
      marketplaceHash,
      tenant_id: metadata.tenant_id,
      terms: metadata.terms
    };

    if(metadata?.branding?.color_scheme === "Custom") {
      metadata.sign_up_button = undefined;
      metadata.log_in_button = undefined;
    }

    this.SetSessionStorage(`marketplace-login-${marketplaceHash}`, Utils.B64(JSON.stringify(metadata)));

    return metadata;
  });

  SendEvent({event, data}) {
    SendEvent({event, data});
  }

  PublicLink({versionHash, path, queryParams={}}) {
    const url = new URL(this.basePublicUrl);
    url.pathname = UrlJoin("q", versionHash, "meta", path);

    Object.keys(queryParams).map(key => url.searchParams.append(key, queryParams[key]));

    return url.toString();
  }

  async ValidateUserName(userName) {
    const symbolFilter = new RegExp(/^[A-Za-zÀ-ÖØ-öø-ÿ0-9_]+$/);
    const profanityFilter = new ProfanityFilter();
    const invalidUsernames = ["me"];

    let errorMessage;
    if(userName.length < 3 || userName.length > 30) {
      errorMessage = "Username must be between 3 and 30 characters";
    } else if(!symbolFilter.test(userName)) {
      errorMessage = "Username must consist of alphanumeric characters, numbers, and underscores";
    } else if(
      invalidUsernames.includes(userName.toLowerCase()) ||
      userName.toLowerCase().startsWith("0x") ||
      profanityFilter.isProfane(userName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("_", " "))
    ) {
      errorMessage = "Invalid username";
    } else {
      const address = await rootStore.walletClient.UserNameToAddress({userName});

      if(address && !Utils.EqualAddress(address, rootStore.CurrentAddress())) {
        errorMessage = "Username has already been taken";
      }
    }

    return errorMessage;
  }

  ValidProfileImageUrl(imageUrl) {
    try {
      const url = new URL(imageUrl);

      return url.hostname.endsWith("contentfabric.io");
    } catch(error) {
      return false;
    }
  }

  ProfileImageUrl(imageUrl, width) {
    if(!imageUrl || !this.ValidProfileImageUrl(imageUrl)) { return; }

    try {
      imageUrl = new URL(imageUrl);
      imageUrl.searchParams.set("width", width);

      return imageUrl.toString();
    // eslint-disable-next-line no-empty
    } catch(error) {}
  }

  UserProfile = flow(function * ({userId, force=false}) {
    let userAddress = userId.toLowerCase().startsWith("0x") ? userId : undefined;
    let userName = !userId.toLowerCase().startsWith("0x") ? userId : undefined;

    if(userName === "me") {
      userAddress = this.CurrentAddress();
      userName = undefined;
    }

    if(userAddress) {
      userAddress = Utils.FormatAddress(userAddress);
    } else if(!userName) {
      return;
    }

    if(force || !this.userProfiles[userId]) {
      const profile = yield this.walletClient.Profile({userAddress, userName});

      if(!profile) {
        return;
      }

      if(profile.imageUrl && !this.ValidProfileImageUrl(profile.imageUrl)) {
        delete profile.imageUrl;
      }

      this.userProfiles[profile.userAddress] = profile;
      this.userProfiles[profile.userName] = profile;

      if(Utils.EqualAddress(profile.userAddress, this.CurrentAddress())) {
        this.userProfiles.me = profile;
      }
    }

    return this.userProfiles[userId];
  });

  UpdateUserProfile = flow(function * ({newUserName, newProfileImageUrl}) {
    const profile = yield this.UserProfile({userId: this.CurrentAddress()});

    // Update username
    if(newUserName) {
      yield this.walletClient.SetProfileMetadata({
        type: "user",
        mode: "public",
        key: "username",
        value: newUserName
      });
    }

    if(newProfileImageUrl) {
      if(!this.ValidProfileImageUrl(newProfileImageUrl)) {
        throw Error("Invalid profile image url: " + newProfileImageUrl);
      }

      yield this.walletClient.SetProfileMetadata({
        type: "user",
        mode: "public",
        key: "icon_url",
        value: newProfileImageUrl.toString()
      });
    }

    if(profile.userName) {
      this.userProfiles[profile.userName].newUserName = newUserName;
    }

    // Reload cache
    return yield this.UserProfile({userId: this.CurrentAddress(), force: true});
  });

  // Get already loaded basic NFT contract info
  NFTContractInfo({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    return this.nftInfo[`${contractAddress}-${tokenId}`];
  }

  // Load basic owned NFT contract info
  LoadNFTContractInfo = flow(function * () {
    if(!this.loggedIn || this.fromEmbed) { return; }

    this.nftInfo = yield this.walletClient.UserItemInfo();
  });

  // Get already loaded full NFT data
  NFTData({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    return this.nftData[key];
  }

  // Load full NFT data
  LoadNFTData = flow(function * ({contractAddress, contractId, tokenId, force}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    if(force || !this.nftData[key]) {
      this.nftData[key] = yield this.walletClient.NFT({contractAddress, tokenId});
    }

    return this.nftData[key];
  });

  SetCustomCSS(css="") {
    css = SanitizeHTML(css);
    const cssTag = document.getElementById("_custom-css");
    if(cssTag) {
      if(testTheme) {
        testTheme.then(theme => {
          cssTag.innerHTML = theme.default;
        });
      } else {
        cssTag.innerHTML = css;
      }
    }

    this.SetSessionStorage("custom-css", Utils.B64(css));
  }

  SetCustomizationOptions(marketplace) {
    if(marketplace !== "default" && this.currentCustomization === (marketplace && marketplace.marketplaceId)) {
      return;
    }

    this.currentCustomization = marketplace && marketplace.marketplaceId;

    const desktopBackground = marketplace?.branding?.background?.url || "";
    const mobileBackground = marketplace?.branding?.background_mobile?.url || "";

    this.SetSessionStorage("background-image", desktopBackground);
    this.SetSessionStorage("background-image-mobile", mobileBackground);

    this.appBackground = {
      desktop: desktopBackground,
      mobile: mobileBackground
    };

    let options = { font: "Hevetica Neue" };
    if(marketplace && marketplace !== "default") {
      options = {
        ...options,
        ...(marketplace.branding || {})
      };
    }

    if(marketplace && this.specifiedMarketplaceId === marketplace.marketplaceId && marketplace.branding && marketplace.branding.hide_global_navigation) {
      this.hideGlobalNavigation = true;
    }

    if(this.hideGlobalNavigationInMarketplace) {
      this.SetSessionStorage("hide-global-navigation-in-marketplace", "true");
    }

    this.centerContent = marketplace?.branding?.text_justification === "Center";
    this.centerItems = marketplace?.branding?.item_text_justification === "Center";

    switch(options.color_scheme) {
      case "Dark":
        this.ToggleDarkMode(true);
        break;

      default:
        this.ToggleDarkMode(false);
        break;
    }

    if(options.color_scheme === "Custom") {
      this.walletClient.MarketplaceCSS({marketplaceParams: {marketplaceId: marketplace.marketplaceId}})
        .then(css => this.SetCustomCSS(css));
    } else {
      this.SetCustomCSS("");
    }
  }

  ClearMarketplace() {
    this.tenantSlug = undefined;
    this.marketplaceSlug = undefined;
    this.marketplaceId = undefined;

    this.SetCustomizationOptions("default");
  }

  SetMarketplace({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash, specified=false}) {
    const marketplace = this.allMarketplaces.find(marketplace =>
      (marketplaceId && Utils.EqualHash(marketplaceId, marketplace.marketplaceId)) ||
      (marketplaceSlug && marketplace.tenantSlug === tenantSlug && marketplace.marketplaceSlug === marketplaceSlug) ||
      (marketplaceHash && marketplace.marketplaceHash === marketplaceHash)
    );

    if(marketplace) {
      this.tenantSlug = marketplace.tenantSlug;
      this.marketplaceSlug = marketplace.marketplaceSlug;
      this.marketplaceId = marketplace.marketplaceId;

      if(specified) {
        this.specifiedMarketplaceId = marketplace.marketplaceId;
        this.specifiedMarketplaceHash = marketplace.marketplaceHash;
        this.SetSessionStorage("marketplace", marketplace.marketplaceId);
      }

      this.SetCustomizationOptions(marketplace);

      return marketplace.marketplaceHash;
    } else if(Object.keys(this.walletClient.availableMarketplaces) > 0) {
      // Don't reset customization if marketplaces haven't yet loaded
      this.SetCustomizationOptions("default");
    }
  }

  LoadEvent = flow(function * ({tenantSlug, eventSlug, eventId, eventHash}) {
    if(eventSlug) {
      if(!tenantSlug) { throw Error("Load Event: Missing required tenant slug"); }

      const mainSiteId = rootStore.walletClient.mainSiteId;
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

  LoadMarketplace = flow(function * (marketplaceId) {
    this.marketplaces[marketplaceId] = yield this.walletClient.Marketplace({marketplaceParams: {marketplaceId}});

    yield this.checkoutStore.MarketplaceStock({tenantId: this.marketplaces[marketplaceId].tenant_id});

    return this.marketplaces[marketplaceId];
  });

  MarketplaceOwnedItems = flow(function * ({marketplace, userAddress}) {
    if(!this.loggedIn) { return {}; }

    try {
      if(!userAddress) {
        userAddress = this.CurrentAddress();
      }

      userAddress = Utils.FormatAddress(userAddress);

      if(Date.now() - (this.marketplaceOwnedCache[userAddress]?.[marketplace.tenant_id]?.retrievedAt || 0) > 60000) {
        delete this.marketplaceOwnedCache[userAddress]?.[marketplace.tenant_id];
      }

      if(!this.marketplaceOwnedCache[userAddress]?.[marketplace.tenant_id]) {
        let promise = new Promise(async resolve => {
          let ownedItems = {};

          const listings = await this.walletClient.UserListings({userAddress, marketplaceParams: { marketplaceId: marketplace.marketplaceId }});

          (await this.walletClient.UserItems({
            userAddress,
            marketplaceParams: { marketplaceId: marketplace.marketplaceId },
            sortBy: "default",
            limit: 10000
          }))
            .results
            .map(nft => {
              const item = marketplace.items.find(item =>
                item?.nft_template?.nft?.address && Utils.EqualAddress(item.nft_template.nft.address, nft.details.ContractAddr)
              );

              if(!item) {
                return;
              }

              const listing = listings.find(listing =>
                listing.details.TokenIdStr === nft.details.TokenIdStr &&
                Utils.EqualAddress(nft.details.ContractAddr, listing.details.ContractAddr)
              );

              if(listing) {
                nft.details = { ...listing.details, ...nft.details };
              }

              if(!ownedItems[item.sku]) {
                ownedItems[item.sku] = [];
              }

              ownedItems[item.sku].push({
                nft,
                item
              });
            });

          resolve(ownedItems);
        });

        if(!this.marketplaceOwnedCache[userAddress]) {
          this.marketplaceOwnedCache[userAddress] = {};
        }

        this.marketplaceOwnedCache[userAddress][marketplace.tenant_id] = {
          retrievedAt: Date.now(),
          ownedItemsPromise: promise
        };
      }

      return yield this.marketplaceOwnedCache[userAddress][marketplace.tenant_id].ownedItemsPromise;
    } catch(error) {
      this.Log(error, true);
      return {};
    }
  });

  MarketplaceCollectionItems = flow(function * ({marketplace, collection, userAddress}) {
    const ownedItems = yield this.MarketplaceOwnedItems({marketplace, userAddress});
    const purchaseableItems = this.MarketplacePurchaseableItems(marketplace);

    return collection.items.map((sku, entryIndex) => {
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      return {
        sku,
        entryIndex,
        item,
        ownedItems: ownedItems[sku] || [],
        purchaseableItem: purchaseableItems[sku]
      };
    })
      .sort((a, b) =>
        a.ownedItems.length > 0 ? -1 :
          b.ownedItems.length > 0 ? 1 :
            a.purchaseableItem ? -1 :
              b.purchaseableItem ? 1 : 0
      );
  });

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

  GenerateOfferCodeData = flow(function * ({nftInfo, offer}) {
    const key = `offer-code-data-${nftInfo.nft.details.ContractAddr}-${nftInfo.nft.details.TokenIdStr}-${offer.offer_id}`;

    let offerCodeData = yield this.walletClient.ProfileMetadata({
      type: "app",
      mode: "private",
      appId: this.appId,
      key
    });

    if(offerCodeData) {
      try {
        offerCodeData = JSON.parse(offerCodeData);
      } catch(error) {
        this.Log(error, true);
      }
    }

    if(!offerCodeData) {
      offerCodeData = {
        adr: this.walletClient.UserAddress(),
        tx: offer.state.transaction,
        ts: Date.now()
      };

      offerCodeData.sig = yield this.walletClient.PersonalSign({message: JSON.stringify(offerCodeData)});
    }

    try {
      yield this.walletClient.SetProfileMetadata({
        type: "app",
        mode: "private",
        appId: this.appId,
        key,
        value: JSON.stringify(offerCodeData)
      });
    } catch(error) {
      this.Log(error, true);
    }

    return offerCodeData;
  });

  // Actions
  SetMarketplaceFilters(filters) {
    this.marketplaceFilters = (filters || []).map(filter => filter.trim()).filter(filter => filter);
  }

  BurnNFT = flow(function * ({nft}) {
    yield this.client.CallContractMethodAndWait({
      contractAddress: nft.details.ContractAddr,
      abi: NFTContractABI,
      methodName: "burn",
      methodArgs: [nft.details.TokenIdStr]
    });
  });

  ListingPurchaseStatus = flow(function * ({listingId, confirmationId}) {
    return yield this.walletClient.ListingPurchaseStatus({listingId, confirmationId});
  });

  PurchaseStatus = flow(function * ({marketplaceId, confirmationId}) {
    return yield this.walletClient.PurchaseStatus({marketplaceParams: { marketplaceId }, confirmationId});
  });

  ClaimStatus = flow(function * ({marketplaceId, sku}) {
    return yield this.walletClient.ClaimStatus({marketplaceParams: { marketplaceId }, sku});
  });

  PackOpenStatus = flow(function * ({contractId, contractAddress, tokenId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    return yield this.walletClient.PackOpenStatus({contractId, contractAddress, tokenId});
  });

  CollectionRedemptionStatus = flow(function * ({marketplaceId, confirmationId}) {
    return yield this.walletClient.CollectionRedemptionStatus({marketplaceParams: { marketplaceId }, confirmationId});
  });

  LoadDrop = flow(function * ({tenantSlug, eventSlug, dropId}) {
    return yield this.walletClient.LoadDrop({tenantSlug, eventSlug, dropId});
  });

  DropStatus = flow(function * ({marketplace, eventId, dropId}) {
    return yield this.walletClient.DropStatus({marketplaceParams: {marketplaceId: marketplace.id}, eventId, dropId});
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
        Authorization: `Bearer ${this.authToken}`
      }
    });
  });

  GetWalletBalance = flow(function * (checkOnboard=false) {
    if(!this.loggedIn) { return; }

    const balances = yield this.walletClient.UserWalletBalance(checkOnboard);

    this.userStripeId = balances.userStripeId;
    this.userStripeEnabled = balances.userStripeEnabled;
    this.totalWalletBalance = balances.totalWalletBalance;
    this.availableWalletBalance = balances.availableWalletBalance;
    this.pendingWalletBalance = balances.pendingWalletBalance;
    this.withdrawableWalletBalance = balances.withdrawableWalletBalance;
    this.usdcBalance = balances.phantomUSDCBalance;

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
          mode: EluvioConfiguration["purchase-mode"],
        },
        headers: {
          Authorization: `Bearer ${this.authToken}`
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
      includeAuth: true,
      parameters: {
        countryCode
      },
      OnCancel: () => this.GetWalletBalance()
    });
  });

  StripeLogin = flow (function * () {
    yield this.Flow({
      type: "flow",
      flow: "stripe-login",
      includeAuth: true,
      noResponse: true,
      OnCancel: () => this.GetWalletBalance()
    });
  });

  MediaViewKey({contractAddress, tokenId, mediaId}) {
    contractAddress = Utils.FormatAddress(contractAddress);
    return `nft-media-viewed-${contractAddress}-${tokenId || "preview"}-${mediaId}`;
  }

  MediaViewed({nft, contractAddress, tokenId, mediaId}) {
    if(nft) {
      contractAddress = nft.details.ContractAddr || contractAddress;
      tokenId = nft.details.TokenIdStr || tokenId;
    }

    return this.viewedMedia[this.MediaViewKey({contractAddress, tokenId, mediaId})];
  }

  CheckViewedMedia = flow(function * ({nft, contractAddress, tokenId, mediaIds}) {
    if(nft) {
      contractAddress = nft.details.ContractAddr || contractAddress;
      tokenId = nft.details.TokenIdStr || tokenId;
    }

    let viewedMedia = { ...this.viewedMedia };

    yield Promise.all(
      mediaIds.map(async mediaId => {
        const key = this.MediaViewKey({contractAddress, tokenId, mediaId});
        if(this.viewedMedia[key]) { return; }

        const viewed = await rootStore.walletClient.ProfileMetadata({
          type: "app",
          mode: "private",
          appId: rootStore.appId,
          key
        });

        if(viewed) {
          viewedMedia[key] = true;
        }
      })
    );

    this.viewedMedia = viewedMedia;
  });

  SetMediaViewed = flow(function * ({nft, contractAddress, tokenId, mediaId}) {
    if(nft) {
      contractAddress = nft.details.ContractAddr || contractAddress;
      tokenId = nft.details.TokenIdStr || tokenId;
    }

    const key = this.MediaViewKey({contractAddress, tokenId, mediaId});
    if(!this.viewedMedia[key] && tokenId) {
      yield rootStore.walletClient.SetProfileMetadata({
        type: "app",
        mode: "private",
        appId: rootStore.appId,
        key,
        value: true
      });
    }

    this.viewedMedia[key] = true;
  });

  SignOut(returnUrl) {
    this.ClearAuthInfo();

    if(this.embedded) {
      this.SetLocalStorage("signed-out", "true");
    }

    this.SendEvent({event: EVENTS.LOG_OUT, data: {address: this.CurrentAddress()}});

    if(window.auth0) {
      try {
        this.disableCloseEvent = true;
        window.auth0.logout({
          returnTo: returnUrl || this.ReloadURL()
        });

        return;
      } catch(error) {
        this.Log("Failed to log out of Auth0:");
        this.Log(error, true);
      }
    }

    this.Reload();
  }

  ReloadURL() {
    const url = new URL(UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, ""));

    if(this.appUUID) {
      url.searchParams.set("appUUID", this.appUUID);
    }

    if(this.marketplaceId) {
      url.hash = UrlJoin("/marketplace", this.marketplaceId, "store");
    }

    if(this.specifiedMarketplaceId) {
      url.searchParams.set("mid", this.specifiedMarketplaceHash);
    }

    if(this.darkMode) {
      url.searchParams.set("dk", "");
    }

    if(this.loginOnly) {
      url.searchParams.set("lo", "");
    }

    if(this.capturedLogin) {
      url.searchParams.set("cl", "");
    }

    return url.toString();
  }

  Reload() {
    this.disableCloseEvent = true;
    window.location.href = this.ReloadURL();
    window.location.reload();
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

    url.searchParams.set("origin", window.location.origin);

    if(darkMode) {
      url.searchParams.set("dk", "");
    }

    return url.toString();
  }

  // Flows are popups that do not require UI input (redirecting to purchase, etc)
  // Actions are popups that present UI (signing, accepting permissions, etc.)
  Flow = flow(function * ({popup, type="flow", flow, parameters={}, includeAuth=false, darkMode=false, noResponse, OnComplete, OnCancel}) {
    try {
      if(!popup) {
        popup = window.open("about:blank");
      }

      if(!popup) {
        throw {message: "Popup Blocked", error: "popup_blocked"};
      }

      const flowId = Utils.B64(UUID());

      parameters.flowId = flowId;

      if(includeAuth || (!this.storageSupported && this.AuthInfo())) {
        parameters.auth = this.AuthInfo().clientAuthToken;
      }

      popup.location.href = this.FlowURL({type, flow, parameters, darkMode});

      if(noResponse) { return; }

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

          setTimeout(() => popup.close(), 1000);

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

        case "open-metamask":
          window.location.href = `https://metamask.app.link/dapp/${parameters.appUrl.toString().replace("https://", "")}`;

          setTimeout(() => window.close(), 1000);

          break;

        case "stripe-onboard":
          const onboardResponse = yield Utils.ResponseToJson(
            this.client.authClient.MakeAuthServiceRequest({
              path: UrlJoin("as", "wlt", "onb", "stripe"),
              method: "POST",
              body: {
                country: parameters.countryCode,
                mode: EluvioConfiguration["purchase-mode"],
                return_url: this.FlowURL({type: "flow", flow: "respond", parameters: { flowId: parameters.flowId, success: true }}),
                refresh_url: window.location.href
              },
              headers: {
                Authorization: `Bearer ${this.authToken}`
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
                mode: EluvioConfiguration["purchase-mode"],
              },
              headers: {
                Authorization: `Bearer ${this.authToken}`
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

  AuthStorageKey() {
    let key = `auth-${this.network}`;

    // TODO: Enable auth storage scoping later
    if(this.authOrigin && false) {
      try {
        key = `${key}-${(new URL(this.authOrigin)).hostname}`;
      // eslint-disable-next-line no-empty
      } catch(error) {}
    }

    return key;
  }

  AuthInfo() {
    try {
      if(this.authInfo) {
        return this.authInfo;
      }

      const tokenInfo = this.GetLocalStorage(this.AuthStorageKey());

      if(tokenInfo) {
        let { clientAuthToken, clientSigningToken, expiresAt } = JSON.parse(Utils.FromB64(tokenInfo));

        // Expire tokens early so they don't stop working while in use
        const expirationBuffer = 4 * 60 * 60 * 1000;

        if(expiresAt - Date.now() < expirationBuffer) {
          this.ClearAuthInfo();
          this.Log("Authorization expired");
        } else {
          return { clientAuthToken, clientSigningToken, expiresAt };
        }
      }
    } catch(error) {
      this.Log("Failed to retrieve auth info", true);
      this.Log(error, true);
      this.RemoveLocalStorage(this.AuthStorageKey());
    }
  }

  ClearAuthInfo() {
    this.RemoveLocalStorage(this.AuthStorageKey());

    this.walletClient?.LogOut();

    this.authInfo = undefined;
  }

  SetAuthInfo({clientAuthToken, clientSigningToken, save=true}) {
    const { expiresAt } = JSON.parse(Utils.FromB58(clientAuthToken));

    const authInfo = {
      clientSigningToken,
      clientAuthToken,
      expiresAt
    };

    if(save) {
      this.SetLocalStorage(
        this.AuthStorageKey(),
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
      if(this.loggedIn) { return; }

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
      this.RemoveSessionStorage("dark-mode");
      themeContainer.innerHTML = "";
      themeContainer.dataset.theme = "default";
      return;
    } else if(themeContainer.dataset.theme !== "dark") {
      this.SetSessionStorage("dark-mode", "true");
      import("Assets/stylesheets/themes/dark.theme.css")
        .then(theme => {
          themeContainer.innerHTML = theme.default;
        });

      themeContainer.dataset.theme = "dark";
    }

    this.darkMode = enabled;
  }

  ToggleNavigation(enabled) {
    this.hideNavigation = !enabled;
  }

  ToggleMarketplaceNavigation(enabled) {
    this.hideMarketplaceNavigation = !enabled;
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

  SetAccountEmail(address, email) {
    address = Utils.FormatAddress(address);
    this.SetLocalStorage(`email-${address}`, email);
  }

  AccountEmail(address) {
    address = Utils.FormatAddress(address);
    return this.GetLocalStorage(`email-${address}`);
  }

  ParseMarketplaceParameter(marketplace) {
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

    return {
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash
    };
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
        return JSON.parse(Utils.FromB64(this.GetLocalStorage(key)));
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
        return JSON.parse(Utils.FromB64(this.GetSessionStorage(key)));
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

  HandleResize({width, height}) {
    clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      runInAction(() => {
        this.pageWidth = width;
        this.pageHeight = height;
      });

      const bodyScrollVisible = document.body.getBoundingClientRect().height > window.innerHeight;
      if(this.embedded && bodyScrollVisible) {
        this.SendEvent({
          event: EVENTS.RESIZE,
          data: {
            width,
            height: height + 200
          }
        });
      }
    }, 250);
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

