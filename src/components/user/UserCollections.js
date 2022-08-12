import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ItemCard from "Components/common/ItemCard";
import ImageIcon from "Components/common/ImageIcon";

import OwnedIcon from "Assets/icons/owned icon.svg";
import {PageLoader} from "Components/common/Loaders";
import NFTCard from "Components/nft/NFTCard";

const UserCollection = observer(({collectionSKU}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const userAddress = rootStore.userProfiles[match.params.userId].userAddress;
  const [collectionItems, setCollectionItems] = useState(undefined);

  if(!marketplace) { return null; }

  const collection = (marketplace.collections || []).find(collection =>
    collectionSKU === collection.sku
  );

  const basePath = UrlJoin("/marketplace", match.params.marketplaceId, "users", match.params.userId);

  useEffect(() => {
    rootStore.MarketplaceCollectionItems({marketplace, collection, userAddress})
      .then(items => {
        setCollectionItems(items);
      });
  }, []);

  const collectionCards = (collectionItems || [])
    .map(({sku, entryIndex, item, ownedItems, purchaseableItem}) => {
      const key = `item-card-${sku}-${entryIndex}`;
      const ownedItem = ownedItems[0];

      if(item && ownedItem) {
        return (
          <NFTCard
            key={key}
            nft={ownedItem.nft}
            hideToken
            link={UrlJoin(basePath, "items", ownedItem.nft.details.ContractId, ownedItem.nft.details.TokenIdStr)}
            imageWidth={600}
            badges={<ImageIcon icon={OwnedIcon} title="You own this item" alt="Listing Icon" className="item-card__badge"/>}
            className="marketplace__collection__card marketplace__collection__card--owned"
          />
        );
      } else if(item && purchaseableItem) {
        return (
          <MarketplaceItemCard
            key={key}
            noLink
            marketplaceHash={marketplace.versionHash}
            item={purchaseableItem.item}
            index={purchaseableItem.index}
            className="marketplace__collection__card"
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
            image={<NFTImage nft={{metadata: item.nftTemplateMetadata}} width={600}/>}
            name={item.nftTemplateMetadata.display_name}
            description={item.nftTemplateMetadata.description}
            variant={item.nftTemplateMetadata.style}
            className="marketplace__collection__card"
          />
        );
      }
    });

  return (
    <div className="marketplace__section">
      <div className="marketplace__collection-header">
        {
          collection.collection_icon ?
            <MarketplaceImage
              rawImage
              className="marketplace__collection-header__icon"
              marketplaceHash={marketplace.versionHash}
              title={collection.name}
              path={UrlJoin("public", "asset_metadata", "info", "collections", collection.collectionIndex.toString(), "collection_icon")}
            /> : null
        }
        <div className="page-headers">
          { collection.collection_header ? <div className="page-header">{ collection.collection_header}</div> : null }
          { collection.collection_subheader ? <div className="page-subheader">{ collection.collection_subheader}</div> : null }
        </div>
        {
          collection.collection_banner ?
            <div className="marketplace__collection-header__banner-container">
              <MarketplaceImage
                rawImage
                width="2000"
                className="marketplace__collection-header__banner"
                marketplaceHash={marketplace.versionHash}
                path={UrlJoin("public", "asset_metadata", "info", "collections", collection.collectionIndex.toString(), "collection_banner")}
              />
            </div> : null
        }
      </div>
      {
        collectionItems ?
          <div className="card-list marketplace__collection__list">
            {collectionCards}
          </div> :
          <PageLoader/>
      }
    </div>
  );
});

const UserCollections = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  return (
    <>
      {
        (marketplace.collections || []).map(collection =>
          <UserCollection collectionSKU={collection.sku} key={`collection-${collection.sku}`}/>
        )
      }
    </>
  );
});

export default UserCollections;
