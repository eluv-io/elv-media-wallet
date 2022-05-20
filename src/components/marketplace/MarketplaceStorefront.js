import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useLocation, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ImageIcon from "Components/common/ImageIcon";
import MarketplaceFeatured from "Components/marketplace/MarketplaceFeatured";

import LinkIcon from "Assets/icons/arrow-right.svg";
import {MarketplaceImage} from "Components/common/Images";

const MarketplaceBanners = ({marketplace}) => {
  if(!marketplace.banners || marketplace.banners.length === 0) { return null; }

  return (
    marketplace.banners.map((banner, index) => {
      const attrs = { key: `banner-${index}`, className: "marketplace__banner" };
      const image = (
        <ImageIcon
          icon={(
            banner.image_mobile && rootStore.pageWidth <= 800 ?
              banner.image_mobile : banner.image
          ).url}
        />
      );

      if(banner.link) {
        return (
          <a href={banner.link} rel="noopener" target="_blank" { ...attrs }>
            { image }
          </a>
        );
      } else if(banner.sku) {
        const item = marketplace.items.find(item => item.sku === banner.sku);

        let link;
        if(item && item.for_sale && (!item.available_at || Date.now() - new Date(item.available_at).getTime() > 0) && (!item.expires_at || Date.now() - new Date(item.expires_at).getTime() < 0)) {
          link = UrlJoin("/marketplace", marketplace.marketplaceId, "store", banner.sku);
        }

        if(link) {
          return (
            <Link to={link} { ...attrs }>
              { image }
            </Link>
          );
        }
      }

      return (
        <div { ...attrs }>
          { image }
        </div>
      );
    })
  );
};

const CollectionCard = ({marketplaceHash, collection, collectionIndex}) => {
  const match = useRouteMatch();

  return (
    <div className="collection-card">
      <div className="item-card__image-container collection-card__icon-container">
        <MarketplaceImage
          rawImage
          className="item-card__image collection-card__icon"
          marketplaceHash={marketplaceHash}
          title={collection.name}
          path={UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_icon")}
        />
      </div>
      <div className="collection-card__details">
        <div className="collection-card__header">
          { collection.collection_header}
        </div>
        <div className="collection-card__subheader">
          { collection.collection_subheader}
        </div>
        <div className="collection-card__actions">
          <Link
            to={UrlJoin("/marketplace", match.params.marketplaceId, `collections?collection=${encodeURIComponent(collection.name || collection.collection_header)}`)}
            className="action action-primary"
          >
            Go to Collection
          </Link>
        </div>
      </div>
    </div>
  );
};

const CollectionsSummary = observer(({marketplace}) => {
  const match = useRouteMatch();
  const location = useLocation();

  if(!marketplace?.collections || marketplace.collections.length === 0) { return null; }

  return (
    <div
      className="marketplace__section collections-summary"
      ref={element => {
        if(!element) { return; }

        if(new URLSearchParams(location.search).get("section") === "collections") {
          setTimeout(() => {
            window.scrollTo({top: element.getBoundingClientRect().top - 50});
          }, 150);
        }
      }}
    >
      <div className="page-headers">
        <div className="page-header">Explore Collections</div>
        <Link
          to={UrlJoin("/marketplace", match.params.marketplaceId, "collections")}
          className="page-link collections-summary__link"
        >
          See All
          <ImageIcon icon={LinkIcon} />
        </Link>
      </div>
      <div className="card-list collections-summary__list">
        {
          marketplace.collections.map((collection, collectionIndex) =>
            <CollectionCard
              collection={collection}
              collectionIndex={collectionIndex}
              marketplaceHash={marketplace.versionHash}
              key={`collection-${collectionIndex}`}
            />
          )
        }
      </div>
    </div>
  );
});

let timeout;
const MarketplaceStorefrontSections = observer(({marketplace}) => {
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    return () => clearTimeout(timeout);
  }, []);

  let nextDiff = 0;
  const sections = (((marketplace.storefront || {}).sections || []).map((section, sectionIndex) => {
    const items = section.items.map((sku) => {
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      let item = itemIndex >= 0 && marketplace.items[itemIndex];

      // Authorization
      if(
        !item ||
        !item.for_sale ||
        (item.requires_permissions && !item.authorized && !item.show_if_unauthorized) ||
        (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))
      ) {
        return;
      }

      // If filters are specified, item must match at least one
      if(rootStore.marketplaceFilters.length > 0 && !rootStore.marketplaceFilters.find(filter => (item.tags || []).map(tag => (tag || "").toLowerCase()).includes(filter.toLowerCase()))) {
        return;
      }

      try {
        const diff = item.available_at ? new Date(item.available_at).getTime() - Date.now() : 0;
        if(diff > 0) {
          nextDiff = nextDiff ? Math.min(diff, nextDiff) : diff;
        }

        const expirationDiff = item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : 0;
        if(expirationDiff > 0) {
          nextDiff = nextDiff ? Math.min(expirationDiff, nextDiff) : expirationDiff;
        }
      } catch(error) {
        rootStore.Log("Failed to parse item date:", true);
        rootStore.Log(item, true);
      }

      // TODO: Check release date
      // Available check - must happen after timeout setup
      if(!item.show_if_unreleased && item.available_at && Date.now() - new Date(item.available_at).getTime() < 0) {
        return null;
      }

      return item;
    }).filter(item => item);

    if(nextDiff > 0) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setLoadKey(loadKey + 1);
      }, Math.min(nextDiff + 1000, 24 * 60 * 60 * 1000));
    }

    if(items.length === 0) { return null; }

    let renderedItems;
    if(section.type === "Featured" && rootStore.pageWidth > 700) {
      renderedItems = (
        <MarketplaceFeatured
          marketplaceHash={marketplace.versionHash}
          items={items}
          justification={section.featured_view_justification}
          showGallery={section.show_carousel_gallery}
        />
      );
    } else {
      renderedItems = (
        <div className="card-list card-list--marketplace">
          {
            items.map((item) =>
              <MarketplaceItemCard
                marketplaceHash={marketplace.versionHash}
                item={item}
                index={item.itemIndex}
                key={`marketplace-item-${item.itemIndex}-${loadKey}`}
              />
            )
          }
        </div>
      );
    }

    return (
      <div className="marketplace__section" key={`marketplace-section-${sectionIndex}-${loadKey}`}>
        <div className="page-headers">
          { section.section_header ? <h1 className="page-header">{section.section_header}</h1> : null }
          { section.section_subheader ? <h2 className="page-subheader">{section.section_subheader}</h2> : null }
        </div>
        { renderedItems }
      </div>
    );
  })).filter(section => section);

  if(sections.length === 0 && marketplace.collections.length === 0) {
    if(rootStore.sidePanelMode) {
      rootStore.SetNoItemsAvailable();
      return <Redirect to={UrlJoin("/marketplace", marketplace.marketplaceId, "collection")} />;
    } else if(!marketplace.banners || marketplace.banners.length === 0) {
      return <h2 className="marketplace__empty">No items available</h2>;
    }
  }

  return sections;
});

const MarketplaceStorefront = observer(() => {
  const match = useRouteMatch();

  let marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  return (
    <>
      <MarketplaceBanners marketplace={marketplace} />
      <MarketplaceStorefrontSections marketplace={marketplace} />
      <CollectionsSummary marketplace={marketplace} />
    </>
  );
});

export default MarketplaceStorefront;
