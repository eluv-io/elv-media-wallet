import {SearchParams} from "../utils/Utils";

let testTheme = undefined;
//testTheme = import("../static/stylesheets/themes/maskverse-test.theme.css");
//testTheme = import("../static/stylesheets/themes/wwe-test.theme.css");
//testTheme = import("../static/stylesheets/themes/lotr-test.theme.css");
//testTheme = import("../static/stylesheets/themes/superman-test.theme.css");
//testTheme = import("../static/stylesheets/themes/uefa-test.theme.scss");

window.sessionStorageAvailable = false;
try {
  sessionStorage.getItem("test");
  window.sessionStorageAvailable = true;
// eslint-disable-next-line no-empty
} catch(error) {}

import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";
import {ElvClient, ElvWalletClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";
import SanitizeHTML from "sanitize-html";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

import CheckoutStore from "Stores/Checkout";
import TransferStore from "Stores/Transfer";
import CryptoStore from "Stores/Crypto";
import NotificationStore from "Stores/Notification";
import MediaPropertyStore from "Stores/MediaProperty";

import NFTContractABI from "../static/abi/NFTContract";
import {v4 as UUID, parse as ParseUUID} from "uuid";
import ProfanityFilter from "bad-words";

import LocalizationEN from "Assets/localizations/en.yml";
import {MediaPropertyBasePath} from "../utils/MediaPropertyUtils";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "never"
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


if(["ris.euro2024.com", "ris-uefa.mw.app"].includes(location.hostname)) {
  sessionStorage.setItem("marketplace", "iq__2Utm3HfQ2dVWquyGPWvrPXtgpy8v");

  if(location.hostname === "ris.euro2024.com") {
    EluvioConfiguration.ory_configuration = {
      "url": "https://auth.euro2024.com",
      "jwt_template": "jwt_uefa_template1"
    };
  } else {
    EluvioConfiguration.ory_configuration = {
      "url": "https://auth.mw.app",
      "jwt_template": "jwt_uefa_template1"
    };
  }
}


class RootStore {
  preferredLocale = Intl.DateTimeFormat()?.resolvedOptions?.()?.locale || navigator.language;
  language = this.GetLocalStorage("lang");
  l10n = LocalizationEN;
  uiLocalizations = ["pt-br"];
  alertNotification = this.GetSessionStorage("alert-notification");
  domainProperty = this.GetSessionStorage("domain-property") || searchParams.get("pid");

  appId = "eluvio-media-wallet";

  auth0 = undefined;
  oryClient = undefined;

  authOrigin = this.GetSessionStorage("auth-origin");

  salePendingDurationDays = 0;

  appUUID = window.appUUID;

  DEBUG_ERROR_MESSAGE = "";

  network = EluvioConfiguration.network;

  embedded = window.top !== window.self || searchParams.has("e");
  inFlow = (window.location.pathname.startsWith("#/flow/") || window.location.pathname.startsWith("#/action/")) && !window.location.pathname.includes("redirect");

  storageSupported = storageSupported;

  // Opened by embedded window for purchase redirect
  fromEmbed = searchParams.has("embed") ||
    this.GetSessionStorage("fromEmbed");

  trustedOrigins = this.GetLocalStorageJSON("trusted-origins") || {};

  pageWidth = window.innerWidth;
  pageHeight = window.innerHeight;
  originalViewportHeight = window.innerHeight;
  fullscreenImageWidth = window.innerWidth > 3000 ? 3840 : window.innerWidth > 2000 ? 2560 : 1920;

  activeModals = 0;

  authInfo = undefined;
  authNonce;
  useLocalAuth;

  loginOnly = window.loginOnly;
  requireLogin = searchParams.has("rl");
  loginBackPath;
  capturedLogin = this.embedded && searchParams.has("cl");
  showLogin = this.requireLogin || searchParams.get("action") === "login" || searchParams.get("action") === "loginCallback";

  loggedIn = false;
  externalWalletUser = false;
  disableCloseEvent = false;
  darkMode = !searchParams.has("lt");

  loginCustomization = {};

  marketplaceId = undefined;
  marketplaceHashes = {};
  tenantSlug = undefined;
  marketplaceSlug = undefined;

  auth0AccessToken = undefined;

  loaded = false;
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
  lockedWalletBalance = undefined;
  usdcDisabled = false;

  liveAppUrl = searchParams.get("lurl") || this.GetSessionStorage("live-url");

  specifiedMarketplaceId = this.GetSessionStorage("marketplace");
  specifiedMarketplaceHash = undefined;
  previewMarketplaceId = this.GetSessionStorage("preview-marketplace");
  previewMarketplaceHash = undefined;

  hideGlobalNavigation = false;
  hideGlobalNavigationInMarketplace = searchParams.has("hgm") || this.GetSessionStorage("hide-global-navigation-in-marketplace");
  hideNavigation = searchParams.has("hn") || this.loginOnly;
  hideMarketplaceNavigation = false;
  navigationInfo = this.GetSessionStorageJSON("navigation-info") || {};
  navigationBreadcrumbs = [];
  sidePanelMode = false;

  appBackground = this.GetSessionStorageJSON("app-background", true) || {};

  centerContent = false;
  centerItems = false;

  authToken = undefined;
  staticToken = undefined;
  basePublicUrl = undefined;

  route = location.pathname;
  routeParams = {};
  backPath = undefined;

  nftInfo = {};
  nftData = {};
  userProfiles = {};
  userStats = {};
  voteStatus = {};

  viewedMedia = {};

  marketplaces = {};
  marketplaceOwnedCache = {};

  marketplaceFilters = [];

  EVENTS = EVENTS;

  noItemsAvailable = false;

  analyticsInitialized = false;

  headerText;
  routeChange;

  shortURLs = {};

  get specifiedMarketplace() {
    return this.marketplaces[this.specifiedMarketplaceId];
  }

  get marketplaceHash() {
    return this.walletClient.marketplaceHashes[this.marketplaceId];
  }

  get allMarketplaces() {
    if(!this.walletClient) { return []; }

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

  MarketplaceByTenantId({tenantId}) {
    return this.allMarketplaces.find(marketplace => marketplace.tenant_id === tenantId);
  }

  Log(message="", error=false) {
    // eslint-disable-next-line no-console
    const logMethod = error === "warn" ? console.warn : error ? console.error : console.log;

    if(typeof message === "string") {
      message = `Eluvio Media Wallet | ${message}`;
    }

    logMethod(message);
  }

  constructor() {
    makeAutoObservable(this);

    if(searchParams.get("origin")) {
      this.authOrigin = searchParams.get("origin");
      this.SetSessionStorage("auth-origin", searchParams.get("origin"));
    }

    if(!this.preferredLocale.includes("-")) {
      this.preferredLocale = navigator.languages?.find(language => language.startsWith(`${this.preferredLocale}-`)) || this.preferredLocale;
    }

    this.checkoutStore = new CheckoutStore(this);
    this.transferStore = new TransferStore(this);
    this.cryptoStore = new CryptoStore(this);
    this.notificationStore = new NotificationStore(this);
    this.mediaPropertyStore = new MediaPropertyStore(this);

    this.authNonce = this.GetLocalStorage("auth-nonce") || Utils.B58(ParseUUID(UUID()));
    this.SetLocalStorage("auth-nonce", this.authNonce);

    this.useLocalAuth = this.GetSessionStorage("local-auth") || searchParams.has("la");
    if(this.useLocalAuth) {
      this.SetSessionStorage("local-auth", "true");
    }

    if(this.appUUID) {
      this.SetSessionStorage(`app-uuid-${window.loginOnly}`, this.appUUID);
    }

    if(this.liveAppUrl) {
      this.SetSessionStorage("live-url", this.liveAppUrl);
    }

    this.resizeHandler = new ResizeObserver(elements => {
      const {width, height} = elements[0].contentRect;

      this.HandleResize({width, height});
    });

    this.resizeHandler.observe(document.body);

    // Viewport height changes for mobile as URL bar adjusts. Size based on initial height instead of css VH
    const SetVH = () =>
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

    SetVH();

    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Only update VH if height has changed significantly enough (e.g. phone rotated)
        if(Math.abs(window.innerHeight - this.originalViewportHeight) > 200) {
          SetVH();
          this.originalViewportHeight = window.innerHeight;
        }
      }, 100);
    });

    this.ToggleDarkMode(this.darkMode);

    this.Initialize();
  }

  RouteChange(pathname) {
    this.SendEvent({event: EVENTS.ROUTE_CHANGE, data: pathname});
  }

  SetLanguage = flow(function * (language, save=false) {
    if(Array.isArray(language)) {
      for(let i = 0; i < language.length; i++) {
        if(yield this.SetLanguage(language[i], save)) {
          return;
        }
      }

      language = "en";
    }

    language = language.toLowerCase();

    if(language.startsWith("en")) {
      this.l10n = LocalizationEN;
      this.language = "en";
      save ? this.SetLocalStorage("lang", "en") : this.RemoveLocalStorage("lang");
      return true;
    }

    // Find matching preference (including variants, e.g. pt-br === pt)
    const availableLocalizations = ["pt-br", "test"];
    language = availableLocalizations.find(key => key.startsWith(language) || language.startsWith("key"));

    if(!language) {
      return false;
    }

    const localization = (yield import(`Assets/localizations/${language}.yml`)).default;

    const MergeLocalization = (l10n, en) => {
      if(Array.isArray(en)) {
        return en.map((entry, index) => MergeLocalization((l10n || [])[index], entry));
      } else if(typeof l10n === "object") {
        let newl10n = {};
        Object.keys(en).forEach(key => newl10n[key] = MergeLocalization((l10n || {})[key], en[key]));

        return newl10n;
      } else {
        return l10n || en;
      }
    };

    // Merge non-english localizations with english to ensure defaults are set for all fields
    this.l10n = MergeLocalization(localization, LocalizationEN);
    this.language = language;

    if(save) {
      this.SetLocalStorage("lang", language);
    }

    return true;
  });

  SetHeaderText(text) {
    this.headerText = text;
  }

  Initialize = flow(function * () {
    try {
      this.loaded = false;
      this.SetLanguage(this.language || navigator.languages);

      if(window.sessionStorageAvailable) {
        // Initialize Ory client
        const {Configuration, FrontendApi} = yield import("@ory/client");
        this.oryClient = new FrontendApi(
          new Configuration({
            features: {
              kratos_feature_flags_use_continue_with_transitions: true,
              use_continue_with_transitions: true
            },
            basePath: EluvioConfiguration.ory_configuration.url,
            // we always want to include the cookies in each request
            // cookies are used for sessions and CSRF protection
            baseOptions: {
              withCredentials: true
            }
          })
        );

        // eslint-disable-next-line no-console
        console.time("Auth0 Initial Load");

        const {Auth0Client} = yield import("auth0-spa-js");

        this.auth0 = new Auth0Client({
          domain: EluvioConfiguration["auth0-domain"],
          client_id: EluvioConfiguration["auth0-configuration-id"],
          redirect_uri: UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, ""),
          cacheLocation: "localstorage",
          useRefreshTokens: true,
          useCookiesForTransactions: true
        });

        // eslint-disable-next-line no-console
        console.timeEnd("Auth0 Initial Load");
      }

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
        localization: this.language === "en" ? undefined : this.language,
        previewMarketplaceId: (searchParams.get("preview") || (!this.embedded && this.GetSessionStorage("preview-marketplace")) || "").replaceAll("/", ""),
        storeAuthToken: false
      });

      // Load domain map
      if(!this.domainProperty && !["localhost", "contentfabric.io"].includes(location.hostname)) {
        let domainMapping = yield this.walletClient.client.ContentObjectMetadata({
          libraryId: this.walletClient.mainSiteLibraryId,
          objectId: this.walletClient.mainSiteId,
          metadataSubtree: "public/asset_metadata/info/domain_map"
        });

        this.domainProperty = domainMapping
          .find(map => map.domain === location.hostname)
          ?.property_slug;
      }

      // Internal feature - allow setting of authd node via query param for testing
      let authdURI = searchParams.get("authd") || this.GetSessionStorage("authd-uri");
      if(authdURI) {
        this.Log("Setting authd URI: " + authdURI, "warn");
        this.SetSessionStorage("authd-uri", authdURI);
        this.walletClient.client.authServiceURIs = [authdURI];
        this.walletClient.client.AuthHttpClient.uris = [authdURI];
      }

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

      if(this.domainProperty) {
        this.SetSessionStorage("domain-property", this.domainProperty);
        yield this.SetDomainCustomization();
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

      if(!this.inFlow) {
        if(this.AuthInfo()) {
          this.Log("Authenticating from saved session");
          yield this.Authenticate(this.AuthInfo());
        } else if(this.auth0) {
          // Attempt to re-auth with auth0. If 'code' is present in URL params, we are returning from Auth0 callback, let the login component handle it
          yield this.AuthenticateAuth0({});
        }
      }

      const marketplace = decodeURIComponent(searchParams.get("mid")) || decodeURIComponent(searchParams.get("marketplace")) || this.GetSessionStorage("marketplace") || "";

      if(marketplace) {
        this.SetMarketplace({
          ...(this.ParseMarketplaceParameter(marketplace)),
          specified: true
        });
      }

      this.SendEvent({event: EVENTS.LOADED});
    } catch(error) {
      this.Log("Initialization failed:", true);
      this.Log(error, true);
    } finally {
      if(this.walletClient) {
        this.loaded = true;
      } else {
        // Retry
        yield new Promise(resolve => setTimeout(resolve, 5000));
        this.Initialize();
      }
    }
  });

  CurrentAddress() {
    if(!this.authToken) { return; }

    return this.walletClient.UserAddress();
  }

  AuthenticateOry = flow(function * ({userData, force=false}={}) {
    let email, jwtToken;
    try {
      const response = yield this.oryClient.toSession({tokenizeAs: EluvioConfiguration.ory_configuration.jwt_template});
      email = response.data.identity.traits.email;
      jwtToken = response.data.tokenized;

      yield this.Authenticate({
        idToken: jwtToken,
        force,
        // TODO: Change
        signerURIs: [
          this.network === "demo" ?
            "https://wlt.dv3.svc.eluv.io" :
            "https://wlt.stg.svc.eluv.io"
        ],
        user: {
          name: email,
          email,
          // TODO: check verification
          verified: true,
          userData
        }
      });
    } catch(error) {
      this.Log("Error logging in with Ory:", true);
      this.Log(error);

      if([400, 403, 503].includes(parseInt(error?.status))) {
        throw { login_limited: true };
      }
    }
  });

  AuthenticateAuth0 = flow(function * ({userData}={}) {
    try {
      // eslint-disable-next-line no-console
      console.time("Auth0 Authentication");

      // Check for existing Auth0 authentication status
      // Note: auth0.checkSession hangs sometimes without throwing an error - if it takes longer than 5 seconds, abort.
      // eslint-disable-next-line no-async-promise-executor
      yield new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => reject("Auth0 checkSession timeout"), 5000);
        // eslint-disable-next-line no-console
        console.time("auth0.checkSession");
        await this.auth0.checkSession();
        // eslint-disable-next-line no-console
        console.timeEnd("auth0.checkSession");
        clearTimeout(timeout);

        resolve();
      });

      if(yield this.auth0.isAuthenticated()) {
        this.Log("Authenticating with Auth0 session");

        const authInfo = yield this.auth0.getIdTokenClaims();

        yield this.Authenticate({
          idToken: authInfo.__raw,
          user: {
            name: authInfo.name,
            email: authInfo.email,
            verified: authInfo.email_verified,
            userData
          }
        });
      }
    } catch(error) {
      if(error?.message?.toLowerCase() !== "login required") {
        this.Log("Error logging in with Auth0:", true);
        this.Log(error, true);
      }

      if([400, 403, 503].includes(parseInt(error?.status))) {
        throw { uiMessage: this.l10n.login.errors.too_many_logins };
      }
    } finally {
      // eslint-disable-next-line no-console
      console.timeEnd("Auth0 Authentication");
    }
  });

  Authenticate = flow(function * ({idToken, clientAuthToken, clientSigningToken, externalWallet, walletName, user, saveAuthInfo=true, signerURIs, force=false, callback}) {
    if(this.authenticating) { return; }

    try {
      this.SetAlertNotification(undefined);
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
      } else if(externalWallet === "Metamask") {
        //yield this.cryptoStore.ActivateEluvioChain();
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
          shareEmail: user?.userData?.share_email,
          extraData: user?.userData || {},
          signerURIs,
          nonce: this.authNonce,
          createRemoteToken: !this.useLocalAuth,
          force
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
      this.externalWalletUser = externalWallet || (walletName && walletName !== "Eluvio");

      this.RemoveLocalStorage("signed-out");

      this.SendEvent({event: EVENTS.LOG_IN, data: { address }});

      this.notificationStore.InitializeNotifications(true);


      // Periodically check to ensure the token has not been revoked
      const CheckTokenStatus = async () => {
        if(!this.AuthInfo(10 * 60 * 1000)) {
          this.SignOut({message: this.l10n.login.errors.session_expired});
        } else if(!(await this.walletClient.TokenStatus())) {
          this.SignOut({message: this.l10n.login.errors.forced_logout});
        }
      };

      if(!this.useLocalAuth) {
        CheckTokenStatus();

        setInterval(() => {
          CheckTokenStatus();
        }, 60000);
      }
    } catch(error) {
      this.ClearAuthInfo();
      this.Log(error, true);

      throw error;
    } finally {
      this.authenticating = false;
    }
  });


  SetDomainCustomization = flow(function * () {
    const options = yield this.LoadPropertyCustomization(this.domainProperty);

    if(!options) { return; }

    this.domainSettings = options;

    this.SetPropertyCustomization(this.domainProperty);
  });

  SetPropertyCustomization = flow(function * (mediaPropertySlugOrId) {
    const options = yield this.LoadPropertyCustomization(mediaPropertySlugOrId);

    if(!options) { return; }

    let css = [];
    if(options.styling?.font === "custom") {
      if(options.styling.custom_font_declaration) {
        if(options.styling.custom_font_definition) {
          css.push(options.styling.custom_font_definition);
        }

        const customFont = `${options.styling.custom_font_declaration}, Inter, sans-serif`;
        const customTitleFont = options.styling.custom_title_font_declaration ?
          `${options.styling.custom_title_font_declaration}, ${customFont}` : undefined;


        css.push(":root {");
        css.push(`--font-family-primary: ${customTitleFont || customFont};`);
        css.push(`--font-family-secondary: ${customFont};`);
        css.push(`--font-family-tertiary: ${customFont};`);

        if(customTitleFont) {
          css.push(`--font-family-title: ${customTitleFont};`);
        }

        css.push("}");
        css.push(`* { font-family: ${customFont}; }`);

        if(customTitleFont) {
          css.push(`*._title { font-family: ${customTitleFont}; }`);
          css.push(`*._title * { font-family: ${customTitleFont}; }`);
        }
      }
    }

    this.SetCustomCSS(css.join("\n"));
  });

  LoadPropertyCustomization = flow(function * (mediaPropertySlugOrId) {
    if(!mediaPropertySlugOrId) { return; }

    // Client may not be initialized yet
    while(!this.client) {
      yield new Promise(resolve => setTimeout(resolve, 100));
    }

    yield this.mediaPropertyStore.LoadMediaProperty({
      mediaPropertySlugOrId
    });

    const property = this.mediaPropertyStore.MediaProperty({
      mediaPropertySlugOrId
    });

    return {
      mediaPropertyId: this.domainProperty,
      tenant: property.metadata?.tenant,
      login: property.metadata?.login,
      styling: property.metadata.styling,
      settings: property.metadata.domain,
      font: property.metadata.styling?.font === "custom" && property.metadata.styling.custom_font_declaration
    };
  });

  LoadLoginCustomization = flow(function * (marketplaceHash) {
    // Client may not be initialized yet but may not be needed
    const Client = async () => {
      while(!this.client) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return this.client;
    };

    if(this.domainProperty) {
      return yield this.LoadPropertyCustomization(this.domainProperty);
    }

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

    if(!this.loginCustomization[marketplaceId]) {
      const localStorageKey = `customization-${marketplaceId}`;
      const fromLocalStorage = this.GetLocalStorageJSON(localStorageKey, true);

      if(fromLocalStorage && fromLocalStorage.marketplaceHash === marketplaceHash) {
        this.loginCustomization[localStorageKey] = fromLocalStorage;

        return this.loginCustomization[localStorageKey];
      }

      let metadata = (
        yield (yield Client()).ContentObjectMetadata({
          versionHash: yield this.walletClient.LatestMarketplaceHash({
            marketplaceParams: {
              marketplaceId,
              marketplaceHash
            }
          }),
          metadataSubtree: UrlJoin("public", "asset_metadata", "info"),
          localizationSubtree: this.language ? UrlJoin("public", "asset_metadata", "localizations", this.language, "info") : "",
          select: [
            "branding",
            "login_customization",
            "tenant_id",
            "terms",
            "terms_document"
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
        terms: metadata.terms,
        terms_document: metadata.terms_document
      };

      if(metadata?.branding?.color_scheme === "Custom") {
        metadata.sign_up_button = undefined;
        metadata.log_in_button = undefined;
      }

      if(metadata.tenant_id) {
        metadata.tenantConfig = yield this.walletClient.TenantConfiguration({tenantId: metadata.tenant_id});
      }

      this.loginCustomization[marketplaceId] = metadata;

      this.SetLocalStorage(
        localStorageKey,
        Utils.B64(JSON.stringify(metadata))
      );
    }

    return this.loginCustomization[marketplaceId];
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

  UpdateVoteStatus = flow(function * ({tenantId, votingEventId}) {
    this.voteStatus[votingEventId] = yield this.walletClient.VoteStatus({tenantId, votingEventId});
  });

  CastVote = flow(function * ({tenantId, votingEventId, sku}) {
    this.voteStatus[votingEventId] = (yield this.walletClient.CastVote({tenantId, votingEventId, sku})).totals;
  });

  RevokeVote = flow(function * ({tenantId, votingEventId, sku}) {
    this.voteStatus[votingEventId] = (yield this.walletClient.RevokeVote({tenantId, votingEventId, sku})).totals;
  });

  // Get already loaded full NFT data
  NFTData({tokenId, contractAddress, contractId}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    const { retrievedAt, nft } = this.nftData[key] || {};
    return {
      nft,
      retrievedAt,
      expired: Date.now() - (retrievedAt || 0) > 60000
    };
  }

  // Load full NFT data
  LoadNFTData = flow(function * ({contractAddress, contractId, tokenId, force}) {
    if(contractId) {
      contractAddress = Utils.HashToAddress(contractId);
    }

    const key = `${contractAddress}-${tokenId}`;
    const { expired } = this.NFTData({contractAddress, contractId, tokenId});
    if(force || expired) {
      this.nftData[key] = {
        retrievedAt: Date.now(),
        nft: yield this.walletClient.NFT({contractAddress, tokenId})
      };
    }

    return this.nftData[key].nft;
  });

  SetCustomCSS(css="", tag="_custom-css") {
    css = SanitizeHTML(css);
    const cssTag = document.getElementById(tag);
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

  SetCustomizationOptions(marketplace, disableTenantStyling=false) {
    if(this.routeParams.mediaPropertySlugOrId) {
      this.SetPropertyCustomization(this.routeParams.mediaPropertySlugOrId);
    }

    const useTenantStyling =
      !disableTenantStyling &&
      marketplace?.branding?.use_tenant_styling &&
      this.navigationInfo.locationType !== "marketplace" &&
      !window.location.pathname.startsWith("/login");
    const customizationKey = marketplace === "default" ? "global" : `${marketplace.marketplaceId}-${useTenantStyling ? "tenant" : "marketplace"}`;

    if(marketplace !== "default" && customizationKey === this.currentCustomization) {
      return;
    }

    this.currentCustomization = customizationKey;

    const desktopBackground = marketplace?.branding?.background?.url || "";
    const mobileBackground = marketplace?.branding?.background_mobile?.url || "";

    const marketplaceBackground = marketplace?.storefront?.background?.url || "";
    const marketplaceBackgroundMobile = marketplace?.storefront?.background_mobile?.url || "";

    const tenantBackground = marketplace?.tenantBranding?.background?.url || "";
    const tenantBackgroundMobile = marketplace?.tenantBranding?.background_mobile?.url || "";

    this.appBackground = {
      desktop: desktopBackground,
      mobile: mobileBackground,
      marketplaceDesktop: marketplaceBackground,
      marketplaceMobile: marketplaceBackgroundMobile,
      tenantDesktop: tenantBackground,
      tenantMobile: tenantBackgroundMobile,
      useTenantStyling: marketplace?.branding?.use_tenant_styling || false
    };

    this.SetSessionStorage("app-background", Utils.B64(JSON.stringify(this.appBackground)));

    let options = { color_scheme: "Dark" };
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
      if(useTenantStyling) {
        this.walletClient.TenantCSS({tenantSlug: marketplace.tenant_slug || marketplace.tenantSlug})
          .then(css => this.SetCustomCSS(css));
      } else {
        this.walletClient.MarketplaceCSS({marketplaceParams: {marketplaceId: marketplace.marketplaceId}})
          .then(css => this.SetCustomCSS(css));
      }
    } else {
      this.SetCustomCSS("");
    }
  }

  ClearMarketplace(clearSpecified=false) {
    this.tenantSlug = undefined;
    this.marketplaceSlug = undefined;
    this.marketplaceId = undefined;

    if(clearSpecified) {
      this.specifiedMarketplaceId = undefined;
      this.specifiedMarketplaceHash = undefined;
      this.RemoveSessionStorage("marketplace");
    }

    this.checkoutStore.SetCurrency({currency: "USD"});

    this.SetCustomizationOptions("default");
  }

  SetMarketplace({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash, specified=false, disableTenantStyling=false}) {
    if(!this.walletClient || this.domainProperty) { return; }

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

        if(marketplace.branding?.disable_usdc) {
          this.usdcDisabled = true;
        }
      }

      if(marketplace?.default_display_currency) {
        this.checkoutStore.SetCurrency({currency: marketplace?.default_display_currency});
      }

      // Give locationType time to settle if path changed
      setTimeout(() => this.SetCustomizationOptions(marketplace, disableTenantStyling), 100);

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

    const defaultCurrency = this.GetLocalStorage(`preferred-currency-${marketplaceId}`) || this.marketplaces[marketplaceId].default_display_currency || "USD";
    yield this.checkoutStore.SetCurrency({currency: defaultCurrency});

    if(marketplaceId === this.specifiedMarketplaceId) {
      this.InitializeAnalytics(this.marketplaces[marketplaceId]);
    }

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
        // eslint-disable-next-line no-async-promise-executor
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

      // Special case - collection refers to item that is not available for sale but not yet released, mark as unreleased to show image only placeholder
      let purchaseableItem = purchaseableItems[sku];
      if(item && !purchaseableItem) {
        const unreleased = item && item.available_at && new Date(item.available_at).getTime() > Date.now();

        if(unreleased) {
          purchaseableItem = {item, index: item.index, unreleased: true};
        }
      }

      return {
        sku,
        entryIndex,
        item,
        ownedItems: ownedItems[sku] || [],
        purchaseableItem
      };
    })
      .sort((a, b) =>
        a.ownedItems.length > 0 ? -1 :
          b.ownedItems.length > 0 ? 1 :
            a.purchaseableItem && !a.purchaseableItem.unreleased ? -1 :
              b.purchaseableItem && !b.purchaseableItem.unreleased ? 1 : 0
      );
  });

  MarketplacePurchaseableItems(marketplace) {
    let purchaseableItems = {};
    ((marketplace.storefront || {}).sections || []).forEach(section =>
      section.items.forEach(sku => {
        const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
        const item = marketplace.items[itemIndex];

        // For sale / authorization
        let unreleased;
        if(!item || !item.for_sale || (item.requires_permissions && !item.authorized)) {
          unreleased = item?.available_at && new Date(item.available_at).getTime() > Date.now();

          if(!unreleased) {
            return;
          }
        }


        if(item.max_per_user && checkoutStore.stock[item.sku] && checkoutStore.stock[item.sku].current_user >= item.max_per_user) {
          // Purchase limit
          return;
        }

        purchaseableItems[sku] = {
          item,
          index: itemIndex,
          unreleased
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

  GiftClaimStatus = flow(function * ({marketplaceId, confirmationId}) {
    return yield this.walletClient.GiftClaimStatus({marketplaceParams: { marketplaceId }, confirmationId});
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

  RedeemableOfferStatus = flow(function * ({tenantId, contractAddress, tokenId, offerId}) {
    return yield this.walletClient.RedeemableOfferStatus({tenantId, contractAddress, tokenId, offerId});
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

    try {
      const balances = yield this.walletClient.UserWalletBalance(checkOnboard);

      this.userStripeId = balances.userStripeId;
      this.userStripeEnabled = balances.userStripeEnabled;
      this.totalWalletBalance = balances.totalWalletBalance;
      this.availableWalletBalance = balances.availableWalletBalance;
      this.pendingWalletBalance = balances.pendingWalletBalance;
      this.lockedWalletBalance = balances.lockedWalletBalance;
      this.withdrawableWalletBalance = balances.withdrawableWalletBalance;
      this.usdcBalance = balances.phantomUSDCBalance;

      return balances;
    } catch(error) {
      this.Log("Failed to load balance", true);
      this.Log(error, true);
    }
  });

  WithdrawFunds = flow(function * ({provider, userInfo, amount}) {
    if(amount > this.withdrawableWalletBalance) {
      throw Error("Attempting to withdraw unavailable funds");
    }

    if(provider === "Stripe") {
      yield this.client.authClient.MakeAuthServiceRequest({
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
      });
    } else {
      try {
        yield this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "bal", "ebanx"),
          method: "POST",
          body: {
            mode: EluvioConfiguration["purchase-mode"],
            amount,
            currency: "USD",
            country: "br",
            method: "pix",
            payee: {
              name: userInfo.name,
              email: userInfo.email,
              phone: userInfo.phone,
              document_type: "cpf",
              document: userInfo.cpf,
              pix_key: userInfo.pix_key,
              birthdate: userInfo.birthdate
            }
          },
          headers: {
            Authorization: `Bearer ${this.authToken}`
          }
        });
      } catch(error) {
        if(error?.body?.cause?.body) {
          const body = JSON.parse(error.body.cause.body);
          switch(body.status_code) {
            case "HP-XB-05":
            case "HP-CM-39":
              // Invalid birthdate
              throw { error, uiMessage: "Invalid birthdate. Please go back and update." };

            case "HP-CM-40":
              // Invalid CPF;
              throw { error, uiMessage: "Invalid CPF number. Please go back and update." };

            case "HP-CM-30":
              // Not enough balance - No special message

            // eslint-disable-next-line no-fallthrough
            default:
              throw error;
          }
        } else {
          throw error;
        }
      }
    }

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

  MediaViewKey({contractAddress, mediaId, preview}) {
    contractAddress = Utils.FormatAddress(contractAddress);
    return `nft-media-viewed-${contractAddress}-${mediaId}${preview ? "-preview" : ""}`;
  }

  MediaViewed({nft, contractAddress, mediaId, preview}) {
    if(nft) {
      contractAddress = nft.details.ContractAddr || contractAddress;
    }

    return this.viewedMedia[this.MediaViewKey({contractAddress, mediaId, preview})];
  }

  CheckViewedMedia = flow(function * ({nft, contractAddress, mediaIds, preview}) {
    if(nft) {
      contractAddress = nft.details.ContractAddr || contractAddress;
    }

    let viewedMedia = { ...this.viewedMedia };

    yield Promise.all(
      mediaIds.map(async mediaId => {
        const key = this.MediaViewKey({contractAddress, mediaId, preview});
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

  SetMediaViewed = flow(function * ({nft, contractAddress, mediaId, preview}) {
    if(nft) {
      contractAddress = nft.details.ContractAddr || contractAddress;
    }

    const key = this.MediaViewKey({contractAddress, mediaId, preview});
    if(!this.viewedMedia[key] && !preview) {
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

  RemoveMediaViewed = flow(function * (key) {
    yield rootStore.walletClient.RemoveProfileMetadata({
      type: "app",
      mode: "private",
      appId: rootStore.appId,
      key
    });

    delete this.viewedMedia[key];
  });

  UserStats = flow(function * ({userAddress, marketplaceId}) {
    userAddress = Utils.FormatAddress(userAddress);

    try {
      if(!this.userStats[userAddress] || (Date.now() - this.userStats[userAddress].retrievedAt) > 60000) {
        this.userStats[userAddress] = yield this.walletClient.Leaderboard({
          userAddress,
          marketplaceParams: marketplaceId ? {marketplaceId: marketplaceId} : undefined
        });
        this.userStats[userAddress].retrievedAt = Date.now();
      }
    } catch(error) {
      this.Log(error, true);
    }

    return this.userStats[userAddress];
  });

  RedeemCode = flow(function * ({tenantId, ntpId, code}) {
    // Create a new client to avoid messing with current client's authorization
    const redemptionClient = yield ElvClient.FromNetworkName({networkName: this.client.networkName});

    return yield redemptionClient.RedeemCode({
      tenantId,
      ntpId,
      code,
      includeNTPId: true
    });
  });

  LoadEventOffer = flow(function * ({tenantSlug, eventSlug, offerId}) {
    const mainSiteHash = yield this.client.LatestVersionHash({objectId: this.walletClient.mainSiteId});
    const offers = (yield this.client.ContentObjectMetadata({
      versionHash: mainSiteHash,
      metadataSubtree: UrlJoin("public", "asset_metadata", "tenants", tenantSlug, "sites", eventSlug, "info", "offers")
    })) || [];

    return offers.find(offer => offer.id === offerId);
  });

  InitializeAnalytics(marketplace) {
    (marketplace?.analytics_ids || []).forEach(analytics => {
      const ids = analytics.ids;

      if(!ids || ids.length === 0) { return; }

      for(const entry of ids) {
        try {
          switch(entry.type) {
            case "Google Analytics ID":
              this.Log("Initializing Google Analytics", "warn");

              const s = document.createElement("script");
              s.setAttribute("src", `https://www.googletagmanager.com/gtag/js?id=${entry.id}`);
              s.async = true;
              document.head.appendChild(s);

              window.dataLayer = window.dataLayer || [];

              // eslint-disable-next-line no-inner-declarations
              function gtag() {
                window.dataLayer.push(arguments);
              }

              window.gtag = gtag;
              gtag("js", new Date());
              gtag("config", entry.id);

              window.ac = {g: gtag};

              break;

            case "Google Tag Manager ID":
              this.Log("Initializing Google Tag Manager", "warn");

              (function(w, d, s, l, i) {
                w[l] = w[l] || [];
                w[l].push({
                  "gtm.start":
                    new Date().getTime(), event: "gtm.js"
                });
                var f = d.getElementsByTagName(s)[0],
                  j = d.createElement(s), dl = l != "dataLayer" ? "&l=" + l : "";
                j.async = true;
                j.src =
                  "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
                f.parentNode.insertBefore(j, f);
              })(window, document, "script", "dataLayer", entry.id);

              break;

            case "Facebook Pixel ID":
              this.Log("Initializing Facebook Analytics", "warn");

              !function(f, b, e, v, n, t, s) {
                if(f.fbq) return;
                n = f.fbq = function() {
                  n.callMethod ?
                    n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                };
                if(!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = "2.0";
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
              }(window, document, "script",
                "https://connect.facebook.net/en_US/fbevents.js");
              fbq("init", entry.id);
              fbq("track", "PageView");

              break;

            case "App Nexus Segment ID":
              this.Log("Initializing App Nexus Analytics", "warn");

              const pixel = document.createElement("img");

              pixel.setAttribute("width", "1");
              pixel.setAttribute("height", "1");
              pixel.style.display = "none";
              pixel.setAttribute("src", `https://secure.adnxs.com/seg?add=${entry.id}&t=2`);

              document.body.appendChild(pixel);

              break;

            case "Twitter Pixel ID":
              this.Log("Initializing Twitter Analytics", "warn");

              !function(e, t, n, s, u, a) {
                e.twq || (s = e.twq = function() {
                  s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
                }, s.version = "1.1", s.queue = [], u = t.createElement(n), u.async = !0, u.src = "https://static.ads-twitter.com/uwt.js",
                a = t.getElementsByTagName(n)[0], a.parentNode.insertBefore(u, a));
              }(window, document, "script");
              twq("config", entry.id);

              break;

            default:
              break;
          }
        } catch(error) {
          this.Log(`Failed to initialize analytics for ${entry.type}`, true);
          this.Log(error, true);
        }
      }
    });

    this.analyticsInitialized = true;
    marketplace.analyticsInitialized = true;
  }

  SignOut = flow(function * ({returnUrl, message}={}) {
    this.ClearAuthInfo();

    this.SetLocalStorage("signed-out", "true");

    if(this.oryClient) {
      try {
        const response = yield rootStore.oryClient.createBrowserLogoutFlow();
        yield rootStore.oryClient.updateLogoutFlow({token: response.data.logout_token});
      } catch(error) {
        this.Log(error, true);
      }
    }

    yield this.walletClient?.LogOut();

    this.SendEvent({event: EVENTS.LOG_OUT, data: {address: this.CurrentAddress()}});

    if(message) {
      this.SetAlertNotification(message);
    }

    if(this.auth0 && (yield this.auth0.isAuthenticated())) {
      try {
        this.disableCloseEvent = true;

        // Auth0 has a specific whitelisted path for login/logout urls - rely on hash redirect
        returnUrl = new URL(returnUrl || this.ReloadURL({signOut: true}));
        returnUrl.hash = returnUrl.pathname;
        returnUrl.pathname = "";

        setTimeout(() => {
          this.auth0.logout({
            returnTo: returnUrl.toString()
          });
        }, 100);

        return;
      } catch(error) {
        this.Log("Failed to log out of Auth0:");
        this.Log(error, true);
      }
    }

    this.Reload(returnUrl || this.ReloadURL({signOut: true}));
  });

  CreateShortURL = flow(function * (url) {
    try {
      // Normalize URL
      url = new URL(url).toString();

      if(!this.shortURLs[url]) {
        const {url_mapping} = yield (yield fetch("https://elv.lv/tiny/create", {method: "POST", body: url})).json();

        this.shortURLs[url] = url_mapping.shortened_url;
      }

      return this.shortURLs[url];
    } catch(error) {
      this.Log(error, true);
    }
  });

  LookoutURL(transaction) {
    return this.network === "main" ?
      `https://explorer.contentfabric.io/tx/${transaction}` :
      `https://lookout.qluv.io/tx/${transaction}`;
  }

  ReloadURL({signOut}={}) {
    const url = new URL(UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, ""));

    if(this.appUUID) {
      url.searchParams.set("appUUID", this.appUUID);
    }

    url.pathname = window.location.pathname;

    if(signOut) {
      if(this.routeParams.mediaPropertySlugOrId && !window.location.pathname.startsWith("/m")) {
        url.pathname = MediaPropertyBasePath(rootStore.routeParams);
      } else if(this.routeParams.marketplaceId) {
        url.pathname = UrlJoin("/marketplace", this.marketplaceId, "store");
      } else {
        url.pathname = "/";
      }
    }

    if(this.specifiedMarketplaceId) {
      url.searchParams.set("mid", this.specifiedMarketplaceHash || this.specifiedMarketplaceId);
    }

    if(this.loginOnly) {
      url.searchParams.set("lo", "");
    }

    if(this.capturedLogin) {
      url.searchParams.set("cl", "");
    }

    return url.toString();
  }

  Reload(returnUrl) {
    this.disableCloseEvent = true;
    window.location.href = returnUrl || this.ReloadURL();
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

  FlowURL({type="flow", flow, marketplaceId, parameters={}}) {
    return this.walletClient.FlowURL({type, flow, marketplaceId, parameters});
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

      if((this.loggedIn && includeAuth) || (!this.storageSupported && this.AuthInfo())) {
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

      if(error?.error === "popup_closed" && OnCancel) {
        OnCancel(error);
      } else {
        throw error;
      }
    }
  });

  HandleFlow = flow(function * ({history, flow, parameters, urlParameters={}}) {
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

        case "balance-purchase":
          yield checkoutStore.BalanceCheckoutSubmit({
            ...parameters,
            fromEmbed: true
          });

          break;

        case "gift":
          // Take the code from the URL params and add it to the redirect path because Auth0 will eat the params on login
          parameters.to = UrlJoin(parameters.to, SearchParams()["otp_code"] || "");

          // Fall through to redirect
        // eslint-disable-next-line no-fallthrough
        case "redirect":
          if(parameters.url) {
            window.location.href = parameters.url;
          } else {
            let [to, params] = parameters.to.split("?");
            if(params) {
              params = new URLSearchParams(params);

              for(const [key, value] of params.entries()) {
                urlParameters[key] = value;
              }
            }

            if(Object.keys(urlParameters).length > 0) {
              to = `${to}?${Object.keys(urlParameters).map(key => `${key}=${urlParameters[key]}`).join("&")}`;
            }

            history.push(to);
          }

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
      this.Log(error, true);
      Respond({error: Utils.MakeClonable(error)});
    }
  });

  AuthStorageKey() {
    let key = `auth-${this.network}`;

    /*
      if(this.authOrigin) {
        try {
          key = `${key}-${(new URL(this.authOrigin)).hostname}`;
        // eslint-disable-next-line no-empty
        } catch(error) {}
      }
     */

    return key;
  }

  AuthInfo(expirationBuffer=6 * 60 * 60 * 1000) {
    try {
      if(this.authInfo) {
        return this.authInfo;
      }

      const tokenInfo = this.GetLocalStorage(this.AuthStorageKey());

      if(tokenInfo) {
        let { clientAuthToken, clientSigningToken, expiresAt } = JSON.parse(Utils.FromB64(tokenInfo));

        // Expire tokens early so they don't stop working while in use
        if(expiresAt - Date.now() < expirationBuffer) {
          this.ClearAuthInfo();
          this.Log("Authorization expired", "warn");
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

  SetNavigationInfo({navigationKey, locationType, path, url, marketplaceId, breadcrumbs=[]}) {
    this.navigationBreadcrumbs = breadcrumbs;

    this.navigationInfo = {
      navigationKey,
      locationType,
      marketplaceId,
      path,
      url
    };

    this.SetSessionStorage("navigation-info", JSON.stringify(this.navigationInfo));
  }

  ShowLogin({requireLogin=false, backPath, ignoreCapture=false}={}) {
    if(this.capturedLogin && !ignoreCapture) {
      if(this.loggedIn) { return; }

      this.SendEvent({event: EVENTS.LOG_IN_REQUESTED});
    } else {
      this.requireLogin = requireLogin;
      this.loginBackPath = backPath;
      this.showLogin = true;
    }
  }

  HideLogin() {
    this.showLogin = false;
    this.requireLogin = false;
    this.loginBackPath = undefined;
  }

  ToggleDarkMode(enabled) {
    const themeContainer = document.querySelector("#_theme");
    if(!enabled) {
      this.RemoveSessionStorage("dark-mode");
      themeContainer.innerHTML = "";
      themeContainer.dataset.theme = "default";
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
    marketplace = marketplace?.replace(/\/+$/, "");

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

        this.fullscreenImageWidth = width > 3000 ? 3840 : width > 2000 ? 2560 : 1920;
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

  ParsedRouteParams() {
    // eslint-disable-next-line no-unused-vars
    let [_, property, __, subproperty] = location.pathname.split(/\/p\/([^/]+)/);
    const marketplaceId = (location.pathname.match(/\/marketplace\/([^/]+)/) || [])[1];

    return {
      mediaPropertySlugOrId: subproperty || property,
      parentMediaPropertySlugOrId: subproperty ? property : "",
      marketplaceId
    };
  }

  SetRouteParams(params) {
    this.route = location.pathname;
    this.routeParams = params || {};
  }

  SetBackPath(backPath) {
    if(!backPath) {
      this.backPath = undefined;
      return;
    }

    let context = new URLSearchParams(location.search).get("ctx");

    let [path, query] = (backPath || "").split("?");

    if(!path && !query) { return; }

    if(context === "s") {
      if(!path.includes("/s/:sectionSlugOrId") && location.pathname.includes("/s/:sectionSlugOrId/")) {
        path = UrlJoin(path, "/s/:sectionSlugOrId");
      } else if(!path.includes("/s/:sectionSlugOrId")) {
        context = undefined;
      }
    } else if(context === "search") {
      if(!location.pathname.endsWith("/search")) {
        path = UrlJoin(path, "/search");
      } else {
        context = undefined;
      }
    }

    path = path
      .split(/[/?]/)
      .map(segment =>
        (segment.startsWith(":") && this.routeParams[segment.replace(":", "")]) ||
        segment
      )
      .join("/");

    const params = new URLSearchParams(query);
    for(const [key, value] of params.entries()) {
      params.set(
        key,
        (value.startsWith(":") && this.routeParams[value.replace(":", "")]) ||
        value
      );
    }

    if(context) {
      params.set("ctx", context);
    }

    if(params.size > 0) {
      path += `?${params.toString()}`;
    }

    this.backPath = path;
  }

  SetRouteChange(route) {
    this.routeChange = route;
  }

  SetAlertNotification(message) {
    if(!message) {
      this.alertNotification = undefined;
      this.RemoveSessionStorage("alert-notification");
    } else {
      this.alertNotification = message;
      this.SetSessionStorage("alert-notification", message);
    }
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
export const notificationStore = rootStore.notificationStore;
export const mediaPropertyStore = rootStore.mediaPropertyStore;

window.rootStore = rootStore;

