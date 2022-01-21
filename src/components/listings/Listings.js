import React, {memo, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Link, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {FormatPriceString} from "Components/common/UIComponents";
import {Loader, PageLoader} from "Components/common/Loaders";
import ListingFilters from "Components/listings/ListingFilters";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import ListingIcon from "Assets/icons/listing";
import ListingStats from "Components/listings/ListingStats";
import {useInfiniteScroll} from "react-g-infinite-scroll";

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

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadKey, setLoadKey] = useState(1);
  const [finished, setFinished] = useState(false);

  useInfiniteScroll({
    fetchMore: () => setLoadKey(loadKey + 1),
    ignoreScroll: loading || finished
  });

  return (
    <div className="marketplace-listings marketplace__section">
      <h1 className="page-header">All Listings</h1>
      <ListingStats mode="listings" />
      <ListingFilters
        perPage={16}
        Loading={setLoading}
        UpdateListings={setListings}
        mode="listings"
        loadKey={loadKey}
        setLoading={setLoading}
        setFinished={setFinished}
      />
      {
        // Initial Load
        loading && listings.length === 0 ? <PageLoader/> : null
      }
      {
        !loading && listings.length === 0 ?
          <h2 className="marketplace__empty">No matching items</h2> :
          <div className="card-list">
            {
              listings.map((listing, index) =>
                <Listing url={match.url} listing={listing} key={`listing-card-${listing.details.ListingId}-${index}`} />
              )
            }
            { // Infinite scroll loading indicator
              loading && listings.length > 1 ? <Loader className="card-list__loader"/> : null
            }
          </div>
      }
    </div>
  );
});

export default Listings;
