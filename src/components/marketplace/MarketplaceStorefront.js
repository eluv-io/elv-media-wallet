import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import MarketplaceCollections from "Components/marketplace/MarketplaceCollections";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";

const MarketplaceStorefront = observer(() => {
  const match = useRouteMatch();
  const [timeouts, setTimeouts] = useState({});
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    return () => {
      Object.keys(timeouts).forEach(sku => clearTimeout(timeouts[sku]));
    };
  }, []);

  let marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  const sections = (((marketplace.storefront || {}).sections || []).map((section, sectionIndex) => {
    const items = section.items.map((sku) => {
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      let item = itemIndex >= 0 && marketplace.items[itemIndex];

      // Authorization
      if(!item || !item.for_sale || (item.requires_permissions && !item.authorized) || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
        return;
      }

      if(item.max_per_user && marketplaceItems[item.sku] && marketplaceItems[item.sku].length >= item.max_per_user) {
        // Purchase limit
        // return;
      }

      // If filters are specified, item must match at least one
      if(rootStore.marketplaceFilters.length > 0 && !rootStore.marketplaceFilters.find(filter => (item.tags || []).map(tag => (tag || "").toLowerCase()).includes(filter.toLowerCase()))) {
        return;
      }

      try {
        const diff = item.available_at ? new Date(item.available_at).getTime() - Date.now() : 0;
        if(diff > 0) {
          if(!timeouts[sku]) {
            setTimeouts({
              ...timeouts,
              [sku]: (
                setTimeout(() => {
                  setLoadKey(sku);
                }, diff + 1000)
              )
            });
          }

          return;
        }
      } catch(error) {
        rootStore.Log("Failed to parse item date:", true);
        rootStore.Log(item, true);
      }

      return { item, itemIndex };
    }).filter(item => item);

    if(items.length === 0) { return null; }

    return (
      <div className="marketplace__section" key={`marketplace-section-${sectionIndex}-${loadKey}`}>
        <h1 className="page-header">{section.section_header}</h1>
        <h2 className="page-subheader">{section.section_subheader}</h2>
        <div className="card-list">
          {
            items.map(({item, itemIndex}) =>
              <MarketplaceItemCard
                marketplaceHash={marketplace.versionHash}
                item={item}
                index={itemIndex}
                key={`marketplace-item-${itemIndex}-${loadKey}`}
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
      return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "collection")} />;
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
