import MediaCardStyles from "Assets/stylesheets/media_properties/media-cards.module.scss";

import React, {useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {MediaItemImageUrl, MediaItemScheduleInfo} from "../../utils/MediaPropertyUtils";
import {Description, LoaderImage, ScaledText} from "Components/properties/Common";
import {NavLink, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";

const S = (...classes) => classes.map(c => MediaCardStyles[c] || "").join(" ");

const MediaCardLink = ({match, sectionItem, mediaItem, navContext}) => {
  mediaItem = mediaItem || sectionItem.mediaItem;

  let linkPath = match.url;
  if(mediaItem || sectionItem?.type === "media") {
    const mediaId = mediaItem?.id || sectionItem.media_id;

    let basePath = match.url;

    //navContext = match.params.sectionSlugOrId || sectionItem.sectionId;
    if(!match.params.sectionSlugOrId && sectionItem.sectionId) {
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
    }
  }

  if(navContext) {
    linkPath += `?ctx=${navContext}`;
  }

  return linkPath;
};

export const MediaCardVertical = observer(({
  sectionItem,
  mediaItem,
  aspectRatio,
  textDisplay="title",
  setImageDimensions,
  navContext,
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

  const {imageUrl, imageAspectRatio} = MediaItemImageUrl({mediaItem: mediaItem || sectionItem?.mediaItem || sectionItem, display: display, aspectRatio});
  const scheduleInfo = MediaItemScheduleInfo(mediaItem || sectionItem.mediaItem);

  return (
    <NavLink
      aria-label={display.title}
      to={MediaCardLink({match, sectionItem, mediaItem, navContext}) || ""}
      className={[S("media-card-vertical", `media-card-vertical--${aspectRatio || imageAspectRatio}`), className].join(" ")}
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
                <ScaledText Tag="h3" maxPx={20} minPx={12} className={S("media-card-vertical__title")}>
                  { display.title }
                </ScaledText>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <ScaledText maxPx={18} minPx={12} className={S("media-card-vertical__subtitle")}>
                  { display.subtitle }
                </ScaledText>
            }
          </div>
      }
    </NavLink>
  );
});

export const MediaCardHorizontal = observer(({
  sectionItem,
  mediaItem,
  aspectRatio,
  textDisplay="title",
  setImageDimensions,
  navContext,
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

  const {imageUrl, imageAspectRatio} = MediaItemImageUrl({mediaItem: mediaItem || sectionItem?.mediaItem || sectionItem, display: display, aspectRatio});
  const scheduleInfo = MediaItemScheduleInfo(mediaItem || sectionItem.mediaItem);

  return (
    <NavLink
      aria-label={display.title}
      to={MediaCardLink({match, sectionItem, mediaItem, navContext}) || ""}
      className={[S("media-card-horizontal", `media-card-horizontal--${aspectRatio || imageAspectRatio}`), className].join(" ")}
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
    </NavLink>
  );
});
