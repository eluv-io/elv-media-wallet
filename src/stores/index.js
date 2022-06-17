const testTheme = undefined;//import("../static/stylesheets/themes/maskverse-test.theme.css");

import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";
import {ElvMarketplaceClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";
import SanitizeHTML from "sanitize-html";

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
  salePendingDurationDays = 0;

  appUUID = window.appUUID;

  DEBUG_ERROR_MESSAGE = "";

  network = EluvioConfiguration["config-url"].includes("main.net955305") ? "main" : "demo";

  embedded = window.top !== window.self || searchParams.has("e");
  inFlow = (window.location.hash.startsWith("#/flow/") || window.location.hash.startsWith("#/action/")) && !window.location.hash.includes("redirect");

  storageSupported = storageSupported;

  // Opened by embedded window for purchase redirect
  fromEmbed = searchParams.has("embed") ||
    this.GetSessionStorage("fromEmbed");

  trustedOrigins = this.GetLocalStorageJSON("trusted-origins") || {};

  pageWidth = window.innerWidth;
  activeModals = 0;

  authInfo = undefined;

  loginOnly = window.loginOnly;
  requireLogin = searchParams.has("rl");
  capturedLogin = this.embedded && searchParams.has("cl");
  showLogin = this.requireLogin || searchParams.has("sl");

  loggedIn = false;
  externalWalletUser = false;
  disableCloseEvent = false;
  darkMode = searchParams.has("dk") || this.GetSessionStorage("dark-mode");

  availableMarketplaces = {};

  marketplaceId = undefined;
  marketplaceHashes = {};
  tenantSlug = undefined;
  marketplaceSlug = undefined;

  drops = {};

  auth0AccessToken = undefined;

  loaded = false;
  loginLoaded = false;
  authenticating = false;
  client = undefined;
  marketplaceClient = undefined;
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

  appBackground = { desktop: this.GetSessionStorage("background-image"), mobile: this.GetSessionStorage("background-image") };
  centerContent = false;
  centerItems = false;

  authToken = undefined;
  staticToken = undefined;
  basePublicUrl = undefined;

  userProfile = {};
  userAddress;

  lastProfileQuery = 0;

  nftInfo = {};
  nftData = {};

  marketplaces = {};
  marketplaceCache = {};
  marketplaceOwnedCache = {};

  marketplaceFilters = [];

  EVENTS = EVENTS;

  navigationBreadcrumbs = [];

  noItemsAvailable = false;

  get specifiedMarketplace() {
    return this.marketplaces[this.specifiedMarketplaceId];
  }

  get marketplaceHash() {
    return this.marketplaceClient.marketplaceHashes[this.marketplaceId];
  }

  get allMarketplaces() {
    let marketplaces = Object.values(this.marketplaceClient.availableMarketplacesById);

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

      this.marketplaceClient = yield ElvMarketplaceClient.Initialize({
        network: EluvioConfiguration.network,
        mode: EluvioConfiguration.mode
      });

      this.client = this.marketplaceClient.client;

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

      const marketplace = decodeURIComponent(searchParams.get("mid") || this.GetSessionStorage("marketplace") || "");

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
        this.SetMarketplace({
          tenantSlug,
          marketplaceSlug,
          marketplaceHash,
          marketplaceId,
          specified: true
        });
      }

      if(authenticationPromise) {
        yield authenticationPromise;
      }

      this.SendEvent({event: EVENTS.LOADED});
    } finally {
      this.loaded = true;
    }
  });

  CurrentAddress() {
    if(!this.authToken) { return; }

    return Utils.DecodeSignedToken(this.authToken).payload.adr;
  }

  Authenticate = flow(function * ({idToken, clientAuthToken, externalWallet, walletName, tenantId, user, saveAuthInfo=true}) {
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

        clientAuthToken = yield this.marketplaceClient.AuthenticateExternalWallet({
          address: yield walletMethods.RetrieveAddress(),
          Sign: walletMethods.Sign,
          walletName: walletMethods.name
        });
      } else if(idToken) {
        clientAuthToken = yield this.marketplaceClient.AuthenticateOAuth({
          idToken,
          tenantId,
          shareEmail: user?.userData.share_email
        });
      } else if(clientAuthToken) {
        yield this.marketplaceClient.Authenticate({token: clientAuthToken});
      } else if(!clientAuthToken) {
        throw Error("Invalid parameters provided to Authenticate");
      }

      this.SetAuthInfo({
        clientAuthToken,
        save: saveAuthInfo
      });

      const { address, fabricToken } = this.AuthInfo();

      this.authToken = fabricToken;

      this.client = this.marketplaceClient.client;

      this.GetWalletBalance();

      this.funds = parseInt((yield this.client.GetBalance({address}) || 0));
      this.userAddress = this.CurrentAddress();
      this.accountId = `iusr${Utils.AddressToHash(address)}`;

      this.basePublicUrl = yield this.client.FabricUrl({
        queryParams: {
          authorization: this.authToken
        },
        noAuth: true
      });

      this.userProfile = {
        address,
        name: user?.name || address,
        email: user?.email || this.AccountEmail(address),
      };

      // Reload marketplaces so they will be reloaded and authorization rechecked
      this.marketplaceCache = {};
      yield Promise.all(Object.keys(this.marketplaces).map(async marketplaceId => await this.LoadMarketplace(marketplaceId)));

      this.HideLogin();

      yield this.cryptoStore.LoadConnectedAccounts();

      this.loggedIn = true;
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

  async LoadLoginCustomization() {
    while(!this.loaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if(!this.specifiedMarketplaceId) {
      return {};
    }

    const marketplaceHash =
      this.marketplaceClient.marketplaceHashes[this.specifiedMarketplaceId] ||
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

  // Get already loaded basic NFT contract info
  NFTInfo({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    return this.nftInfo[`${contractAddress}-${tokenId}`];
  }

  // Load basic owned NFT contract info
  LoadNFTInfo = flow(function * () {
    if(!this.loggedIn || this.fromEmbed) { return; }

    this.nftInfo = yield this.marketplaceClient.OwnedItemInfo();
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
  LoadNFTData = flow(function * ({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    if(!this.nftData[key]) {
      this.nftData[key] = yield this.marketplaceClient.NFT({contractAddress, tokenId});
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

    this.SetSessionStorage("custom-css", btoa(css));
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
      this.marketplaceClient.MarketplaceCSS({marketplaceParams: {marketplaceId: marketplace.marketplaceId}})
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
        this.SetSessionStorage("marketplace", marketplace.marketplaceId);
      }

      this.SetCustomizationOptions(marketplace);

      return marketplace.marketplaceHash;
    } else if(Object.keys(this.marketplaceClient.availableMarketplaces) > 0) {
      // Don't reset customization if marketplaces haven't yet loaded
      this.SetCustomizationOptions("default");
    }
  }

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

  LoadMarketplace = flow(function * (marketplaceId) {
    this.marketplaces[marketplaceId] = yield this.marketplaceClient.Marketplace({marketplaceParams: {marketplaceId}});

    yield this.checkoutStore.MarketplaceStock({tenantId: this.marketplaces[marketplaceId].tenant_id});

    return this.marketplaces[marketplaceId];
  });

  MarketplaceOwnedItems = flow(function * (marketplace) {
    try {
      if(!this.loggedIn) {
        return {};
      }

      if(Date.now() - (this.marketplaceOwnedCache[marketplace.tenant_id]?.retrievedAt || 0) > 60000) {
        delete this.marketplaceOwnedCache[marketplace.tenant_id];
      }

      if(!this.marketplaceOwnedCache[marketplace.tenant_id]) {
        let promise = new Promise(async resolve => {
          let ownedItems = {};

          const listings = await this.marketplaceClient.UserListings({marketplaceParams: { marketplaceId: marketplace.marketplaceId }});

          (await this.marketplaceClient.UserItems({
            marketplaceParams: { marketplaceId: marketplace.marketplaceId },
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

        this.marketplaceOwnedCache[marketplace.tenant_id] = {
          retrievedAt: Date.now(),
          ownedItemsPromise: promise
        };
      }

      return yield this.marketplaceOwnedCache[marketplace.tenant_id].ownedItemsPromise;
    } catch(error) {
      this.Log(error, true);
      return {};
    }
  });

  MarketplaceCollectionItems = flow(function * ({marketplace, collection}) {
    const ownedItems = yield this.MarketplaceOwnedItems(marketplace);
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
    return yield this.marketplaceClient.ListingPurchaseStatus({listingId, confirmationId});
  });

  PurchaseStatus = flow(function * ({marketplaceId, confirmationId}) {
    return yield this.marketplaceClient.PurchaseStatus({marketplaceParams: { marketplaceId }, confirmationId});
  });

  ClaimStatus = flow(function * ({marketplaceId, sku}) {
    return yield this.marketplaceClient.ClaimStatus({marketplaceParams: { marketplaceId }, sku});
  });

  PackOpenStatus = flow(function * ({contractId, contractAddress, tokenId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    return yield this.marketplaceClient.PackOpenStatus({contractId, contractAddress, tokenId});
  });

  CollectionRedemptionStatus = flow(function * ({marketplaceId, confirmationId}) {
    return yield this.marketplaceClient.CollectionRedemptionStatus({marketplaceParams: { marketplaceId }, confirmationId});
  });

  LoadDrop = flow(function * ({tenantSlug, eventSlug, dropId}) {
    return yield this.marketplaceClient.LoadDrop({tenantSlug, eventSlug, dropId});
  });

  DropStatus = flow(function * ({marketplace, eventId, dropId}) {
    return yield this.marketplaceClient.DropStatus({marketplaceParams: {marketplaceId: marketplace.id}, eventId, dropId});
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

    const balances = yield this.marketplaceClient.UserWalletBalance(checkOnboard);

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

  SignOut(returnUrl) {
    this.ClearAuthInfo();

    if(this.embedded) {
      this.SetLocalStorage("signed-out", "true");
    }

    this.disableCloseEvent = true;
    if(window.auth0) {
      try {
        this.disableCloseEvent = true;
        this.SendEvent({event: EVENTS.LOG_OUT, data: {address: this.CurrentAddress()}});
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
      url.searchParams.set("mid", this.marketplaceHash || this.marketplaceId);
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

      const flowId = btoa(UUID());

      parameters.flowId = flowId;

      if(includeAuth || (!this.storageSupported && this.AuthInfo())) {
        parameters.auth = this.AuthInfo();
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

          setTimeout(() => popup.close(), 500);

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

  AuthInfo() {
    try {
      if(this.authInfo) {
        return this.authInfo;
      }

      const tokenInfo = this.GetLocalStorage(`auth-${this.network}`);

      if(tokenInfo) {
        let { clientAuthToken, fabricToken, authToken, address, user, walletType, walletName, expiresAt } = JSON.parse(Utils.FromB64(tokenInfo));

        // Expire tokens early so they don't stop working while in use
        const expirationBuffer = 4 * 60 * 60 * 1000;

        expiresAt = expiresAt || (authToken && JSON.parse(atob(authToken)).exp);
        if(expiresAt - Date.now() < expirationBuffer) {
          this.ClearAuthInfo();
          this.Log("Authorization expired");
        } else {
          return { clientAuthToken, fabricToken, authToken, address, user, walletType, walletName, expiresAt };
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

  SetAuthInfo({clientAuthToken, save=true}) {
    const { fabricToken, email, address, walletName, walletType, expiresAt } = JSON.parse(Utils.FromB58(clientAuthToken));

    const authInfo = {
      clientAuthToken,
      fabricToken,
      address,
      expiresAt,
      walletName,
      walletType,
      user: {
        name: email || address,
        email,
        address
      }
    };

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

