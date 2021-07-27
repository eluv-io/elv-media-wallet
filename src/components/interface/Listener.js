import {rootStore} from "Stores/index";
import {toJS} from "mobx";

const pages = {
  "discover": "/discover",
  "wallet": "/wallet",
  "items": "/wallet/collections",
  "item": "/wallet/collections/:tokenId",
  "tickets": "/wallet/tickets",
  "tokens": "/wallet/tokens",
  "profile": "/profile"
};

const FormatNFT = (nft) => {
  if(!nft || !nft.metadata) { return; }

  return toJS(nft);
};

const InitializeListener = (history) => {
  let target;
  if(window.self !== window.top) {
    // In iframe
    target = window.top;
  } else if(window.opener) {
    // Popup
    target = window.opener;
  } else {
    return;
  }

  const Listener = async event => {
    if(!event || !event.data || event.data.type !== "ElvMediaWalletClientRequest") { return; }
    const data = event.data;

    const Respond = ({response, error}) => {
      if(!target) { return; }

      target.postMessage({
        type: "ElvMediaWalletResponse",
        requestId: data.requestId,
        response,
        error
      }, "*");
    };

    switch(data.action) {
      case "items":
        if(rootStore.nfts.length === 0) {
          await rootStore.LoadCollections();
        }

        if(data.params.tokenId) {
          Respond({response: FormatNFT(rootStore.NFT(data.params.tokenId))});
        } else {
          Respond({response: rootStore.nfts.map(FormatNFT)});
        }

        break;
      case "navigate":
        if(data.params.path) {
          // Direct path
          history.push(data.params.path);
        } else {
          // Named page
          if(!pages[data.params.page]) {
            rootStore.Log(`Unknown page: ${data.params.page}`);
            Respond({error: `Unknown page: ${data.params.page}`});
            return;
          }

          // Replace route variables
          let route = pages[data.params.page];
          if(data.params.params) {
            Object.keys(data.params.params).forEach(key => {
              route = route.replace(`:${key}`, data.params.params[key]);
            });
          }

          history.push(route);

          Respond({});
        }

        break;
      default:
        rootStore.Log(`Unknown action: ${data.action}`);
        Respond({error: `Unknown action: ${data.action}`});
    }
  };

  window.addEventListener("message", Listener);
  window.onbeforeunload = () => window.removeEventListener("message", Listener);

  target.postMessage({
    type: "ElvMediaWalletResponse",
    requestId: "init"
  }, "*");
};

export default InitializeListener;
