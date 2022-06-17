import {flow, makeAutoObservable} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";
import {rootStore} from "./index";

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

  async CurrentNFTStatus({listingId, nft, contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress || nft?.details?.ContractAddr);

    try {
      // Check first to see if NFT has sold if listing ID is known
      if(listingId) {
        try {
          const listingStatus = await this.rootStore.marketplaceClient.ListingStatus({listingId});

          if(listingStatus) {
            contractAddress = Utils.FormatAddress(listingStatus.contract);

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

      let listing;
      if(listingId) {
        listing = await this.rootStore.marketplaceClient.Listing({listingId});
      } else if(nft) {
        try {
          listing = (await this.rootStore.marketplaceClient.Listings({
            contractAddress: nft.details.ContractAddr,
            tokenId: nft.details.TokenIdStr
          })) || [];
          // eslint-disable-next-line no-empty
        } catch(error) {}
      }

      if(listing) {
        // Listing is not expected or listing is found
        return { listing };
      }

      // Listing is expected, but NFT inaccessible and not listed - check if it was sold by us
      const lastTransfer = (await this.rootStore.marketplaceClient.UserSales({contractAddress, tokenId}))[0];

      if(lastTransfer && Utils.EqualAddress(rootStore.CurrentAddress(), lastTransfer.seller)) {
        return { sale: lastTransfer };
      }

      return { listing: undefined };
    } catch(error) {
      rootStore.Log(error);

      return { error: typeof error === "string" ? error : "Unable to load NFT" };
    }
  }

  // Transfer History

  UserPaymentsHistory = flow(function * () {
    if(!this.loadCache.paymentsHistory || Date.now() - this.loadCache.paymentsHistory.retrievedAt > 10000) {
      this.loadCache.paymentsHistory = {
        retrievedAt: Date.now(),
        promise: Utils.ResponseToJson(
          this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", "wlt", "mkt", "pmts"),
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.rootStore.authToken}`
            }
          })
        )
      };
    }

    return yield this.loadCache.paymentsHistory.promise;
  });
}

export default TransferStore;
