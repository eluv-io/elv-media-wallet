import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import NFTPlaceholderIcon from "Assets/icons/nft";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ItemCard from "Components/common/ItemCard";
import ImageIcon from "Components/common/ImageIcon";

import OwnedIcon from "Assets/icons/owned icon.svg";

const MarketplaceCollections = observer(() => {
  const match = useRouteMatch();
  const location = useLocation();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const basePath = UrlJoin("/marketplace", match.params.marketplaceId, "collection");

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  const purchaseableItems = rootStore.MarketplacePurchaseableItems(marketplace);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if(params.has("collection")) {
      setTimeout(() => {
        const collectionSection = document.getElementById(`collection-${encodeURIComponent(params.get("collection"))}`);

        if(!collectionSection) { return; }

        window.scrollTo({top: collectionSection.getBoundingClientRect().top});
      }, 100);
    }
  }, []);

  const collections = marketplace.collections.map((collection, collectionIndex) => {
    // If filters are specified, must at least one filter
    if(rootStore.marketplaceFilters.length > 0 && !rootStore.marketplaceFilters.find(filter => (collection.collection_header || "").toLowerCase().includes(filter.toLowerCase()))) {
      return null;
    }

    const collectionItems = collection.items.map((sku, entryIndex) => {
      const key = `collection-card-${collectionIndex}-${entryIndex}`;
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      if(item && marketplaceItems[sku] && marketplaceItems[sku].length > 0) {
        const details = marketplaceItems[sku][0];
        const nft = {
          metadata: item.nft_template.nft,
          details
        };

        return (
          <ItemCard
            key={key}
            link={UrlJoin(basePath, collectionIndex.toString(), "owned", nft.details.ContractId, nft.details.TokenIdStr)}
            image={<NFTImage nft={nft} width={600} />}
            name={nft.metadata.display_name}
            description={item.description || item.nftTemplateMetadata.description}
            badges={<ImageIcon icon={OwnedIcon} title="You own this item" alt="Listing Icon" className="item-card__badge" />}
          />
        );
      } else if(item && purchaseableItems[sku]) {
        return (
          <MarketplaceItemCard
            key={key}
            to={`${basePath}/${collectionIndex}/store/${purchaseableItems[sku].item.sku}`}
            marketplaceHash={marketplace.versionHash}
            item={purchaseableItems[sku].item}
            index={purchaseableItems[sku].index}
            className="item-card--disabled"
          />
        );
      } else {
        // Not accessible or null item use placeholder

        const placeholder = item || collection.placeholder || {};

        return (
          <ItemCard
            key={key}
            image={
              placeholder.image ?
                <MarketplaceImage
                  marketplaceHash={marketplace.versionHash}
                  title={placeholder.name}
                  path={
                    item ?
                      UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image") :
                      UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "placeholder", "image")
                  }
                /> :
                <MarketplaceImage title={placeholder.name} icon={NFTPlaceholderIcon} />
            }
            name={placeholder.name}
            description={placeholder.description}
          />
        );
      }
    });

    const collectionIcon = collection.collection_icon;

    return (
      <div className="marketplace__section" key={`marketplace-section-${collectionIndex}`} id={`collection-${encodeURIComponent(collection.name || collection.collection_header)}`}>
        <div className="marketplace__collection-header">
          {
            collectionIcon ?
              <MarketplaceImage
                rawImage
                className="marketplace__collection-header__icon"
                marketplaceHash={marketplace.versionHash}
                title={collection.name}
                path={
                  UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_icon")
                }
              /> : null
          }
          <div className="page-header">{ collection.collection_header}</div>
          <div className="page-subheader">{ collection.collection_subheader}</div>
        </div>
        <div className="card-list card-list-collections">
          { collectionItems }
        </div>
      </div>
    );
  });

  if(collections.length === 0) {
    return null;
  }

  return (
    <div className="marketplace-listings marketplace__section">
      { collections }
    </div>
  );
});

export default MarketplaceCollections;
