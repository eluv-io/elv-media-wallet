import React, {memo} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import FilteredView from "Components/listings/FilteredView";

import ListingIcon from "Assets/icons/listings icon";
import LinkedIcon from "Assets/icons/linked wallet icon (r).svg";
import NFTCard from "Components/nft/NFTCard";

const Listing = memo(({url, listing}) => (
  <NFTCard
    link={UrlJoin(url, listing.details.ListingId)}
    imageWidth={600}
    nft={listing}
    selectedListing={listing}
    truncateDescription
    badges={
      <>
        {
          Utils.EqualAddress(rootStore.CurrentAddress(), listing.details.SellerAddress) ?
            <ImageIcon icon={ListingIcon} title="This is your listing" alt="Listing Icon" className="item-card__badge"/> : null
        }
        {
          listing.details.USDCOnly ?
            <ImageIcon icon={LinkedIcon} title="This listing may only be purchased with a linked wallet" alt="Linked Wallet Icon" className="item-card__badge"/> : null
        }
      </>
    }
  />
));

const Listings = observer(() => {
  const match = useRouteMatch();

  return (
    <FilteredView
      mode="listings"
      pagingMode="paginated"
      topPagination
      showPagingInfo
      perPage={9}
      scrollOnPageChange
      Render={({entries}) => (
        entries.length === 0 ? null :
          <div className="card-list">
            {
              entries.map((listing, index) => {
                return (
                  <Listing
                    url={match.url}
                    listing={listing}
                    key={`listing-card-${listing.details.ListingId}-${index}`}
                  />
                );
              })
            }
          </div>
      )}
    />
  );
});

export default Listings;
