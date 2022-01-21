import EVENTS from "./Events";

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
 * Eluvio Media Wallet Client
 */
export class ElvWalletClient {
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
  }

  /**
   * This constructor should not be used. Please use <a href="#.InitializePopup">InitializeFrame</a> or <a href="#.InitializePopup">InitializePopup</a> instead.
   *
<pre><code>
import { ElvWalletClient } from "@eluvio/elv-wallet-client";

// Initialize in iframe at target element
const walletClient = await ElvWalletClient.InitializeFrame({
 walletAppUrl: "https://wallet.contentfabric.io",
 target: document.getElementById("#wallet-target"),
 marketplaceHash: <version-hash-of-marketplace>
});

// Or initialize in a popup
const walletClient = await ElvWalletClient.InitializePopup({
 walletAppUrl: "https://wallet.contentfabric.io",
});
</code></pre>
   * @constructor
   */
  constructor({
    walletAppUrl="http://wallet.contentfabric.io",
    target,
    Close,
    timeout=10
  }) {
    if(!walletAppUrl) {
      this.Throw("walletAppUrl not specified");
    }

    if(!target) {
      this.Throw("target not specified");
    }

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
  }

  EventHandler(event) {
    const message = event.data;

    if(message.type !== "ElvMediaWalletEvent" || !EVENTS[message.event]) { return; }

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
   * Available options: LOADED, LOG_IN, LOG_OUT, CLOSE, ALL
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
   * Return the current user's profile, including name, email and blockchain address.
   *
   * @return Promise<Object> - If a user is currently logged in, the user's profile is returned.
   */
  async UserProfile() {
    return await this.SendMessage({
      action: "profile",
      params: {}
    });
  }

  /**
   * Return info about all items in the user's wallet
   *
   * @methodGroup Items
   * @return Promise<Array<Object>> - Information about the items in the user's wallet.
   */
  async Items() {
    return await this.SendMessage({
      action: "items",
      params: {}
    });
  }

  /**
   * Return info about a specific item in the user's wallet
   *
   * @methodGroup Items
   * @namedParams
   * @param {string=} contractAddress - The address of the contract. Either contractAddress or contractId is required.
   * @param {string=} contractId - The ID of the contract. Either contractAddress or contractId is required.
   * @param {string} tokenId - The ID of the item
   *
   * @return Promise<Object> - Information about the requested item. Returns undefined if the item was not found.
   */
  async Item({contractAddress, contractId, tokenId}) {
    return await this.SendMessage({
      action: "items",
      params: {
        contractAddress,
        contractId,
        tokenId
      }
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

  /**
   * Set the marketplace for the wallet
   *
   * @methodGroup Navigation
   * @namedParams
   * @param {string=} marketplaceId - The ID of the marketplace
   * @param {string=} marketplaceHash - A version hash of the marketplace
   */
  async SetMarketplace({marketplaceId, marketplaceHash}) {
    return this.SendMessage({action: "setMarketplace", params: { marketplaceId, marketplaceHash }});
  }

  async SetMarketplaceFilters({filters=[]}) {
    return this.SendMessage({action: "setMarketplaceFilters", params: { filters }});
  }

  /**
   * Indicate that the wallet has become active in order to activate certain UI behaviors
   */
  async SetActive() {
    return this.SendMessage({action: "setActive", noResponse: true});
  }

  async SetAuthInfo({authToken, address, privateKey, user}) {
    return this.SendMessage({
      action: "login",
      params: {
        authToken,
        privateKey,
        address,
        user
      }
    });
  }

  /**
   * Request the wallet app navigate to the specified page.
   *
   * Currently supported pages:

      - 'items' - List of items in the user's wallet
      - 'item' - A specific item in the user's wallet
        -- Required param: `contractAddress` or `contractId`
        -- Required param: `tokenId`
      - 'profile' - The user's profile
      - 'marketplaces'
      - 'marketplace':
        -- Required param: `marketplaceId` or 'marketplaceHash'
      - 'marketplaceItem`
        -- Required params: `marketplaceId` or 'marketplaceHash', `sku`
      - `drop`
        -- Optional params: `marketplaceId` or 'marketplaceHash', `dropId`

   * @methodGroup Navigation
   * @namedParams
   * @param {string=} page - A named app path
   * @param {Object=} params - URL parameters for the specified path, e.g. { tokenId: <token-id> } for an 'item' page.
   * @param {string=} path - An absolute app path
   * @param {Array<string>=} marketplaceFilters - A list of filters to limit items shown in the marketplace store page
   */
  async Navigate({page, path, params, marketplaceFilters=[]}) {
    return this.SendMessage({
      action: "navigate",
      params: {
        page,
        path,
        params,
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
   * Initialize the media wallet in a new window.
   *
   * @methodGroup Constructor
   *
   * @namedParams
   * @param {string=} walletAppUrl=http://wallet.contentfabric.io - The URL of the Eluvio Media Wallet app
   * @param {string=} marketplaceId - Specify a specific marketplace for the wallet to use
   * @param {string=} marketplaceHash - Specify a specific version of a specific marketplace for the wallet to use
   * @param {boolean=} darkMode=false - Specify whether the app should be in dark mode
   *
   * @return {Promise<ElvWalletClient>} - The ElvWalletClient initialized to communicate with the media wallet app in the new window.
   */
  static async InitializePopup({walletAppUrl="http://wallet.contentfabric.io", marketplaceId, marketplaceHash, darkMode=false}) {
    walletAppUrl = new URL(walletAppUrl);

    if(marketplaceId || marketplaceHash) {
      walletAppUrl.searchParams.set("mid", marketplaceHash || marketplaceId);
    }

    if(darkMode) {
      walletAppUrl.searchParams.set("d", "");
    }

    const target = Popup({url: walletAppUrl.toString(), title: "Eluvio Media Wallet", w: 400, h: 700});

    const client = new ElvWalletClient({walletAppUrl: walletAppUrl.toString(), target, Close: () => target.close()});

    // Ensure app is initialized
    await client.AwaitMessage("init");

    return client;
  }

  /**
   * Initialize the media wallet in a new iframe. The target can be an existing iframe or an element in which to create the iframe,
   * and the target can be passed in either as an element directly, or by element ID.
   *
   * @methodGroup Constructor
   *
   * @namedParams
   * @param {string=} walletAppUrl=http://wallet.contentfabric.io - The URL of the Eluvio Media Wallet app
   * @param {Object | string} target - An HTML element or the ID of an element

   * @param {string=} marketplaceId - Specify a specific marketplace for the wallet to use
   * @param {string=} marketplaceHash - Specify a specific version of a specific marketplace for the wallet to use
   * @param {boolean=} darkMode=false - Specify whether the app should be in dark mode
   *
   * @return {Promise<ElvWalletClient>} - The ElvWalletClient initialized to communicate with the media wallet app in the new iframe.
   */
  static async InitializeFrame({walletAppUrl="http://wallet.contentfabric.io", target, marketplaceId, marketplaceHash, darkMode=false}) {
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
    target.allow = "encrypted-media *; clipboard-read; clipboard-write";

    walletAppUrl = new URL(walletAppUrl);

    if(marketplaceId || marketplaceHash) {
      walletAppUrl.searchParams.set("mid", marketplaceHash || marketplaceId);
    }

    if(darkMode) {
      walletAppUrl.searchParams.set("d", "");
    }

    const client = new ElvWalletClient({
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
 * - `client.EVENTS.LOG_IN` - User has logged in. Event data contains user address.
 * - `client.EVENTS.LOG_OUT` - User has logged out. Event data contains user address.
 * - `client.EVENTS.CLOSE` - Target window or frame has been closed or has otherwise unloaded the wallet app.
 * - `client.EVENTS.ALL` - Any of the above events has occurred.
 */
ElvWalletClient.EVENTS = EVENTS;
ElvWalletClient.LOG_LEVELS = LOG_LEVELS;

export default ElvWalletClient;
