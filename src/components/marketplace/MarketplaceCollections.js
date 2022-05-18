import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ItemCard from "Components/common/ItemCard";
import ImageIcon from "Components/common/ImageIcon";

import OwnedIcon from "Assets/icons/owned icon.svg";
import {PageLoader} from "Components/common/Loaders";

const MarketplaceCollections = observer(() => {
  const match = useRouteMatch();
  const location = useLocation();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const [ownedItems, setOwnedItems] = useState(undefined);

  if(!marketplace) { return null; }

  const basePath = UrlJoin("/marketplace", match.params.marketplaceId, "collection");

  const purchaseableItems = rootStore.MarketplacePurchaseableItems(marketplace);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    rootStore.MarketplaceOwnedItems(marketplace)
      .then(ownedItems => {
        setOwnedItems(ownedItems);

        if(params.has("collection")) {
          setTimeout(() => {
            const collectionSection = document.getElementById(`collection-${encodeURIComponent(params.get("collection"))}`);

            if(!collectionSection) { return; }

            window.scrollTo({top: collectionSection.getBoundingClientRect().top});
          }, 100);
        }
      });
  }, []);

  const collections = marketplace.collections.map((collection, collectionIndex) => {
    if(!ownedItems) {
      return null;
    }

    // If filters are specified, must at least one filter
    if(rootStore.marketplaceFilters.length > 0 && !rootStore.marketplaceFilters.find(filter => (collection.collection_header || "").toLowerCase().includes(filter.toLowerCase()))) {
      return null;
    }

    const collectionItems = collection.items.map((sku, entryIndex) => {
      const key = `collection-card-${collectionIndex}-${entryIndex}`;
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      if(item && ownedItems[sku] && ownedItems[sku].length > 0) {
        const ownedItem = ownedItems[sku][0];

        return (
          <ItemCard
            key={key}
            link={UrlJoin(basePath, collectionIndex.toString(), "owned", ownedItem.nft.details.ContractId, ownedItem.nft.details.TokenIdStr)}
            image={<NFTImage nft={ownedItem.nft} width={600} />}
            name={ownedItem.nft.metadata.display_name}
            description={ownedItem.nft.description}
            edition={ownedItem.nft.edition_name}
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
          />
        );
      } else {
        // Not accessible or null item
        if(!item || !item.nftTemplateMetadata) {
          return;
        }

        return (
          <ItemCard
            key={key}
            link={UrlJoin("/marketplace", match.params.marketplaceId, `listings?filter=${encodeURIComponent(item.nftTemplateMetadata.display_name)}`)}
            image={<NFTImage nft={{metadata: item.nftTemplateMetadata}} width={600} />}
            name={item.nftTemplateMetadata.display_name}
            description={item.nftTemplateMetadata.description}
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
          <div className="page-headers">
            { collection.collection_header ? <div className="page-header">{ collection.collection_header}</div> : null }
            { collection.collection_subheader ? <div className="page-subheader">{ collection.collection_subheader}</div> : null }
          </div>
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
      { ownedItems ? collections : <PageLoader /> }
    </div>
  );
});

export default MarketplaceCollections;
