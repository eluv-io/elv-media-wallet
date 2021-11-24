import React, {useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import AsyncComponent from "Components/common/AsyncComponent";
import {rootStore, transferStore} from "Stores";
import ListingCard from "Components/sales/ListingCard";

const Listings = observer(() => {
  const match = useRouteMatch();
  const [key, setKey] = useState(0);
  const listingKey = transferStore.ListingKey({userAddress: rootStore.userAddress});
  const listings = (transferStore.listings[listingKey] || {}).listings || [];

  return (
    <AsyncComponent
      key={`listing-page-${key}`}
      loadingClassName="page-loader"
      Load={async () => await transferStore.TransferListings({userAddress: rootStore.userAddress, forceUpdate: key > 0})}
    >
      <div className="listings-page">
        <h2 className="listings-page__header">
          <div className="header-dot" style={{backgroundColor: listings.length > 0 ? "#08b908" : "#a4a4a4"}} />
          { listings.length > 0 ? "Active Listings" : "No Active Listings" }
        </h2>
        <div className="listing-card-list">
          { listings.map((nft, index) =>
            <ListingCard
              key={`nft-listing-${index}`}
              nft={nft}
              Refresh={() => setKey(key + 1)}
            />
          )}
        </div>
      </div>
    </AsyncComponent>
  );
});

export default Listings;
