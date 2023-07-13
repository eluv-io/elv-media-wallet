import React, {useEffect, useState} from "react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {MarketplaceImage} from "Components/common/Images";
import UrlJoin from "url-join";
import {observer} from "mobx-react";
import {PageLoader} from "Components/common/Loaders";

const CollectionCard = observer(({marketplace, collection}) => {
  if(!collection.sku) { return; }

  const match = useRouteMatch();

  const [collected, setCollected] = useState(undefined);

  useEffect(() => {
    if(!rootStore.loggedIn) { return; }
    rootStore.MarketplaceCollectionItems({marketplace, collection})
      .then(collectionItems => {
        setCollected(collectionItems.filter(slot => slot.ownedItems.length > 0).length);
      });
  }, [rootStore.loggedIn]);

  return (
    <div className="collection-card">
      <div className="collection-card__icon-container">
        <div className="collection-card__icon">
          <MarketplaceImage
            className="collection-card__image"
            marketplaceHash={marketplace.versionHash}
            title={collection.name}
            url={collection?.collection_icon?.url}
          />
        </div>
      </div>
      <div className="collection-card__details">
        <div className="collection-card__header">
          { collection.collection_header}
        </div>
        {
          typeof collected === "undefined" ? null :
            <div className={`collection-card__summary ${collected === collection.items.length ? "collection-card__summary--highlight" : ""}`}>
              { collected } / { collection.items.length}
            </div>
        }
        <div className="collection-card__subheader">
          { collection.collection_subheader}
        </div>
        <div className="collection-card__actions">
          <Link
            to={UrlJoin("/marketplace", match.params.marketplaceId, "collections", collection.sku)}
            className="action action-primary"
          >
            { rootStore.l10n.collections.go_to_collection }
          </Link>
        </div>
      </div>
    </div>
  );
});

export const MarketplaceCollectionsSummary = observer(() => {
  const match = useRouteMatch();
  const [loading, setLoading] = useState(true);
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collectionsInfo = marketplace?.collections_info || {};

  useEffect(() => {
    if(!marketplace) { return; }

    rootStore.MarketplaceOwnedItems({marketplace})
      .then(() => setLoading(false));
  }, [marketplace]);

  if(!marketplace) { return null; }

  if(rootStore.marketplaceFilters.length > 0 || !marketplace?.collections || marketplace.collections.length === 0) { return null; }

  if(loading) {
    return <PageLoader />;
  }

  return (
    <div className="marketplace__section collections-summary">
      <div className="marketplace__collection-header">
        {
          collectionsInfo.icon ?
            <MarketplaceImage
              rawImage
              className="marketplace__collection-header__icon"
              marketplaceHash={marketplace.versionHash}
              url={collectionsInfo?.icon?.url}
            /> : null
        }
        <div className="page-headers">
          <div className="page-header">{ collectionsInfo.header || rootStore.l10n.header.collections }</div>
          { collectionsInfo.subheader ? <div className="page-subheader">{ collectionsInfo.subheader }</div> : null }
        </div>
        {
          collectionsInfo.banner ?
            <div className="marketplace__collection-header__banner-container">
              <MarketplaceImage
                rawImage
                width="2000"
                className="marketplace__collection-header__banner"
                marketplaceHash={marketplace.versionHash}
                url={collectionsInfo?.banner?.url}
              />
            </div> : null
        }
      </div>
      <div className="card-list collections-summary__list">
        {
          marketplace.collections.map((collection) =>
            <CollectionCard
              marketplace={marketplace}
              collection={collection}
              key={`collection-${collection.sku}`}
            />
          )
        }
      </div>
    </div>
  );
});

export default MarketplaceCollectionsSummary;
