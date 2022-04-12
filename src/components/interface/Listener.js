import {checkoutStore, rootStore, transferStore} from "Stores/index";
import {toJS} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import EVENTS from "../../../client/src/Events";
import UrlJoin from "url-join";

const pages = {
  // Wallet
  "wallet": "/wallet",
  "items": "/wallet/collection",
  "item": "/wallet/collection/:contractId/:tokenId",
  "tickets": "/wallet/tickets",
  "tokens": "/wallet/tokens",

  // Profile
  "profile": "/profile",

  // Marketplace
  "marketplaces": "/marketplaces",
  "marketplace": "/marketplace/:marketplaceId/store",
  "marketplaceItem": "/marketplace/:marketplaceId/store/:sku",
  "marketplaceWallet": "/marketplace/:marketplaceId/collection",
  "marketplaceListings": "/marketplace/:marketplaceId/listings",
  "drop": "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId",

  // Listings
  "listings": "/wallet/listings"
};

const FormatNFT = (nft) => {
  if(!nft || !nft.metadata) { return; }

  nft = toJS(nft);

  nft.contractAddress = nft.details.ContractAddr;
  nft.contractId = nft.details.ContractId;
  nft.tokenId = nft.details.TokenIdStr;
  nft.name = nft.metadata.display_name;

  if(nft.details.ListingId) {
    nft.listingId = nft.details.ListingId;
  }

  return nft;
};

const Target = () => {
  if(rootStore.embedded) {
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

    while(!rootStore.client) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const Respond = ({response, error}) => {
      if(!target) { return; }

      target.postMessage({
        type: "ElvMediaWalletResponse",
        requestId: data.requestId,
        response: Utils.MakeClonable(response),
        error: Utils.MakeClonable(error)
      }, "*");
    };

    let marketplaceInfo;
    if(data?.params?.marketplaceSlug) {
      marketplaceInfo = await rootStore.MarketplaceInfo({
        tenantSlug: data.params.tenantSlug,
        marketplaceSlug: data.params.marketplaceSlug,
        marketplaceId: data.params.marketplaceId,
        marketplaceHash: data.params.marketplaceHash
      });
    }


    let contractAddress, marketplace;
    switch(data.action) {
      // client.SignIn
      case "login":
        await rootStore.Authenticate({
          idToken: data.params.idToken,
          authToken: data.params.authToken,
          privateKey: data.params.privateKey,
          user: data.params.user,
          tenantId: data.params.tenantId
        });

        return Respond({});

      // client.SignOut
      case "logout":
        await rootStore.SignOut();

        return Respond({});

      // client.Profile
      case "profile":
        if(!rootStore.loggedIn) {
          return Respond({response: null});
        }

        let profile = toJS(rootStore.userProfile);
        delete profile.profileImage;

        return Respond({response: profile});

      // client.Stock
      case "stock":
        return Respond({response: toJS(await checkoutStore.MarketplaceStock({tenantId: marketplaceInfo?.tenantId}))});

      // client.ItemNames
      case "itemNames":
        return Respond({response: await transferStore.ListingNames({marketplaceId: marketplaceInfo?.marketplaceId})});

      // client.Items
      case "items":
        contractAddress = data.params.contractAddress || (data.params.contractId && Utils.HashToAddress(data.params.contractId));

        return Respond({
          response: (
            await transferStore.FilteredQuery({
              mode: "owned",
              sortBy: data.params.sortBy,
              sortDesc: data.params.sortDesc,
              filter: data.params.filter,
              contractAddress,
              limit: 10000,
              start: 0
            })
          ).results || []
        });

      // client.Item
      case "item":
        return Respond({
          response: FormatNFT(
            await rootStore.LoadNFTData({contractAddress: data.params.contractAddress, contractId: data.params.contractId, tokenId: data.params.tokenId})
          )
        });

      // client.Listings
      case "listings":
        contractAddress = data.params.contractAddress || (data.params.contractId && Utils.HashToAddress(data.params.contractId));

        return Respond({
          response: (
            await transferStore.FilteredQuery({
              mode: "listings",
              sortBy: data.params.sortBy,
              sortDesc: data.params.sortDesc,
              filter: data.params.filter,
              contractAddress,
              tenantIds: marketplaceInfo ? [ marketplaceInfo.tenantId ] : [],
              start: data.params.start || 0,
              limit: data.params.limit || 50
            })
          )
        });

      // client.Listing
      case "listing":
        return Respond({
          response: FormatNFT(
            ((await transferStore.FetchTransferListings({listingId: data.params.listingId})) || [])[0]
          )
        });

      // client.MarketplaceItems
      case "marketplaceItems":
        marketplace = await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId);

        return Respond({
          response: toJS(marketplace.items)
        });

      // client.MarketplaceStorefront
      case "marketplaceStorefront":
        marketplace = await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId);

        let storefront = toJS(marketplace.storefront);
        storefront.sections = storefront.sections.map(section => ({
          ...section,
          items: section.items
            .map(sku => toJS(marketplace.items.find(item => item.sku === sku)))
            .filter(item => item)
        }));

        return Respond({
          response: storefront
        });

      // client.MarketplaceMetadata
      case "marketplaceMetadata":
        return Respond({
          response: await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId)
        });

      // client.EventMetadata
      case "eventMetadata":
        return Respond({
          response: await rootStore.LoadEvent({
            tenantSlug: data.params.tenantSlug,
            eventSlug: data.params.eventSlug,
            eventId: data.params.eventId,
            eventHash: data.params.eventHash
          })
        });

      // client.SetMarketplace
      case "setMarketplace":
        const marketplaceHash = await rootStore.SetMarketplace({
          tenantSlug: data.params.tenantSlug,
          marketplaceSlug: data.params.marketplaceSlug,
          marketplaceId: data.params.marketplaceId,
          marketplaceHash: data.params.marketplaceHash
        });

        return Respond({response: marketplaceHash});

      // client.SetMarketplaceFilters, client.ClearMarketplaceFilters
      case "setMarketplaceFilters":
        await rootStore.SetMarketplaceFilters(data.params.filters);

        return Respond({});

      // client.CurrentPath
      case "currentPath":
        const pathname = UrlJoin("/", window.location.hash.replace("#", ""));

        return Respond({response: pathname});

      // client.Navigate
      case "navigate":
        rootStore.SetMarketplaceFilters(data.params.marketplaceFilters || []);

        let route;
        if(data.params.path === "/login" || data.params.page === "login") {
          rootStore.ShowLogin({requireLogin: data.params.loginRequired});

          route = "/login";
        } else if(data.params.path) {
          // Direct path
          history.push(data.params.path);

          route = data.params.path;
        } else {
          // Named page
          if(!pages[data.params.page]) {
            rootStore.Log(`Unknown page: ${data.params.page}`);
            return Respond({error: `Unknown page: ${data.params.page}`});
          }

          // Replace route variables
          route = pages[data.params.page];

          const params = (data.params || {}).params;
          if(params) {
            if(params.marketplaceSlug || params.marketplaceHash || params.marketplaceId) {
              await rootStore.SetMarketplace({
                tenantSlug: params.tenantSlug,
                marketplaceSlug: params.marketplaceSlug,
                marketplaceId: params.marketplaceId,
                marketplaceHash: params.marketplaceHash
              });

              params.marketplaceId = rootStore.marketplaceId;
            }

            if(params.contractAddress) {
              params.contractId = `ictr${Utils.AddressToHash(params.contractAddress)}`;
            }

            Object.keys(params).forEach(key => {
              route = route.replace(`:${key}`, params[key]);
            });
          }

          history.push(route);
        }

        return Respond({response: route});

      // client.ToggleNavigation
      case "toggleNavigation":
        rootStore.ToggleNavigation(data.params.enabled);

        return Respond({});

      // client.ToggleSidePanelMode
      case "toggleSidePanelMode":
        rootStore.ToggleSidePanelMode(data.params.enabled);

        return Respond({});

      // client.ToggleDarkMode
      case "toggleDarkMode":
        rootStore.ToggleDarkMode(data.params.enabled);

        return Respond({});

      // POPUP RESPONSES
      case "purchase":
        checkoutStore.PurchaseComplete({
          confirmationId: data.params.confirmationId,
          success: data.params.success,
          message: data.params.message
        });

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
