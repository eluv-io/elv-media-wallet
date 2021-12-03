import React, {useState} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {transferStore} from "Stores";
import AsyncComponent from "Components/common/AsyncComponent";
import {NFTImage} from "Components/common/Images";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {FormatPriceString} from "Components/common/UIComponents";
import {PageLoader} from "Components/common/Loaders";
import ListingFilters from "Components/listings/ListingFilters";

const MarketplaceListings = observer(() => {
  const match = useRouteMatch();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const LoadListings = async (params) => {
    setLoading(true);

    try {
      setListings(
        await transferStore.FilteredTransferListings(params)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketplace-listings marketplace__section">
      <ListingFilters RetrieveListings={LoadListings} />
      <h1 className="page-header">Available Listings</h1>
      <div className="card-list">
        {
          loading ?
            <PageLoader /> :
            listings.map((listing, index) =>
              <div className="card-container card-shadow" key={`listing-card-${index}`}>
                <Link
                  to={UrlJoin(match.url, listing.details.ListingId)}
                  className="card nft-card"
                >
                  <NFTImage nft={listing} width={400} />
                  <div className="card__text">
                    <div className="card__titles">
                      <h2 className="card__title">
                        <div className="card__title__title">
                          { listing.metadata.display_name }
                        </div>
                        <div className="card__title__price">
                          { FormatPriceString({USD: listing.details.Total}) }
                        </div>
                      </h2>
                      <h2 className="card__title card__title-edition">{ listing.details.TokenIdStr }</h2>
                      {
                        listing.metadata.edition_name ?
                          <h2 className="card__title card__title-edition">{ listing.metadata.edition_name }</h2> : null
                      }
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
            )
        }
      </div>
    </div>
  );
});

export default MarketplaceListings;
