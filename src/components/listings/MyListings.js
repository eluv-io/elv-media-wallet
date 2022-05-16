import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore, transferStore} from "Stores";
import ListingCard from "Components/listings/ListingCard";
import UrlJoin from "url-join";
import {UserTransferTable} from "Components/listings/TransferTables";

const MyListings = observer(() => {
  const match = useRouteMatch();
  const [key, setKey] = useState(0);
  const [listings, setListings] = useState(undefined);

  const LoadListings = async () => {
    let retrievedListings = [...(await transferStore.FetchTransferListings({userAddress: rootStore.userAddress}))]
      .sort((a, b) => a.details.CreatedAt > b.details.CreatedAt ? -1 : 1);

    setListings(retrievedListings);
  };

  useEffect(() => {
    LoadListings();

    let loadInterval;
    loadInterval = setInterval(async () => LoadListings(), 30000);

    return () => clearInterval(loadInterval);
  }, []);

  return (
    <div className="listings-page">
      <h2 className="listings-page__header">
        { listings ? <div className="header-dot" style={{backgroundColor: listings.length > 0 ? "#08b908" : "#a4a4a4"}} /> : null }
        { listings && listings.length > 0 ? "My Active Listings" : "No Active Listings" }
      </h2>
      <div className="listing-card-list">
        { (listings || []).map((listing, index) =>
          <ListingCard
            key={`nft-listing-${index}`}
            listing={listing}
            link={
              match.params.marketplaceId ?
                UrlJoin("/marketplace", match.params.marketplaceId, "my-listings", listing.details.ContractId, listing.details.TokenIdStr) :
                UrlJoin("/wallet", "my-listings", listing.details.ContractId, listing.details.TokenIdStr)
            }
            Refresh={() => setKey(key + 1)}
          />
        )}
      </div>
      <UserTransferTable
        header="Sold NFTs"
        type="sale"
        marketplaceId={match.params.marketplaceId}
        className="my-listings-transfer-history my-listings-sold"
      />
      <UserTransferTable
        header="Bought NFTs"
        type="purchase"
        marketplaceId={match.params.marketplaceId}
        className="my-listings-transfer-history my-listings-bought"
      />
      <div className="listings-page__message">
        Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT. Account holders acknowledge that, during this hold period, a seller will be unable to use or withdraw the amounts attributable to such sale(s).  The current hold period for spending the balance is 7 days, and withdrawing the balance is 15 days.
      </div>
      <div className="listings-page__message">
        For questions or concerns, please contact <a href={"mailto:payments@eluv.io"}>payments@eluv.io</a>
      </div>
    </div>
  );
});

export default MyListings;
