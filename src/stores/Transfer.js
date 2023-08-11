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
    collectionIndexes: [],
    limit: 50,
    start: 0
  };

  loadCache = {};

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  TransferNFT = flow(function * ({nft, targetAddress}) {
    try {
      yield rootStore.walletClient.TransferNFT({
        contractAddress: nft.details.ContractAddr,
        tokenId: nft.details.TokenIdStr,
        targetAddress
      });

      const start = Date.now();
      do {
        yield new Promise(resolve => setTimeout(resolve, 10000));

        const nftInfo = yield rootStore.walletClient.NFT({
          contractAddress: nft.details.ContractAddr,
          tokenId: nft.details.TokenIdStr
        });

        if(this.client.utils.EqualAddress(targetAddress, nftInfo.details.TokenOwner)) {
          yield this.rootStore.LoadNFTData({
            contractAddress: nft.details.ContractAddr,
            tokenId: nft.details.TokenIdStr,
            force: true
          });

          return;
        }
      } while(Date.now() - start < 3 * 60 * 1000);

      throw Error("Transfer never completed");
    } catch(error) {
      rootStore.Log(error, true);
      throw new Error("Transfer failed");
    }
  });

  /* Listings */

  async ActiveOffer({contractAddress, tokenId}) {
    try {
      return (await this.rootStore.walletClient.MarketplaceOffers({
        contractAddress,
        tokenId,
        statuses: ["ACTIVE"]
      }))
        .find(offer => Utils.EqualAddress(this.rootStore.CurrentAddress(), offer.buyer));
    } catch(error) {
      this.rootStore.Log(error, true);
    }
  }

  async CurrentNFTStatus({listingId, nft, contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress || nft?.details?.ContractAddr);

    let offer;
    if(nft || (contractAddress && tokenId)) {
      offer = await this.ActiveOffer({
        contractAddress: contractAddress || nft?.details.ContractAddr,
        tokenId: tokenId || nft?.details.TokenIdStr
      });
    }

    try {
      // Check first to see if NFT has sold if listing ID is known
      if(listingId) {
        try {
          const listingStatus = await this.rootStore.walletClient.ListingStatus({listingId});

          if(listingStatus) {
            contractAddress = Utils.FormatAddress(listingStatus.contract);


            if(listingStatus.action === "SOLD") {
              return { sale: listingStatus, offer };
            } else if(listingStatus.action === "UNLISTED") {
              return { removed: listingStatus, offer };
            }
          }
        // eslint-disable-next-line no-empty
        } catch(error) {}
      }

      let listing;
      if(listingId) {
        listing = await this.rootStore.walletClient.Listing({listingId});
      } else if(nft) {
        try {
          listing = ((await this.rootStore.walletClient.Listings({
            contractAddress: nft.details.ContractAddr,
            tokenId: nft.details.TokenIdStr,
            includeCheckoutLocked: true
          }))?.results || [])[0];
          // eslint-disable-next-line no-empty
        } catch(error) {}
      }

      if(listing) {
        if(!offer) {
          try {
            offer = await this.ActiveOffer({
              contractAddress: listing.details.ContractAddr,
              tokenId: listing.details.TokenIdStr
            });
          // eslint-disable-next-line no-empty
          } catch(error) {}
        }

        // Listing is not expected or listing is found
        return { listing, offer };
      }

      // Listing is expected, but NFT inaccessible and not listed - check if it was sold by us
      const lastTransfer = (await this.rootStore.walletClient.UserSales({contractAddress, tokenId}))[0];

      if(lastTransfer && Utils.EqualAddress(rootStore.CurrentAddress(), lastTransfer.seller)) {
        return { sale: lastTransfer, offer };
      }

      return { listing: undefined, offer };
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
