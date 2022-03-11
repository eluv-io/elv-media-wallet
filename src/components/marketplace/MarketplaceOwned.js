import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import ImageIcon from "Components/common/ImageIcon";
import ListingIcon from "Assets/icons/listing";
import {NFTDisplayToken} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {Loader} from "Components/common/Loaders";

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
      perPage={32}
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
                  entries.map((ownedItem) =>
                    <div className="card-container card-shadow" key={`marketplace-owned-item-${ownedItem.details.ContractAddr}-${ownedItem.details.TokenIdStr}`}>
                      <Link
                        to={UrlJoin(match.url, "owned", ownedItem.details.ContractId, ownedItem.details.TokenIdStr)}
                        className="card nft-card"
                      >
                        <NFTImage nft={ownedItem} width={400} />
                        <div className="card__badges">
                          { listings.find(listing =>
                            listing.details.ContractAddr === ownedItem.details.ContractAddr &&
                            listing.details.TokenIdStr === ownedItem.details.TokenIdStr
                          ) ?
                            <ImageIcon icon={ListingIcon} title="This NFT is listed for sale" alt="Listing Icon" className="card__badge" />
                            : null
                          }
                        </div>
                        <div className="card__text">
                          <div className="card__titles">
                            <h2 className="card__title">
                              { ownedItem.metadata.display_name || "" }
                            </h2>
                            {
                              ownedItem.metadata.edition_name ?
                                <h2 className="card__title-edition">
                                  { ownedItem.metadata.edition_name }
                                </h2> : null
                            }
                            <h2 className="card__title card__title-edition">
                              { NFTDisplayToken(ownedItem) }
                            </h2>
                            <ResponsiveEllipsis
                              component="h2"
                              className="card__subtitle"
                              text={ownedItem.metadata.description}
                              maxLine="3"
                            />
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
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
