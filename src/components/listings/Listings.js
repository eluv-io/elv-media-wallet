import React, {memo} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import {FormatPriceString} from "Components/common/UIComponents";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import FilteredView from "Components/listings/FilteredView";
import {NFTDisplayToken} from "../../utils/Utils";

import ListingIcon from "Assets/icons/listings icon";
import ItemCard from "Components/common/ItemCard";

const Listing = memo(({url, listing}) => (
  <ItemCard
    link={UrlJoin(url, listing.details.ListingId)}
    image={<NFTImage nft={listing} width={600}/>}
    name={listing.metadata.display_name}
    edition={listing.metadata.edition_name}
    description={listing.metadata.description}
    price={FormatPriceString({USD: listing.details.Price}, {includeCurrency: true, prependCurrency: true})}
    usdcAccepted={listing.details.USDCAccepted}
    sideText={NFTDisplayToken(listing)}
    badges={
      Utils.EqualAddress(rootStore.userAddress, listing.details.SellerAddress) ?
        <ImageIcon icon={ListingIcon} title="This is your listing" alt="Listing Icon" className="item-card__badge" /> : null
    }
  />
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
