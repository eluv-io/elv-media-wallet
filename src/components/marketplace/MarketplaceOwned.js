import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import Listings from "Components/listings/Listings";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import MarketplaceCollections from "Components/marketplace/MarketplaceCollections";

const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);
  const ownedItems = Object.values(marketplaceItems).flat();

  useEffect(() => {
    if(!rootStore.sidePanelMode || !rootStore.noItemsAvailable) { return; }

    // If there are no items available for sale and we're in the side panel, we want to avoid navigating back to the marketplace page.
    const originalHideNavigation = rootStore.hideNavigation;

    rootStore.ToggleNavigation(false);

    return () => {
      rootStore.ToggleNavigation(originalHideNavigation);
    };
  }, []);

  const owned = (
    ownedItems.length === 0 ?
      <div className="marketplace__section">
        <div className="page-header">{ ((marketplace.storefront || {}).tabs || {}).collection || "My Items" }</div>
        <h2 className="marketplace__empty">You don't own any items from this marketplace yet!</h2>
      </div> :
      <div className="marketplace__section">
        <div className="page-header">{ ((marketplace.storefront || {}).tabs || {}).collection || "My Items" }</div>
        <div className="card-list">
          {
            ownedItems.map(ownedItem =>
              <div className="card-container card-shadow" key={`marketplace-owned-item-${ownedItem.details.ContractAddr}-${ownedItem.details.TokenIdStr}`}>
                <Link
                  to={UrlJoin(match.url, "owned", ownedItem.details.ContractId, ownedItem.details.TokenIdStr)}
                  className="card nft-card"
                >
                  <NFTImage nft={ownedItem} width={400} />
                  <div className="card__text">
                    <div className="card__titles">
                      <h2 className="card__title">
                        { ownedItem.metadata.display_name || "" }
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
      </div>
  );

  return (
    <>
      <div className="marketplace__section">
        <Listings />
      </div>
      { ownedItems.length === 0 && marketplace.collections.length > 0 ? null : owned }
      <MarketplaceCollections />
    </>
  );
});

export default MarketplaceOwned;
