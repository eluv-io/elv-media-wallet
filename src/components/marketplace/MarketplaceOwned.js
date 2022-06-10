import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import ImageIcon from "Components/common/ImageIcon";
import ListingIcon from "Assets/icons/listings icon";
import {NFTDisplayToken} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {Loader} from "Components/common/Loaders";
import ItemCard from "Components/common/ItemCard";
import {FormatPriceString} from "Components/common/UIComponents";

const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();
  const [listings, setListings] = useState([]);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  useEffect(() => {
    rootStore.transferStore.FetchTransferListings({userAddress: rootStore. userAddress})
      .then(listings => setListings(listings));

    if(!rootStore.sidePanelMode || !rootStore.noItemsAvailable) { return; }

    // If there are no items available for sale and we're in the side panel, we want to avoid navigating back to the marketplace page.
    const originalHideNavigation = rootStore.hideNavigation;
    rootStore.ToggleNavigation(false);

    return () => {
      rootStore.ToggleNavigation(originalHideNavigation);
    };
  }, []);

  return (
    <FilteredView
      mode="owned"
      hideStats
      perPage={60}
      cacheDuration={30}
      Render={({entries, paging, loading}) =>
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
                  entries.map((ownedItem) => {
                    const listing = listings.find(listing =>
                      listing.details.ContractAddr === ownedItem.details.ContractAddr &&
                      listing.details.TokenIdStr === ownedItem.details.TokenIdStr
                    );

                    return (
                      <ItemCard
                        key={`marketplace-owned-item-${ownedItem.details.ContractAddr}-${ownedItem.details.TokenIdStr}`}
                        link={UrlJoin(match.url, "owned", ownedItem.details.ContractId, ownedItem.details.TokenIdStr)}
                        image={<NFTImage nft={ownedItem} width={600}/>}
                        name={ownedItem.metadata.display_name || ""}
                        edition={ownedItem.metadata.edition_name}
                        description={ownedItem.metadata.description}
                        sideText={NFTDisplayToken(ownedItem)}
                        badges={listing ? <ImageIcon icon={ListingIcon} title="This NFT is listed for sale" alt="Listing Icon" className="item-card__badge"/> : null}
                        price={listing ? FormatPriceString({USD: listing.details.Price}, {includeCurrency: !listing.details.USDCOnly, prependCurrency: true}) : null}
                        usdcAccepted={listing?.details?.USDCAccepted}
                        variant={ownedItem.metadata.style}
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
      }
    />
  );
});

export default MarketplaceOwned;
