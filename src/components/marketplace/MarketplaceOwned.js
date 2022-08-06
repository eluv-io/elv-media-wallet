import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import ListingIcon from "Assets/icons/listings icon";
import FilteredView from "Components/listings/FilteredView";
import TestIcon from "Assets/icons/alert-circle";
import NFTCard from "Components/nft/NFTCard";

const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();
  const [listings, setListings] = useState([]);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  useEffect(() => {
    rootStore.walletClient.UserListings()
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
      topPagination
      showPagingInfo
      perPage={9}
      scrollOnPageChange
      Render={({entries}) =>
        entries.length === 0 ? null :
          <div className="card-list">
            {
              entries.map((ownedItem) => {
                const listing = listings.find(listing =>
                  listing.details.ContractAddr === ownedItem.details.ContractAddr &&
                  listing.details.TokenIdStr === ownedItem.details.TokenIdStr
                );

                return (
                  <NFTCard
                    key={`nft-card2-${ownedItem.details.ContractId}-${ownedItem.details.TokenIdStr}`}
                    link={UrlJoin(match.url, ownedItem.details.ContractId, ownedItem.details.TokenIdStr)}
                    nft={ownedItem}
                    selectedListing={listing}
                    imageWidth={600}
                    truncateDescription
                    badges={
                      <>
                        {
                          listing ?
                            <ImageIcon
                              icon={ListingIcon}
                              title="This NFT is listed for sale"
                              alt="Listing Icon"
                              className="item-card__badge"
                            /> : null
                        }
                        {
                          ownedItem.metadata.test ?
                            <ImageIcon
                              icon={TestIcon}
                              title="This is a test NFT"
                              alt="Test NFT"
                              className="item-card__badge item-card__badge--test"
                            /> : null
                        }
                      </>
                    }
                  />
                );
              })
            }
          </div>
      }
    />
  );
});

export default MarketplaceOwned;
