import React, {useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import AsyncComponent from "Components/common/AsyncComponent";
import {rootStore, transferStore} from "Stores";
import ListingCard from "Components/listings/ListingCard";
import UrlJoin from "url-join";
import {UserTransferTable} from "Components/listings/TransferTables";
import Utils from "@eluvio/elv-client-js/src/Utils";

const MyListings = observer(() => {
  const match = useRouteMatch();
  const [key, setKey] = useState(0);
  const [listings, setListings] = useState([]);

  return (
    <AsyncComponent
      key={`listing-page-${key}`}
      loadKey={`my-listings-${key}`}
      loadingClassName="page-loader"
      Load={async () => {
        let retrievedListings = await transferStore.FetchTransferListings({userAddress: rootStore.userAddress});

        if(match.params.marketplaceId) {
          const marketplace = rootStore.marketplaces[match.params.marketplaceId];
          // If marketplace filtered, exclude entries that aren't present in the marketplace
          retrievedListings = retrievedListings.filter(listing =>
            marketplace.items.find(item => Utils.EqualAddress(
              listing.details.ContractAddr,
              Utils.SafeTraverse(item, "nft_template", "nft", "address"),
            ))
          );
        }

        setListings(retrievedListings);
      }}
    >
      <div className="listings-page">
        <h2 className="listings-page__header">
          <div className="header-dot" style={{backgroundColor: listings.length > 0 ? "#08b908" : "#a4a4a4"}} />
          { listings.length > 0 ? "My Active Listings" : "No Active Listings" }
        </h2>
        <div className="listing-card-list">
          { listings.map((listing, index) =>
            <ListingCard
              key={`nft-listing-${index}`}
              listing={listing}
              link={
                match.params.marketplaceId ?
                  UrlJoin("/marketplaces", match.params.marketplaceId, "my-listings", listing.details.ContractId, listing.details.TokenIdStr) :
                  UrlJoin("/wallet", "my-listings", listing.details.ContractId, listing.details.TokenIdStr)
              }
              Refresh={() => setKey(key + 1)}
            />
          )}
        </div>
      </div>
      <UserTransferTable header="Sold NFTs" type="sell" marketplaceId={match.params.marketplaceId} />
      <UserTransferTable header="Bought NFTs" type="buy" marketplaceId={match.params.marketplaceId} />
    </AsyncComponent>
  );
});

export default MyListings;
