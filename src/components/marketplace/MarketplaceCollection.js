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
import NFTCard from "Components/nft/NFTCard";
import {LocalizeString} from "Components/common/UIComponents";

const MarketplaceCollection = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false || marketplace?.branding?.disable_secondary_market;
  const [collectionItems, setCollectionItems] = useState(undefined);

  if(!marketplace) { return null; }

  const collection = (marketplace.collections || []).find(collection =>
    match.params.collectionSKU === collection.sku
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
          <NFTCard
            key={key}
            nft={ownedItem.nft}
            hideToken
            link={UrlJoin(basePath, collection.sku, "owned", ownedItem.nft.details.ContractId, ownedItem.nft.details.TokenIdStr)}
            imageWidth={600}
            badges={[<ImageIcon key="badge-owned" icon={OwnedIcon} title="You own this item" alt="Listing Icon" className="item-card__badge"/>]}
            className="marketplace__collection__card marketplace__collection__card--owned"
          />
        );
      } else if(item && purchaseableItem) {
        return (
          <MarketplaceItemCard
            key={key}
            imageOnly={purchaseableItem.unreleased}
            to={UrlJoin(basePath, collection.sku, "store", purchaseableItem.item.sku)}
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
            link={secondaryDisabled ? "" : UrlJoin("/marketplace", match.params.marketplaceId, `listings?filter=${encodeURIComponent(item.nftTemplateMetadata.display_name)}`)}
            image={<NFTImage nft={{metadata: item.nftTemplateMetadata}} width={600}/>}
            name={item.nftTemplateMetadata.display_name}
            description={item.nftTemplateMetadata.description}
            variant={item.nftTemplateMetadata.style}
            className="marketplace__collection__card"
          />
        );
      }
    });

  const collectionCompleted = collectionItems && !collectionItems.find(slot => (slot.ownedItems || []).length === 0);

  let redeemButton = (
    <Link
      to={UrlJoin(basePath, collection.sku, "redeem")}
      className="action action-primary marketplace__collection__redeem__button"
    >
      { rootStore.l10n.collections.select_nfts }
    </Link>
  );

  if(!collectionCompleted) {
    redeemButton = (
      <button
        disabled={true}
        className="action action-primary marketplace__collection__redeem__button"
      >
        { rootStore.l10n.collections.select_nfts }
      </button>
    );
  }

  return (
    <div className="marketplace__section">
      <Link to={basePath} className="details-page__back-link">
        <ImageIcon icon={BackIcon} />
        <div className="details-page__back-link__text ellipsis">
          { LocalizeString(rootStore.l10n.collections.back_to_collections, { marketplaceName: marketplace?.branding?.name || "Marketplace" }) }
        </div>
      </Link>
      <div className="marketplace__section">
        <div className="marketplace__collection-header">
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
                  url={collection.collection_banner?.url}
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
        {
          collectionItems && collection.redeemable ?
            <div className="marketplace__collection__redeem">
              <div className="marketplace__collection__redeem__message">
                { rootStore.l10n.collections[collectionCompleted ? "collection_complete" : "complete_to_redeem"] }
              </div>
              { redeemButton }
            </div> : null
        }
        {
          collection.redeemable ?
            <div className="collection-redemption__rewards-container">
              <div className={`card-list ${rootStore.centerContent ? "card-list--centered" : ""} collection-redemption__rewards`}>
                {
                  collection.redeem_items.map((sku, index) => {
                    const item = marketplace.items.find(item => item.sku === sku);

                    if(!item) { return null; }

                    return (
                      <MarketplaceItemCard
                        key={`marketplace-card-${index}`}
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
            </div> : null
        }
      </div>
    </div>
  );
});

export default MarketplaceCollection;
