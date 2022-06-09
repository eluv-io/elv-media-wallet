import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ItemCard from "Components/common/ItemCard";
import ImageIcon from "Components/common/ImageIcon";

import OwnedIcon from "Assets/icons/owned icon.svg";
import {PageLoader} from "Components/common/Loaders";
import BackIcon from "Assets/icons/arrow-left";

const MarketplaceCollection = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const [collectionItems, setCollectionItems] = useState(undefined);

  if(!marketplace) { return null; }

  const collection = (marketplace.collections || []).find(collection =>
    match.params.collectionSlug === collection.collectionSlug
  );

  const basePath = UrlJoin("/marketplace", match.params.marketplaceId, "collections");

  useEffect(() => {
    rootStore.MarketplaceCollectionItems({marketplace, collection})
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
          <ItemCard
            key={key}
            link={UrlJoin(basePath, collection.collectionSlug, "owned", ownedItem.nft.details.ContractId, ownedItem.nft.details.TokenIdStr)}
            image={<NFTImage nft={ownedItem.nft} width={600}/>}
            name={ownedItem.nft.metadata.display_name}
            description={ownedItem.nft.metadata.description}
            edition={ownedItem.nft.metadata.edition_name}
            badges={<ImageIcon icon={OwnedIcon} title="You own this item" alt="Listing Icon" className="item-card__badge"/>}
            variant={ownedItem.nft.metadata.style}
          />
        );
      } else if(item && purchaseableItem) {
        return (
          <MarketplaceItemCard
            key={key}
            to={UrlJoin(basePath, collection.collectionSlug, "store", purchaseableItem.item.sku)}
            marketplaceHash={marketplace.versionHash}
            item={purchaseableItem.item}
            index={purchaseableItem.index}
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
            image={<NFTImage nft={{metadata: item.nftTemplateMetadata}} width={600}/>}
            name={item.nftTemplateMetadata.display_name}
            description={item.nftTemplateMetadata.description}
            variant={item.nftTemplateMetadata.style}
          />
        );
      }
    });

  const collectionIcon = collection.collection_icon;
  const collectionCompleted = collectionItems && !collectionItems.find(slot => (slot.ownedItems || []).length === 0);

  let redeemButton = (
    <Link
      to={UrlJoin(basePath, collection.collectionSlug, "redeem")}
      className="action action-primary marketplace__collection__redeem__button"
    >
      Redeem
    </Link>
  );

  if(!collectionCompleted) {
    redeemButton = (
      <button
        disabled={true}
        className="action action-primary marketplace__collection__redeem__button"
      >
        Redeem
      </button>
    );
  }

  return (
    <div className="marketplace-listings marketplace__section">
      <Link to={basePath} className="details-page__back-link">
        <ImageIcon icon={BackIcon} />
        Back to { marketplace?.branding?.name || "Marketplace" } Collections
      </Link>
      <div className="marketplace__section">
        <div className="marketplace__collection-header">
          {
            collectionIcon ?
              <MarketplaceImage
                rawImage
                className="marketplace__collection-header__icon"
                marketplaceHash={marketplace.versionHash}
                title={collection.name}
                path={
                  UrlJoin("public", "asset_metadata", "info", "collections", collection.collectionIndex.toString(), "collection_icon")
                }
              /> : null
          }
          <div className="page-headers">
            { collection.collection_header ? <div className="page-header">{ collection.collection_header}</div> : null }
            { collection.collection_subheader ? <div className="page-subheader">{ collection.collection_subheader}</div> : null }
          </div>
        </div>
        {
          collectionItems && collection.redeemable ?
            <div className="marketplace__collection__redeem">
              <div className="marketplace__collection__redeem__message">
                {
                  collectionCompleted ?
                    "Your collection is complete!" :
                    "Collect all the tokens to redeem rewards!"
                }
              </div>
              { redeemButton }
            </div> : null
        }
        {
          collectionItems ?
            <div className="card-list marketplace__collection__list">
              {collectionCards}
            </div> :
            <PageLoader/>
        }
        {
          collection.redeemable ?
            <div className="collection-redemption__rewards-container">
              <div className="collection-redemption__rewards-container__header">
                Complete your collection to redeem these rewards!
              </div>
              <div className="card-list card-list--centered collection-redemption__rewards">
                {
                  collection.redeem_items.map(sku => {
                    const item = marketplace.items.find(item => item.sku === sku);

                    return (
                      <MarketplaceItemCard
                        noLink
                        noStock
                        noPrice
                        item={item}
                        index={item.itemIndex}
                        marketplaceHash={marketplace.versionHash}
                      />
                    );
                  })
                }
              </div>
              { redeemButton }
            </div> : null
        }
      </div>
    </div>
  );
});

export default MarketplaceCollection;
