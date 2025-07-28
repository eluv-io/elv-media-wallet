import SidebarStyles from "Assets/stylesheets/media_properties/media-sidebar.module.scss";

import {observer} from "mobx-react";
import React, {useState} from "react";
import {MediaItemImageUrl, MediaItemScheduleInfo, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import {rootStore, mediaPropertyStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {LoaderImage} from "Components/properties/Common";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import PipVideoIcon from "Assets/icons/sidebar-pip.svg";
import MultiviewIcon from "Assets/icons/eye.svg";
import XIcon from "Assets/icons/x.svg";
import ChevronLeft from "Assets/icons/left-arrow.svg";

const S = (...classes) => classes.map(c => SidebarStyles[c] || "").join(" ");

export const SidebarContent = async ({match}) => {
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const sidebarOptions = mediaProperty.metadata.media_sidebar || {};
  const currentNavContext = new URLSearchParams(window.location.search).get("ctx");
  const currentSection = mediaPropertyStore.MediaPropertySection({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    sectionSlugOrId: match.params.sectionSlugOrId || currentNavContext,
    mediaListSlugOrId: match.params.mediaListSlugOrId
  });

  const mediaItem = mediaPropertyStore.MediaPropertyMediaItem({...match.params});

  const additionalViews = (mediaItem?.additional_views || [])
    .filter(view => !!view.media_link)
    .map((view, index) => ({...view, index}));
  const additionalViewLabel = mediaItem?.additional_views_label;

  if(!sidebarOptions.show_media_sidebar) {
    return { content: [], additionalViews, additionalViewLabel };
  }

  if(sidebarOptions.sidebar_content === "live" || (!currentSection && sidebarOptions.default_sidebar_content === "live")) {
    let content = await mediaPropertyStore.SearchMedia({
      ...match.params,
      searchOptions: {schedule: "live_and_upcoming"}
    });

    content = content
      .map(result => ({
        ...result,
        scheduleInfo: MediaItemScheduleInfo(result.mediaItem)
      }))
      .sort((a, b) => a.mediaItem.start_time < b.mediaItem.start_time ? -1 : 1);

    return { content, additionalViews, additionalViewLabel };
  } else {
    let section = sidebarOptions.sidebar_content === "current_section" && currentSection;
    if(
      sidebarOptions.sidebar_content === "specific_section" ||
      (
        sidebarOptions.sidebar_content === "current_section" &&
        !section &&
        sidebarOptions.default_sidebar_content === "specific_section"
      )
    ) {
      section = mediaPropertyStore.MediaPropertySection({
        mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
        mediaListSlugOrId: match.params.mediaListSlugOrId,
        sectionSlugOrId: sidebarOptions.sidebar_content_section_id
      });
    }

    if(!section) {
      return { content: [], additionalViews, additionalViewLabel };
    }

    let content = await mediaPropertyStore.MediaPropertySectionContent({
      ...match.params,
      sectionSlugOrId: section.id
    });

    content = content
      .map(result => ({
        ...result,
        scheduleInfo: MediaItemScheduleInfo(result.mediaItem)
      }))
      .sort((a, b) => {
        if(a.scheduleInfo.isLiveContent) {
          if(b.scheduleInfo.isLiveContent) {
            return a.mediaItem.start_time < b.mediaItem.start_time ? -1 : 1;
          }

          return -1;
        } else if(b.scheduleInfo.isLiveContent) {
          return 1;
        }

        return 0;
      });

    return {
      content,
      section,
      additionalViews,
      additionalViewLabel
    };
  }
};

const AdditionalView = observer(({
  item,
  multiviewMode,
  additionalMedia=[],
  setAdditionalMedia,
  selectedView,
  setSelectedView
}) => {
  const [hovering, setHovering] = useState(false);
  const isActive = additionalMedia.find(other => item.index === other.index);
  const isSelected = selectedView?.media_link?.["/"] === item?.media_link?.["/"];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setSelectedView(isSelected ? undefined : item)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={
        S(
          "item",
          "item--additional-view",
          selectedView?.index === item.index ? "item--hover" : "",
          hovering? "item--hover" : ""
        )
      }
    >
      <div className={S("item__text")}>
        <div className={S("item__title")}>
          {item.label}
        </div>
      </div>
      <div
        onMouseEnter={() => setHovering(false)}
        onMouseLeave={() => setHovering(true)}
        className={S("item__actions")}
      >
        <Linkish
          disabled={!isActive && additionalMedia.length >= 8}
          onClick={event => {
            event.stopPropagation();
            event.preventDefault();

            if(isActive) {
              setAdditionalMedia(additionalMedia.filter(other => item.index !== other.index));
            } else if(multiviewMode === "pip") {
              setAdditionalMedia([item]);
            } else {
              setAdditionalMedia([...additionalMedia, item]);
            }
          }}
          className={S("item__action", !isActive ? "item__action--faded" : "")}
        >
          <ImageIcon
            icon={
                multiviewMode === "pip" ?
                  PipVideoIcon : MultiviewIcon
            }
          />
        </Linkish>
      </div>
    </div>
  );
});

const SidebarItem = observer(({
  item,
  noBorder,
  aspectRatio,
  showActions,
  multiviewMode,
  additionalMedia=[],
  setAdditionalMedia
}) => {
  const [hovering, setHovering] = useState(false);
  const match = useRouteMatch();
  const mediaItem = item.mediaItem;

  if(!mediaItem) { return null; }

  let {imageUrl} = MediaItemImageUrl({
    mediaItem,
    display: mediaItem,
    aspectRatio: aspectRatio || "Landscape",
    width: 400
  });

  const itemIsLive = item.scheduleInfo?.currentlyLive;
  const itemIsVod = !item.scheduleInfo?.isLiveContent;

  const navContext = new URLSearchParams(location.search).get("ctx");
  const { linkPath } = MediaPropertyLink({match, mediaItem: mediaItem, navContext}) || "";

  const isPrimary = mediaItem.id === match.params.mediaItemSlugOrId;
  const isActive = isPrimary || !!additionalMedia.find(mediaId => mediaId === mediaItem.id);

  return (
    <Linkish
      disabled={isPrimary}
      to={linkPath}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={S(
        "item",
        noBorder ? "item--no-border" : "",
        (itemIsLive || itemIsVod) ? "item--live" : "",
          item.id === match.params.mediaItemSlugOrId ? "item--active" : "",
        hovering? "item--hover" : ""
      )}
      /*
        ref={element => {
          // Scroll selected item into view
          if(!element || item.id !== match.params.mediaItemSlugOrId) {
            return;
          }

          const parentDimensions = element.parentElement.getBoundingClientRect();
          const elementDimensions = element.getBoundingClientRect();

          if(elementDimensions.top + elementDimensions.height <= parentDimensions.top + parentDimensions.height) {
            // Element already visible
            return;
          }

          element.parentElement.scrollTop = elementDimensions.top - parentDimensions.top;
        }}
       */
    >
      {
        !(itemIsLive || itemIsVod) ? null :
          <div className={S("item__image-container", aspectRatio ? `item__image-container--${aspectRatio.toLowerCase()}` : "")}>
            { itemIsLive ? <div className={S("live-badge")}>Live</div> : null }
            <LoaderImage
              loaderAspectRatio={16 / 9}
              alt={mediaItem.thumbnail_alt_text || mediaItem.title}
              className={S("item__image")}
              src={imageUrl}
            />
          </div>
      }
      <div className={S("item__text")}>
        <div className={S("item__title")}>
          {mediaItem.title}
        </div>
        {
          !mediaItem.subtitle ? null :
            <div className={S("item__subtitle")}>
              {mediaItem.subtitle}
            </div>
        }
        {
          !item.scheduleInfo?.isLiveContent ? null :
            <div className={S("item__date")}>
              { item.scheduleInfo.displayStartDateLong } at { item.scheduleInfo.displayStartTime }
            </div>
        }
      </div>
      {
        !showActions || !itemIsLive || (isPrimary && multiviewMode === "pip") ? null :
          <div
            onMouseEnter={() => setHovering(false)}
            onMouseLeave={() => setHovering(true)}
            onClick={event => {
              event.stopPropagation();
              event.preventDefault();
            }}
            className={S("item__actions")}
          >
            <Linkish
              disabled={!isActive && additionalMedia.length >= 8}
              onClick={
                isPrimary ? undefined :
                  () => {
                    if(isActive) {
                      setAdditionalMedia(additionalMedia.filter(mediaId => mediaId !== mediaItem.id));
                    } else if(multiviewMode === "pip") {
                      setAdditionalMedia([mediaItem.id]);
                    } else {
                      setAdditionalMedia([...additionalMedia, mediaItem.id]);
                    }
                  }
              }
              className={S("item__action", isPrimary ? "item__action--primary" : "", !isActive ? "item__action--faded" : "")}
            >
              <ImageIcon
                icon={
                    multiviewMode === "pip" ?
                      PipVideoIcon : MultiviewIcon
                }
              />
            </Linkish>
          </div>
      }
    </Linkish>
  );
});

const MediaSidebar = observer(({
  mediaItem,
  display,
  sidebarContent,
  showActions,
  showSidebar,
  setShowSidebar,
  additionalMedia,
  setAdditionalMedia,
  selectedView,
  setSelectedView,
  multiviewMode,
  setMultiviewMode
}) => {
  const {content, section} = sidebarContent || {};

  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isLive = scheduleInfo?.isLiveContent && scheduleInfo?.started;
  const aspectRatio = section?.display?.aspect_ratio;

  if(!content || content.length === 0) {
    return;
  }

  const liveContent = content.filter(item => item.scheduleInfo.isLiveContent && item.scheduleInfo.started && !item.scheduleInfo.ended);
  const upcomingContent = content.filter(item => item.scheduleInfo.isLiveContent && !item.scheduleInfo.started);
  const vodContent = content.filter(item => !item.scheduleInfo.isLiveContent);

  if(!showSidebar || rootStore.pageWidth < 800) {
    return (
      <div className={S("hidden-sidebar")}>
        <button onClick={() => setShowSidebar(true)} className={S("show-button")}>
          <ImageIcon icon={ChevronLeft} />
        </button>
      </div>
    );
  }

  return (
    <div className={S("sidebar", "sidebar--overlay")}>
      <button onClick={() => setShowSidebar(false)} className={S("hide-button")}>
        <ImageIcon icon={XIcon} />
      </button>
      <div className={S("header")}>
        {
          !isLive ? null :
            <div className={S("live-badge")}>
              Live
            </div>
        }
        <div className={[S("header__title"), "_title"].join(" ")}>
          { display.title }
        </div>
        <div className={S("header__headers")}>
          {display.headers.map((header, index) =>
            <div key={`header-${index}`} className={S("header__header")}>{header}</div>
          )}
        </div>
        <div className={S("header__subtitle")}>
          { display.subtitle }
        </div>
      </div>
      <div className={S("content")}>
        {
          sidebarContent.additionalViews.length === 0 ? null :
            <div className={S("content__section")}>
              <div className={[S("content__title", "content__mode"), "_title"].join(" ")}>
                <button
                  onClick={() => setMultiviewMode("pip")}
                  className={S("content__mode-tab", multiviewMode === "pip" ? "content__mode-tab--active" : "")}
                >
                  { sidebarContent.additionalViewLabel || "Additional Views" }
                </button>
                <button
                  onClick={() => setMultiviewMode("multiview")}
                  className={S("content__mode-tab", multiviewMode === "multiview" ? "content__mode-tab--active" : "")}
                >
                  Multiview
                </button>
              </div>
              {sidebarContent.additionalViews.map((item, index) =>
                <AdditionalView
                  multiviewMode={multiviewMode}
                  item={item}
                  additionalMedia={additionalMedia}
                  setAdditionalMedia={setAdditionalMedia}
                  selectedView={selectedView}
                  setSelectedView={setSelectedView}
                  key={`item-${index}`}
                />
              )}
            </div>
        }
        {
          liveContent.length === 0 ? null :
            <div className={S("content__section")}>
              {
                sidebarContent.additionalViews.length > 0 ?
                  <div className={[S("content__title"), "_title"].join(" ")}>
                    Today
                  </div> :
                  <div className={[S("content__title", "content__mode"), "_title"].join(" ")}>
                    <button
                      onClick={() => setMultiviewMode("pip")}
                      className={S("content__mode-tab", multiviewMode === "pip" ? "content__mode-tab--active" : "")}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setMultiviewMode("multiview")}
                      className={S("content__mode-tab", multiviewMode === "multiview" ? "content__mode-tab--active" : "")}
                    >
                      Multiview
                    </button>
                  </div>
              }
              {liveContent.map((item, index) =>
                <SidebarItem
                  multiviewMode={multiviewMode}
                  noBorder={index === 0}
                  item={item}
                  aspectRatio={aspectRatio}
                  showActions={showActions}
                  additionalMedia={additionalMedia}
                  setAdditionalMedia={setAdditionalMedia}
                  key={`item-${item.id}`}
                />
              )}
            </div>
        }
        {
          upcomingContent.length === 0 ? null :
            <div className={S("content__section")}>
              <div className={[S("content__title"), "_title"].join(" ")}>
                Upcoming
              </div>
              {upcomingContent.map(item =>
                <SidebarItem
                  item={item}
                  aspectRatio={aspectRatio}
                  showActions={showActions}
                  key={`item-${item.id}`}
                />
              )}
            </div>
        }
        {
          vodContent.length === 0 ? null :
            <div className={S("content__section")}>
              <div className={[S("content__title"), "_title"].join(" ")}>
                { section?.display?.title }
              </div>
              {vodContent.map(item =>
                <SidebarItem
                  item={item}
                  aspectRatio={aspectRatio}
                  showActions={false}
                  key={`item-${item.id}`}
                />
              )}
            </div>
        }
      </div>
    </div>
  );
});

export default MediaSidebar;
