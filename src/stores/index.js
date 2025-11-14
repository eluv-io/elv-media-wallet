// eslint-disable-next-line no-console
console.time("Initial Load");

import {SearchParams} from "../utils/Utils";

window.sessionStorageAvailable = false;
try {
  sessionStorage.getItem("test");
  window.sessionStorageAvailable = true;
// eslint-disable-next-line no-empty
} catch(error) {}

import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";
import {ElvClient, ElvWalletClient} from "@eluvio/elv-client-js";
import SiteConfiguration from "@eluvio/elv-client-js/src/walletClient/Configuration";
import Utils from "@eluvio/elv-client-js/src/Utils";
import SanitizeHTML from "sanitize-html";
import {parseDomain} from "parse-domain";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

import CheckoutStore from "Stores/CheckoutStore";
import TransferStore from "Stores/TransferStore";
import CryptoStore from "Stores/CryptoStore";
import NotificationStore from "Stores/NotificationStore";
import MediaPropertyStore from "Stores/MediaPropertyStore";

import NFTContractABI from "../static/abi/NFTContract";
import {v4 as UUID, parse as ParseUUID} from "uuid";
import ProfanityFilter from "bad-words";
import MergeWith from "lodash/mergeWith";

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

let activeTimers = 0;
class RootStore {
  siteConfiguration = SiteConfiguration[EluvioConfiguration.network][EluvioConfiguration.mode];
  preferredLocale = Intl.DateTimeFormat()?.resolvedOptions?.()?.locale || navigator.language;
  language = this.GetLocalStorage("lang");
  geo = this.GetSessionStorage("geo") || searchParams.get("geo");
  l10n = LocalizationEN;
  uiLocalizations = ["en", "de", "es", "fr", "it", "pt", "pt-br"];
  alertNotification = this.GetSessionStorage("alert-notification");

  customDomainPropertyId;
  customDomainPropertySlug;
  customDomainPropertyTenantId;

  currentPropertyId;
  currentPropertySlug;
  currentPropertyTenantId;

  domainSettings = undefined;
  isCustomDomain = !["localhost", "192.168", "contentfabric.io", "eluv.io"].find(host => window.location.hostname.includes(host));

  discoverFilter = "";

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
  authCode = searchParams.get("elvid");
  authTTL = searchParams.get("ttl") || parseFloat(this.GetSessionStorage("auth-ttl"));
  noSavedAuth = searchParams.has("refresh");
  useLocalAuth;

  loginOnly = window.loginOnly;
  requireLogin = searchParams.has("rl");
  loginBackPath;
  capturedLogin = this.embedded && searchParams.has("cl");
  showLogin = this.requireLogin || searchParams.get("action") === "login" || searchParams.get("action") === "loginCallback";

  loggedIn = false;
  signingOut = false;
  externalWalletUser = false;
  disableCloseEvent = false;
  darkMode = !searchParams.has("lt");

  loginCustomization = {};

  marketplaceId = undefined;
  marketplaceHashes = {};
  tenantSlug = undefined;
  marketplaceSlug = undefined;

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

  routeChange;

  shortURLs = {};

  _resources = {};
  logTiming = false;

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

    this.LoadResource = this.LoadResource.bind(this);

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

    if(this.geo) {
      this.SetSessionStorage("geo", this.geo);
    }

    if(this.authTTL) {
      this.SetSessionStorage("auth-ttl", this.authTTL);
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
        // Only update VH if height has changed significantly enough
        if(Math.abs(window.innerHeight - this.originalViewportHeight) > 50) {
          SetVH();
          this.originalViewportHeight = window.innerHeight;
        }
      }, 10);
    });

    this.logTiming = new URLSearchParams(location.search).has("logTiming") || this.GetSessionStorage("log-timing");
    if(this.logTiming) {
      this.SetSessionStorage("log-timing", true);
    }

    this.Initialize();
  }

  RouteChange(pathname) {
    this.SendEvent({event: EVENTS.ROUTE_CHANGE, data: pathname});
  }

  SetDiscoverFilter(filter) {
    this.discoverFilter = filter;
  }

  SetLanguage = flow(function * (language="en") {
    language = language.toLowerCase();

    // Find matching preference (including variants, e.g. pt-br === pt)
    const availableLocalizations = [...this.uiLocalizations, "test"];
    language =
      // Prefer exact match
      availableLocalizations.find(key => key === language) ||
      // Accept close match (e.g. pt -> pt-br)
      availableLocalizations.find(key => key.startsWith(language) || language.startsWith("key"));

    if(!language || language.startsWith("en")) {
      this.l10n = LocalizationEN;
      this.language = "en";
      return true;
    }

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

    return true;
  });

  SetCurrentProperty = flow(function * (mediaPropertySlugOrId) {
    if(!mediaPropertySlugOrId) {
      this.currentPropertyId = undefined;
      this.currentPropertySlug = undefined;
      this.currentPropertyTenantId = undefined;
      return;
    } else if(
      this.currentPropertyId === mediaPropertySlugOrId ||
      this.currentPropertySlug === mediaPropertySlugOrId
    ) {
      // Already set
      return;
    }

    yield this.mediaPropertyStore.LoadMediaPropertyHashes();

    const propertyHash = this.mediaPropertyStore.mediaPropertyHashes[mediaPropertySlugOrId];

    if(!propertyHash) {
      return;
    }

    const propertySlug = Object.keys(this.mediaPropertyStore.mediaPropertyHashes)
      .find(key =>
          key &&
          !key.startsWith("iq") &&
          this.mediaPropertyStore.mediaPropertyHashes[key] === propertyHash
      );

    const propertyId = this.client.utils.DecodeVersionHash(propertyHash).objectId;

    this.currentPropertyId = propertyId;
    this.currentPropertySlug = propertySlug;
    this.currentPropertyTenantId = yield this.client.ContentObjectTenantId({objectId: propertyId});

    yield this.InitializeAuth0Client();
  });

  Initialize = flow(function * () {
    try {
      this.loaded = false;

      if(window.sessionStorageAvailable) {
        let oryUrl = EluvioConfiguration.ory_configuration.url;
        if(this.isCustomDomain) {
          const parsedUrl = parseDomain(window.location.hostname);
          if(parsedUrl.type !== "INVALID" && parsedUrl.type !== "RESERVED") {
            oryUrl = new URL(`https://ory.svc.${parsedUrl.domain}.${parsedUrl.topLevelDomains.join(".")}`).toString();
          }
        }

        // Initialize Ory client
        const {Configuration, FrontendApi} = yield import("@ory/client");
        this.oryClient = new FrontendApi(
          new Configuration({
            features: {
              kratos_feature_flags_use_continue_with_transitions: true,
              use_continue_with_transitions: true
            },
            basePath: oryUrl,
            // we always want to include the cookies in each request
            // cookies are used for sessions and CSRF protection
            baseOptions: {
              withCredentials: true
            }
          })
        );
      }

      // Start loading media properties

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

      const client = yield ElvClient.FromConfigurationUrl({
        configUrl:
          EluvioConfiguration.network === "main" ?
            "https://main.glb.contentfabric.io/s/main/config" :
            "https://demov3.net955210.contentfabric.io/config"
      });

      this.walletClient = yield ElvWalletClient.Initialize({
        client,
        appId: this.appId,
        network: EluvioConfiguration.network,
        mode: EluvioConfiguration.mode,
        localization: this.language === "en" ? undefined : this.language,
        storeAuthToken: false,
        skipMarketplaceLoad: true
      });

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

      // Load domain map
      if(this.isCustomDomain) {
        let propertySlug = window.__domainPropertySlug;
        yield this.mediaPropertyStore.LoadMediaPropertyHashes();
        let propertyHash = this.mediaPropertyStore.mediaPropertyHashes[propertySlug];

        if(propertySlug && !propertySlug.startsWith("@") && propertyHash) {
          const propertyId = this.client.utils.DecodeVersionHash(propertyHash).objectId;
          this.customDomainPropertyId = propertyId;
          this.customDomainPropertySlug = propertySlug;
          this.customDomainPropertyHash = propertyHash;

          this.mediaPropertyStore.mediaPropertyHashes[propertySlug] = propertyHash;
          this.mediaPropertyStore.mediaPropertyHashes[propertyId] = propertyHash;
          this.mediaPropertyStore.mediaPropertyIds[propertySlug] = propertyId;

          this.SetCurrentProperty(propertySlug);
        }
      } else if(searchParams.get("pid")) {
        this.SetCurrentProperty(searchParams.get("pid"));
      }

      if(this.customDomainPropertyId) {
        if(this.isCustomDomain && window.location.pathname === "/") {
          this.routeChange = UrlJoin("/", this.currentPropertySlug || this.currentPropertyId);
        }
      }

      yield this.InitializeAuth0Client();

      try {
        // Auth parameter containing wallet app formatted tokens
        const authInfo = searchParams.get("auth");

        if(authInfo) {
          this.SetAuthInfo(JSON.parse(Utils.FromB58ToStr(authInfo)));
          this.ClearLoginParams();
        }
      } catch(error) {
        this.Log("Failed to load auth from parameter", true);
        this.Log(error, true);
      }

      try {
        // Auth parameter containing raw info
        const authInfo = searchParams.get("authorization");

        if(authInfo) {
          yield this.SetAuthInfoFromAuthorizationParam(JSON.parse(Utils.FromB58ToStr(authInfo)));
          this.ClearLoginParams();
        }
      } catch(error) {
        this.Log("Failed to load auth from parameter", true);
        this.Log(error, true);
      }

      if(!this.inFlow) {
        // If we have saved auth info and are not doing code login session, load it
        if(this.AuthInfo() && !this.authCode) {
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
        // eslint-disable-next-line no-console
        console.timeEnd("Initial Load");
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

  AuthenticateOry = flow(function * ({nonce, installId, origin, userData, sendWelcomeEmail, sendVerificationEmail, force=false}={}) {
    if(this.authenticating) { return; }

    let email, jwtToken;
    try {
      const response = yield this.oryClient.toSession({tokenizeAs: EluvioConfiguration.ory_configuration.jwt_template});
      email = response.data.identity.traits.email;
      jwtToken = response.data.tokenized;

      yield this.Authenticate({
        idToken: jwtToken,
        force,
        provider: "ory",
        nonce,
        installId,
        origin,
        user: {
          name: email,
          email,
          // TODO: check verification
          verified: true,
          userData
        }
      });

      if(sendWelcomeEmail) {
        const previouslySignedIn = yield this.walletClient.ProfileMetadata({
          type: "app",
          mode: "private",
          appId: this.appId,
          key: `signed-in-${EluvioConfiguration.network}`
        });

        if(!previouslySignedIn) {
           this.SendLoginEmail({email, type: "send_welcome_email"});

          yield this.walletClient.SetProfileMetadata({
            type: "app",
            mode: "private",
            appId: this.appId,
            key: `signed-in-${EluvioConfiguration.network}`,
            value: "true"
          });
        }
      }

      if(sendVerificationEmail) {
        this.SendLoginEmail({email, type: "request_email_verification"});
      }

      return true;
    } catch(error) {
      this.Log("Error logging in with Ory:", true);
      this.Log(error);

      if([400, 403, 503].includes(parseInt(error?.status))) {
        throw { login_limited: true };
      }
    }
  });

  GetPropertySlugOrId() {
    let id = this.currentPropertyId || this.routeParams.mediaPropertySlugOrId;

    if(id) {
      return id;
    } else if(window.location.pathname.includes("/p/")) {
      return window.location.pathname.split("/p/").slice(-1)[0].split("/")[0];
    } else {
      const slug = window.location.pathname.split("/")[1];

      if(slug !== "login") {
        return slug;
      }
    }
  }

  InitializeAuth0Client = flow(function * () {
    const config = yield this.LoadPropertyCustomization(
      this.GetPropertySlugOrId()
    );

    if(!config?.login?.settings?.use_auth0 || !config?.login?.settings?.auth0_domain) { return; }

    const {Auth0Client} = yield import("@auth0/auth0-spa-js");
    this.auth0 = new Auth0Client({
      domain: config.login.settings.auth0_domain,
      clientId: config.login.settings.auth0_client_id,
      authorizationParams: {
        redirect_uri: UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, ""),
      },
      useRefreshTokensFallback: true,
      cacheLocation: "localstorage",
      //useRefreshTokens: true,
    });
  });

  AuthenticateAuth0 = flow(function * ({nonce, installId, origin, userData}={}) {
    try {
      // eslint-disable-next-line no-console
      console.time("Auth0 Authentication");

      // Check for existing Auth0 authentication status
      // Note: auth0.checkSession hangs sometimes without throwing an error - if it takes longer than 5 seconds, abort.
      // eslint-disable-next-line no-async-promise-executor
      yield new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => reject("Auth0 checkSession timeout"), 5000);

        await this.auth0.checkSession();

        clearTimeout(timeout);

        resolve();
      });

      if(yield this.auth0.isAuthenticated()) {
        this.Log("Authenticating with Auth0 session");

        const authInfo = yield this.auth0.getIdTokenClaims();

        yield this.Authenticate({
          idToken: authInfo.__raw,
          provider: "auth0",
          nonce,
          installId,
          origin,
          user: {
            name: authInfo.name,
            email: authInfo.email,
            verified: authInfo.email_verified,
            userData
          }
        });

        this.ClearLoginParams();
      }
    } catch(error) {
      if(error?.message?.toLowerCase() !== "login required") {
        this.Log("Error logging in with Auth0:", true);
        this.Log(error, true);

        this.ClearLoginParams();
      }

      if([400, 403, 503].includes(parseInt(error?.status))) {
        throw { uiMessage: this.l10n.login.errors.too_many_logins };
      }

      this.SignOut({returnUrl: window.location.href, reload: true, logOutAuth0: true});
    } finally {
      // eslint-disable-next-line no-console
      console.timeEnd("Auth0 Authentication");
    }
  });

  ClearLoginParams() {
    try {
      // Ensure login parameters are cleared
      let paramKeys = [
        "code",
        "origin",
        "source",
        "action",
        "provider",
        "mode",
        "response",
        "redirect",
        "elvid",
        "clear",
        "marketplace",
        "mid",
        "data",
        "state",
        "auth",
        "authorization",
        "next"
      ];

      // If on code login page, preserve the parameters so the page can be refreshed and still work
      const url = new URL(window.location.href);
      if(url.searchParams.has("elvid")) {
        paramKeys = [
          "code",
          "data",
          "state"
        ];

        if(url.searchParams.has("action")) {
          url.searchParams.set("action", "login");
        }
      }

      paramKeys.forEach(key => url.searchParams.delete(key));

      window.history.replaceState({}, document.title, url.toString());
    } catch(error) {
      this.Log("Failed to clear login URL parameters", true);
      this.Log(error, true);
    }
  }

  Authenticate = flow(function * ({
    idToken,
    clientAuthToken,
    clientSigningToken,
    provider="external",
    externalWallet,
    walletName,
    installId,
    nonce,
    origin,
    user,
    saveAuthInfo=true,
    signerURIs,
    force=false,
    callback
  }) {
    if(this.authenticating) { return; }

    try {
      this.SetAlertNotification(undefined);
      this.authenticating = true;
      this.loggedIn = false;

      if(externalWallet === "Metamask" && !this.cryptoStore.MetamaskAvailable()) {
        // Metamask not available, link to download or open in app
        const url = this.FlowURL({flow: "redirect", parameters: {url: window.location.href}});
        const a = document.createElement("a");
        a.href = `https://metamask.app.link/dapp/${url.toString().replace("https://", "")}`;

        a.target = "_self";
        document.body.appendChild(a);
        a.click();
        a.remove();

        return;
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
        const tokens = yield this.walletClient.AuthenticateOAuth({
          idToken,
          email: user?.email,
          tenantId: this.currentPropertyTenantId,
          shareEmail: user?.userData?.share_email,
          extraData: {
            ...(user?.userData || {}),
            origin: origin || "Unknown"
          },
          signerURIs,
          nonce: nonce || Utils.B58(ParseUUID(UUID())),
          installId,
          appName: origin,
          createRemoteToken: !this.useLocalAuth,
          force,
          tokenDuration: this.authTTL || 24
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
        provider,
        nonce,
        installId,
        save: this.authCode ? false : saveAuthInfo
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
        if(!this.loggedIn) { return; }

        if(!this.AuthInfo(10 * 60 * 1000)) {
          this.SignOut({message: this.l10n.login.errors.session_expired});
        } else if(!(await this.walletClient.TokenStatus())) {
          this.SignOut({message: this.l10n.login.errors.forced_logout});
        }
      };

      if(!this.useLocalAuth) {
        CheckTokenStatus();

        this.tokenStatusInterval = setInterval(() => {
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

  SetDomainCustomization = flow(function * (mediaPropertyId) {
    if(this.currentPropertyId === mediaPropertyId && this.domainSettings) {
      return;
    }

    this.SetCurrentProperty(mediaPropertyId);

    yield this.mediaPropertyStore.LoadMediaPropertyHashes();

    const options = yield this.LoadPropertyCustomization(this.currentPropertyId);

    if(!options) { return; }

    this.domainSettings = options;

    this.SetPropertyCustomization(this.currentPropertyId);
  });

  ClearDomainCustomization() {
    this.SetCurrentProperty();

    this.domainSettings = undefined;
    this.SetCustomCSS("");
  }

  SetPropertyCustomization = flow(function * (mediaPropertySlugOrId) {
    const options = yield this.LoadPropertyCustomization(mediaPropertySlugOrId);

    if(!options) {
      return;
    }

    let variables = [];

    let css = [];
    if(options.styling?.font === "custom") {
      if(options.styling.custom_font_declaration) {
        if(options.styling.custom_font_definition) {
          css.push(options.styling.custom_font_definition);
        }

        const customFont = `${options.styling.custom_font_declaration}, Inter, sans-serif`;
        const customTitleFont = options.styling.custom_title_font_declaration ?
          `${options.styling.custom_title_font_declaration}, ${customFont}` : undefined;


        variables.push(`--font-family-primary: ${customTitleFont || customFont};`);
        variables.push(`--font-family-secondary: ${customFont};`);
        variables.push(`--font-family-tertiary: ${customFont};`);

        if(customTitleFont) {
          variables.push(`--font-family-title: ${customTitleFont};`);
        }

        css.push(`* { font-family: ${customFont}; }`);

        if(customTitleFont) {
          css.push(`*._title { font-family: ${customTitleFont}; }`);
          css.push(`*._title * { font-family: ${customTitleFont}; }`);
        }
      }
    }

    if(CSS.supports("color", options?.styling?.filter_color)) {
     variables.push(`--property-filter-color: ${options.styling.filter_color};`);
    }

    if(options?.styling?.filter_style === "squared") {
      //variables.push("--property-filter-border-radius: 0px;");
    } else if(options?.styling?.filter_style === "alternating") {
      variables.push("--property-filter-border-radius: 7px 0 7px 0;");
    }

    if(CSS.supports("color", options?.styling?.button_style?.background_color)) {
      variables.push(`--property-button-background--custom: ${options.styling.button_style.background_color};`);
      // If border color is not explicitly set, it should default to background color
      variables.push(`--property-button-border-color--custom: ${options.styling.button_style.background_color};`);
    }
    if(CSS.supports("color", options?.styling?.button_style?.text_color)) {
      variables.push(`--property-button-text--custom: ${options.styling.button_style.text_color};`);
    }
    if(CSS.supports("color", options?.styling?.button_style?.border_color)) {
      variables.push(`--property-button-border-color--custom: ${options.styling.button_style.border_color};`);
    }
    if(!isNaN(parseInt(options?.styling?.button_style?.border_radius))) {
      variables.push(`--property-button-border-radius--custom: ${options.styling.button_style.border_radius}px;`);
    }

    if(variables.length > 0) {
      css.unshift(":root {\n" + variables.join("\n") + "\n}\n");
    }

    this.SetCustomCSS(css.join("\n"));
  });

  LoadPropertyCustomization = flow(function * (mediaPropertySlugOrId) {
    if(!mediaPropertySlugOrId) { return; }

    // Client may not be initialized yet
    while(!this.client) {
      yield new Promise(resolve => setTimeout(resolve, 100));
    }

    const metadata = yield this.mediaPropertyStore.LoadMediaPropertyCustomizationMetadata({
      mediaPropertySlugOrId
    });

    return {
      mediaPropertyId: metadata.mediaPropertyId,
      tenant: metadata?.tenant,
      login: metadata?.login,
      styling: metadata.styling,
      settings: metadata.domain,
      font: metadata.styling?.font === "custom" && metadata.styling.custom_font_declaration
    };
  });

  LoadLoginCustomization = flow(function * (mediaPropertySlugOrId) {
    // Client may not be initialized yet but may not be needed
    while(!this.client) {
      yield new Promise(resolve => setTimeout(resolve, 100));
    }

    const property = mediaPropertySlugOrId || this.currentPropertyId || this.routeParams.mediaPropertySlugOrId;

    if(property) {
      return yield this.LoadPropertyCustomization(property);
    }
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
      const address = await this.walletClient.UserNameToAddress({userName});

      if(address && !Utils.EqualAddress(address, this.CurrentAddress())) {
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
      try {
        const profile = yield this.walletClient.Profile({userAddress, userName});

        if(!profile) {
          return;
        }

        if(profile.imageUrl && !this.ValidProfileImageUrl(profile.imageUrl)) {
          delete profile.imageUrl;
        }

        this.userProfiles[profile.userAddress] = profile;
        this.userProfiles[profile.userName] = profile;

        userAddress = userAddress || profile.userAddress;
      } catch(error) {
        this.Log(error, true);

        if(userAddress){
          this.userProfiles[userAddress] = {
            userAddress,
            badges: []
          };
        }
      }

      if(userAddress && Utils.EqualAddress(userAddress, this.CurrentAddress())) {
        this.userProfiles.me = this.userProfiles[userAddress];
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
      cssTag.innerHTML = css;
    }

    this.SetSessionStorage("custom-css", Utils.B64(css));
  }

  SetCustomizationOptions() {
    if(this.routeParams.mediaPropertySlugOrId) {
      this.SetPropertyCustomization(this.routeParams.mediaPropertySlugOrId);
    }
  }

  ClearCustomizationOptions() {
    // Give route params time to settle if path changed
    setTimeout(() => this.SetCustomizationOptions(), 100);
  }

  SetMarketplace({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash, specified=false, disableTenantStyling=false}) {
    if(!this.walletClient || this.currentPropertyId) { return; }

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

      // Give locationType time to settle if path changed
      setTimeout(() => this.SetCustomizationOptions(marketplace, disableTenantStyling), 100);

      return marketplace.marketplaceHash;
    } else if(Object.keys(this.walletClient.availableMarketplaces) > 0) {
      // Don't reset customization if marketplaces haven't yet loaded
      setTimeout(() => this.SetCustomizationOptions("default"), 100);
    }
  }

  LoadEvent = flow(function * ({tenantSlug, eventSlug, eventId, eventHash}) {
    if(eventSlug) {
      if(!tenantSlug) { throw Error("Load Event: Missing required tenant slug"); }

      const mainSiteId = this.walletClient.mainSiteId;
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

  LoadMarketplace = flow(function * (marketplaceId, localizationKey) {
    if(!this.walletClient.marketplaceLoadingStarted) {
      this.walletClient.marketplaceLoadingStarted = true;
      yield this.walletClient.LoadAvailableMarketplaces();
      this.walletClient.marketplacesLoaded = true;
    }

    while(!this.walletClient.marketplacesLoaded) {
      yield new Promise(resolve => setTimeout(resolve, 100));
    }

    if(!this.marketplaces[marketplaceId]) {
      const marketplace = yield this.walletClient.Marketplace({marketplaceParams: {marketplaceId}, localizationKey});

      yield this.checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});
      yield this.checkoutStore.MarketplacePrices({tenantId: marketplace.tenant_id});

      marketplace.items = marketplace.items.map(item => {
        if(this.checkoutStore.priceInfo[item.sku]) {
          item.price = {
            ...(item.price || {}),
            ...(this.checkoutStore.priceInfo[item.sku].allin_price_map || {}),
            USD: item.price.USD
          };
        }

        return item;
      });

      this.marketplaces[marketplaceId] = marketplace;
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

        const viewed = await this.walletClient.ProfileMetadata({
          type: "app",
          mode: "private",
          appId: this.appId,
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
      yield this.walletClient.SetProfileMetadata({
        type: "app",
        mode: "private",
        appId: this.appId,
        key,
        value: true
      });
    }

    this.viewedMedia[key] = true;
  });

  RemoveMediaViewed = flow(function * (key) {
    yield this.walletClient.RemoveProfileMetadata({
      type: "app",
      mode: "private",
      appId: this.appId,
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

  UserItems = flow(function * (params) {
    const response = yield this.walletClient.UserItems(params);

    const localizationKey = yield this.mediaPropertyStore.GetLocalizationKey({mediaPropertyId: this.currentPropertyId});
    if(localizationKey) {
      response.results = yield Promise.all(
        response.results.map(async item => {
          try {
            const localizedMetadata = (await this.client.ContentObjectMetadata({
              versionHash: item.details.VersionHash,
              metadataSubtree: UrlJoin("public", "asset_metadata", "localizations", localizationKey, "nft"),
              produceLinkUrls: true
            })) || {};

            item.metadata = MergeWith({}, item.metadata, localizedMetadata, (a, b) => b === null || b === "" ? a : undefined);
          } catch(error) {
            this.Log("Error localizing user item", true);
            this.Log(error);
          }

          return item;
        })
      );
    }

    return response;
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

 SignOut = flow(function * ({returnUrl, message, reload=true, clearSavedLogin=true, logOutAuth0=false}={}) {
    this.signingOut = true;

    clearInterval(this.tokenStatusInterval);

    if(clearSavedLogin) {
      this.ClearAuthInfo();
      this.SetLocalStorage("signed-out", "true");
    }

    if(this.oryClient) {
      try {
        const response = yield this.oryClient.createBrowserLogoutFlow();
        yield this.oryClient.updateLogoutFlow({token: response.data.logout_token});
      } catch(error) {
        this.Log(error, true);
      }
    }

    yield this.walletClient?.LogOut();

    if(message) {
      this.SetAlertNotification(message);
    }

    if(!reload) {
      this.loggedIn = false;
      this.signingOut = false;
      return;
    }

    if(this.auth0 && (logOutAuth0 || (yield this.auth0.isAuthenticated()))) {
      try {
        this.disableCloseEvent = true;

        // Auth0 has a specific whitelisted path for login/logout urls - rely on hash redirect
        returnUrl = new URL(returnUrl || this.ReloadURL({signOut: true}));
        returnUrl.hash = returnUrl.pathname;
        returnUrl.pathname = "";

        setTimeout(() => {
          this.auth0.logout({
            logoutParams: {
              returnTo: returnUrl.toString()
            }
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
        url.pathname = MediaPropertyBasePath(this.routeParams);
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

  // Auth
  SendLoginEmail = flow(function * ({tenantId, email, type, code, mediaPropertySlugOrId}) {
    email = email || this.walletClient.UserInfo()?.email;

    mediaPropertySlugOrId = mediaPropertySlugOrId || this.currentPropertyId || this.routeParams.mediaPropertySlugOrId;

    if(!tenantId) {
      yield this.mediaPropertyStore.LoadMediaPropertyHashes();

      const propertyId = this.mediaPropertyStore.mediaPropertyIds[mediaPropertySlugOrId];
      tenantId = yield this.client.ContentObjectTenantId({objectId: propertyId});
    }

    let path = !mediaPropertySlugOrId ? "/" :
      MediaPropertyBasePath({
        parentMediaPropertySlugOrId: this.routeParams.parentMediaPropertySlugOrId,
        mediaPropertySlugOrId: mediaPropertySlugOrId
      });

    let callbackUrl = new URL(window.location.origin);
    callbackUrl.pathname = path;

    switch(type) {
      case "request_email_verification":
        callbackUrl.pathname = UrlJoin(callbackUrl.pathname, "verify");
        callbackUrl.searchParams.set("next", path);
        break;
      case "create_account":
        callbackUrl.pathname = "/register";
        callbackUrl.searchParams.set("next", path);
        callbackUrl.searchParams.set("pid", mediaPropertySlugOrId);
        break;
    }

    try {
      const result = yield this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "ory", type),
          method: "POST",
          queryParams: code ? { code } : {},
          body: {
            tenant: tenantId,
            email,
            callback_url: callbackUrl.toString()
          },
          headers: type === "reset_password" ?
            {} :
            { Authorization: `Bearer ${this.authToken}` }
        })
      );

      if(type === "confirm_email") {
        this.SetAlertNotification(this.l10n.login.email_confirmed);
      }

      return result;
    } catch(error) {
      this.Log(error, true);

      if(type === "confirm_email") {
        this.SetAlertNotification(this.l10n.login.errors.email_confirmation_failed);
      } else {
        throw error;
      }
    }
  });

  AuthStorageKey() {
    return `auth-${this.network}`;
  }

  AuthInfo() {
    try {
      if(this.authInfo || this.noSavedAuth) {
        return this.authInfo;
      }

      const tokenInfo = this.GetLocalStorage(this.AuthStorageKey());

      if(tokenInfo) {
        let { clientAuthToken, clientSigningToken, provider, expiresAt } = JSON.parse(Utils.FromB64(tokenInfo));

        const { address } = JSON.parse(Utils.FromB58(clientAuthToken));

        return { clientAuthToken, clientSigningToken, provider, expiresAt, address };
      }
    } catch(error) {
      this.Log("Failed to retrieve auth info", true);
      this.Log(error, true);
      this.RemoveLocalStorage(this.AuthStorageKey());
    }
  }

  CheckAuthSession = flow(function * (expirationBuffer = 3 * 60 * 60 * 1000) {
    return yield this.LoadResource({
      key: "CheckAuthSession",
      id: "check-auth-session",
      anonymous: true,
      ttl: 20,
      Load: async () => {
        let {provider, expiresAt} = this.AuthInfo() || {};

        if(!provider || expiresAt - Date.now() > expirationBuffer) {
          return;
        }

        // Expired
        if(provider === "ory" && await this.AuthenticateOry()) {
          // Reauthentication from ory session successful
          return;
        }

        await this.SignOut({reload: true, message: this.l10n.login.errors.session_expired});
      }
    });
  });

  ClearAuthInfo() {
    this.RemoveLocalStorage(this.AuthStorageKey());

    this.authInfo = undefined;
  }

  SetAuthInfoFromAuthorizationParam = flow(function * ({
    clusterToken,
    fabricToken,
    tenantId,
    address,
    email,
    expiresAt,
    walletType="Custodial",
    walletName="Eluvio",
    signerURIs,
    provider
  }) {
    if(Utils.EqualAddress(address, this.AuthInfo()?.address)) {
      this.Log("Ignoring auth info from authorization param - Already logged in with this param");
      return;
    }

    switch(provider) {
      case "auth0":
      case "ory":
        walletType = "Custodial";
        walletName = "Eluvio";
        break;
      case "metamask":
        walletType = "External";
        walletName = "Metamask";
        break;

      default:
        this.Log(`Error setting auth from parameter: Invalid provider '${provider}'`);
    }

    // If we have the cluster token, create a fresh fabric token
    if(clusterToken) {
      yield this.client.SetRemoteSigner({authToken: clusterToken, signerURIs});

      try {
        expiresAt = JSON.parse(this.client.utils.FromB64(clusterToken)).exp || expiresAt;

        if(expiresAt - Date.now() < 5 * 60 * 60 * 1000) {
          // This auth expires too soon, ignore it
          return;
        }
      } catch(error) {
        this.Log("Failed to parse cluster token from authorization parameter:", true);
        this.Log(error);
      }

      fabricToken = yield this.client.CreateFabricToken({
        duration: 24 * 60 * 60 * 1000,
        context: email ? {usr: {email}} : {}
      });
    }

    const clientAuthToken = this.walletClient.SetAuthorization({
      clusterToken,
      fabricToken,
      tenantId,
      address,
      email,
      expiresAt,
      signerURIs,
      walletType,
      walletName,
      register: false
    });

    const clientSigningToken = this.walletClient.SetAuthorization({
      clusterToken,
      fabricToken,
      tenantId,
      address,
      email,
      expiresAt,
      signerURIs,
      walletType,
      walletName,
      register: false
    });

    this.SetAuthInfo({
      clientAuthToken,
      clientSigningToken,
      provider
    });
  });

  SetAuthInfo({clientAuthToken, clientSigningToken, provider="external", nonce, installId, save=true}) {
    let { address, expiresAt } = JSON.parse(Utils.FromB58(clientAuthToken));

    const authInfo = {
      clientSigningToken,
      clientAuthToken,
      provider,
      expiresAt,
      address,
      nonce,
      installId
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

  ShowLogin({requireLogin=false, backPath, Cancel, ignoreCapture=false}={}) {
    const mediaProperty = this.mediaPropertyStore.MediaProperty(this.routeParams);
    if(mediaProperty?.metadata?.login?.settings?.disable_login) {
      // Login disabled, ignore
      return;
    }

    if(this.capturedLogin && !ignoreCapture) {
      if(this.loggedIn) { return; }

      this.SendEvent({event: EVENTS.LOG_IN_REQUESTED});
    } else {
      this.requireLogin = requireLogin;
      this.loginBackPath = backPath;
      this.loginCancel = Cancel;
      this.showLogin = true;
    }
  }

  HideLogin() {
    this.showLogin = false;
    this.requireLogin = false;
    this.loginBackPath = undefined;

    this.loginCancel && this.loginCancel();

    this.loginCancel = undefined;
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
    }, 100);
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
    if(!backPath || (this.isCustomDomain && backPath === "/")) {
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


  // Ensure the specified load method is called only once unless forced
  LoadResource = flow(function * ({key, id, force=false, anonymous=false, ttl, Load}) {
    if(anonymous) {
      key = `load${key}-anonymous`;
    } else if(!anonymous) {
      while(!this.loaded || this.authenticating) {
        yield new Promise(resolve => setTimeout(resolve, 500));
      }

      key = `load${key}-${this.CurrentAddress() || "anonymous"}`;
    }

    if(force || (ttl && this._resources[key]?.[id] && Date.now() - this._resources[key][id].retrievedAt > ttl * 1000)) {
      // Force - drop all loaded content
      this._resources[key] = {};
    }

    this._resources[key] = this._resources[key] || {};

    if(force || !this._resources[key][id]) {
      if(this.logTiming) {
        this._resources[key][id] = {
          promise: (async (...args) => {
            activeTimers += 1;
            let start = Date.now();
            // eslint-disable-next-line no-console
            console.log(`${"-".repeat(activeTimers - 1)}Start Timing ${key.split("-").join(" ")} - ${id}`);
            const result = await Load(...args);
            // eslint-disable-next-line no-console
            console.log(`${(Date.now() - start)}ms`.padEnd(7, " "), `| End Timing ${key.split("-").join(" ")} - ${id}`);

            activeTimers -= 1;

            return result;
          })(),
          retrievedAt: Date.now()
        };
      } else {
        this._resources[key][id] = {
          promise: Load(),
          retrievedAt: Date.now()
        };
      }
    }

    return yield this._resources[key][id].promise;
  });
}

export const rootStore = new RootStore();
export const checkoutStore = rootStore.checkoutStore;
export const transferStore = rootStore.transferStore;
export const cryptoStore = rootStore.cryptoStore;
export const notificationStore = rootStore.notificationStore;
export const mediaPropertyStore = rootStore.mediaPropertyStore;

window.rootStore = rootStore;

