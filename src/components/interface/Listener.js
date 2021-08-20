import {rootStore} from "Stores/index";
import {toJS} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import EVENTS from "../../../client/src/Events";

const pages = {
  // Wallet
  "wallet": "/wallet",
  "items": "/wallet/collections",
  "item": "/wallet/collections/:tokenId",
  "tickets": "/wallet/tickets",
  "tokens": "/wallet/tokens",

  // Profile
  "profile": "/profile",

  // Marketplace
  "marketplaces": "/marketplaces",
  "marketplace": "/marketplaces/:marketplaceId",
  "marketplaceItem": "/marketplaces/:marketplaceId/:sku",
  "drop": "/marketplaces/:marketplaceId/events/:dropId"
};

const FormatNFT = (nft) => {
  if(!nft || !nft.metadata) { return; }

  return toJS(nft);
};

const Target = () => {
  if(window.self !== window.top) {
    // In iframe
    return window.top;
  } else if(window.opener) {
    // Popup
    return window.opener;
  }
};

export const InitializeListener = (history) => {
  const target = Target();

  if(!target) { return; }

  const Listener = async event => {
    if(!event || !event.data || event.data.type !== "ElvMediaWalletClientRequest") { return; }
    const data = event.data;

    const Respond = ({response, error}) => {
      if(!target) { return; }

      target.postMessage({
        type: "ElvMediaWalletResponse",
        requestId: data.requestId,
        response: Utils.MakeClonable(response),
        error: Utils.MakeClonable(error)
      }, "*");
    };

    switch(data.action) {
      case "login":
        await rootStore.InitializeClient({
          authToken: data.params.token,
          address: data.params.address,
          user: data.params.user
        });
        break;
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
      case "toggleNavigation":
        rootStore.ToggleNavigation(data.params.enabled);

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
  window.onbeforeunload = () => {
    if(!rootStore.disableCloseEvent) {
      SendEvent({event: EVENTS.CLOSE});
    }
    window.removeEventListener("message", Listener);
  };

  target.postMessage({
    type: "ElvMediaWalletResponse",
    requestId: "init"
  }, "*");
};

export const SendEvent = ({event, data}) => {
  const target = Target();

  if(!target) { return; }

  target.postMessage({
    type: "ElvMediaWalletEvent",
    event,
    data: Utils.MakeClonable(data)
  }, "*");
};
