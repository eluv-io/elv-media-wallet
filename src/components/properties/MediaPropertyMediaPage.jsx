import MediaStyles from "Assets/stylesheets/media_properties/property-media.module.scss";

import React, {useEffect, useState, useRef} from "react";
import {observer} from "mobx-react";
import { Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import Countdown from "./Countdown";
import {
  MediaItemImageUrl,
  MediaItemMediaUrl,
  MediaItemScheduleInfo
} from "../../utils/MediaPropertyUtils";
import {Carousel, Description, LoaderImage, PurchaseGate} from "Components/properties/Common";
import Video from "./Video";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js";

import MediaErrorIcon from "Assets/icons/media-error-icon";
import {MediaPropertyPageContent} from "Components/properties/MediaPropertyPage";

const S = (...classes) => classes.map(c => MediaStyles[c] || "").join(" ");


/* Video */

const MediaVideo = observer(({mediaItem, display}) => {
  const match = useRouteMatch();
  const [scheduleInfo, setScheduleInfo] = useState(MediaItemScheduleInfo(mediaItem));
  const [error, setError] = useState();
  const icons = (display.icons || []).filter(({icon}) => !!icon?.url);
  const page = mediaPropertyStore.MediaPropertyPage(match.params);
  const backgroundImage = SetImageUrlDimensions({
    url: (rootStore.pageWidth <= 800 && page?.layout?.background_image_mobile?.url) || page?.layout?.background_image?.url,
    width: rootStore.fullscreenImageWidth
  });
  const {imageUrl} = MediaItemImageUrl({mediaItem, display: mediaItem, aspectRatio: "square", width: rootStore.fullscreenImageWidth});

  if(scheduleInfo.isLiveContent && !scheduleInfo.started) {
    // Upcoming
    return (
      <div className={S("media__error", "media__error--countdown")}>
        <LoaderImage src={backgroundImage || imageUrl} className={S("media__error-image")} />
        <div className={S("media__error-cover")} />
        {
          icons.length === 0 ? null :
            <div className={S("media__error-content-icons")}>
              {icons.map(({icon, alt_text}, index) =>
                <LoaderImage
                  key={`icon-${index}`}
                  src={icon.url}
                  alt={alt_text}
                  className={S("media__error-content-icon")}
                />
              )}
            </div>
        }
        {
          (display.headers || []).length === 0 ? null :
            <div className={S("media__error-headers")}>
              {display.headers.map((header, index) =>
                <div key={`header-${index}`} className={S("media__error-header")}>{header}</div>
              )}
            </div>
        }
        <div className={S("media__error-title")}>
          { display.title }
        </div>
        <Countdown
          displayTime={scheduleInfo.startTime}
          time={scheduleInfo.streamStartTime}
          OnEnded={() => setScheduleInfo(MediaItemScheduleInfo(mediaItem))}
          className={S("media__countdown")}
        />
      </div>
    );
  }

  if(error) {
    return (
      <div className={S("media__error")}>
        <ImageIcon icon={MediaErrorIcon} className={S("media__error-icon")} />
        <ImageIcon icon={imageUrl} className={S("media__error-image")} />
        <div className={S("media__error-cover")} />
        <div className={S("media__error-message")}>
          {
            error?.permission_message ||
            (
              scheduleInfo.ended ?
                rootStore.l10n.media_properties.media.errors.ended :
                rootStore.l10n.media_properties.media.errors.default
            )
          }
        </div>
      </div>
    );
  }

  return (
    <Video
      link={mediaItem.media_link}
      isLive={display.live_video}
      playoutParameters={
        display.live_video || !display.clip ? {} :
          { clipStart: display.clip_start_time, clipEnd: display.clip_end_time }
      }
      contentInfo={{
        title: display.title
      }}
      playerOptions={{
        title: EluvioPlayerParameters.title.FULLSCREEN_ONLY,
        playerProfile: EluvioPlayerParameters.playerProfile[mediaItem.player_profile || (scheduleInfo.isLiveContent ? "LOW_LATENCY" : "DEFAULT")]
      }}
      posterImage={
        SetImageUrlDimensions({
          url: mediaItem.poster_image?.url,
          width: mediaPropertyStore.rootStore.fullscreenImageWidth
        })
      }
      errorCallback={() => setError("Something went wrong")}
      className={S("media", "video")}
    />
  );
});


/* Gallery */

const GalleryContent = observer(({galleryItem}) => {
  if(galleryItem.video) {
    return (
      <Video
        link={galleryItem.video}
        posterImage={SetImageUrlDimensions({
          url: galleryItem.poster_image?.url,
          width: mediaPropertyStore.rootStore.fullscreenImageWidth
        })}
        className={S("gallery__video")}
      />
    );
  }

  return (
    <LoaderImage
      loaderHeight="100%"
      src={galleryItem.image?.url || galleryItem.thumbnail?.url}
      lazy={false}
      alt={galleryItem.title || ""}
      loaderAspectRatio={
        galleryItem.thumbnail_aspect_ratio === "Portrait" ? "2 / 3" :
          galleryItem.thumbnail_aspect_ratio === "Landscape" ? "16 / 9" : "1"
      }
      className={S("gallery__image")}
    />
  );
});

const MediaGallery = observer(({mediaItem}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [contentHeight, setContentHeight] = useState("var(--property-full-content-height)");
  const textRef = useRef();
  const carouselRef = useRef();

  useEffect(() => {
    const CalcContentHeight = () => `calc(var(--property-full-content-height) - 80px - ${carouselRef?.current?.getBoundingClientRect?.().height || 0}px - ${textRef?.current?.getBoundingClientRect?.().height || 0}px)`;
    setContentHeight(CalcContentHeight());
    setTimeout(() => {
      setContentHeight(CalcContentHeight());
    }, 15);
  }, [textRef, carouselRef, activeIndex]);

  if(!mediaItem || !mediaItem.gallery) { return null; }

  const activeItem = mediaItem.gallery[activeIndex];

  if(!activeItem) { return null; }

  return (
    <div className={S("media", "gallery")}>
      <div key={`gallery-content-${activeItem.id}`} style={{height: contentHeight}} className={S("gallery__content")}>
        <GalleryContent galleryItem={activeItem} />
      </div>
      <div key={`gallery-text-${activeItem.id}`} ref={textRef} className={S("gallery__text")}>
        {
          !activeItem.title ? null :
            <h1 className={S("gallery__title")}>{ activeItem.title }</h1>
        }
        {
          !activeItem.subtitle ? null :
            <h2 className={S("gallery__subtitle")}>{ activeItem.subtitle }</h2>
        }
        {
          !activeItem.description ? null :
            <div className={S("gallery__description-block")}>
              <div className={S("gallery__description-placeholder")} />
              <Description expandable maxLines={3} description={activeItem.description} className={S("gallery__description")} />
            </div>
        }
      </div>
      <div ref={carouselRef} className={S("gallery__carousel-container")}>
        <Carousel
          className={S("gallery__carousel")}
          swiperOptions={{spaceBetween: 5}}
          content={mediaItem.gallery}
          UpdateActiveIndex={setActiveIndex}
          RenderSlide={({item, index, Select}) =>
            <button
              key={`slide-${item.id}`}
              onClick={Select}
              className={S("gallery__carousel-slide")}
            >
              <LoaderImage
                width={400}
                key={`gallery-item-${item.id}`}
                src={item.thumbnail?.url}
                alt={item.title || ""}
                loaderAspectRatio={
                  item.thumbnail_aspect_ratio === "Portrait" ? "2 / 3" :
                    item.thumbnail_aspect_ratio === "Landscape" ? "16 / 9" : "1"
                }
                className={S("gallery__carousel-image", index === activeIndex ? "gallery__carousel-image--active" : "")}
              />
            </button>
          }
        />
      </div>
    </div>
  );
});


const Media = observer(({mediaItem, display}) => {
  if(!mediaItem) { return <div className={S("media")} />; }

  if(mediaItem.media_type === "Video") {
    return <MediaVideo mediaItem={mediaItem} display={display} />;
  } else if(mediaItem.media_type === "Gallery") {
    return <MediaGallery mediaItem={mediaItem} />;
  } else if(mediaItem.media_type === "Image") {
    const imageUrl = mediaItem.image?.url || MediaItemImageUrl({
      mediaItem,
      aspectRatio: mediaItem.image_aspect_ratio
    })?.imageUrl;

    return (
      <div className={S("media", "image")}>
        <LoaderImage
          src={imageUrl}
          lazy={false}
          loaderHeight="100%"
          loaderWidth="100%"
          className={S("media__image")}
        />
      </div>
    );
  } else if(["Ebook", "HTML"].includes(mediaItem.media_type)) {
    const url = MediaItemMediaUrl(mediaItem);
    return (
      <div className={S("media", "html")}>
        <iframe
          src={url.toString()}
          allow="encrypted-media *"
          allowFullScreen
          sandbox={[
            "allow-downloads",
            "allow-scripts",
            "allow-forms",
            "allow-modals",
            "allow-pointer-lock",
            "allow-orientation-lock",
            "allow-popups",
            "allow-presentation",
            "allow-same-origin",
            "allow-downloads-without-user-activation"
          ].join(" ")}
          className={S("html__frame")}
        />
      </div>
    );
  } else {
    return (
      <div className={S("media", "unknown")} />
    );
  }
});

const MediaDescription = observer(({display}) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descriptionRef = useRef();

  useEffect(() => {
    setTimeout(() =>
      setShowToggle(
        expanded ||
        (descriptionRef &&
          descriptionRef.current &&
          descriptionRef.current.getBoundingClientRect().height - 20 < descriptionRef.current?.firstChild?.getBoundingClientRect()?.height)
      ), 100);

  }, [descriptionRef, expanded]);

  if(!display.description && !display.description_rich_text) {
    return null;
  }

  return (
    <div
      ref={descriptionRef}
      role={expanded ? "" : "button"}
      onClick={() => showToggle && !expanded && setExpanded(true)}
      className={S("media-text__description-container", showToggle ? "media-text__description-container--toggleable" : "", `media-text__description-container--${expanded ? "expanded" : "contracted"}`)}
    >
      <Description
        description={display.description}
        descriptionRichText={display.description_rich_text}
        className={S("media-text__description")}
      />
      { expanded ? null : <div className={S("media-text__description-overlay")} /> }
      {
        !showToggle ? null :
          <button onClick={() => setExpanded(!expanded)} className={S("media-text__description-toggle")}>
            {mediaPropertyStore.rootStore.l10n.media_properties.media.description[expanded ? "hide" : "show"]}
          </button>
      }
    </div>
  );
});

const MediaDetails = observer(({hideText, display}) => {
  const icons = (display.icons || []).filter(({icon}) => !!icon?.url);

  return (
    <div className={S("media-info")}>
      <div className={S("media-text")}>
        {
          hideText || !display.title ? null :
            <h1 className={S("media-text__title")}>
              {
                icons.length === 0 ? null :
                  <div className={S("media-text__icons")}>
                    {icons.map(({icon, alt_text}, index) =>
                      <img
                        key={`icon-${index}`}
                        src={icon.url}
                        alt={alt_text}
                        className={S("media-text__icon")}
                      />
                    )}
                  </div>
              }
              {display.title}
            </h1>
        }
        {
          hideText || (display.headers || []).length === 0 ? null :
            <div className={S("media-text__headers")}>
              {display.headers.map((header, index) =>
                <div key={`header-${index}`} className={S("media-text__header")}>{header}</div>
              )}
            </div>
        }
        {
          hideText || !display.subtitle ? null :
            <h2 className={S("media-text__subtitle")}>{display.subtitle}</h2>
        }
        <MediaDescription display={display}/>
      </div>
    </div>
  );
});

const MediaPropertyMediaPage = observer(() => {
  const match = useRouteMatch();

  const mediaItem = mediaPropertyStore.MediaPropertyMediaItem(match.params);
  const context = new URLSearchParams(location.search).get("ctx");

  if(!mediaItem) {
    return <Redirect to={rootStore.backPath} />;
  }

  const display = mediaItem.override_settings_when_viewed ? mediaItem.viewed_settings : mediaItem;
  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isUpcoming = scheduleInfo?.isLiveContent && !scheduleInfo?.started;
  const hasText = !isUpcoming && !!(display.title || display.subtitle || display.headers.length > 0);
  const hasDescription = !!(display.description_rich_text || display.description);

  const permissions = mediaPropertyStore.ResolvePermission({
    ...match.params,
    sectionSlugOrId: match.params.sectionSlugOrId || context
  });

  let content;
  if(!permissions.authorized) {
    const {imageUrl} = MediaItemImageUrl({mediaItem, display: mediaItem, aspectRatio: rootStore.pageWidth > 800 ? "landscape" : "portrait", width: mediaPropertyStore.rootStore.fullscreenImageWidth});
    content = (
      <div className={S("media-page")}>
        <div className={S("media__error")}>
          <ImageIcon icon={imageUrl} className={S("media__error-image")} />
          <div className={S("media__error-cover")} />
          {
            permissions.purchaseGate ? null :
              <div className={S("media__error-message")}>
                {rootStore.l10n.media_properties.media.errors.unauthorized}
              </div>
          }
        </div>
      </div>
    );
  } else {
    content = (
      <div className={S("media-page", !hasText && !hasDescription ? "media-page--full" : !hasDescription ? "media-page--extended" : "")}>
        <div className={S("media-container")}>
          <Media mediaItem={mediaItem} display={display} />
        </div>
        {
          !hasText && !hasDescription ? null :
            <MediaDetails display={display} hideText={isUpcoming}/>
        }
      </div>
    );
  }

  return (
    <PurchaseGate permissions={permissions}>
      { content }
      <MediaPropertyPageContent isMediaPage className={S("media-page__additional-content")} />
    </PurchaseGate>
  );
});

export default MediaPropertyMediaPage;
