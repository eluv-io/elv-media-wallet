import {flow, makeAutoObservable} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";
import {rootStore} from "./index";
import {RarityToPercentage} from "../utils/Utils";

class TransferStore {
  listings = {};
  listingNames = {};

  filters = {
    sort_by: "created",
    sort_desc: false,
    filters: [],
    collectionIndex: -1,
    limit: 50,
    start: 0
  }

  loadCache = {};

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  /* Listings */

  // Format returned listing format to match account profile format
  FormatResult(entry) {
    const isListing = !!entry.id;

    const metadata = (isListing ? entry.nft : entry.meta) || {};
    const info = (isListing ? entry.info : entry);

    let details = {
      USDCAccepted: (entry.accepts || []).includes("sol"),
      TenantId: entry.tenant || entry.tenant_id,
      ContractAddr: info.contract_addr,
      ContractId: `ictr${Utils.AddressToHash(info.contract_addr)}`,
      ContractName: info.contract_name,
      Cap: info.cap,
      TokenIdStr: info.token_id_str,
      TokenUri: info.token_uri,
      TokenOrdinal: info.ordinal,
      TokenHold: info.hold,
      TokenHoldDate: info.hold ? new Date(parseInt(info.hold) * 1000) : undefined,
      TokenOwner: info.token_owner ? Utils.FormatAddress(info.token_owner) : "",
      VersionHash: (info.token_uri || "").split("/").find(s => s.startsWith("hq__")),
    };

    if(isListing){
      details = {
        ...details,
        // Listing specific fields
        ListingId: entry.id,
        CreatedAt: entry.created * 1000,
        UpdatedAt: entry.updated * 1000,
        CheckoutLockedUntil: entry.checkout ? entry.checkout * 1000 : undefined,
        SellerAddress: Utils.FormatAddress(entry.seller),
        Price: entry.price,
        Fee: entry.fee
      };

      this.listingNames[entry.id] = this.listingNames[entry.id] || metadata.display_name || "";
    }

    // Generate embed URLs for additional media
    if(metadata?.additional_media) {
      metadata.additional_media = metadata.additional_media.map(media => {
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
          embedUrl.searchParams.set("ath", media.requires_permissions ? rootStore.authedToken : rootStore.staticToken);

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

    // Format traits
    const FILTERED_ATTRIBUTES = [ "Content Fabric Hash", "Creator", "Total Minted Supply" ];
    const traits = (metadata?.attributes || [])
      .filter(attribute => attribute && !FILTERED_ATTRIBUTES.includes(attribute.trait_type));

    if(traits.length > 0) {
      metadata.traits = traits.map(trait => ({ ...trait, rarity_percent: RarityToPercentage(trait.rarity)}));
    }

    return {
      metadata,
      details
    };
  }

  // Determine the right object key for saved listings
  ListingKey({listingId, tenantId, userId, userAddress, contractId, contractAddress, tokenId}={}) {
    if(userId) { userAddress = Utils.HashToAddress(userId); }

    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    let key = "all";
    if(userAddress) {
      key = `user-${userAddress}`;
    } else if(tenantId) {
      key = `tenant-${tenantId}`;
    } else if(contractAddress) {
      if(tokenId) {
        key = `contract-${contractAddress}-${tokenId}`;
      } else {
        key = `contract-${contractAddress}`;
      }
    } else if(listingId) {
      key = `listing-${listingId}`;
    }

    return key;
  }

  FetchTransferListings = flow(function * ({
    listingId,
    tenantId,
    userId,
    userAddress,
    contractId,
    contractAddress,
    tokenId,
    forceUpdate
  }={}) {
    if(userId) { userAddress = Utils.HashToAddress(userId); }

    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    const listingKey = this.ListingKey({listingId, tenantId, userId, userAddress, contractId, contractAddress, tokenId});

    try {
      let path = "/mkt/ls";
      if(userAddress) {
        path = UrlJoin("mkt", "ls", "s", userAddress);
      } else if(tenantId) {
        path = UrlJoin("mkt", "ls", "tnt", tenantId);
      } else if(contractAddress) {
        if(tokenId) {
          path = UrlJoin("mkt", "ls", "c", contractAddress, "t", tokenId);
        } else {
          path = UrlJoin("mkt", "ls", "c", contractAddress);
        }
      } else if(listingId) {
        path = UrlJoin("mkt", "l", listingId);
      }

      // TODO: Also check for search/filter params
      if(forceUpdate || (!this.listings[listingKey] || Date.now() - this.listings[listingKey].retrievedAt > 10000)) {
        const listings = yield Utils.ResponseToJson(
          yield this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", path),
            method: "GET",
            queryParams: {
              count: 10000
            }
          })
        ) || [];

        this.listings[listingKey] = {
          retrievedAt: Date.now(),
          listings: !listings ? [] :
            (Array.isArray(listings) ? listings : [listings])
              .map(listing => this.FormatResult(listing))
        };
      }

      return this.listings[listingKey].listings;
    } catch(error) {
      if(error.status && error.status.toString() === "404") {
        this.listings[listingKey] = [];

        return [];
      }

      this.rootStore.Log(error, true);

      throw error;
    }
  });

  async CurrentNFTStatus({listingId, nft, contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    try {
      // Check first to see if NFT has sold if listing ID is known
      if(listingId) {
        try {
          const listingStatus = await this.ListingStatus({listingId});
          if(listingStatus) {
            if(listingStatus.action === "SOLD") {
              return { sale: listingStatus };
            } else if(listingStatus.action === "UNLISTED") {
              if(nft) {
                return { listing: undefined };
              } else {
                return { error: "This listing has been removed" };
              }
            }
          }
        // eslint-disable-next-line no-empty
        } catch(error) {}
      }

      // Find existing listing based on listing ID or NFT details
      let listings = [];
      if(listingId) {
        try {
          listings = await this.FetchTransferListings({listingId, forceUpdate: true});
        // eslint-disable-next-line no-empty
        } catch(error) {}
      } else if(nft) {
        try {
          listings = (await this.FetchTransferListings({
            contractAddress: nft.details.ContractAddr,
            tokenId: nft.details.TokenIdStr,
            forceUpdate: true
          })) || [];
          // eslint-disable-next-line no-empty
        } catch(error) {}
      }

      if(listingId || listings.length > 0) {
        // Listing is not expected or listing is found
        return { listing: listings[0] };
      }

      // Listing is expected, but NFT inaccessible and not listed - check if it was sold by us
      const history = await this.UserTransferHistory();
      const lastTransfer = history
        .sort((a, b) => a.created > b.created ? -1 : 1)
        .find(entry =>
          entry.token === tokenId &&
          entry.action === "SOLD" &&
          Utils.EqualAddress(contractAddress, entry.contract) &&
          (
            Utils.EqualAddress(rootStore.userAddress, entry.seller) ||
            Utils.EqualAddress(rootStore.userAddress, entry.buyer)
          )
        );

      if(lastTransfer && Utils.EqualAddress(rootStore.userAddress, lastTransfer.seller)) {
        return { sale: lastTransfer };
      }

      return { listing: undefined };
    } catch(error) {
      rootStore.Log(error);

      return { error: typeof error === "string" ? error : "Unable to load NFT" };
    }
  }

  FilteredQuery = flow(function * ({
    mode="listings",
    sortBy="created",
    sortDesc=false,
    filter,
    contractAddress,
    tokenId,
    currency,
    marketplace,
    marketplaceId,
    tenantIds=[],
    collectionIndex=-1,
    lastNDays=-1,
    start=0,
    limit=50
  }={}) {
    collectionIndex = parseInt(collectionIndex);

    let params = {
      sort_by: sortBy,
      sort_descending: sortDesc,
      start,
      limit
    };

    if(marketplaceId) {
      marketplace = this.rootStore.marketplaces[marketplaceId];
    }

    try {
      let filters = [];
      if(marketplace && collectionIndex >= 0) {
        const collection = marketplace.collections[collectionIndex];

        collection.items.forEach(sku => {
          if(!sku) { return; }

          const item = marketplace.items.find(item => item.sku === sku);

          if(!item) { return; }

          const address = Utils.SafeTraverse(item, "nft_template", "nft", "address");

          if(address) {
            filters.push(
              `${mode === "owned" ? "contract_addr": "contract"}:eq:${Utils.FormatAddress(address)}`
            );
          }
        });

        // No valid items, so there must not be anything relevant in the collection
        if(filters.length === 0) {
          if(mode.includes("stats")) {
            return {};
          } else {
            return {
              paging: {
                start: params.start,
                limit: params.limit,
                total: 0,
                more: false
              },
              results: []
            };
          }
        }
      } else if(tenantIds) {
        tenantIds.map(tenantId => filters.push(`tenant:eq:${tenantId}`));
      }

      if(contractAddress) {
        filters.push(`contract:eq:${Utils.FormatAddress(contractAddress)}`);

        if(tokenId) {
          filters.push(`token:eq:${tokenId}`);
        }
      } else if(filter) {
        if(mode.includes("listing")) {
          filters.push(`nft/display_name:eq:${filter}`);
        } else if(mode === "owned") {
          filters.push(`meta:@>:{"display_name":"${filter}"}`);
          params.exact = false;
        } else {
          filters.push(`name:eq:${filter}`);
        }
      }

      if(currency) {
        filters.push("link_type:eq:sol");
      }

      if(lastNDays && lastNDays > 0) {
        filters.push(`created:gt:${((Date.now() / 1000) - ( lastNDays * 24 * 60 * 60 )).toFixed(0)}`);
      }

      let path;
      switch(mode) {
        case "owned":
          path = UrlJoin("as", "wlt", "nfts");
          break;

        case "listings":
          path = UrlJoin("as", "mkt", "f");
          break;

        case "sales":
          path = UrlJoin("as", "mkt", "hst", "f");
          filters.push("action:eq:SOLD");
          break;

        case "listing-stats":
          path = UrlJoin("as", "mkt", "stats", "listed");
          break;

        case "sales-stats":
          path = UrlJoin("as", "mkt", "stats", "sold");
          break;
      }

      if(filters.length > 0) {
        params.filter = filters;
      }

      if(mode.includes("stats")) {
        return yield Utils.ResponseToJson(
          this.client.authClient.MakeAuthServiceRequest({
            path,
            method: "GET",
            queryParams: params
          })
        );
      }

      const { contents, paging } = yield Utils.ResponseToJson(
        yield this.client.authClient.MakeAuthServiceRequest({
          path,
          method: "GET",
          queryParams: params,
          headers: mode === "owned" ? { Authorization: `Bearer ${this.client.signer.authToken}` } : {}
        })
      ) || [];

      return {
        paging: {
          start: params.start,
          limit: params.limit,
          total: paging.total,
          more: paging.total > start + limit
        },
        results: (contents || []).map(item => ["owned", "listings"].includes(mode) ? this.FormatResult(item) : item)
      };
    } catch(error) {
      if(error.status && error.status.toString() === "404") {
        return {
          paging: {
            start: params.start,
            limit: params.limit,
            total: 0,
            more: false
          },
          results: []
        };
      }

      throw error;
    }
  });

  CreateListing = flow(function * ({contractAddress, contractId, tokenId, price, listingId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    if(listingId) {
      // Update
      return yield Utils.ResponseToFormat(
        "text",
        yield this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "mkt"),
          method: "PUT",
          body: {
            id: listingId,
            price: parseFloat(price)
          },
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );
    } else {
      // Create
      return yield Utils.ResponseToJson(
        yield this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "mkt"),
          method: "POST",
          body: {
            contract: contractAddress,
            token: tokenId,
            price: parseFloat(price)
          },
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );
    }
  });

  RemoveListing = flow(function * ({listingId}) {
    yield this.client.authClient.MakeAuthServiceRequest({
      path: UrlJoin("as", "wlt", "mkt", listingId),
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.client.signer.authToken}`
      }
    });
  });

  ListingStatus = flow(function * ({listingId}) {
    try {
      return yield Utils.ResponseToJson(
        yield this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "mkt", "status", listingId),
          method: "GET"
        })
      );
    } catch(error) {
      if(error.status === 404) { return; }

      throw error;
    }
  });

  ListingNames = flow(function * ({marketplaceId}) {
    let names = yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "mkt", "names"),
        method: "GET"
      })
    );

    if(marketplaceId) {
      const marketplace = yield this.rootStore.LoadMarketplace(marketplaceId);

      let marketplaceNames = {};
      marketplace.items.map(item => marketplaceNames[item?.nftTemplateMetadata?.display_name] = true);

      names = names.filter(name => marketplaceNames[name]);
    }

    return names;
  });

  // Transfer History

  UserTransferHistory = flow(function * () {
    if(!rootStore.loggedIn) {
      return [];
    }

    return yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "mkt", "hst"),
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      })
    );
  });

  UserPaymentsHistory = flow(function * () {
    if(!this.loadCache.paymentsHistory || Date.now() - this.loadCache.paymentsHistory.retrievedAt > 10000) {
      this.loadCache.paymentsHistory = {
        retrievedAt: Date.now(),
        promise: Utils.ResponseToJson(
          this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", "wlt", "mkt", "pmts"),
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.client.signer.authToken}`
            }
          })
        )
      };
    }

    return yield this.loadCache.paymentsHistory.promise;
  });

  TransferHistory = flow(function * ({contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    return yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "mkt", "hst", contractAddress),
        method: "GET",
        queryParams: tokenId ? { tid: tokenId } : {}
      })
    );
  });
}

export default TransferStore;
