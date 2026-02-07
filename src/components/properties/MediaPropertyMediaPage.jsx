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
import {Button, Carousel, Description, ExpandableDescription, LoaderImage} from "Components/properties/Common";
import Video from "./Video";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";

import {MediaPropertyPageContent} from "Components/properties/MediaPropertyPage";
import MediaSidebar, {MultiviewSelectionModal} from "Components/properties/MediaSidebar";
import {Linkish} from "Components/common/UIComponents";
import {ActionIcon, Menu} from "@mantine/core";

import MediaErrorIcon from "Assets/icons/media-error-icon";
import MultiviewIcon from "Assets/icons/media/multiview";
import DownloadIcon from "Assets/icons/download.svg";

const S = (...classes) => classes.map(c => MediaStyles[c] || "").join(" ");

/* Video */

const MediaVideo = observer(({
  mediaItem,
  display,
  videoRef,
  showTitle,
  hideControls,
  allowCasting=true,
  mute,
  capLevelToPlayerSize,
  onClick,
  onClose,
  settingsUpdateCallback,
  className="",
  containerProps
}) => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const [scheduleInfo, setScheduleInfo] = useState(MediaItemScheduleInfo(mediaItem));
  const [error, setError] = useState();
  const [loadKey, setLoadKey] = useState(0);
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
      <div className={S("media__error", "media__error--countdown")} {...containerProps}>
        <LoaderImage
          src={backgroundImage || imageUrl}
          alt={mediaItem?.thumbnail_alt_text || mediaItem.title}
          className={S("media__error-image")}
        />
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
              {display.headers?.map?.((header, index) =>
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
      <div onClick={onClick} className={[S("media__error"), className].join(" ")} {...containerProps}>
        <ImageIcon icon={MediaErrorIcon} className={S("media__error-icon")} />
        <img src={imageUrl} alt={mediaItem.thumbnail_alt_text || mediaItem.title} className={S("media__error-image")} />
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

  if(mediaItem.media_link_info) {
    if(mediaItem.media_link_info.type === "composition") {
      playoutParameters.channel = mediaItem.media_link_info.composition_key;
    } else if(!mediaItem.live_video){
      playoutParameters.clipStart = mediaItem.media_link_info.clip_start_time;
      playoutParameters.clipEnd = mediaItem.media_link_info.clip_end_time;
    }
  } else if(mediaItem.clip && !mediaItem.live_video) {
    playoutParameters.clipStart = display.clip_start_time;
    playoutParameters.clipEnd = display.clip_end_time;
  }

  return (
    <Video
      key={loadKey}
      ref={videoRef}
      link={mediaItem.media_link}
      isLive={display.live_video}
      onClick={onClick}
      showTitle={showTitle}
      hideControls={hideControls || mediaItem.player_controls}
      mute={mute || mediaItem.player_muted}
      mediaPropertySlugOrId={mediaProperty.mediaPropertyId}
      mediaItemId={mediaItem.id}
      saveProgress
      playoutParameters={playoutParameters}
      contentInfo={{
        title: display.title,
        liveDVR: EluvioPlayerParameters.liveDVR[mediaItem.enable_dvr ? "ON" : "OFF"]
      }}
      playerOptions={{
        capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize[capLevelToPlayerSize ? "ON" : "OFF"],
        playerProfile: EluvioPlayerParameters.playerProfile[mediaItem.player_profile] || EluvioPlayerParameters.playerProfile.DEFAULT,
        permanentPoster: EluvioPlayerParameters.permanentPoster[mediaItem.always_show_poster ? "ON" : "OFF"],
        loop: EluvioPlayerParameters.muted[mediaItem.player_loop ? "ON" : "OFF"],
        allowCasting: EluvioPlayerParameters.allowCasting[allowCasting ? "ON" : "OFF"]
      }}
      posterImage={
        SetImageUrlDimensions({
          url: mediaItem.poster_image?.url,
          width: mediaPropertyStore.rootStore.fullscreenImageWidth
        })
      }
      settingsUpdateCallback={settingsUpdateCallback}
      onClose={onClose}
      errorCallback={async error => {
        const shouldReload = await mediaPropertyStore.MediaPropertyShouldReload(match.params);

        if(shouldReload) {
          await mediaPropertyStore.LoadMediaProperty(match.params);
          setLoadKey(loadKey + 1);
        } else {
          mediaPropertyStore.Log(error, true);
          setError("Something went wrong");
        }
      }}
      className={[S("media", "media__video"), className].join(" ")}
      containerProps={containerProps}
    />
  );
});

const PIPContent = observer(({mediaInfo, displayedContent, setDisplayedContent}) => {
  const [menuActive, setMenuActive] = useState(false);

  if(mediaInfo.length === 0) {
    return (
      <div className={S("media-with-sidebar__video", "media", "media_video")}>
        <div className={S("media__empty")}>
          { rootStore.l10n.media_properties.media.select_media }
        </div>
      </div>
    );
  }

  const primaryMedia = mediaInfo[0];
  const secondaryMedia = mediaInfo[1];

  const primaryVideo = (
    <MediaVideo
      key={`media-${displayedContent[0].id}`}
      mediaItem={primaryMedia.mediaItem}
      display={primaryMedia.display}
      showTitle={!!secondaryMedia}
      settingsUpdateCallback={player => setMenuActive(player.controls.IsMenuVisible())}
      className={S("media-with-sidebar__video")}
    />
  );

  if(!secondaryMedia) {
    return primaryVideo;
  }

  const secondaryVideo = (
    <MediaVideo
      key={`media-${displayedContent[1].id}`}
      mediaItem={secondaryMedia.mediaItem}
      display={secondaryMedia.display}
      showTitle
      hideControls
      mute
      settingsUpdateCallback={player => setMenuActive(player.controls.IsMenuVisible())}
      onClick={() => setDisplayedContent([displayedContent[1], displayedContent[0]])}
      className={
        S(
          "media-with-sidebar__pip-video",
          menuActive ? "media-with-sidebar__pip-video--under-menu" : ""
        )
      }
    />
  );

  return (
    <>
      { primaryVideo }
      { secondaryVideo }
    </>
  );
});

let lastSelectedMode = "pip";
const MediaVideoWithSidebar = observer(({
  mediaItem,
  display,
  sidebarContent,
  textContent,
  showMultiviewSelectionModal,
  setShowMultiviewSelectionModal,
  displayedContent,
  setDisplayedContent
}) => {
  const [showSidebar, setShowSidebar] = useState(rootStore.pageWidth > 800);
  const [multiviewMode, setMultiviewMode] = useState(lastSelectedMode);
  const [mediaGridRef, setMediaGridRef] = useState(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);

  let streamLimit = rootStore.pageWidth > 1400 ? 16 :
    rootStore.pageWidth > 850 ? 9 : 8;

  useEffect(() => {
    if(window.innerWidth < 850 || window.innerHeight < 600) {
      setMultiviewMode("multiview");
    }
  }, [rootStore.pageWidth, rootStore.pageHeight]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);

    document.addEventListener("fullscreenchange", onChange);

    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if(multiviewMode === "pip") {
      setDisplayedContent(displayedContent.slice(0, 2));
    }
  }, [multiviewMode]);

  if(!mediaItem) { return <div className={S("media")} />; }

  const mediaInfo = displayedContent
    .map(item => {
      if(item.type === "additional-view") {
        return {
          id: item.id,
          index: item.index,
          type: "additional-view",
          mediaItem: {
            media_link: item.media_link,
            media_link_info: item.media_link_info,
          },
          display: {
            title: item.label
          }
        };
      } else {
        const mediaItem = mediaPropertyStore.media[item.id];

        if(!mediaItem) {
          return;
        }

        const display = mediaItem.override_settings_when_viewed ? mediaItem.viewed_settings : mediaItem;

        return { id: item.id, type: "media-item", mediaItem, display };
      }
    })
    .filter(item => item)
    .slice(0, streamLimit);

  let media;
  if(multiviewMode === "pip" || mediaInfo.length === 1) {
    media = (
      <div ref={setMediaGridRef} className={S("media-with-sidebar__media-container", isFullscreen ? "media-with-sidebar__media-container--fullscreen" : "")}>
        <PIPContent
          mediaInfo={mediaInfo}
          displayedContent={displayedContent}
          setDisplayedContent={setDisplayedContent}
        />
      </div>
    );
  } else {
    media = (
      <div className={S("media-with-sidebar__media-grid-container", isFullscreen ? "media-with-sidebar__media-grid-container--fullscreen" : "", mediaInfo.length === 0 ? "media-with-sidebar__media-grid-container--single" : "")}>
        <div ref={setMediaGridRef} className={S("media-with-sidebar__media-grid", `media-with-sidebar__media-grid--${mediaInfo.length}`, isFullscreen ? "media-with-sidebar__media-grid--fullscreen" : "")}>
          {
            mediaInfo.map((item, index) =>
              <MediaVideo
                key={`media-${item.id}`}
                capLevelToPlayerSize
                mute={index > 0}
                mediaItem={item.mediaItem}
                display={item.display || display}
                showTitle={displayedContent.length > 1}
                onClose={
                  mediaInfo.length === 1 ? undefined :
                    () => {
                      setDisplayedContent(
                        displayedContent.filter(otherItem =>
                          otherItem.type !== item.type ||
                          otherItem.id !== item.id
                        )
                      );
                    }
                }
                className={S("media-with-sidebar__video")}
                containerProps={{
                  style: { gridArea: `video-${index + 1}` }
                }}
              />
            )
          }
        </div>
      </div>
    );
  }

  return (
    <div className={S("media-with-sidebar", showSidebar && rootStore.pageWidth >= 800 ? "media-with-sidebar--sidebar-visible" : "media-with-sidebar--sidebar-hidden")}>
      <div className={S("media-with-sidebar__media")}>
        {media}
        {textContent}
      </div>
      {
        rootStore.pageWidth < 850 && displayedContent.length > 1 ? null :
          <MediaSidebar
            sidebarContent={sidebarContent}
            showActions
            mediaItem={mediaItem}
            display={display}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
            displayedContent={displayedContent}
            setDisplayedContent={setDisplayedContent}
            multiviewMode={multiviewMode}
            setMultiviewMode={setMultiviewMode}
            setSelectedView={view => setDisplayedContent([view])}
            contentRef={mediaGridRef}
            setShowMultiviewSelectionModal={setShowMultiviewSelectionModal}
            streamLimit={streamLimit}
          />
      }
      <MultiviewSelectionModal
        streamLimit={streamLimit}
        mediaItem={mediaItem}
        opened={showMultiviewSelectionModal}
        sidebarContent={sidebarContent}
        displayedContent={displayedContent}
        setDisplayedContent={setDisplayedContent}
        multiviewMode={multiviewMode}
        setMultiviewMode={setMultiviewMode}
        Close={() => setShowMultiviewSelectionModal(false)}
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

const SectionNavButtons = observer(() => {
  const match = useRouteMatch();
  const searchParams = new URLSearchParams(location.search);
  const [sectionContent, setSectionContent] = useState(undefined);

  useEffect(() => {
    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      pageSlugOrId: match.params.pageSlugOrId,
      sectionSlugOrId: match.params.mediaListSlugOrId || match.params.sectionSlugOrId || searchParams.get("ctx"),
      mediaListSlugOrId: match.params.mediaListSlugOrId
    })
      .then(content => setSectionContent(
        content.filter(sectionItem => sectionItem.type === "media")
      ));
  }, []);

  if(!sectionContent || sectionContent?.length === 0) { return null; }

  const currentItemIndex = sectionContent.findIndex(item =>
    item.mediaItem?.id === match.params.mediaItemSlugOrId ||
    item.mediaItem?.slug === match.params.mediaItemSlugOrId
  );
  const previousItemId = currentItemIndex < 1 ? undefined :
    sectionContent[currentItemIndex - 1].mediaItem?.id;

  const nextItemId = currentItemIndex < 0 || currentItemIndex >= sectionContent.length - 1 ? undefined :
    sectionContent[currentItemIndex + 1].mediaItem?.id;

  return (
    <>
      {
        !previousItemId ? null :
          <Linkish
            className={S("media-nav-button", "media-nav-button--previous")}
            to={`${match.url.replace(match.params.mediaItemSlugOrId, previousItemId)}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`}
          >
            Previous
          </Linkish>
      }
            {
        !nextItemId ? null :
          <Linkish
            className={S("media-nav-button", "media-nav-button--next")}
            to={`${match.url.replace(match.params.mediaItemSlugOrId, nextItemId)}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`}
          >
            Next
          </Linkish>
      }
    </>
  );
});

const DownloadButton = observer(({mediaItem, title}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if(status?.status === "completed") {
      setTimeout(() => setStatus(undefined), 1000);
    }
  }, [status]);

  let button;
  if(rootStore.pageWidth > 850) {
    button = (
      <Button
        title="Download"
        loading={loading && !status}
        onClick={() => setShowMenu(!showMenu)}
        disabled={!!status}
        rightIcon={status ? undefined : DownloadIcon}
        variant="outline"
        className={S("download-menu__button", showMenu ? "download-menu__button--active" : "")}
      >
        {
          !status ? "DOWNLOAD" :
            `PREPARING: ${(status?.progress || 0).toFixed(0)}%`
        }
      </Button>
    );
  } else {
    button = (
      <ActionIcon
        title="Download"
        onClick={() => setShowMenu(!showMenu)}
        disabled={!!status}
        loading={loading}
        variant="outline"
        color="var(--property-border-color-secondary)"
        p={5}
        size={30}
        className={S("icon-button")}
      >
        <ImageIcon icon={DownloadIcon} />
      </ActionIcon>
    );
  }

  return (
    <Menu
      opened={showMenu}
      onChange={setShowMenu}
      position="bottom-end"
      offset={5}
      classNames={{
        dropdown: S("download-menu"),
        item: S("download-menu__item"),
      }}
    >
      <Menu.Target>
        <div>
          {button}
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        {
          mediaItem.media_link_info.representations.map((rep, index) =>
            <Menu.Item
              key={`rep-${rep.string}`}
              onClick={async () => {
                setLoading(true);
                try {
                  await mediaPropertyStore.StartDownloadJob({
                    mediaItem,
                    filename: `${title}${index > 0 ? ` (${rep.resolution})` : ""}`,
                    representation: rep.key,
                    SetStatus: setStatus
                  });
                } catch(error) {
                  rootStore.Log(error, true);
                } finally {
                  setLoading(false);
                }

                setShowMenu(false);
              }}
             rightSection={
               <ImageIcon
                 icon={DownloadIcon}
                 style={{height: 22, width: 22, marginLeft: 10}}
               />
             }
            >
              { rep.resolution }
            </Menu.Item>
          )
        }
      </Menu.Dropdown>
    </Menu>
  );
});

const Media = observer(({
  mediaItem,
  display,
  displayedContent,
  setDisplayedContent,
  sidebarContent,
  textContent,
  showMultiviewSelectionModal,
  setShowMultiviewSelectionModal
}) => {
  if(!mediaItem) { return <div className={S("media")} />; }

  if(mediaItem.media_type === "Video") {
    if(sidebarContent?.tabs?.length > 0) {
      return (
        <MediaVideoWithSidebar
          mediaItem={mediaItem}
          display={display}
          displayedContent={displayedContent}
          setDisplayedContent={setDisplayedContent}
          sidebarContent={sidebarContent}
          textContent={textContent}
          showMultiviewSelectionModal={showMultiviewSelectionModal}
          setShowMultiviewSelectionModal={setShowMultiviewSelectionModal}
        />
      );
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
          alt={mediaItem?.thumbnail_alt_text || mediaItem?.title}
          loaderHeight="100%"
          loaderWidth="100%"
          className={S("media__image")}
        />
        <SectionNavButtons />
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
  const primaryMediaItem = mediaPropertyStore.MediaPropertyMediaItem(match.params);

  const [sidebarContent, setSidebarContent] = useState(undefined);
  const [showMultiviewSelectionModal, setShowMultiviewSelectionModal] = useState(false);
  const [displayedContent, setDisplayedContent] = useState([{type: "media-item", id: primaryMediaItem.id}]);

  const mediaItem = !displayedContent[0] ? primaryMediaItem :
    mediaPropertyStore.MediaPropertyMediaItem({...match.params, mediaItemSlugOrId: displayedContent[0].mediaItemId || displayedContent[0].id});

  const context = new URLSearchParams(location.search).get("ctx");
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  useEffect(() => {
    mediaPropertyStore.SidebarContent({
      ...match.params,
      sectionSlugOrId: match.params.sectionSlugOrId || context
    })
      .then(setSidebarContent);
  }, []);

  if(!mediaItem) {
    return <Redirect to={rootStore.backPath} />;
  }

  const display = mediaItem.override_settings_when_viewed ? mediaItem.viewed_settings : mediaItem;
  const hasText = !!(display.title || display.subtitle || display.headers.length > 0);
  const hasDescription = !!(display.description_rich_text || display.description);
  const showSidebar = sidebarContent?.tabs?.length > 0;
  const showDetails = (hasText || hasDescription);
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
          <img src={imageUrl} alt={mediaItem?.thumbnail_alt_text || mediaItem?.title} className={S("media__error-image")} />
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
    const textContent = (
      !(hasText || !hasDescription) ? null :
        <div key={`media-info-${mediaItem.id}`} className={S("media-info")}>
          {
            !hasText ? null :
              <div className={S("media-text")}>
                <h1 className={[S("media-text__title"), "_title"].join(" ")}>
                  <div className={S("media-text__title--left")}>
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
                  </div>

                  <div className={S("media-text__title--right")}>
                    {
                      !rootStore.loggedIn || mediaItem.live_video || !mediaItem.allow_download || !mediaItem.media_link_info?.downloadable ? null :
                        <DownloadButton title={display.title} mediaItem={mediaItem} />
                    }
                    {
                      !sidebarContent?.anyMultiview || rootStore.pageWidth >= 850 ? null :
                        <ActionIcon
                          variant="filled"
                          onClick={() => setShowMultiviewSelectionModal(!showMultiviewSelectionModal)}
                          title="Show Multiview Options"
                          p={5}
                          color="white"
                          size={30}
                          className={S("icon-button", "icon-button--light")}
                        >
                          <ImageIcon icon={MultiviewIcon} />
                        </ActionIcon>
                    }
                  </div>
                </h1>
                {
                  (display.headers || []).length === 0 ? null :
                    <div className={S("media-text__headers")}>
                      {display.headers?.map?.((header, index) =>
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
    );

    content = (
      <div className={S("media-page", showSidebar ? "media-page--sidebar" : (!showDetails ? "media-page--full" : !hasDescription ? "media-page--extended" : ""))}>
        <div className={S("media-container")}>
          <Media
            mediaItem={mediaItem}
            display={display}
            displayedContent={displayedContent}
            setDisplayedContent={setDisplayedContent}
            sidebarContent={sidebarContent}
            textContent={textContent}
            showMultiviewSelectionModal={showMultiviewSelectionModal}
            setShowMultiviewSelectionModal={setShowMultiviewSelectionModal}
          />
          {
            showSidebar ? null :
              textContent
          }
        </div>
      </div>
    );
  }

  return (
    <>
      { content }
      <MediaPropertyPageContent
        isMediaPage
        params={match.params}
        sections={page.layout?.sections}
      />
    </>
  );
});

export default MediaPropertyMediaPage;
