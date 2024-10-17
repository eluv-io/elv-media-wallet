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
import {Carousel, Description, ExpandableDescription, LoaderImage, PurchaseGate} from "Components/properties/Common";
import Video from "./Video";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";

import MediaErrorIcon from "Assets/icons/media-error-icon";
import {MediaPropertyPageContent} from "Components/properties/MediaPropertyPage";
import MediaSidebar, {SidebarContent} from "Components/properties/MediaSidebar";

const S = (...classes) => classes.map(c => MediaStyles[c] || "").join(" ");

/* Video */

const MediaVideo = observer(({mediaItem, display, videoRef, showTitle, hideControls, mute, onClick, settingsUpdateCallback, className=""}) => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const [scheduleInfo, setScheduleInfo] = useState(MediaItemScheduleInfo(mediaItem));
  const [error, setError] = useState();
  const icons = (display.icons || []).filter(({icon}) => !!icon?.url);
  const page = mediaPropertyStore.MediaPropertyPage(match.params);
  let backgroundImage = SetImageUrlDimensions({
    url: (rootStore.pageWidth <= 800 && page?.layout?.background_image_mobile?.url) || page?.layout?.background_image?.url,
    width: rootStore.fullscreenImageWidth
  });
  const {imageUrl} = MediaItemImageUrl({mediaItem, display: mediaItem, aspectRatio: "square", width: rootStore.fullscreenImageWidth});

  if(scheduleInfo.isLiveContent && !scheduleInfo.started) {
    // Upcoming - countdown

    // Background image for countdown is either from media item, from property general settings, or the page background
    backgroundImage = SetImageUrlDimensions({
      url:
        (
          rootStore.pageWidth <= 800 &&
          (
            mediaItem?.countdown_background_mobile?.url ||
            mediaProperty.metadata?.countdown_background_mobile?.url
          )
        ) ||
        mediaItem?.countdown_background_desktop?.url ||
        mediaProperty.metadata?.countdown_background_desktop?.url,
      width: rootStore.fullscreenImageWidth
    }) || backgroundImage;

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
      <div onClick={onClick} className={[S("media__error"), className].join(" ")}>
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

  let playoutParameters = {
    offerings: mediaItem.offerings
  };

  if(display.clip && !mediaItem.live_video) {
    playoutParameters.clipStart = display.clip_start_time;
    playoutParameters.clipEnd = display.clip_end_time;
  }

  return (
    <Video
      ref={videoRef}
      link={mediaItem.media_link}
      isLive={display.live_video}
      onClick={onClick}
      showTitle={showTitle}
      hideControls={hideControls || mediaItem.player_controls}
      mute={mute || mediaItem.player_muted}
      playoutParameters={playoutParameters}
      contentInfo={{
        title: display.title,
        liveDVR: EluvioPlayerParameters.liveDVR[mediaItem.enable_dvr ? "ON" : "OFF"]
      }}
      playerOptions={{
        playerProfile: EluvioPlayerParameters.playerProfile[mediaItem.player_profile || (scheduleInfo.isLiveContent ? "LOW_LATENCY" : "DEFAULT")],
        permanentPoster: EluvioPlayerParameters.permanentPoster[mediaItem.always_show_poster ? "ON" : "OFF"],
        loop: EluvioPlayerParameters.muted[mediaItem.player_loop ? "ON" : "OFF"],
      }}
      posterImage={
        SetImageUrlDimensions({
          url: mediaItem.poster_image?.url,
          width: mediaPropertyStore.rootStore.fullscreenImageWidth
        })
      }
      settingsUpdateCallback={settingsUpdateCallback}
      errorCallback={() => setError("Something went wrong")}
      className={[S("media", "media__video"), className].join(" ")}
    />
  );
});

const MediaVideoWithSidebar = observer(({mediaItem, display, sidebarContent}) => {
  const [secondaryMediaSettings, setSecondaryMediaSettings] = useState(undefined);
  const [primaryPlayerActive, setPrimaryPlayerActive] = useState(false);
  const [primaryMenuActive, setPrimaryMenuActive] = useState(false);
  const [secondaryMenuActive, setSecondaryMenuActive] = useState(false);

  useEffect(() => {
    if(rootStore.pageWidth < 800) {
      setSecondaryMediaSettings(undefined);
    }
  }, [rootStore.pageWidth]);

  if(!mediaItem) { return <div className={S("media")} />; }

  const secondaryMediaItem = mediaPropertyStore.media[secondaryMediaSettings?.mediaId];
  const secondaryDisplay = secondaryMediaItem?.override_settings_when_viewed ? secondaryMediaItem.viewed_settings : secondaryMediaItem;

  const primaryPIP = secondaryMediaSettings?.display === "picture-in-picture" && secondaryMediaSettings.pip === "primary";
  const secondaryPIP = secondaryMediaSettings?.display === "picture-in-picture" && secondaryMediaSettings.pip === "secondary";

  const primaryMedia = (
    <MediaVideo
      key={`media-${mediaItem.mediaId}`}
      mediaItem={mediaItem}
      display={display}
      showTitle={primaryPIP}
      hideControls={primaryPIP}
      mute={primaryPIP}
      settingsUpdateCallback={player => {
        setPrimaryPlayerActive(true);
        setPrimaryMenuActive(player.controls.IsMenuVisible());
      }}
      onClick={
          !primaryPIP? undefined :
          () => setSecondaryMediaSettings({...secondaryMediaSettings, pip: "secondary"})
      }
      className={
        S(
          primaryPIP ? "media-with-sidebar__pip-video" : "media-with-sidebar__video",
          primaryPIP && secondaryMenuActive ? "media-with-sidebar__pip-video--under-menu" : ""
        )
      }
    />
  );

  let secondaryMedia = !secondaryMediaItem ? null :
    <MediaVideo
      key={`media-${secondaryMediaSettings.mediaId}`}
      mediaItem={secondaryMediaItem}
      display={secondaryDisplay}
      showTitle={secondaryPIP}
      hideControls={secondaryPIP}
      mute={secondaryPIP}
      settingsUpdateCallback={player => setSecondaryMenuActive(player.controls.IsMenuVisible())}
      onClick={
        !secondaryPIP ? undefined :
          () => setSecondaryMediaSettings({...secondaryMediaSettings, pip: "primary"})
      }
      className={
        S(
          secondaryPIP ? "media-with-sidebar__pip-video" : "media-with-sidebar__video",
          secondaryPIP && primaryMenuActive ? "media-with-sidebar__pip-video--under-menu" : ""
        )
      }
    />;

  return (
    <div className={S("media-with-sidebar")}>
      <div className={S("media-with-sidebar__media")}>
        <div className={S("media-with-sidebar__media-container")}>
          {
            secondaryMediaSettings?.pip !== "primary" ?
              <>
                { primaryMedia }
                { secondaryMedia }
              </> :
              <>
                { secondaryMedia }
                { primaryMedia }
              </>
          }
        </div>
      </div>
      <MediaSidebar
        sidebarContent={sidebarContent}
        showActions={primaryPlayerActive}
        mediaItem={mediaItem}
        display={display}
        secondaryMediaSettings={secondaryMediaSettings}
        setSecondaryMediaSettings={setSecondaryMediaSettings}
      />
    </div>
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

const Media = observer(({mediaItem, display, sidebarContent}) => {
  if(!mediaItem) { return <div className={S("media")} />; }

  if(mediaItem.media_type === "Video") {
    if(sidebarContent?.content?.length > 0) {
      return <MediaVideoWithSidebar mediaItem={mediaItem} display={display} sidebarContent={sidebarContent} />;
    } else {
      return <MediaVideo mediaItem={mediaItem} display={display}/>;
    }
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

const MediaPropertyMediaPage = observer(() => {
  const match = useRouteMatch();

  const [sidebarContent, setSidebarContent] = useState(undefined);

  const mediaItem = mediaPropertyStore.MediaPropertyMediaItem(match.params);
  const context = new URLSearchParams(location.search).get("ctx");

  if(!mediaItem) {
    return <Redirect to={rootStore.backPath} />;
  }

  useEffect(() => {
    SidebarContent({match})
      .then(setSidebarContent);
  }, []);

  const display = mediaItem.override_settings_when_viewed ? mediaItem.viewed_settings : mediaItem;
  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isUpcoming = scheduleInfo?.isLiveContent && !scheduleInfo?.started;
  const hasText = !isUpcoming && !!(display.title || display.subtitle || display.headers.length > 0);
  const hasDescription = !!(display.description_rich_text || display.description);
  const showSidebar = sidebarContent?.content?.length > 0;
  const showText = hasText && !isUpcoming && !sidebarContent;
  const showDetails = (hasText || hasDescription) && !sidebarContent;
  const icons = (display.icons || []).filter(({icon}) => !!icon?.url);

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
      <div className={S("media-page", showSidebar ? "media-page--sidebar" : (!showDetails ? "media-page--full" : !hasDescription ? "media-page--extended" : ""))}>
        <div className={S("media-container")}>
          <Media
            mediaItem={mediaItem}
            display={display}
            sidebarContent={sidebarContent}
          />
        </div>
        {
          !(hasText || !hasDescription) ? null :
            <div className={S("media-info")}>
              {
                !showText ? null :
                  <div className={S("media-text")}>
                    {
                      !display.title ? null :
                        <h1 className={[S("media-text__title"), "_title"].join(" ")}>
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
                      (display.headers || []).length === 0 ? null :
                        <div className={S("media-text__headers")}>
                          {display.headers.map((header, index) =>
                            <div key={`header-${index}`} className={S("media-text__header")}>{header}</div>
                          )}
                        </div>
                    }
                    {
                      !display.subtitle ? null :
                        <h2 className={S("media-text__subtitle")}>{display.subtitle}</h2>
                    }
                  </div>
              }
              {
                !display.description && !display.description_rich_text ? null :
                  <div className={S("media-text__description-container")}>
                    <ExpandableDescription
                      description={display.description}
                      descriptionRichText={display.description_rich_text}
                      className={S("media-text__description")}
                    />
                  </div>
              }
            </div>
        }
      </div>
    );
  }

  return (
    <PurchaseGate id={mediaItem.id} permissions={permissions}>
      { content }
      <MediaPropertyPageContent isMediaPage className={S("media-page__additional-content")} />
    </PurchaseGate>
  );
});

export default MediaPropertyMediaPage;
