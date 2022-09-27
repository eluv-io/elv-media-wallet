import React, {useEffect, useState, useRef} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ImageIcon from "Components/common/ImageIcon";
import MarketplaceFeatured from "Components/marketplace/MarketplaceFeatured";
import {MarketplaceCollectionsSummary} from "Components/marketplace/MarketplaceCollectionsSummary";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import {LinkTargetHash} from "../../utils/Utils";

const MarketplaceBannerContent = observer(({banner}) => {
  const targetRef = useRef();

  if(!banner) { return null; }

  useEffect(() => {
    if(!targetRef || !targetRef.current) { return; }

    const playerPromise = new EluvioPlayer(
      targetRef.current,
      {
        clientOptions: {
          network: rootStore.walletClient.network === "main" ?
            EluvioPlayerParameters.networks.MAIN : EluvioPlayerParameters.networks.DEMO,
          client: rootStore.client
        },
        sourceOptions: {
          playoutParameters: {
            versionHash: LinkTargetHash(banner.video)
          }
        },
        playerOptions: {
          watermark: EluvioPlayerParameters.watermark.OFF,
          muted: banner.video_muted ? EluvioPlayerParameters.muted.ON : EluvioPlayerParameters.muted.OFF,
          autoplay: banner.video_muted ? EluvioPlayerParameters.autoplay.ON : EluvioPlayerParameters.autoplay.OFF,
          controls: banner.video_muted ? EluvioPlayerParameters.controls.OFF : EluvioPlayerParameters.controls.AUTO_HIDE,
          loop: banner.video_muted ? EluvioPlayerParameters.loop.ON : EluvioPlayerParameters.loop.OFF
        }
      }
    );

    return async () => {
      if(!playerPromise) { return; }

      const player = await playerPromise;
      player.Destroy();
    };
  }, [targetRef]);

  if(banner.video) {
    return <div className="marketplace__banner__video" ref={targetRef} />;
  }

  return (
    <ImageIcon
      className="marketplace__banner__image"
      icon={(
        banner.image_mobile && rootStore.pageWidth <= 800 ?
          banner.image_mobile : banner.image
      ).url}
    />
  );
});

const MarketplaceBanners = ({marketplace}) => {
  if(!marketplace.banners || marketplace.banners.length === 0) { return null; }

  return (
    marketplace.banners.map((banner, index) => {
      const attrs = { key: `banner-${index}`, className: "marketplace__banner" };
      const bannerContent = <MarketplaceBannerContent banner={banner} />;

      if(banner.link) {
        return (
          <a href={banner.link} rel="noopener" target="_blank" { ...attrs }>
            { bannerContent }
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
              { bannerContent }
            </Link>
          );
        }
      }

      return (
        <div { ...attrs }>
          { bannerContent }
        </div>
      );
    })
  );
};

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
        <div className={`card-list card-list--marketplace ${rootStore.centerContent ? "card-list--centered" : ""}`}>
          {
            items.map((item, index) =>
              <MarketplaceItemCard
                marketplaceHash={marketplace.versionHash}
                item={item}
                index={item.itemIndex}
                showVideo={item.play_on_storefront}
                key={`marketplace-item-${sectionIndex}-${item.sku}-${index}-${loadKey}`}
              />
            )
          }
        </div>
      );
    }

    return (
      <div className="marketplace__section marketplace__section--no-margin" key={`marketplace-section-${sectionIndex}-${loadKey}`}>
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
      return <Redirect to={UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items")} />;
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
    <div className="page-block page-block--main-content page-block--storefront">
      <div className="page-block__content page-block__content--unrestricted">
        <MarketplaceBanners marketplace={marketplace} />
        <MarketplaceStorefrontSections marketplace={marketplace} />
        <MarketplaceCollectionsSummary marketplace={marketplace} />
      </div>
    </div>
  );
});

export default MarketplaceStorefront;
