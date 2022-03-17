import React, {memo} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Link, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {FormatPriceString} from "Components/common/UIComponents";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import ListingIcon from "Assets/icons/listing";
import FilteredView from "Components/listings/FilteredView";
import {NFTDisplayToken} from "../../utils/Utils";

const Listing = memo(({url, listing}) => (
  <div className="card-container card-shadow" >
    <Link
      to={UrlJoin(url, listing.details.ListingId)}
      className="card nft-card"
    >
      <NFTImage nft={listing} width={600}/>
      <div className="card__badges">
        {
          Utils.EqualAddress(rootStore.userAddress, listing.details.SellerAddress) ?
            <ImageIcon icon={ListingIcon} title="This is your listing" alt="Listing Icon" className="card__badge" /> : null
        }
      </div>
      <div className="card__text">
        <div className="card__titles">
          <h2 className="card__title">
            <div className="card__title__title">
              {listing.metadata.display_name}
            </div>
            <div className="card__title__price">
              {FormatPriceString({USD: listing.details.Price})}
            </div>
          </h2>
          {
            listing.metadata.edition_name ?
              <h2 className="card__title card__title-edition">{listing.metadata.edition_name}</h2> : null
          }
          <h2 className="card__title card__title-edition">
            { NFTDisplayToken(listing) }
          </h2>
          <ResponsiveEllipsis
            component="h2"
            className="card__subtitle"
            text={listing.metadata.description}
            maxLine="3"
          />
        </div>
      </div>
    </Link>
  </div>
));

const Listings = observer(() => {
  const match = useRouteMatch();

  return (
    <FilteredView
      mode="listings"
      perPage={32}
      loadOffset={600}
      cacheDuration={0}
      Render={({entries, paging, loading}) => (
        <>
          {
            !paging ? null :
              <div className="listing-pagination">
                {
                  paging.total <= 0 ?
                    "No Results" :
                    `Showing 1 - ${entries.length} of ${paging.total} results`
                }
              </div>
          }
          {
            entries.length === 0 ? null :
              <div className="card-list">
                {
                  entries.map((listing, index) => {
                    // TODO: Remove
                    if(["iten2dbu685wiHLyjgLnx19jEKxiNb6J"].includes(listing?.details?.TenantId)) {
                      return null;
                    }

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
          }
          { // Infinite scroll loading indicator
            loading && entries.length > 1 ? <Loader className="card-list__loader"/> : null
          }
        </>
      )}
    />
  );
});

export default Listings;
