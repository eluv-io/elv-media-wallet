import {flow, makeAutoObservable} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";

let now = Date.now();
const _transfers = [
  {
    id: "asd123",
    name: "Skunk",
    contractAddress: "0x1234567890987654321",
    tokenId: "823",
    transactionId: "asd123qweasd123qwe",
    transactionType: "Trade",
    createdAt: now - 10000,
    price: 1.23,
    fee: 0.23,
    buyerAddress: "0x123456789098765431",
    sellerAddress: "0x54321234567890987"
  },
  {
    id: "qwe123",
    name: "Bull",
    contractAddress: "0x1234567890987654321",
    tokenId: "334",
    transactionId: "qwe123qweqwe123qwe",
    transactionType: "Trade",
    createdAt: now - 200000,
    price: 2.23,
    fee: 0.23,
    buyerAddress: "0x123456789098765431",
    sellerAddress: "0x54321234567890987"
  },
  {
    id: "fhg123",
    name: "Gold Pack",
    contractAddress: "0x1234567890987654321",
    tokenId: "456",
    transactionId: "fhg123qweqwe123qwe",
    transactionType: "Trade",
    createdAt: now - 500000,
    price: 4.23,
    fee: 0.23,
    buyerAddress: "0x123456789098765431",
    sellerAddress: "0x54321234567890987"
  },
  {
    id: "cvb123",
    name: "Beach Ball",
    contractAddress: "0x1234567890987654321",
    tokenId: "234",
    transactionId: "cvb123qweqwe123qwe",
    transactionType: "Trade",
    createdAt: now - 1000000,
    price: 3.23,
    fee: 0.23,
    buyerAddress: "0x123456789098765431",
    sellerAddress: "0x54321234567890987"
  },
  {
    id: "vbn123",
    name: "Cupcake",
    contractAddress: "0x1234567890987654321",
    tokenId: "012",
    transactionId: "vbn123qweqwe123qwe",
    transactionType: "Trade",
    createdAt: now - (60 * 60 * 24 - 10) * 1000,
    price: 5.23,
    fee: 0.23,
    buyerAddress: "0x123456789098765431",
    sellerAddress: "0x54321234567890987"
  }
];

class TransferStore {
  userPurchases = {};
  userSales = {};
  transferHistories = {};

  listings = {};

  filters = {
    sort_by: "created",
    sort_desc: false,
    filters: [],
    collectionIndex: -1,
    limit: 50,
    start: 0
  }

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  /* Listings */

  // Format returned listing format to match account profile format
  FormatListing(entry) {
    const metadata = entry.nft || {};

    const details = {
      TenantId: entry.tenant,
      ContractAddr: entry.contract,
      ContractId: `ictr${Utils.AddressToHash(entry.contract)}`,
      TokenIdStr: entry.token,
      TokenUri: metadata.token_uri,
      VersionHash: (metadata.token_uri || "").split("/").find(s => s.startsWith("hq__")),

      // Listing specific fields
      ListingId: entry.id,
      ListingOrdinal: entry.ordinal,
      CreatedAt: entry.created * 1000,
      UpdatedAt: entry.updated * 1000,
      SellerAddress: entry.seller,
      Price: entry.price,
      Fee: entry.fee,
      Total: (entry.price + entry.fee)
    };

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

  // Retrieve previously fetched listings
  TransferListings({listingId, tenantId, userId, userAddress, contractId, contractAddress, tokenId, marketplaceId}={}) {
    if(userId) { userAddress = Utils.HashToAddress(userId); }

    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    const listingKey = this.ListingKey({listingId, tenantId, userId, userAddress, contractId, contractAddress, tokenId});
    let listings = (this.listings[listingKey] || {}).listings || [];

    if(marketplaceId) {
      const marketplace = this.rootStore.marketplaces[marketplaceId];

      listings = listings.filter(listing =>
        marketplace.items.find(item =>
          item.nft_template && !item.nft_template["/"] && item.nft_template.nft && item.nft_template.nft.template_id && item.nft_template.nft.template_id === listing.metadata.template_id
        )
      );
    }

    return listings;
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

    const listingKey = this.ListingKey({tenantId, userId, userAddress, contractId, contractAddress, tokenId});

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
        path = UrlJoin("mkt", listingId);
      }

      // TODO: Also check for search/filter params
      if(forceUpdate || (!this.listings[listingKey] || Date.now() - this.listings[listingKey].retrievedAt > 10000)) {
        const listings = yield Utils.ResponseToJson(
          yield this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", path),
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.client.signer.authToken}`
            }
          })
        ) || [];

        this.listings[listingKey] = {
          retrievedAt: Date.now(),
          listings: (Array.isArray(listings) ? listings : [listings])
            .map(listing => this.FormatListing(listing))
        };
      }

      return this.listings[listingKey].listings;
    } catch(error) {
      if(error.status && error.status.toString() === "404") {
        this.listings[listingKey] = [];

        return [];
      }

      throw error;
    }
  });

  FilteredTransferListings = flow(function * ({
    sortBy="created",
    sortDesc=false,
    contractAddress,
    marketplace,
    collectionIndex=-1,
    page=1,
    perPage=50
  }={}) {
    collectionIndex = parseInt(collectionIndex);

    try {
      let params = {
        sortBy,
        sortDesc,
        start: (page - 1) * perPage,
        limit: perPage
      };

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
              `contract:eq:${Utils.FormatAddress(address)}`
            );
          }
        });

        // No valid items, so there must not be anything relevant in the collection
        if(filters.length === 0) {
          return [];
        }
      }

      if(contractAddress) {
        filters.push(`contract:eq:${Utils.FormatAddress(contractAddress)}`);
      }

      if(filters.length > 0) {
        params.filter = filters;
      }

      const listings = yield Utils.ResponseToJson(
        yield this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "mkt", "f"),
          method: "GET",
          queryParams: params,
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      ) || [];

      return listings.map(listing => this.FormatListing(listing));
    } catch(error) {
      if(error.status && error.status.toString() === "404") {
        return [];
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
      return yield Utils.ResponseToFormat(
        "text",
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

  // Transfer History

  TransferKey({contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    return tokenId ? `${contractAddress}-${tokenId}` : contractAddress;
  }

  UserTransferHistory = flow(function * ({userAddress, type="purchases"}) {
    userAddress = Utils.FormatAddress(userAddress);

    if(type === "purchases") {
      this.userPurchases[userAddress] = _transfers;
    } else {
      this.userSales[userAddress] = _transfers;
    }

    return _transfers;
  });

  TransferHistory = flow(function * ({contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    const key = this.TransferKey({contractAddress, tokenId});

    this.transferHistories[key] = _transfers;

    return this.transferHistories[key];
  });
}

export default TransferStore;
