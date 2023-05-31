const {ElvWalletClient, Utils} = require("@eluvio/elv-client-js/src/walletClient/index");
const EVENTS = require("./Events");

const UUID = () => {
  return "XXXXXXXX".replace(/[X]/g, () => {
    const r = Math.floor(Math.random() * 16);
    return r.toString(16);
  });
};


// https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
const Popup = ({url, title, w, h}) => {
  // Fixes dual-screen position
  const dualScreenLeft = window.screenLeft || window.screenX;
  const dualScreenTop = window.screenTop || window.screenY;

  const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;

  const systemZoom = width / window.screen.availWidth;
  const left = (width - w) / 2 / systemZoom + dualScreenLeft;
  const top = (height - h) / 2 / systemZoom + dualScreenTop;
  const newWindow = window.open(url, title,
    `
      scrollbars=yes,
      width=${w / systemZoom},
      height=${h / systemZoom},
      top=${top},
      left=${left}
    `
  );

  if(window.focus) newWindow.focus();

  return newWindow;
};

let __id = 0;
class Id {
  static next(){
    __id++;
    return __id;
  }
}

const SandboxPermissions = () => {
  return [
    "allow-downloads",
    "allow-scripts",
    "allow-forms",
    "allow-modals",
    "allow-pointer-lock",
    "allow-orientation-lock",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-presentation",
    "allow-same-origin",
    "allow-downloads-without-user-activation",
    "allow-storage-access-by-user-activation"
  ].join(" ");
};

const LOG_LEVELS = {
  DEBUG: 0,
  WARN: 1,
  ERROR: 2
};

/**
 * This page contains documentation for client setup, navigation and other management.
 <br /><br />
 * <a href="./module-ElvWalletFrameClient_Methods.html">For details on retrieving information from and performing actions in the wallet, see the wallet client methods page.</a>
 * ### Wallet Client Proxy
 *
 * Most methods available in the [Eluvio Wallet Client](https://eluv-io.github.io/elv-client-js/wallet-client/index.html) are also available via proxy in the frame client. Simply access them through `walletFrameClient.walletClient`. Certain methods, such as those that generate signatures, are not available.
 <br /><br />
 * ```javascript
 * await walletFrameClient.walletClient.UserItems({
 *   start: 50,
 *   limit: 10
 * });
 * ```
 */
class ElvWalletFrameClient {
  Throw(error) {
    throw new Error(`Eluvio Media Wallet Client | ${error}`);
  }

  Log({message, level=this.LOG_LEVELS.WARN}) {
    if(level < this.logLevel) { return; }

    if(typeof message === "string") {
      message = `Eluvio Media Wallet Client | ${message}`;
    }

    switch(level) {
      case this.LOG_LEVELS.DEBUG:
        // eslint-disable-next-line no-console
        console.log(message);
        return;
      case this.LOG_LEVELS.WARN:
        // eslint-disable-next-line no-console
        console.warn(message);
        return;
      case this.LOG_LEVELS.ERROR:
        // eslint-disable-next-line no-console
        console.error(message);
        return;
    }
  }

  Destroy() {
    window.removeEventListener("message", this.EventHandler);

    if(this.Close) {
      this.Close();
    }

    if(this.target.close) {
      this.target.close();
    }
  }

  /**
   * This constructor should not be used. Please use <a href="#.InitializePopup">InitializeFrame</a> or <a href="#.InitializePopup">InitializePopup</a> instead.
   *
```javascript
import { ElvWalletFrameClient } from "@eluvio/elv-wallet-frame-client";

// Initialize in iframe at target element
const frameClient = await ElvWalletFrameClient.InitializeFrame({
 requestor: "My App",
 walletAppUrl: "https://wallet.contentfabric.io",
 target: document.getElementById("#wallet-target")
});

// Or initialize in a popup
const frameClient = await ElvWalletFrameClient.InitializePopup({
 requestor: "My App",
 walletAppUrl: "https://wallet.contentfabric.io",
});
```
   * @constructor
   */
  constructor({
    appUUID,
    requestor,
    walletAppUrl="https://wallet.contentfabric.io",
    target,
    Close,
    timeout=300
  }) {
    if(!walletAppUrl) {
      this.Throw("walletAppUrl not specified");
    }

    if(!target) {
      this.Throw("target not specified");
    }

    this.appUUID = appUUID;
    this.requestor = requestor;
    this.walletAppUrl = walletAppUrl;
    this.target = target;
    this.Close = Close;
    this.timeout = timeout;
    this.LOG_LEVELS = LOG_LEVELS;
    this.logLevel = this.LOG_LEVELS.WARN;
    this.EVENTS = EVENTS;

    this.eventListeners = {};
    Object.keys(EVENTS).forEach(key => this.eventListeners[key] = []);

    this.EventHandler = this.EventHandler.bind(this);

    window.addEventListener("message", this.EventHandler);

    // Ensure client is destroyed when target window closes
    this.AddEventListener(this.EVENTS.CLOSE, () => this.Destroy());

    // Initialize wallet client proxy
    this.walletClient = {};
    ElvWalletClient.AllowedMethods().forEach(methodName =>
      this.walletClient[methodName] = async (...args) => {
        return await this.SendMessage({
          action: "walletClientProxy",
          params: {
            methodName,
            params: Utils.MakeClonable(args)
          }
        });
      }
    );
  }

  EventHandler(event) {
    const message = event.data;

    if(
      message.type !== "ElvMediaWalletEvent" ||
      message.appUUID !== this.appUUID ||
      !EVENTS[message.event]
    ) {
      return;
    }

    const listeners = message.event === EVENTS.ALL ?
      this.eventListeners[EVENTS.ALL] :
      [...this.eventListeners[message.event], ...this.eventListeners[EVENTS.ALL]];

    listeners.forEach(async Listener => {
      try {
        await Listener(message);
      } catch(error) {
        this.Log({
          message: `${message.event} listener error:`,
          level: this.LOG_LEVELS.WARN
        });
        this.Log({
          message: error,
          level: this.LOG_LEVELS.WARN
        });
      }
    });
  }


  /**
   * Event keys that can be registered in AddEventListener.
   *
   * Available options: LOADED, LOG_IN, LOG_OUT, ROUTE_CHANGE, CLOSE, ALL
   *
   * Also accessible as a property via `walletClient.EVENTS`
   *
   * @methodGroup Events
   */
  Events() {
    return this.EVENTS;
  }

  /**
   * Add an event listener for the specified event
   *
   * Example:
   *
   * `walletClient.AddEventListener(walletClient.EVENTS.LOG_IN, HandleLogin);`
   *
   * @methodGroup Events
   * @param {string} event - An event key from <a href="#Events">Events</a>
   * @param {function} Listener - An event listener
   */
  AddEventListener(event, Listener) {
    if(!EVENTS[event]) { this.Throw(`AddEventListener: Invalid event ${event}`); }

    if(typeof Listener !== "function") { this.Throw("AddEventListener: Listener is not a function"); }

    this.eventListeners[event].push(Listener);
  }

  /**
   * Remove the specified event listener
   *
   * @methodGroup Events
   * @param {string} event - An event key from <a href="#Events">Events</a>
   * @param {function} Listener - The listener to remove
   */
  RemoveEventListener(event, Listener) {
    if(!EVENTS[event]) { this.Throw(`RemoveEventListener: Invalid event ${event}`); }
    if(typeof Listener !== "function") { this.Throw("RemoveEventListener: Listener is not a function"); }

    this.eventListeners[event] = this.eventListeners[event].filter(f => f !== Listener);
  }


  /**
   * Request the wallet app navigate to the specified page.
   *
   * When specifying a marketplace, you must provide either:
   <pre>
   - tenantSlug and marketplaceSlug - Slugs for the tenant and marketplace
   - marketplaceHash - Version hash of a marketplace
   - marketplaceId - Object ID of a marketplace
   </pre>
   * Currently supported pages:
   <pre>
   - 'login' - The login page
   - 'wallet' - The user's global wallet
   - 'items' - List of items in the user's wallet
   - 'item' - A specific item in the user's wallet
     -- Required param: `contractAddress` or `contractId`
     -- Required param: `tokenId`
   - 'profile' - The user's profile
   - 'marketplaces'
   - 'marketplace':
     -- Required param: marketplace parameters
   - 'marketplaceItem`
     -- Required params: `sku`, marketplace parameters
   - 'marketplaceWallet' - The user's collection for the specified marketplace
     -- Required params: marketplace parameters
   - `drop`
     -- Required params: `tenantSlug`, `eventSlug`, `dropId`, marketplace parameters
   - `listings`
   - `marketplaceListings`
     -- Required params: marketplace parameters
   </pre>

   * @methodGroup Navigation
   * @namedParams
   * @param {string=} page - A named app path
   * @param {Object=} params - URL parameters for the specified path, e.g. { tokenId: <token-id> } for an 'item' page.
   * @param {string=} path - An absolute app path
   * @param {boolean=} loginRequired - If login was specified, this parameter will control whether the login prompt is dismissible
   * @param {Array<string>=} marketplaceFilters - A list of filters to limit items shown in the marketplace store page
   *
   * @returns {string} - Returns the actual route to which the app has navigated
   */
  async Navigate({page, path, loginRequired, params, marketplaceFilters=[]}) {
    return this.SendMessage({
      action: "navigate",
      params: {
        page,
        path,
        params,
        loginRequired,
        marketplaceFilters
      }
    });
  }

  /**
   * Retrieve the current location path of the wallet app
   *
   * @methodGroup Navigation
   * @returns {string} - The current path of the wallet app
   */
  async CurrentPath() {
    return this.SendMessage({
      action: "currentPath"
    });
  }


  /**
   * Request the navigation header and footer to be shown or hidden in the wallet
   *
   * @methodGroup Navigation
   * @namedParams
   * @param {boolean=} enabled=true - True to show navigation, false to hide it
   */
  async ToggleNavigation(enabled=true) {
    return this.SendMessage({
      action: "toggleNavigation",
      params: {
        enabled
      },
      noResponse: true
    });
  }

  /**
   * Set whether the wallet should be displayed in dark mode
   *
   * @methodGroup Navigation
   * @namedParams
   * @param {boolean=} enabled=true - True to enable dark mode, false to disable
   */
  async ToggleDarkMode(enabled=true) {
    return this.SendMessage({
      action: "toggleDarkMode",
      params: {
        enabled
      },
      noResponse: true
    });
  }

  /**
   * Request the wallet enter/exit 'side panel' mode, where certain elements are hidden
   *
   * @methodGroup Navigation
   * @namedParams
   * @param {boolean=} enabled=true - Whether side panel mode should be enabled
   */
  async ToggleSidePanelMode(enabled=true) {
    return this.SendMessage({
      action: "toggleSidePanelMode",
      params: {
        enabled
      },
      noResponse: true
    });
  }

  // Alias
  async SignIn() {
    return await this.LogIn(arguments[0] || {});
  }

  /**
   * Sign the user in to the wallet app. Authorization can be provided in three ways:
   <ul>
    <li>- Wallet app token retrieved from elv-wallet-app-client (Preferred)</li>
    <li>- ID token from an OAuth flow</li>
    <li>- Eluvio authorization token previously retrieved from exchanging an ID token</li>
   <br/>
   *
   * NOTE: This is only to be used if authorization is performed outside of the wallet app. To direct the
   * wallet application to the login page, use the <a href="#Navigate">Navigate</a> method
   *
   * @methodGroup Authorization
   * @namedParams
   * @param {string=} clientAuthToken - An app token retrieved via elv-wallet-app-client. If this is provided, no other parameters are necessary.
   * @param {string=} email - The email address of the user
   * @param {string=} address - The address of the user
   * @param {string=} tenantId - A tenant Id to associate with the login
   * @param {string=} idToken - An OAuth ID token to authenticate with
   * @param {string=} authToken - An Eluvio authorization token
   * @param {string=} fabricToken - An Eluvio authorization token signed by the user
   * @param {string=} walletName - If signing in from an external wallet such as metamask, the name of the wallet
   * @param {number=} expiresAt - A unix epoch timestamp indicating when the specified authorization expires
   */
  async LogIn({clientAuthToken, email, idToken, authToken, fabricToken, address, walletName, tenantId, expiresAt}) {
    return this.SendMessage({
      action: "login",
      params: {
        clientAuthToken,
        idToken,
        authToken,
        fabricToken,
        address,
        tenantId,
        walletName,
        expiresAt,
        user: {
          name,
          email
        }
      }
    });
  }

  // Alias
  async SignOut() {
    return await this.LogOut(arguments[0] || {});
  }

  /**
   * Sign the current user out
   *
   * @methodGroup Authorization
   */
  async LogOut() {
    this.SendMessage({
      action: "logout",
      params: {}
    });

    await Promise.race([
      new Promise(resolve => {
        this.AddEventListener(EVENTS.LOADED , () => resolve());
      }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
  }

  /**
   * Reload the wallet application
   *
   * @methodGroup Navigation
   */
  async Reload() {
    return this.SendMessage({
      action: "reload",
      params: {}
    });
  }

  /**
   * Initialize the media wallet in a new window.
   *
   * Calling client.Destroy() will close the popup.
   *
   * @methodGroup Constructor
   * @namedParams
   * @param {string} requestor - The name of your application. This field is used in permission prompts, e.g.
   <br />
   <br />
   `<requestor> is requesting to perform <action>`
   * @param {string=} walletAppUrl=https://wallet.contentfabric.io - The URL of the Eluvio Media Wallet app
   * @param {string=} tenantSlug - Specify the URL slug of your tenant. Required if specifying marketplaceSlug
   * @param {string=} marketplaceSlug - Specify the URL slug of your marketplace
   * @param {string=} marketplaceId - Specify the ID of your marketplace. Not necessary if marketplaceSlug is specified
   * @param {string=} previewMarketplaceId - Specify the ID of a marketplace to show a preview for.
   * @param {boolean=} requireLogin=false - If specified, users will be required to log in before accessing any page in the app
   * @param {boolean=} loginOnly=false - If specified, only the login flow will be shown. Be sure to register an event listener for the `LOG_IN` event. `client.Destroy()` can be used to close the popup after login. Note that once this mode is activated, it cannot be deactivated - you must re-initialize the popup/frame.
   * @param {boolean=} captureLogin=false - If specified, the parent frame will be responsible for handling login requests. When the user attempts to log in, the LOG_IN_REQUESTED event will be fired.
   * @param {boolean=} darkMode=false - Specify whether the app should be in dark mode
   *
   * @returns {Promise<ElvWalletFrameClient>} - The ElvWalletFrameClient initialized to communicate with the media wallet app in the new window.
   */
  static async InitializePopup({
    requestor,
    walletAppUrl="https://wallet.contentfabric.io",
    tenantSlug,
    marketplaceSlug,
    marketplaceId,
    marketplaceHash,
    previewMarketplaceId,
    requireLogin=false,
    loginOnly=false,
    captureLogin=false,
    darkMode=false
  }) {
    const appUUID = UUID();

    walletAppUrl = new URL(walletAppUrl);

    walletAppUrl.searchParams.set("appUUID", appUUID);

    walletAppUrl.searchParams.set("origin", window.location.origin);

    if(marketplaceSlug) {
      walletAppUrl.searchParams.set("mid", `${tenantSlug}/${marketplaceSlug}`);
    } else if(marketplaceId || marketplaceHash) {
      walletAppUrl.searchParams.set("mid", marketplaceHash || marketplaceId);
    }

    if(walletAppUrl.searchParams.has("mid") && !walletAppUrl.hash) {
      walletAppUrl.hash = `#/marketplaces/redirect/${tenantSlug}/${marketplaceSlug}/store`;
    }

    if(requireLogin){
      walletAppUrl.searchParams.set("rl", "");
    }

    if(loginOnly) {
      walletAppUrl.searchParams.set("lo", "");
    }

    if(captureLogin) {
      walletAppUrl.searchParams.set("cl", "");
    }

    if(darkMode) {
      walletAppUrl.searchParams.set("dk", "");
    }

    if(previewMarketplaceId) {
      walletAppUrl.searchParams.set("preview", previewMarketplaceId);
    }

    const target = Popup({url: walletAppUrl.toString(), title: "Eluvio Media Wallet", w: 400, h: 700});

    const client = new ElvWalletFrameClient({
      appUUID,
      requestor,
      walletAppUrl: walletAppUrl.toString(),
      target,
      Close: () => target.close()
    });

    // Ensure app is initialized
    await client.AwaitMessage("init");

    // Watch for popup to be closed
    let popupInterval = setInterval(() => {
      if(target.closed) {
        clearInterval(popupInterval);
        client.EventHandler({data: { type: "ElvMediaWalletEvent", event: EVENTS.CLOSE }});
      }
    }, 1000);

    return client;
  }

  /**
   * Initialize the media wallet in a new iframe. The target can be an existing iframe or an element in which to create the iframe,
   * and the target can be passed in either as an element directly, or by element ID.
   *
   * @methodGroup Constructor
   *
   * @namedParams
   * @param {string} requestor - The name of your application. This field is used in permission prompts, e.g.
   <br />
   <br />
   `<requestor> is requesting to perform <action>`
   * @param {string=} walletAppUrl=https://wallet.contentfabric.io - The URL of the Eluvio Media Wallet app
   * @param {Object | string} target - An HTML element or the ID of an element
   * @param {string=} tenantSlug - Specify the URL slug of your tenant. Required if specifying marketplace slug
   * @param {string=} marketplaceSlug - Specify the URL slug of your marketplace
   * @param {string=} marketplaceId - Specify the ID of your marketplace. Not necessary if marketplaceSlug is specified
   * @param {string=} previewMarketplaceId - Specify the ID of a marketplace to show a preview for.
   * @param {boolean=} requireLogin=false - If specified, users will be required to log in before accessing any page in the app
   * @param {boolean=} loginOnly=false - If specified, only the login flow will be shown. Be sure to register an event listener for the `LOG_IN` event. Note that once this mode is activated, it cannot be deactivated - you must re-initialize the popup/frame.
   * @param {boolean=} captureLogin - If specified, the parent frame will be responsible for handling login requests. When the user attempts to log in, the LOG_IN_REQUESTED event will be fired.
   * @param {boolean=} darkMode=false - Specify whether the app should be in dark mode
   *
   * @returns {Promise<ElvWalletFrameClient>} - The ElvWalletFrameClient initialized to communicate with the media wallet app in the new iframe.
   */
  static async InitializeFrame({
    requestor,
    walletAppUrl="https://wallet.contentfabric.io",
    target,
    tenantSlug,
    marketplaceSlug,
    marketplaceId,
    marketplaceHash,
    previewMarketplaceId,
    requireLogin=false,
    loginOnly=false,
    captureLogin=false,
    darkMode=false
  }) {
    const appUUID = UUID();

    if(typeof target === "string") {
      const targetElement = document.getElementById(target);

      if(!targetElement) {
        throw Error(`Eluvio Media Wallet Client: Unable to find element with target ID ${target}`);
      }

      target = targetElement;
    }

    if((target.tagName || target.nodeName).toLowerCase() !== "iframe") {
      let parent = target;
      parent.innerHTML = "";

      target = document.createElement("iframe");
      parent.appendChild(target);
    }

    target.classList.add("-elv-media-wallet-frame");
    target.sandbox = SandboxPermissions();
    target.setAttribute("allowFullScreen", "");
    target.allow = "encrypted-media *; autoplay; fullscreen; clipboard-read; clipboard-write";
    target.title = "Eluvio Media Wallet";

    walletAppUrl = new URL(walletAppUrl);

    walletAppUrl.searchParams.set("appUUID", appUUID);

    walletAppUrl.searchParams.set("origin", window.location.origin);

    if(marketplaceSlug) {
      walletAppUrl.searchParams.set("mid", `${tenantSlug}/${marketplaceSlug}`);
    } else if(marketplaceId || marketplaceHash) {
      walletAppUrl.searchParams.set("mid", marketplaceHash || marketplaceId);
    }

    if(walletAppUrl.searchParams.has("mid") && !walletAppUrl.hash) {
      walletAppUrl.hash = `#/marketplaces/redirect/${tenantSlug}/${marketplaceSlug}/store`;
    }

    if(requireLogin){
      walletAppUrl.searchParams.set("rl", "");
    }

    if(loginOnly) {
      walletAppUrl.searchParams.set("lo", "");
    }

    if(captureLogin) {
      walletAppUrl.searchParams.set("cl", "");
    }

    if(darkMode) {
      walletAppUrl.searchParams.set("dk", "");
    }

    if(previewMarketplaceId) {
      walletAppUrl.searchParams.set("preview", previewMarketplaceId);
    }

    const client = new ElvWalletFrameClient({
      appUUID,
      requestor,
      walletAppUrl: walletAppUrl.toString(),
      target: target.contentWindow,
      Close: () => target && target.parentNode && target.parentNode.removeChild(target)
    });

    // Ensure app is initialized
    target.src = walletAppUrl.toString();
    await client.AwaitMessage("init");

    return client;
  }

  async SendMessage({action, params, noResponse=false}) {
    const requestId = `action-${Id.next()}`;

    this.target.postMessage({
      type: "ElvMediaWalletClientRequest",
      requestor: this.requestor,
      requestId,
      action,
      params
    }, this.walletAppUrl);

    if(noResponse) { return; }

    return (await this.AwaitMessage(requestId));
  }

  async AwaitMessage(requestId) {
    const timeout = this.timeout;
    return await new Promise((resolve, reject) => {
      let methodListener;

      // Initialize or reset timeout
      let timeoutId;
      const touchTimeout = () => {
        if(timeoutId) {
          clearTimeout(timeoutId);
        }

        if(timeout > 0) {
          timeoutId = setTimeout(() => {
            if(typeof window !== "undefined") {
              window.removeEventListener("message", methodListener);
            }

            reject(`Request ${requestId} timed out`);
          }, timeout * 1000);
        }
      };

      methodListener = async (event) => {
        try {
          const message = event.data;

          if(message.type !== "ElvMediaWalletResponse" || message.requestId !== requestId) {
            return;
          }

          clearTimeout(timeoutId);

          window.removeEventListener("message", methodListener);

          if(message.error) {
            reject(message.error);
          } else {
            resolve(message.response);
          }
        } catch(error){
          clearTimeout(timeoutId);

          window.removeEventListener("message", methodListener);

          reject(error);
        }
      };

      // Start the timeout
      touchTimeout();

      window.addEventListener("message", methodListener);
    });
  }
}

/**
 * `client.EVENTS` contains event keys for the AddEventListener and RemoveEventListener methods
 *
 * - `client.EVENTS.LOADED` - Wallet app has finished loading and authentication is settled. If a user is currently logged in, a `LOG_IN` event will have preceded this event.
 * - `client.EVENTS.LOG_IN` - User has logged in. Event data contains user address.
 * - `client.EVENTS.LOG_OUT` - User has logged out. Event data contains user address.
 * - `client.EVENTS.CLOSE` - Target window or frame has been closed or has otherwise unloaded the wallet app.
 * - `client.EVENTS.ROUTE_CHANGE` - The wallet app's current route has changed. Event data contains the current route of the app.
 * - `client.EVENTS.RESIZE` - This event will specify the full height and width of the wallet application as currently rendered
 * - `client.EVENTS.ALL` - Any of the above events has occurred.
 */
ElvWalletFrameClient.EVENTS = EVENTS;
ElvWalletFrameClient.LOG_LEVELS = LOG_LEVELS;

Object.assign(ElvWalletFrameClient.prototype, require("./ClientMethods"));

exports.ElvWalletFrameClient = ElvWalletFrameClient;
