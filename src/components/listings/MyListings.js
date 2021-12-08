import React, {useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import AsyncComponent from "Components/common/AsyncComponent";
import {rootStore, transferStore} from "Stores";
import ListingCard from "Components/listings/ListingCard";
import UrlJoin from "url-join";
import {UserTransferTable} from "Components/listings/TransferTables";

const MyListings = observer(() => {
  const match = useRouteMatch();
  const [key, setKey] = useState(0);

  let listings = transferStore.TransferListings({
    userAddress: rootStore.userAddress,
    marketplaceId: match.params.marketplaceId
  });

  return (
    <AsyncComponent
      key={`listing-page-${key}`}
      loadKey={`my-listings-${key}`}
      cacheSeconds={30}
      loadingClassName="page-loader"
      Load={async () =>
        await transferStore.FetchTransferListings({userAddress: rootStore.userAddress, forceUpdate: key > 0})
      }
    >
      <div className="listings-page">
        <h2 className="listings-page__header">
          <div className="header-dot" style={{backgroundColor: listings.length > 0 ? "#08b908" : "#a4a4a4"}} />
          { listings.length > 0 ? "My Active Listings" : "No Active Listings" }
        </h2>
        <div className="listing-card-list">
          { listings.map((nft, index) =>
            <ListingCard
              key={`nft-listing-${index}`}
              nft={nft}
              link={
                match.params.marketplaceId ?
                  UrlJoin("/marketplaces", match.params.marketplaceId, "my-listings", nft.details.ContractId, nft.details.TokenIdStr) :
                  UrlJoin("/wallet", "my-listings", nft.details.ContractId, nft.details.TokenIdStr)
              }
              Refresh={() => setKey(key + 1)}
            />
          )}
        </div>
      </div>
      <UserTransferTable header="Sold NFTs" type="sell" />
      <UserTransferTable header="Bought NFTs" type="buy" />
    </AsyncComponent>
  );
});

export default MyListings;
