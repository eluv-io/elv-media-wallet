import {checkoutStore, rootStore, transferStore} from "Stores/index";
import {toJS} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import EVENTS from "../../../client/src/Events";
import UrlJoin from "url-join";
import {FormatPriceString} from "Components/common/UIComponents";
import {roundToDown, roundToUp} from "round-to";

const embedded = window.self !== window.top;

const pages = {
  // Global
  "listings": "/wallet/listings",
  "listing": "/wallet/listings/:listingId",
  "activity": "/wallet/activity",

  // User pages
  "wallet": "/wallet/users/me/items",
  "items": "/wallet/users/me/items",
  "item": "/wallet/users/me/items/:contractId/:tokenId",
  "myListings": "/wallet/users/me/listings",
  "myListing": "/wallet/users/me/listings/:listingId",
  "profile": "/wallet/profile",

  // Marketplace
  "marketplaces": "/marketplaces",
  "marketplace": "/marketplace/:marketplaceId/store",
  "marketplaceItem": "/marketplace/:marketplaceId/store/:sku",
  "marketplaceListings": "/marketplace/:marketplaceId/listings",
  "marketplaceListing": "/marketplace/:marketplaceId/listings/:listingId",
  "marketplaceActivity": "/marketplace/:marketplaceId/activity",
  "marketplaceProfile": "/marketplace/:marketplaceId/profile",

  // Marketplace user pages
  "marketplaceWallet": "/marketplace/:marketplaceId/users/me/items",
  "marketplaceCollections": "/marketplace/:marketplaceId/collections",
  "marketplaceMyCollections": "/marketplace/:marketplaceId/users/me/collections",
  "marketplaceMyListings": "/marketplace/:marketplaceId/users/me/listings",
  "marketplaceMyListing": "/marketplace/:marketplaceId/users/me/listings/:listingId",

  // Drop
  "drop": "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId",
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

const ListingPayout = (nft, listingPrice) => {
  const royalty = parseFloat((nft.config || {})["nft-royalty"] || 20) / 100;

  const parsedPrice = isNaN(parseFloat(listingPrice)) ? 0 : parseFloat(listingPrice);
  const payout = roundToUp(parsedPrice * (1 - royalty), 2);

  const royaltyFee = roundToDown(parsedPrice - payout, 2);

  return {
    listingPrice: parsedPrice,
    royalty,
    royaltyFee,
    payout
  };
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

    return toJS(item);
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
    let listing;
    if(data.params.listingId) {
      listing = await rootStore.walletClient.Listing({listingId: data.params.listingId});
    } else {
      const listingResults = await rootStore.walletClient.Listings({
        contractAddress: data.params.contractAddress,
        tokenId: data.params.tokenId
      });

      listing = listingResults.results[0];
    }

    if(!listing) { throw "Listing not found"; }

    return toJS(listing);
  } catch(error) {
    throw Error(`Unable to find listing with ID ${data.params.listingId}`);
  }
};

// Create or update listing
const CreateListing = async data => {
  try {
    return await rootStore.walletClient.CreateListing({
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
export const InitializeListener = () => {
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
        appUUID: window.appUUID,
        clientType: embedded ? "FRAME" : "POPUP",
        requestId: data.requestId,
        response: Utils.MakeClonable(response),
        error: Utils.MakeClonable(error)
      }, "*");
    };

    try {
      let marketplaceInfo;
      if(data?.params?.marketplaceSlug || data?.params?.marketplaceId || data?.params?.marketplaceHash) {
        marketplaceInfo = await rootStore.walletClient.MarketplaceInfo({
          marketplaceParams: {
            tenantSlug: data.params.tenantSlug,
            marketplaceSlug: data.params.marketplaceSlug,
            marketplaceId: data.params.marketplaceId,
            marketplaceHash: data.params.marketplaceHash
          }
        });
      }

      let marketplace, listing, item, status, balance, price, tags;
      switch(data.action) {
        // wallet client proxy
        case "walletClientProxy":
          return Respond({
            response: toJS(await rootStore.walletClient[data.params.methodName](...(data.params.params || {})))
          });

        // client.LogIn
        case "login":
          if(rootStore.AuthInfo()?.clientAuthToken === data.params.clientAuthToken) {
            while(rootStore.authenticating) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Already logged in with this token
            return Respond({});
          }

          await rootStore.Authenticate({
            clientAuthToken: data.params.clientAuthToken,
            idToken: data.params.idToken,
            authToken: data.params.authToken,
            fabricToken: data.params.fabricToken,
            address: data.params.address,
            user: data.params.user,
            tenantId: data.params.tenantId,
            walletName: data.params.walletName,
            expiresAt: data.params.expiresAt || (Date.now() + 12 * 60 * 60 * 1000)
          });

          return Respond({});

        // client.LogOut
        case "logout":
          await rootStore.SignOut();

          return Respond({});

        // client.Profile
        case "profile":
          if(!rootStore.loggedIn) {
            return Respond({response: null});
          }

          let profile = toJS(rootStore.walletClient.UserInfo() || {});

          profile.name = profile.email || profile.address;

          return Respond({response: profile});

        case "balances":
          return Respond({response: toJS(await rootStore.GetWalletBalance())});

        // client.Stock
        case "stock":
          return Respond({response: toJS(await checkoutStore.MarketplaceStock({tenantId: marketplaceInfo?.tenantId}))});

        // client.ItemNames, client.ListingNames
        case "itemNames":
        case "listingNames":
          return Respond({response: await rootStore.walletClient.ListingNames({marketplaceParams: marketplaceInfo})});

        case "listingEditionNames":
          return Respond({response: await rootStore.walletClient.ListingEditionNames({displayName: data.params.displayName})});

        case "listingAttributes":
          return Respond({response: await rootStore.walletClient.ListingAttributes({marketplaceParams: marketplaceInfo, displayName: data.params.displayName})});

        case "userTransferHistory":
          let response = {
            purchases: [],
            sales: [],
            withdrawals: []
          };

          (await transferStore.UserPaymentsHistory())
            .sort((a, b) => a.created > b.created ? -1 : 1)
            .map(entry => {
              entry = ({
                ...entry,
                created: entry.created * 1000,
                processed_at: entry.processed_at * 1000,
                type:
                  !entry.addr && (entry.processor || "").includes("stripe-payout") ?
                    "withdrawal" : Utils.EqualAddress(entry.buyer, rootStore.CurrentAddress()) ? "purchase" : "sale",
                processor:
                  (entry.processor || "").startsWith("eluvio") ? "Wallet Balance" :
                    (entry.processor || "").startsWith("stripe") ? "Credit Card" : "Crypto",
                pending: Date.now() < entry.created * 1000 + 7 * 24 * 60 * 60 * 1000
              });

              if(entry.type === "withdrawal") {
                response.withdrawals.push(entry);
              } else if(entry.type === "purchase") {
                response.purchases.push(entry);
              } else {
                response.sales.push(entry);
              }
            });

          return Respond({response: toJS(response)});

        // client.Items
        case "items":
          let items = (await rootStore.walletClient.UserItems({
            sortBy: data.params.sortBy,
            sortDesc: data.params.sortDesc,
            filter: data.params.filter,
            contractAddress: data.params.contractAddress,
            marketplaceParams: marketplaceInfo ? marketplaceInfo : undefined,
            limit: 10000,
            start: 0
          })).results || [];

          let myListings = toJS(await rootStore.walletClient.UserListings({marketplaceParams: marketplaceInfo ? marketplaceInfo : undefined}));

          items.forEach((item) => {
            const listing = myListings.find(listing =>
              Utils.EqualAddress(listing.contractAddress, item.contractAddress) &&
              listing.tokenId === item.tokenId
            );

            if(!listing) { return; }

            item.listingId = listing.listingId;
            item.details.ListingId = listing.listingId;

            myListings = myListings.filter(otherListing => otherListing !== listing);
          });

          return Respond({response: items});

        // client.Item
        case "item":
          item = await Item(data);

          listing = ((await rootStore.walletClient.Listings({
            contractAddress: item.contractAddress,
            tokenId: item.tokenId
          })) || [])[0];

          if(listing) {
            item.listingId = listing.listingId;
            item.details.ListingId = listing.listingId;
          }

          return Respond({response: item});

        // client.UserListings
        case "userListings":
          return Respond({
            response: toJS(await rootStore.walletClient.UserListings())
          });

        // client.Listings
        case "listings":
          return Respond({
            response: (
              await rootStore.walletClient.Listings({
                sortBy: data.params.sortBy,
                sortDesc: data.params.sortDesc,
                marketplaceParams: marketplaceInfo ? marketplaceInfo : undefined,
                filter: data.params.filter,
                editionFilter: data.params.editionFilter,
                attributeFilters: data.params.attributeFilters,
                contractAddress: data.params.contractAddress,
                tokenId: data.params.tokenId,
                lastNDays: data.params.lastNDays || -1,
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
            action: `List '${item?.metadata?.display_name || "NFT"}' for sale for ${FormatPriceString(data.params.price)}`
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
            action: `List '${listing?.metadata?.display_name || "NFT"}' for sale for ${FormatPriceString(data.params.price)}`
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

          await rootStore.walletClient.RemoveListing({listingId: listing.details.ListingId});

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
              action: `Purchase '${listing?.metadata?.display_name || "NFT"}' with wallet balance for ${FormatPriceString(listing.details.Price)}`
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
            response: toJS(await MarketplaceItem(marketplaceInfo, data))
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
              sku: data.params.sku,
              email: data.params.email
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
            let mint;
            if(data.params.listingId) {
              mint = await rootStore.ListingPurchaseStatus({listingId: data.params.listingId, confirmationId: data.params.confirmationId});
            } else {
              mint = await rootStore.PurchaseStatus({marketplaceId: marketplaceInfo.marketplaceId, confirmationId: data.params.confirmationId});
            }

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

        case "listingPayout":
          const nft = await rootStore.LoadNFTData({
            contractAddress: data.params.contractAddress,
            tokenId: data.params.tokenId
          });

          if(!nft) { throw Error(`Unable to find NFT with contract address ${data.params.contractAddress} and token ID ${data.params.tokenId}`); }

          return Respond({response: ListingPayout(nft, data.params.listingPrice)});

        // client.OpenPack
        case "openPack":
          // Ensure pack exists
          item = await Item(data);

          await rootStore.RequestPermission({
            origin: event.origin,
            requestor: data.requestor,
            action: `Open pack '${item?.metadata?.display_name || "NFT"}'`
          });

          await checkoutStore.OpenPack({
            tenantId: item.details.TenantId,
            contractAddress: item.details.ContractAddr,
            tokenId: item.details.TokenIdStr
          });

          return Respond({});

        // client.PackOpenStatus
        case "packOpenStatus":
          const packStatus = await rootStore.PackOpenStatus({
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
          return Respond({
            response: await rootStore.walletClient.ListingStats({
              marketplaceParams: marketplaceInfo ? marketplaceInfo : undefined,
              contractAddress: data.params.contractAddress,
              tokenId: data.params.tokenId,
              lastNDays: data.params.lastNDays || -1
            })
          });

        case "salesStats":
          return Respond({
            response: await rootStore.walletClient.SalesStats({
              marketplaceParams: marketplaceInfo ? marketplaceInfo : undefined,
              contractAddress: data.params.contractAddress,
              tokenId: data.params.tokenId,
              lastNDays: data.params.lastNDays || -1
            })
          });

        // client.Activity
        case "activity":
          const activity = await rootStore.walletClient.Sales({
            start: data.params.start || 0,
            limit: data.params.limit || 50,
            sortBy: data.params.sortBy,
            sortDesc: data.params.sortDesc,
            marketplaceParams: marketplaceInfo ? marketplaceInfo: undefined,
            filter: data.params.filter,
            contractAddress: data.params.contractAddress,
            tokenId: data.params.tokenId,
            lastNDays: data.params.lastNDays || -1
          });

          return Respond({response: activity});

        // client.CurrentPath
        case "currentPath":
          const pathname = UrlJoin("/", window.location.pathname);

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
            rootStore.SetRouteChange(data.params.path);

            route = data.params.path;
          } else {
            // Named page
            if(!pages[data.params.page]) {
              rootStore.Log(`Unknown page: ${data.params.page}`);
              return Respond({error: `Unknown page: ${data.params.page}`});
            }

            // Replace route variables
            route = pages[data.params.page];

            const params = (data.params || {}).params || {};
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

            const searchParams = data.params?.params?.searchParams;
            if(searchParams && Object.keys(searchParams).length > 0) {
              route += "?" + Object.keys(searchParams).map(key => `${key}=${searchParams[key]}`).join("&");
            }

            rootStore.SetRouteChange(route);
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

        // client.SetLanguage
        case "setLanguage":
          const originalLanguage = rootStore.language;
          await rootStore.SetLanguage(data.params.languageCode, true);

          if(rootStore.language !== originalLanguage) {
            await rootStore.Reload();
          }

          return Respond({});

        // client.Reload
        case "reload":
          rootStore.Reload();

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
    appUUID: window.appUUID,
    clientType: embedded ? "FRAME" : "POPUP",
    requestId: "init"
  }, "*");
};

export const SendEvent = ({event, data}) => {
  const target = Target();

  if(!target) { return; }

  target.postMessage({
    type: "ElvMediaWalletEvent",
    appUUID: window.appUUID,
    clientType: embedded ? "FRAME" : "POPUP",
    event,
    data: Utils.MakeClonable(data)
  }, "*");
};
