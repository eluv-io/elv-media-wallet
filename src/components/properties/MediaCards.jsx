import MediaCardStyles from "Assets/stylesheets/media_properties/media-cards.module.scss";

import React, {useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {
  MediaItemImageUrl,
  MediaItemMediaUrl,
  MediaItemScheduleInfo
} from "../../utils/MediaPropertyUtils";
import {Description, LoaderImage, ScaledText} from "Components/properties/Common";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {Linkish} from "Components/common/UIComponents";

const S = (...classes) => classes.map(c => MediaCardStyles[c] || "").join(" ");

const MediaCardLink = ({match, sectionItem, mediaItem, navContext}) => {
  mediaItem = mediaItem || sectionItem.mediaItem;
  let params = new URLSearchParams();

  // TODO: Rewrite so it's not relative to current path
  let linkPath = match.url;
  let url;
  if(mediaItem || sectionItem?.type === "media") {
    const mediaId = mediaItem?.id || sectionItem?.media_id;

    let basePath = match.url.replace(/\/search/, "");

    //navContext = match.params.sectionSlugOrId || sectionItem.sectionId;
    if(!match.params.sectionSlugOrId && sectionItem?.sectionId) {
      basePath = UrlJoin(basePath, "s", sectionItem.sectionId);
    }

    if((mediaItem?.type || sectionItem.media_type) === "collection") {
      linkPath = UrlJoin(basePath, "c", mediaId);
    } else if((mediaItem?.type || sectionItem.media_type) === "list") {
      linkPath = UrlJoin(basePath, "l", mediaId);
    } else if((mediaItem?.type || sectionItem.media_type) === "media") {
      const listParam = new URLSearchParams(location.search).get("l");

      if(listParam) {
        basePath = UrlJoin(basePath, "l", listParam);
      }

      linkPath = UrlJoin(basePath, "m", mediaId);

      url = mediaItem?.media_type === "HTML" && MediaItemMediaUrl(mediaItem);
    }
  } else if(sectionItem?.type === "item_purchase") {
    // Preserve params
    linkPath = match.url;
    params = new URLSearchParams(location.search);
    params.set(
      "p",
      mediaPropertyStore.client.utils.B58(JSON.stringify({
        type: "purchase",
        sectionSlugOrId: match.params.sectionSlugOrId,
        sectionItemId: sectionItem.id
      }))
    );
  } else if(sectionItem?.type === "page_link") {
    const page = mediaPropertyStore.MediaPropertyPage({...match.params, pageSlugOrId: sectionItem.page_id});

    if(page) {
      const pageSlugOrId = page?.slug || sectionItem.page_id;
      linkPath = UrlJoin("/properties", match.params.mediaPropertySlugOrId, pageSlugOrId === "main" ? "" : pageSlugOrId);
    }
  } else if(sectionItem?.type === "property_link") {
    linkPath = UrlJoin("/properties", sectionItem.property_id, sectionItem.property_page_id || "");
  } else if(sectionItem?.type === "subproperty_link") {
    linkPath = UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.pageSlugOrId || "", "p", sectionItem.subproperty_id, sectionItem.subproperty_page_id || "");
  } else if(sectionItem?.type === "marketplace_link") {
    const marketplaceId = sectionItem.marketplace?.marketplace_id;

    if(marketplaceId) {
      const sku = sectionItem.marketplace_sku || "";
      linkPath = UrlJoin("/marketplace", marketplaceId, "store", sku);
    }
  }

  if(navContext) {
    params.set("ctx", navContext);
  }

  return {
    linkPath: linkPath + (params.size > 0 ? `?${params.toString()}` : ""),
    url
  };
};

const MediaCardBanner = observer(({
  display,
  imageContainerRef,
  imageUrl,
  scheduleInfo,
  textDisplay,
  linkPath="",
  url,
  onClick,
  className=""
}) => {
  return (
    <Linkish
      aria-label={display.title}
      onClick={onClick}
      to={linkPath}
      href={url}
      className={[S("media-card-banner"), className].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-banner__image-container")}>
        { !imageUrl ? null :
          <LoaderImage
            src={imageUrl}
            alt={display.title}
            width={mediaPropertyStore.rootStore.fullscreenImageWidth}
            className={S("media-card-banner__image")}
          />
        }
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-banner__indicator", "media-card-banner__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-banner__indicator", "media-card-banner__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-banner__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-banner__headers")}>
                { display.headers?.map((header, index) =>
                  <div className={S("media-card-banner__header")} key={`header-${index}`}>
                    <div className={S("media-card-banner__headers")}>
                      {header}
                    </div>
                  </div>
                )}
              </div>
            }
            {
              !display.title ? null :
                <ScaledText Tag="h3" maxPx={20} minPx={12} maxPxMobile={18} className={S("media-card-banner__title")}>
                  { display.title }
                </ScaledText>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <ScaledText maxPx={12} maxPxMobile={11} minPx={10} className={S("media-card-banner__subtitle")}>
                  { display.subtitle }
                </ScaledText>
            }
            <Description
              description={display.description}
              maxLines={textDisplay === "all" ? 2 : 3}
              className={S("media-card-banner__description")}
            />
          </div>
      }
    </Linkish>
  );
});


const MediaCardVertical = observer(({
  display,
  imageContainerRef,
  imageUrl,
  scheduleInfo,
  textDisplay,
  aspectRatio,
  linkPath="",
  url,
  onClick,
  className=""
}) => {
  let textScale = (aspectRatio) === "landscape" ? 1 : 0.9;
  textScale *= mediaPropertyStore.rootStore.pageWidth < 800 ? 0.8 : 1;

  return (
    <Linkish
      aria-label={display.title}
      to={linkPath}
      href={url}
      onClick={onClick}
      className={[S("media-card-vertical", `media-card-vertical--${aspectRatio}`), className].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-vertical__image-container")}>
        { !imageUrl ? null :
          <LoaderImage
            src={imageUrl}
            alt={display.title}
            width={600}
            className={S("media-card-vertical__image")}
          />
        }
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-vertical__indicator", "media-card-vertical__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-vertical__indicator", "media-card-vertical__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-vertical__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-vertical__headers")}>
                { display.headers?.map((header, index) =>
                  <div className={S("media-card-vertical__header")} key={`header-${index}`}>
                    <div className={S("media-card-vertical__headers")}>
                      {header}
                    </div>
                  </div>
                )}
              </div>
            }
            {
              !display.title ? null :
                <ScaledText Tag="h3" maxPx={20 * textScale} minPx={16 * textScale} className={S("media-card-vertical__title")}>
                  { display.title }
                </ScaledText>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <ScaledText maxPx={16 * textScale} minPx={12 * textScale} className={S("media-card-vertical__subtitle")}>
                  { display.subtitle }
                </ScaledText>
            }
          </div>
      }
    </Linkish>
  );
});

const MediaCardHorizontal = observer(({
  display,
  imageContainerRef,
  imageUrl,
  scheduleInfo,
  textDisplay,
  aspectRatio,
  linkPath="",
  url,
  onClick,
  className=""
}) => {
  return (
    <Linkish
      aria-label={display.title}
      to={linkPath}
      href={url}
      onClick={onClick}
      className={[S("media-card-horizontal", `media-card-horizontal--${aspectRatio}`), className].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-horizontal__image-container")}>
        { !imageUrl ? null :
          <LoaderImage
            src={imageUrl}
            alt={display.title}
            width={600}
            className={S("media-card-horizontal__image")}
          />
        }
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-horizontal__indicator", "media-card-horizontal__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-horizontal__indicator", "media-card-horizontal__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-horizontal__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-horizontal__headers")}>
                { display.headers?.map((header, index) =>
                  <div className={S("media-card-horizontal__header")} key={`header-${index}`}>
                    <div className={S("media-card-horizontal__headers")}>
                      {header}
                    </div>
                  </div>
                )}
              </div>
            }
            {
              !display.title ? null :
                <ScaledText Tag="h3" maxPx={20} minPx={12} maxPxMobile={18} className={S("media-card-horizontal__title")}>
                  { display.title }
                </ScaledText>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <ScaledText maxPx={12} maxPxMobile={11} minPx={10} className={S("media-card-horizontal__subtitle")}>
                  { display.subtitle }
                </ScaledText>
            }
            <Description
              description={display.description}
              maxLines={textDisplay === "all" ? 2 : 3}
              className={S("media-card-horizontal__description")}
            />
          </div>
      }
    </Linkish>
  );
});


const MediaCard = observer(({
  format="vertical",
  sectionItem,
  mediaItem,
  aspectRatio,
  textDisplay="title",
  setImageDimensions,
  navContext,
  onClick,
  className=""
}) => {
  const match = useRouteMatch();
  const display = sectionItem?.display || mediaItem;
  const imageContainerRef = useRef();

  useEffect(() => {
    if(!setImageDimensions || !imageContainerRef?.current) { return; }

    setImageDimensions(imageContainerRef.current.getBoundingClientRect());
  }, [imageContainerRef, mediaPropertyStore.rootStore.pageWidth]);

  if(!display) {
    mediaPropertyStore.Log("Invalid section item", true);
    mediaPropertyStore.Log(sectionItem);
    return null;
  }

  aspectRatio = aspectRatio?.toLowerCase() || "";
  let {imageUrl, imageAspectRatio} = MediaItemImageUrl({
    mediaItem: mediaItem || sectionItem?.mediaItem || sectionItem,
    display,
    aspectRatio
  });

  if(format === "banner") {
    imageUrl =
      (mediaPropertyStore.rootStore.pageWidth < 800 && sectionItem?.banner_image_mobile?.url) ||
      sectionItem?.banner_image?.url ||
      imageUrl;
  }

  const scheduleInfo = MediaItemScheduleInfo(mediaItem || sectionItem.mediaItem);

  let {linkPath, url} = MediaCardLink({match, sectionItem, mediaItem, navContext}) || "";

  let args = {
    display,
    imageUrl,
    textDisplay,
    linkPath,
    url,
    onClick,
    scheduleInfo,
    imageContainerRef,
    aspectRatio: aspectRatio || imageAspectRatio,
    className
  };

  let card;
  switch(format) {
    case "horizontal":
      card = <MediaCardHorizontal {...args} />;
      break;
    case "vertical":
      card = <MediaCardVertical {...args} />;
      break;
    case "banner":
      card =<MediaCardBanner {...args} />;
      break;
  }

  return (
    <>
      { card }
    </>
  );
});

export default MediaCard;
