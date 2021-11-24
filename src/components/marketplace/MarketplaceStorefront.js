import React from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import MarketplaceCollections from "Components/marketplace/MarketplaceCollections";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";

const MarketplaceStorefront = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  const sections = (((marketplace.storefront || {}).sections || []).map((section, sectionIndex) => {
    const items = section.items.map((sku) => {
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = itemIndex >= 0 && marketplace.items[itemIndex];

      // Authorization
      if(!item || !item.for_sale || (item.requires_permissions && !item.authorized) || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
        return;
      }

      if(item.max_per_user && marketplaceItems[item.sku] && marketplaceItems[item.sku].length >= item.max_per_user) {
        // Purchase limit
        return;
      }

      // If filters are specified, item must match at least one
      if(rootStore.marketplaceFilters.length > 0 && !rootStore.marketplaceFilters.find(filter => (item.tags || []).map(tag => (tag || "").toLowerCase()).includes(filter.toLowerCase()))) {
        return;
      }

      return { item, itemIndex };
    }).filter(item => item);

    if(items.length === 0) { return null; }

    return (
      <div className="marketplace__section" key={`marketplace-section-${sectionIndex}`}>
        <h1 className="page-header">{section.section_header}</h1>
        <h2 className="page-subheader">{section.section_subheader}</h2>
        <div className="card-list">
          {
            items.map(({item, itemIndex}) =>
              <MarketplaceItemCard
                marketplaceHash={marketplace.versionHash}
                item={item}
                index={itemIndex}
                key={`marketplace-item-${itemIndex}`}
              />
            )
          }
        </div>
      </div>
    );
  })).filter(section => section);

  if(sections.length === 0 && marketplace.collections.length === 0) {
    if(rootStore.sidePanelMode) {
      rootStore.SetNoItemsAvailable();
      return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, "collections")} />;
    } else {
      return <h2 className="marketplace__empty">No items available</h2>;
    }
  }

  return (
    <>
      { sections }
      <MarketplaceCollections />
    </>
  );
});

export default MarketplaceStorefront;
