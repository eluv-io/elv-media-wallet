import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ImageIcon from "Components/common/ImageIcon";
import MarketplaceFeatured from "Components/marketplace/MarketplaceFeatured";
import {MarketplaceCollectionsSummary} from "Components/marketplace/MarketplaceCollectionsSummary";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import {SetImageUrlDimensions} from "../../utils/Utils";
import Modal from "Components/common/Modal";
import Countdown from "Components/common/Countdown";
import {RichText} from "Components/common/UIComponents";
import Video from "Components/properties/Video";


const MarketplaceBannerContent = observer(({banner}) => {
  if(!banner) { return null; }

  if(banner.video) {
    return (
      <Video
        link={banner.video}
        className="marketplace__banner__video"
        playerOptions={{
          muted: banner.video_muted ? EluvioPlayerParameters.muted.ON : EluvioPlayerParameters.muted.OFF,
          autoplay: banner.video_muted ? EluvioPlayerParameters.autoplay.ON : EluvioPlayerParameters.autoplay.OFF,
          controls: banner.video_muted ? EluvioPlayerParameters.controls.OFF : EluvioPlayerParameters.controls.AUTO_HIDE,
          loop: banner.video_muted ? EluvioPlayerParameters.loop.ON : EluvioPlayerParameters.loop.OFF
        }}
      />
    );
  }

  const image = (banner.image_mobile && rootStore.pageWidth <= 800 ? banner.image_mobile : banner.image)?.url;

  if(!image) { return null; }

  return (
    <ImageIcon
      className="marketplace__banner__image"
      icon={SetImageUrlDimensions({url: image, width: rootStore.pageWidth <= 800 ? "1000" : "2000"})}
    />
  );
});

const MarketplaceBanners = ({marketplace}) => {
  const [videoModal, setVideoModal] = useState(false);

  if(!marketplace.banners || marketplace.banners.length === 0) { return null; }

  return (
    <>
      {
        marketplace.banners.map((banner, index) => {
          const attrs = {key: `banner-${index}`, className: "marketplace__banner"};
          const bannerContent = <MarketplaceBannerContent banner={banner}/>;

          if(banner.link) {
            return (
              // eslint-disable-next-line react/jsx-key
              <a href={banner.link} rel="noreferrer" target="_blank" {...attrs}>
                {bannerContent}
              </a>
            );
          } else if(banner.sku) {
            const item = marketplace.items.find(item => item.sku === banner.sku);

            let link;
            if(item && (item.for_sale && !item.viewable) && (!item.available_at || Date.now() - new Date(item.available_at).getTime() > 0) && (!item.expires_at || Date.now() - new Date(item.expires_at).getTime() < 0)) {
              link = UrlJoin("/marketplace", marketplace.marketplaceId, "store", banner.sku);
            }

            if(link) {
              return (
                // eslint-disable-next-line react/jsx-key
                <Link to={link} {...attrs}>
                  {bannerContent}
                </Link>
              );
            }
          } else if(banner.modal_video) {
            return (
              // eslint-disable-next-line react/jsx-key
              <button {...attrs} onClick={() => setVideoModal(banner.modal_video)}>
                {bannerContent}
              </button>
            );
          }

          return (
            // eslint-disable-next-line react/jsx-key
            <div {...attrs}>
              {bannerContent}
            </div>
          );
        })
      }
      {
        videoModal ?
          <Modal className="marketplace__banner__video-modal" Toggle={() => setVideoModal(undefined)}>
            <Video
              link={videoModal}
              className="marketplace__banner__video-modal__video"
              playerOptions={{
                muted: EluvioPlayerParameters.muted.OFF,
                autoplay: EluvioPlayerParameters.autoplay.ON,
                controls: EluvioPlayerParameters.controls.AUTO_HIDE,
                loop: EluvioPlayerParameters.loop.OFF
              }}
            />
          </Modal> :
          null
      }
    </>
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
        (!item.for_sale && !item.viewable) ||
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
          marketplace={marketplace}
          items={items}
          justification={section.featured_view_justification}
          showGallery={section.show_carousel_gallery}
          countdown={section.show_countdown ? section.countdown : undefined}
        />
      );
    } else {
      renderedItems = (
        <>
          {
            section.show_countdown ?
              <div className="marketplace__countdown-container">
                { section.countdown.header ? <h2 className="marketplace__countdown-header">{section.countdown.header}</h2> : null }
                <div className="marketplace__countdown-border">
                  <Countdown time={section.countdown.date} showSeconds className="marketplace__countdown"/>
                </div>
              </div> : null
          }
          <div className={`card-list card-list--marketplace ${rootStore.centerContent ? "card-list--centered" : ""}`}>
            {
              items.map((item, index) =>
                <MarketplaceItemCard
                  marketplaceHash={marketplace.versionHash}
                  item={item}
                  index={item.itemIndex}
                  showVideo={item.play_on_storefront}
                  showRichTextDescription={marketplace.storefront.show_rich_text_descriptions}
                  showCta={marketplace.storefront.show_card_cta}
                  key={`marketplace-item-${sectionIndex}-${item.sku}-${index}-${loadKey}`}
                />
              )
            }
          </div>
        </>
      );
    }

    return (
      <div className="marketplace__section" key={`marketplace-section-${sectionIndex}-${loadKey}`}>
        <div className="page-headers">
          { section.section_header ? <h1 className="page-header">{section.section_header}</h1> : null }
          { section.section_subheader ? <h2 className="page-subheader">{section.section_subheader}</h2> : null }
          { section.section_header_rich_text ? <RichText richText={section.section_header_rich_text} className="markdown-document marketplace__section__header--rich-text" /> : null }
        </div>
        { renderedItems }
        {
          section.section_footer ?
            <div className="page-headers">
              <RichText richText={section.section_footer} className="markdown-document marketplace__section__footer" />
            </div> : null
        }
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

  useEffect(() => {
    if(marketplace && marketplace.analyticsInitialized) {
      checkoutStore.AnalyticsEvent({
        marketplace,
        analytics: marketplace?.storefront_page_view_analytics,
        eventName: "Storefront Page View"
      });
    }
  }, [marketplace]);

  if(!marketplace) { return null; }

  return (
    <div key={`marketplace-${match.params.marketplaceId}`} className="page-block page-block--main-content page-block--storefront">
      <div className="page-block__content">
        <MarketplaceBanners marketplace={marketplace} />
        <MarketplaceStorefrontSections marketplace={marketplace} />
        { marketplace?.collections_info?.show_on_storefront ? <MarketplaceCollectionsSummary marketplace={marketplace} /> : null }
      </div>
    </div>
  );
});

export default MarketplaceStorefront;
