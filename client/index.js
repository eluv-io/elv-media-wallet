import Utils from "@eluvio/elv-client-js/src/Utils";

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

class MediaWalletClient {
  Throw(error) {
    throw new Error(`Eluvio Media Wallet Client | ${error}`);
  }

  Log(message, error=false) {
    message = `Eluvio Media Wallet Client | ${message}`;
    error ? console.error(message) : console.log(message);
  }

  Destroy() {
    if(this.Close) {
      this.Close();
    }
  }

  constructor({
    walletAppUrl="http://media-wallet.v3.contentfabric.io",
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

    this.utils = Utils;
  }

  async Items() {
    return await this.SendMessage({
      action: "items",
      params: {}
    });
  }

  async Item({tokenId}) {
    return await this.SendMessage({
      action: "items",
      params: {
        tokenId
      }
    });
  }

  async Navigate({page, path, params}) {
    return this.SendMessage({
      action: "navigate",
      params: {
        page,
        path,
        params
      }
    });
  }

  async SendMessage({action, params}) {
    const requestId = `action-${Id.next()}`;

    this.target.postMessage({
      type: "ElvMediaWalletClientRequest",
      requestId,
      action,
      params
    }, this.walletAppUrl);

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

export const InitializePopup = async ({walletAppUrl="http://media-wallet.v3.contentfabric.io"}) => {
  const target = Popup({url: walletAppUrl, title: "Eluvio Media Wallet", w: 400, h: 700});

  return new MediaWalletClient({walletAppUrl, target, Close: () => target.close()});
};

export const InitializeFrame = async ({
  walletAppUrl="http://media-wallet.v3.contentfabric.io",
  target,
  targetId
}) => {
  if(targetId) {
    target = document.getElementById(targetId);

    if(!target) {
      throw Error(`Eluvio Media Wallet Client: Unable to find element with target ID ${targetId}`);
    }
  }

  if((target.tagName || target.nodeName).toLowerCase() !== "iframe") {
    let parent = target;
    parent.innerHTML = "";

    target = document.createElement("iframe");
    parent.appendChild(target);
  }

  target.src = walletAppUrl;
  target.classList.add("-elv-media-wallet-frame");
  target.sandbox = SandboxPermissions();
  target.allowfullscreen = true;
  target.allow = "encrypted-media *";

  return new MediaWalletClient({
    walletAppUrl,
    target: target.contentWindow,
    Close: () => target.parentNode.removeChild(target)
  });
};
