import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import ListingCard from "Components/listings/ListingCard";
import UrlJoin from "url-join";
import {PageLoader} from "Components/common/Loaders";

const UserListings = observer(() => {
  const match = useRouteMatch();
  const [key, setKey] = useState(0);
  const [listings, setListings] = useState(undefined);

  const LoadListings = async () => {
    setListings(
      await rootStore.walletClient.UserListings({userAddress: rootStore.UserIdToAddress(match.params.userId)})
    );
  };

  useEffect(() => {
    LoadListings();

    let loadInterval;
    loadInterval = setInterval(async () => LoadListings(), 30000);

    return () => clearInterval(loadInterval);
  }, []);

  return (
    <div className="listings-page">
      { !listings ? <PageLoader /> : null }
      {
        listings?.length === 0 ?
          <h2 className="listings-page__header">
            No Active Listings
          </h2> : null
      }

      <div className="listing-card-list">
        {(listings || []).map((listing, index) =>
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
    </div>
  );
});

export default UserListings;
