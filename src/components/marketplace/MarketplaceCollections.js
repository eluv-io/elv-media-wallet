import React, {useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import NFTPlaceholderIcon from "Assets/icons/nft";
import InfoModal from "Components/common/InfoModal";
import ImageIcon from "Components/common/ImageIcon";
import HelpIcon from "Assets/icons/help-circle";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ItemCard from "Components/common/ItemCard";

const MarketplaceCollections = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const [modal, setModal] = useState(null);

  if(!marketplace) { return null; }

  const basePath = UrlJoin("/marketplace", match.params.marketplaceId, "collection");

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  const purchaseableItems = rootStore.MarketplacePurchaseableItems(marketplace);

  const collections = marketplace.collections.map((collection, collectionIndex) => {
    let owned = 0;

    // If filters are specified, must at least one filter
    if(rootStore.marketplaceFilters.length > 0 && !rootStore.marketplaceFilters.find(filter => (collection.collection_header || "").toLowerCase().includes(filter.toLowerCase()))) {
      return null;
    }

    const collectionItems = collection.items.map((sku, entryIndex) => {
      const key = `collection-card-${collectionIndex}-${entryIndex}`;
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      if(item && marketplaceItems[sku] && marketplaceItems[sku].length > 0) {
        owned += 1;

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

    const collectionModalInfo = collection.collection_info_modal || {};
    return (
      <div className="marketplace__section" key={`marketplace-section-${collectionIndex}`}>
        <h1 className="page-header section-header">
          <div className="section-header__left">
            <div className="page-header__title marketplace__collection-header">
              {
                collectionIcon ?
                  <MarketplaceImage
                    rawImage
                    className="page-header__icon"
                    marketplaceHash={marketplace.versionHash}
                    title={collection.name}
                    path={
                      UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_icon")
                    }
                  /> :
                  <div className="page-header__title__title">
                    { collection.collection_header }
                  </div>
              }
            </div>
            {
              collectionModalInfo.show ?
                <button
                  className="collection-info__button"
                  onClick={() => setModal(
                    <InfoModal
                      info={collectionModalInfo}
                      marketplaceHash={marketplace.versionHash}
                      imagePath={UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_info_modal", "image")}
                      backgroundImagePath={UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_info_modal", "background_image")}
                      Close={() => setModal(null)}
                    />
                  )}
                >
                  <ImageIcon
                    className="collection-info__button__icon"
                    icon={HelpIcon}
                    title="Click here for more information about this collection!"
                  />
                </button> : null
            }
          </div>
          <div className="page-header__subtitle">{ owned } / { collection.items.length }</div>
        </h1>
        <h2 className="page-subheader">{collection.collection_subheader}</h2>
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
    <>
      { modal }
      <div className="marketplace-listings marketplace__section">
        { collections }
      </div>
    </>
  );
});

export default MarketplaceCollections;
