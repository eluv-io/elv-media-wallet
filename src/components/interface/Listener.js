import {checkoutStore, rootStore, transferStore} from "Stores/index";
import {toJS} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import EVENTS from "../../../client/src/Events";
import UrlJoin from "url-join";
import {FormatPriceString} from "Components/common/UIComponents";
import {roundToDown} from "round-to";

const embedded = window.self !== window.top;

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

const Price = (item, quantity=1) => {
  const FormatPrice = amount => parseFloat(parseFloat(amount).toFixed(2));

  const price = item?.details?.ListingId ? item.details.Price : item.price.USD;
  const subtotal = price * quantity;
  const fee = Math.max(1, roundToDown(subtotal * 0.05, 2));
  const total = subtotal + fee;

  return {
    price: FormatPrice(price),
    subtotal: FormatPrice(subtotal),
    fee: FormatPrice(fee),
    total: FormatPrice(total),
    quantity
  };
};

// Serialize NFT and move some important details to top level
// NOTE: NFT has already run through transferStore.FormatResult
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

  // Generate embed URLs for additional media
  if(nft.metadata?.additional_media) {
    nft.metadata.additional_media = nft.metadata.additional_media.map(media => {
      try {
        // Generate embed URLs for additional media
        const mediaType = (media.media_type || "").toLowerCase();

        if(mediaType === "image") {
          return {
            ...media,
            embed_url: media.media_file.url
          };
        }

        let embedUrl = new URL("https://embed.v3.contentfabric.io");
        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("ath", rootStore.authToken);

        if(mediaType === "video") {
          embedUrl.searchParams.set("vid", media.media_link["."].container);
          embedUrl.searchParams.set("ct", "h");
          embedUrl.searchParams.set("ap", "");
        } else if(mediaType === "ebook") {
          embedUrl.searchParams.set("type", "ebook");
          embedUrl.searchParams.set("vid", media.media_file["."].container);
          embedUrl.searchParams.set("murl", btoa(media.media_file.url));
        }

        return {
          ...media,
          embed_url: embedUrl.toString()
        };
      } catch(error) {
        return media;
      }
    });
  }

  return nft;
};

const Target = () => {
  if(embedded) {
    // In iframe
    return window.top;
  } else if(window.opener) {
    // Popup
    return window.opener;
  }
};


// Util methods
const Item = async data => {
  try {
    const item = await rootStore.LoadNFTData({
      contractAddress: data.params.contractAddress,
      tokenId: data.params.tokenId
    });

    if(!item) { throw "Item not found"; }

    return FormatNFT(item);
  } catch(error) {
    throw Error(`Unable to find item with contract address '${data.params.contractAddress}' and token ID '${data.params.tokenId}'`);
  }
};

const MarketplaceItem = async (marketplaceInfo, data) => {
  const marketplace = await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId);

  try {
    const marketplaceItem = marketplace.items.find(item => item.sku === data.params.sku);

    if(!marketplaceItem) { throw "Item not found"; }

    return marketplaceItem;
  } catch(error) {
    throw Error(`Unable to find marketplace item in ${marketplace.name} marketplace with SKU ${data.params.sku}`);
  }
};

const Listing = async data => {
  try {
    const listing = ((await transferStore.FetchTransferListings({
      listingId: data.params.listingId,
      contractAddress: data.params.contractAddres,
      tokenId: data.params.tokenId
    })) || [])[0];

    if(!listing) { throw "Listing not found"; }

    return FormatNFT(listing);
  } catch(error) {
    throw Error(`Unable to find listing with ID ${data.params.listingId}`);
  }
};

// Create or update listing
const CreateListing = async data => {
  try {
    return await transferStore.CreateListing({
      listingId: data.params.listingId,
      contractAddress: data.params.contractAddress,
      tokenId: data.params.tokenId,
      price: data.params.price
    });
  } catch(error) {
    if(data.params.listingId) {
      throw Error(`Unable to modify listing ${data.params.listingId}`);
    } else {
      throw Error(`Unable to create listing for contract ${data.params.contractAddress} and token ID ${data.params.tokenId}`);
    }
  }
};


let listenerInitialized = false;
export const InitializeListener = (history) => {
  if(listenerInitialized) { return; }

  listenerInitialized = true;

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
        appUUID: rootStore.appUUID,
        requestId: data.requestId,
        response: Utils.MakeClonable(response),
        error: Utils.MakeClonable(error)
      }, "*");
    };

    try {
      let marketplaceInfo;
      if(data?.params?.marketplaceSlug || data?.params?.marketplaceId || data?.params?.marketplaceHash) {
        await rootStore.LoadAvailableMarketplaces({tenantSlug: data.params.tenantSlug, marketplaceSlug: data.params.marketplaceSlug});
        marketplaceInfo = await rootStore.MarketplaceInfo({
          tenantSlug: data.params.tenantSlug,
          marketplaceSlug: data.params.marketplaceSlug,
          marketplaceId: data.params.marketplaceId,
          marketplaceHash: data.params.marketplaceHash
        });
      }

      let marketplace, listing, item, status, balance, price, tags;
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

          return Respond({response: profile});

        case "balances":
          return Respond({response: toJS(await rootStore.GetWalletBalance())});

        // client.Stock
        case "stock":
          return Respond({response: toJS(await checkoutStore.MarketplaceStock({tenantId: marketplaceInfo?.tenantId}))});

        // client.ItemNames
        case "itemNames":
          return Respond({response: await transferStore.ListingNames({marketplaceId: marketplaceInfo?.marketplaceId})});

        // client.Items
        case "items":
          return Respond({
            response: (
              await transferStore.FilteredQuery({
                mode: "owned",
                sortBy: data.params.sortBy,
                sortDesc: data.params.sortDesc,
                filter: data.params.filter,
                contractAddress: data.params.contractAddress,
                limit: 10000,
                start: 0
              })
            ).results || []
          });

        // client.Item
        case "item":
          return Respond({response: await Item(data)});

        // client.UserListings
        case "userListings":
          return Respond({
            response: toJS(await transferStore.FetchTransferListings({userAddress: rootStore.userAddress}))
          });

        // client.Listings
        case "listings":
          return Respond({
            response: (
              await transferStore.FilteredQuery({
                mode: "listings",
                sortBy: data.params.sortBy,
                sortDesc: data.params.sortDesc,
                filter: data.params.filter,
                contractAddress: data.params.contractAddress,
                tenantIds: marketplaceInfo ? [marketplaceInfo.tenantId] : [],
                start: data.params.start || 0,
                limit: data.params.limit || 50
              })
            )
          });

        // client.Listing
        case "listing":
          return Respond({response: await Listing(data)});

        // client.ListItem
        case "listItem":
          item = await Item(data);

          await rootStore.RequestPermission({
            origin: event.origin,
            requestor: data.requestor,
            action: `List '${item?.metadata?.display_name || "NFT"}' for sale for ${FormatPriceString({"USD": data.params.price})}`
          });

          const listingId = await CreateListing(data);

          return Respond({
            response: listingId
          });

        // client.EditListing
        case "editListing":
          // Ensure listing exists
          listing = await Listing(data);

          await rootStore.RequestPermission({
            origin: event.origin,
            requestor: data.requestor,
            action: `List '${listing?.metadata?.display_name || "NFT"}' for sale for ${FormatPriceString({"USD": data.params.price})}`
          });

          data.params.listingId = listing.details.ListingId;

          await CreateListing(data);

          return Respond({});

        // client.RemoveListing
        case "removeListing":
          // Ensure listing exists
          listing = await Listing(data);

          await rootStore.RequestPermission({
            origin: event.origin,
            requestor: data.requestor,
            action: `Remove listing for '${listing?.metadata?.display_name || "NFT"}'`
          });

          await transferStore.RemoveListing({listingId: listing.details.ListingId});

          return Respond({});

        // client.ListingPurchase
        case "listingPurchase":
          // Ensure listing exists
          listing = await Listing(data);

          balance = await rootStore.GetWalletBalance();
          price = Price(listing);

          if(data.params.provider === "wallet-balance") {
            if(balance.availableWalletBalance < price.total) {
              throw Error("Insufficient available wallet balance for purchase");
            }

            await rootStore.RequestPermission({
              origin: event.origin,
              requestor: data.requestor,
              action: `Purchase '${listing?.metadata?.display_name || "NFT"}' with wallet balance for ${FormatPriceString({USD: listing.details.Price})}`
            });
          }

          if(data.params.provider === "linked-wallet" && !balance.usdcBalance || balance.usdcBalance < price.total) {
            throw Error("Insufficient USDC balance for purchase");
          }

          try {
            const listingPurchase = await checkoutStore.ListingCheckoutSubmit({
              provider: data.params.provider,
              listingId: data.params.listingId,
              tenantId: listing.details.TenantId
            });

            return Respond({
              response: listingPurchase.confirmationId
            });
          } catch(error) {
            if(error.status === 409) {
              throw Error("Listing is no longer available");
            }

            throw error;
          }

        // client.MarketplaceItems
        case "marketplaceItems":
          marketplace = await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId);
          tags = (data.params.tags || []).map(tag => tag.toLowerCase());

          return Respond({
            response: toJS(marketplace.items)
              .filter(item => {
                if(tags.length === 0) { return true; }

                const itemTags = (item.tags || []).map(itemTag => itemTag.toLowerCase());

                return tags.find(tag => itemTags.includes(tag));
              })
          });

        // client.MarketplaceItem
        case "marketplaceItem":
          return Respond({
            response: toJS(MarketplaceItem(marketplaceInfo, data))
          });

        // client.MarketplaceStorefront
        case "marketplaceStorefront":
          marketplace = await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId);

          tags = (data.params.tags || []).map(tag => tag.toLowerCase());
          let storefront = toJS(marketplace.storefront);
          storefront.sections = storefront.sections
            .map(section => ({
              ...section,
              items: section.items
                .map(sku => toJS(marketplace.items.find(item => item.sku === sku)))
                .filter(item => item)
                .filter(item => {
                  if(tags.length === 0) { return true; }

                  const itemTags = (item.tags || []).map(itemTag => itemTag.toLowerCase());

                  return tags.find(tag => itemTags.includes(tag));
                })
            }))
            .filter(section => section.items.length > 0);

          return Respond({
            response: storefront
          });

        // client.MarketplaceMetadata
        case "marketplaceMetadata":
          return Respond({
            response: await rootStore.LoadMarketplace(marketplaceInfo?.marketplaceId)
          });

        // client.MarketplacePurchase
        case "marketplacePurchase":
          const marketplaceItem = await MarketplaceItem(marketplaceInfo, data);

          balance = await rootStore.GetWalletBalance();
          price = Price(marketplaceItem, data.params.quantity || 1);
          const free = price.price === 0 || marketplaceItem.free;

          if(!free && data.params.provider === "wallet-balance") {
            if(balance.availableWalletBalance < price.total) {
              throw Error("Insufficient available wallet balance for purchase");
            }

            await rootStore.RequestPermission({
              origin: event.origin,
              requestor: data.requestor,
              action: `Purchase '${marketplaceItem.name || "NFT"}' with wallet balance for ${FormatPriceString(marketplaceItem.price)}`
            });
          }

          let marketplacePurchase;
          if(free) {
            marketplacePurchase = await checkoutStore.ClaimSubmit({
              marketplaceId: marketplaceInfo.marketplaceId,
              sku: data.params.sku
            });
          } else {
            marketplacePurchase = await checkoutStore.CheckoutSubmit({
              provider: data.params.provider,
              tenantId: marketplaceInfo?.tenantId,
              marketplaceId: marketplaceInfo.marketplaceId,
              sku: data.params.sku,
              quantity: data.params.quantity || 1
            });
          }

          return Respond({
            response: marketplacePurchase.confirmationId
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

        // client.PurchaseStatus
        case "purchaseStatus":
          status = { purchase: "CANCELLED", minting: "PENDING" };
          const purchaseStatus = checkoutStore.purchaseStatus[data.params.confirmationId] || {};

          if(purchaseStatus.status === "complete" && purchaseStatus.success) {
            const mint = (((await rootStore.MintingStatus({
              tenantId: purchaseStatus.tenantId
            })) || [])
              .find(status => status.confirmationId === data.params.confirmationId));

            status = { purchase: "COMPLETE", minting: "PENDING" };

            if(mint?.status === "failed") {
              status.minting = "FAILED";
            } else if(mint?.status === "complete") {
              status.minting = "COMPLETE";

              let items =
                mint.tokenId ?
                  // Claim and transfer - one item
                  [{token_addr: mint.address, token_id_str: mint.tokenId}] :
                  // Marketplace purchase - may be list of items
                  mint.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

              items = await Promise.all(
                items.map(async ({token_addr, token_id_str}) =>
                  await rootStore.LoadNFTData({contractAddress: token_addr, tokenId: token_id_str})
                )
              );

              status.items = JSON.parse(JSON.stringify(items));
            }
          } else if(purchaseStatus.status === "pending") {
            status = { purchase: "PENDING", minting: "PENDING" };
          }

          return Respond({response: status});

        // client.PurchasePrice
        case "purchasePrice":
          if(data.params.listingId) {
            item = await Listing(data);
          } else {
            item = await MarketplaceItem(marketplaceInfo, data);
          }

          return Respond({response: Price(item, data.params.quantity || 1)});

        // client.OpenPack
        case "openPack":
          // Ensure pack exists
          item = await Item(data);

          await rootStore.RequestPermission({
            origin: event.origin,
            requestor: data.requestor,
            action: `Open pack '${item?.metadata?.display_name || "NFT"}'`
          });

          await rootStore.OpenNFT({
            tenantId: item.details.TenantId,
            contractAddress: item.details.ContractAddr,
            tokenId: item.details.TokenIdStr
          });

          return Respond({});

        // client.PackOpenStatus
        case "packOpenStatus":
          const address = Utils.FormatAddress(data.params.contractAddress);
          const packInfo = checkoutStore.purchaseStatus[`${address}:${data.params.tokenId}`];

          if(!packInfo) {
            throw Error(`Unable to determine pack open status for item with contract address ${data.params.contractAddress} and token ID ${data.params.tokenId}`);
          }

          const packStatus = await rootStore.PackOpenStatus({
            tenantId: packInfo.tenantId,
            contractAddress: data.params.contractAddress,
            tokenId: data.params.tokenId
          });

          status = { status: "PENDING" };
          if(packStatus?.status === "failed") {
            status.status = "FAILED";
          } else if(packStatus?.status === "complete") {
            status.status = "COMPLETE";

            let items = packStatus.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));
            items = await Promise.all(
              items.map(async ({token_addr, token_id_str}) =>
                await rootStore.LoadNFTData({contractAddress: token_addr, tokenId: token_id_str})
              )
            );

            status.items = JSON.parse(JSON.stringify(items));
          }

          return Respond({response: status});

        // client.ListingStats, client.SalesStats
        case "listingStats":
        case "salesStats":
          const stats = await transferStore.FilteredQuery({
            mode: data.action === "listingStats" ? "listing-stats" : "sales-stats",
            marketplaceId: marketplaceInfo?.marketplaceId,
            tenantIds: marketplaceInfo ? [ marketplaceInfo.tenantId ] : [],
            contractAddress: data.params.contractAddress,
            lastNDays: data.params.lastNDays || -1
          });

          return Respond({response: stats});

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
                await rootStore.LoadAvailableMarketplaces({tenantSlug: params.tenantSlug, marketplaceSlug: params.marketplaceSlug});

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
    } catch(error) {
      if(error.error) {
        Respond({error});
      } else {
        Respond({error: error.message});
      }
    }
  };

  window.addEventListener("message", Listener);
  window.onbeforeunload = () => {
    // Only applies to frame - popup has watcher in client
    if(!rootStore.disableCloseEvent && embedded) {
      SendEvent({event: EVENTS.CLOSE});
    }
    window.removeEventListener("message", Listener);
  };

  target.postMessage({
    type: "ElvMediaWalletResponse",
    appUUID: rootStore.appUUID,
    requestId: "init"
  }, "*");
};

export const SendEvent = ({event, data}) => {
  const target = Target();

  if(!target) { return; }

  target.postMessage({
    type: "ElvMediaWalletEvent",
    appUUID: rootStore.appUUID,
    event,
    data: Utils.MakeClonable(data)
  }, "*");
};
