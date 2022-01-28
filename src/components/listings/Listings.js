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

const Listing = memo(({url, listing}) => (
  <div className="card-container card-shadow" >
    <Link
      to={UrlJoin(url, listing.details.ListingId)}
      className="card nft-card"
    >
      <NFTImage nft={listing} width={400}/>
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
            { typeof listing.details.TokenOrdinal !== "undefined" ? `${parseInt(listing.details.TokenOrdinal) + 1} / ${listing.details.Cap}` : listing.details.TokenIdStr }
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
      header="All Listings"
      mode="listings"
      perPage={16}
      loadOffset={600}
      Render={({entries, loading}) => (
        <>
          {
            entries.length === 0 ? null :
              <div className="card-list">
                {
                  entries.map((listing, index) =>
                    <Listing
                      url={match.url}
                      listing={listing}
                      key={`listing-card-${listing.details.ListingId}-${index}`}
                    />
                  )
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
