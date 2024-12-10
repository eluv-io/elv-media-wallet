import SidebarStyles from "Assets/stylesheets/media_properties/media-sidebar.module.scss";

import {observer} from "mobx-react";
import React from "react";
import {MediaItemImageUrl, MediaItemScheduleInfo, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import {rootStore, mediaPropertyStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {LoaderImage} from "Components/properties/Common";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import NoVideoIcon from "Assets/icons/sidebar-novideo.svg";
import MultiVideoIcon from "Assets/icons/sidebar-multivideo.svg";
import PipVideoIcon from "Assets/icons/sidebar-pip.svg";
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

  if(!sidebarOptions.show_media_sidebar) { return; }

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

    return { content };
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

    if(!section) { return; }

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
      section
    };
  }
};

const SidebarItem = observer(({
  item,
  aspectRatio,
  showActions,
  secondaryMediaSettings,
  setSecondaryMediaSettings
}) => {
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

  return (
    <Linkish
      to={linkPath}
      className={S(
        "item",
        (itemIsLive || itemIsVod) ? "item--live" : "",
          item.id === match.params.mediaItemSlugOrId ? "item--active" : ""
      )}
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
        !showActions || !itemIsLive || item.id === match.params.mediaItemSlugOrId ? null :
          <div className={S("item__actions")}>
            <button
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                if(secondaryMediaSettings?.mediaId === mediaItem.id) {
                  if(secondaryMediaSettings.display === "side-by-side") {
                    setSecondaryMediaSettings({mediaId: mediaItem.id, display: "picture-in-picture", pip: "secondary"});
                  } else {
                    setSecondaryMediaSettings(undefined);
                  }
                } else {
                  setSecondaryMediaSettings({mediaId: mediaItem.id, display: "side-by-side"});
                }
              }}
              className={S("item__action", secondaryMediaSettings?.mediaId !== mediaItem.id ? "item__action--faded" : "")}
            >
              <ImageIcon
                icon={
                  secondaryMediaSettings?.mediaId !== mediaItem.id ? NoVideoIcon :
                    secondaryMediaSettings.display === "side-by-side" ? MultiVideoIcon :
                      PipVideoIcon
                }
              />
            </button>
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
  secondaryMediaSettings,
  setSecondaryMediaSettings,
  showSidebar,
  setShowSidebar
}) => {
  const {content, section} = sidebarContent || {};

  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isLive = scheduleInfo?.isLiveContent && scheduleInfo?.started;
  const aspectRatio = section?.display?.aspect_ratio;

  if(!content || content.length === 0) { return; }

  const liveContent = content.filter(item => item.scheduleInfo.isLiveContent && item.scheduleInfo.started);
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
    <div className={S("sidebar", secondaryMediaSettings?.display === "side-by-side" ? "sidebar--overlay" : "")}>
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
          liveContent.length === 0 ? null :
            <>
              <div className={[S("content__title"), "_title"].join(" ")}>
                Today
              </div>
              {liveContent.map(item =>
                <SidebarItem
                  item={item}
                  aspectRatio={aspectRatio}
                  showActions={showActions}
                  secondaryMediaSettings={secondaryMediaSettings}
                  setSecondaryMediaSettings={setSecondaryMediaSettings}
                  key={`item-${item.id}`}
                />
              )}
            </>
        }
        {
          upcomingContent.length === 0 ? null :
            <>
              <div className={[S("content__title"), "_title"].join(" ")}>
                Upcoming
              </div>
              {upcomingContent.map(item =>
                <SidebarItem
                  item={item}
                  aspectRatio={aspectRatio}
                  showActions={showActions}
                  secondaryMediaSettings={secondaryMediaSettings}
                  setSecondaryMediaSettings={setSecondaryMediaSettings}
                  key={`item-${item.id}`}
                />
              )}
            </>
        }
        {
          vodContent.length === 0 ? null :
            <>
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
            </>
        }
      </div>
    </div>
  );
});

export default MediaSidebar;
