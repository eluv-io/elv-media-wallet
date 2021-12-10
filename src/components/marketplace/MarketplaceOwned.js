import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {NFTImage} from "Components/common/Images";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import MarketplaceCollections from "Components/marketplace/MarketplaceCollections";
import ImageIcon from "Components/common/ImageIcon";
import ListingIcon from "Assets/icons/listing";

const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();
  const [listings, setListings] = useState([]);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);
  const ownedItems = Object.values(marketplaceItems).flat();

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
                        { typeof ownedItem.details.TokenOrdinal !== "undefined" ? `${parseInt(ownedItem.details.TokenOrdinal) + 1} / ${ownedItem.details.Cap}` : ownedItem.details.TokenIdStr }
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
      { ownedItems.length === 0 && marketplace.collections.length > 0 ? null : owned }
      <MarketplaceCollections />
    </>
  );
});

export default MarketplaceOwned;
