import SidebarStyles from "Assets/stylesheets/media_properties/media-sidebar.module.scss";

import {observer} from "mobx-react";
import React, {useEffect, useState} from "react";
import {MediaItemImageUrl, MediaItemScheduleInfo, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import {mediaPropertyStore, mediaStore, rootStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {Button, LoaderImage, Modal} from "Components/properties/Common";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {LinkTargetHash, SetImageUrlDimensions} from "../../utils/Utils";
import {TextInput} from "@mantine/core";

import HideIcon from "Assets/icons/right-arrow";
import ShowIcon from "Assets/icons/left-arrow";
import FullscreenIcon from "Assets/icons/full screen";
import PipVideoIcon from "Assets/icons/pip";
import MultiviewIcon from "Assets/icons/media/multiview";
import EyeIcon from "Assets/icons/eye.svg";
import XIcon from "Assets/icons/x";
import AIDescriptionIcon from "Assets/icons/ai-description";
import SearchIcon from "Assets/icons/search";
import {useIsVisible} from "Components/common/Hooks";

const S = (...classes) => classes.map(c => SidebarStyles[c] || "").join(" ");

const Item = observer(({
  imageUrl,
  title,
  subtitle,
  scheduleInfo,
  disabled,
  onClick,
  primaryMediaId,
  contentItem,
  noBorder,
  noActions,
  toggleOnClick,
  streamLimit,
  multiviewMode,
  displayedContent,
  setDisplayedContent
}) => {
  multiviewMode = multiviewMode || mediaStore.multiviewMode;
  displayedContent = displayedContent || mediaStore.displayedContent;
  setDisplayedContent = setDisplayedContent || (content => mediaStore.SetDisplayedContent(content));

  const match = useRouteMatch();
  const [hovering, setHovering] = useState(false);

  const isActive = !!(displayedContent || []).find(item => item.type === contentItem.type && item.id === contentItem.id);
  const isPrimary = (displayedContent || []).findIndex(item => item.type === contentItem.type && item.id === contentItem.id) === 0;

  let linkPath;
  if(!toggleOnClick && !onClick && contentItem.type === "media-item" && contentItem.id !== primaryMediaId) {
    const navContext = new URLSearchParams(location.search).get("ctx");
    linkPath = MediaPropertyLink({match, mediaItem: rootStore.mediaPropertyStore.media[contentItem.id], navContext})?.linkPath || "";
  }

  const ToggleMultiview = () => {
    if(isActive) {
      setDisplayedContent(displayedContent.filter(item => contentItem.id !== item.id));
    } else if(multiviewMode === "pip" && displayedContent.length >= 1) {
      setDisplayedContent([displayedContent[0], contentItem]);
    } else if(displayedContent.length < streamLimit) {
      setDisplayedContent([...displayedContent, contentItem]);
    }
  };

  onClick = onClick ? onClick :
    toggleOnClick ? ToggleMultiview :
      linkPath ? undefined :
        !isActive ?
          () => setDisplayedContent([contentItem]) :
          contentItem.id !== primaryMediaId ?
            () => setDisplayedContent([{type: "media-item", id: primaryMediaId}]) :
            undefined;

  return (
    <Linkish
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={
        S(
          "item",
          disabled ? "item--disabled" : "",
          noBorder ? "item--no-border" : "",
          (hovering && !disabled) ? "item--hover" : "",
          isPrimary ? "item--primary" : "",
          isActive && !isPrimary ? "item--active" : "",
          contentItem.type === "additional-view" ? "item--additional-view" : "",
        )
      }
    >
      {
        !imageUrl ? null :
          <Linkish
            onClick={onClick}
            to={linkPath}
            disabled={disabled}
            className={S("item__image-container", "item__image-container--landscape")}
          >
            <LoaderImage
              loaderAspectRatio={16 / 9}
              alt={title}
              className={S("item__image")}
              src={imageUrl}
            />
            {
              !scheduleInfo?.currentlyLive ? null :
                <div className={S("live-badge")}>Live</div>
            }
          </Linkish>
      }
      <Linkish
        onClick={onClick}
        to={linkPath}
        disabled={disabled}
        className={S("item__text")}
      >
        <div title={title} className={S("item__title")}>
          {title}
        </div>
        {
          !subtitle ? null :
            <div title={subtitle} className={S("item__subtitle")}>
              {subtitle}
            </div>
        }
        {
          !scheduleInfo?.isLiveContent || contentItem.type !== "media-item" ? null :
            <div className={S("item__date")}>
              {scheduleInfo.displayStartDateLong} at {scheduleInfo.displayStartTime}
            </div>
        }
        {
          // TODO: Decide if we want a live badge here
          true || imageUrl || !scheduleInfo?.currentlyLive ? null :
            <div className={S("live-badge")}>Live</div>
        }
      </Linkish>
      {
        noActions ? null :
          <div className={S("item__actions")}>
            <Linkish
              disabled={!isActive && displayedContent.length >= streamLimit}
              onClick={ToggleMultiview}
              className={S("item__action", isActive ? "item__action--active" : "")}
            >
              <ImageIcon
                icon={
                  multiviewMode === "pip" ?
                    PipVideoIcon : EyeIcon
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
  contentRef,
  streamLimit
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const tab = mediaStore.sidebarContent?.tabs?.[tabIndex];

  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isLive = scheduleInfo?.isLiveContent && scheduleInfo?.started;

  if(mediaStore.sidebarContent?.tabs?.length === 0) {
    return;
  }

  if(!mediaStore.showSidebar && rootStore.pageWidth >= 850) {
    return (
      <div className={S("hidden-sidebar")}>
        <button onClick={() => mediaStore.SetShowSidebar(true)} className={S("show-button")}>
          <ImageIcon icon={ShowIcon} />
        </button>
      </div>
    );
  }

  return (
    <div className={S("sidebar", mediaStore.sidebarContent.anyMultiview ? "sidebar--with-multiview" : "")}>
      <div className={S("sidebar__actions")}>
        {
          !mediaStore.sidebarContent.anyMultiview ? null :
            <div className={S("multiview-switch")}>
              <button
                onClick={() => mediaStore.SetMultiviewMode("pip")}
                title="Picture-in-Picture Mode"
                className={S("multiview-switch__button", mediaStore.multiviewMode === "pip" ? "multiview-switch__button--active" : "")}
              >
                <ImageIcon icon={PipVideoIcon}/>
              </button>
              <button
                onClick={() => mediaStore.SetMultiviewMode("multiview")}
                title="Multiview Mode"
                className={S("multiview-switch__button", mediaStore.multiviewMode === "multiview" ? "multiview-switch__button--active" : "")}
              >
                <ImageIcon icon={MultiviewIcon}/>
              </button>
            </div>
        }
        <button title="Hide Sidbar" onClick={() => mediaStore.SetShowSidebar(false)} className={S("hide-button")}>
          <ImageIcon icon={HideIcon}/>
        </button>
        {
          rootStore.pageWidth <= 850 || !contentRef || !document.fullscreenEnabled || mediaStore.displayedContent.length <= 1 ? null :
            <button
              onClick={() => contentRef.requestFullscreen()}
              title="View Content in Full Screen"
              className={S("fullscreen-button")}
            >
              <ImageIcon icon={FullscreenIcon}/>
            </button>
        }
      </div>
      <div className={S("header", "header--sidebar")}>
        {
          !isLive ? null :
            <div className={S("live-badge")}>
              Live
            </div>
        }
        <div className={[S("header__title"), "_title"].join(" ")}>
          {display.title}
        </div>
        <div className={S("header__headers")}>
          {display.headers?.map?.((header, index) =>
            <div key={`header-${index}`} className={S("header__header")}>{header}</div>
          )}
        </div>
        <div className={S("header__subtitle")}>
          {display.subtitle}
        </div>
      </div>
      <div className={S("tabs-container")}>
        {
          (mediaStore.sidebarContent.tabs || []).length <= 1 ? null :
            <div className={S("tabs")}>
              {
                mediaStore.sidebarContent.tabs.map((tab, index) =>
                  <button
                    onClick={() => setTabIndex(index)}
                    key={`tab-${tab.id}`}
                    className={S("tab", tabIndex === index ? "tab--active" : "")}
                  >
                    {tab.title}
                  </button>
                )
              }
            </div>
        }
      </div>
      <div className={S("content")}>
        {
          tab.groups.map(group =>
            <div key={`group-${group.id}`} className={S("content__section")}>
              {
                !group.title ? null :
                  <div className={[S("content__title"), "_title"].join(" ")}>
                    { group.title }
                  </div>
              }
              {group.content.map((item, index) => {
                let {imageUrl} = MediaItemImageUrl({
                  mediaItem: item.mediaItem,
                  display: item.display
                });

                return (
                  <>
                    <Item
                      noBorder={index === 0}
                      imageUrl={imageUrl}
                      title={item.display.title}
                      subtitle={item.display.subtitle}
                      scheduleInfo={item.scheduleInfo}
                      key={`item-${item.id}`}
                      contentItem={{type: "media-item", id: item.mediaItem.id}}
                      primaryMediaId={mediaItem.id}
                      noActions={!item.authorized || !item.scheduleInfo?.isMultiviewable}
                      streamLimit={streamLimit}
                    />
                    {
                      (item?.additional_views || [])?.length === 0 || !item.authorized || !item.scheduleInfo.isMultiviewable ? null :
                        <div className={S("content__views-container")}>
                          {
                            (item.additional_views || []).map((view, index) =>
                              <Item
                                imageUrl={SetImageUrlDimensions({url: view.image?.url, width: 400})}
                                title={view.label}
                                key={`item-${item.id}-${index}`}
                                scheduleInfo={item.scheduleInfo}
                                contentItem={{
                                  ...view,
                                  type: "additional-view",
                                  id: `${item.id}-${index}`,
                                  mediaItemId: item.id,
                                  index,
                                  label: `${item.display.title} - ${view.label}`
                                }}
                                primaryMediaId={mediaItem.id}
                                streamLimit={streamLimit}
                              />
                            )
                          }
                        </div>
                    }
                  </>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
});

export const MultiviewSelectionModal = observer(({
  mediaItem,
  streamLimit
}) => {
  let tabs = (mediaStore.sidebarContent.tabs || []).filter(tab =>
    tab.groups.find(group =>
      group.content.find(item =>
        item.scheduleInfo.isMultiviewable
      )
    )
  );

  const [selectedContent, setSelectedContent] = useState([...mediaStore.displayedContent]);
  const [tabIndex, setTabIndex] = useState(0);
  const tab = tabs[tabIndex];

  useEffect(() => {
    if(mediaStore.showMultiviewSelectionModal) {
      setSelectedContent([...mediaStore.displayedContent]);
    }
  }, [mediaStore.showMultiviewSelectionModal]);

  useEffect(() => {
    setSelectedContent(
      selectedContent.slice(0, streamLimit)
    );
  }, [streamLimit]);

  if(tabs.length === 0) {
    return null;
  }

  return (
    <Modal
      size="sm"
      centered
      opened={mediaStore.showMultiviewSelectionModal}
      onClose={() => mediaStore.SetShowMultiviewSelectionModal(false)}
      withCloseButton={false}
      header={
        <div className={S("multiview-selection-modal__header")}>
          <Linkish
            className={S("multiview-selection-modal__back")}
            onClick={() => mediaStore.SetShowMultiviewSelectionModal(false)}
          >
            <ImageIcon icon={ShowIcon}/>
          </Linkish>
          <div>
            {rootStore.l10n.media_properties.media.select_streams}
          </div>
        </div>
      }
      bodyClassName={S("multiview-selection-modal__body")}
      headerClassName={S("multiview-selection-modal__header")}
      contentClassName={S("multiview-selection-modal")}
      childrenContainerClassName={S("multiview-selection-modal__content")}
    >
      {
        tabs.length <= 1 ? null :
          <div className={S("tabs-container")}>
            <div className={S("tabs")}>
              {
                tabs.map((tab, index) =>
                  <button
                    onClick={() => setTabIndex(index)}
                    key={`tab-${tab.id}`}
                    className={S("tab", tabIndex === index ? "tab--active" : "")}
                  >
                    {tab.title}
                  </button>
                )
              }
            </div>
          </div>
      }
      <div className={S("multiview-selection-modal__items")}>
        {
          tab?.groups.map(group =>
            !group.content.find(item => item.authorized && item.scheduleInfo.isMultiviewable) ? null :
              <div key={`group-${group.id}`} className={S("content__section")}>
                {
                  !group.title ? null :
                    <div className={[S("content__title"), "_title"].join(" ")}>
                      {group.title}
                    </div>
                }
                {group.content
                  .filter(item => item.authorized && item.scheduleInfo?.isMultiviewable)
                  .map((item, index) => {
                    let {imageUrl} = MediaItemImageUrl({
                      mediaItem: item.mediaItem,
                      display: item.display
                    });

                    return (
                      <>
                        <Item
                          noBorder={index === 0}
                          imageUrl={imageUrl}
                          toggleOnClick
                          title={item.display.title}
                          subtitle={item.display.subtitle}
                          scheduleInfo={item.scheduleInfo}
                          key={`item-${item.id}`}
                          contentItem={{type: "media-item", id: item.mediaItem.id}}
                          primaryMediaId={mediaItem.id}
                          multiviewMode="multiview"
                          streamLimit={streamLimit}
                          displayedContent={selectedContent}
                          setDisplayedContent={setSelectedContent}
                        />
                        {
                          (item?.additional_views || [])?.length === 0 ? null :
                            <div className={S("content__views-container")}>
                              {
                                (item.additional_views || []).map((view, index) =>
                                  <Item
                                    noBorder={index === 0}
                                    toggleOnClick
                                    imageUrl={SetImageUrlDimensions({url: view.image?.url, width: 400})}
                                    title={view.label}
                                    key={`item-${item.id}-${index}`}
                                    contentItem={{
                                      ...view,
                                      type: "additional-view",
                                      id: `${item.id}-${index}`,
                                      index,
                                      label: `${item.display.title} - ${view.label}`
                                    }}
                                    primaryMediaId={mediaItem.id}
                                    scheduleInfo={item.scheduleInfo}
                                    multiviewMode="multiview"
                                    streamLimit={streamLimit}
                                    displayedContent={selectedContent}
                                    setDisplayedContent={setSelectedContent}
                                  />
                                )
                              }
                            </div>
                        }
                      </>
                    );
                  })}
              </div>
          )
        }
      </div>
      <div className={S("multiview-selection-modal__actions")}>
        <Button onClick={() => mediaStore.SetShowMultiviewSelectionModal(false)} variant="subtle" className={S("multiview-selection-modal__action")}>
          Cancel
        </Button>
        <Button
          variant="primary"
          defaultStyles
          disabled={selectedContent.length === 0}
          onClick={() => {
            mediaStore.SetDisplayedContent(selectedContent);
            mediaStore.SetShowMultiviewSelectionModal(false);
          }}
          className={S("multiview-selection-modal__action")}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
});

/* Tag Sidebar */

export const FormatTime = time => {
  const useHours = time > 60 * 60;

  const hours = Math.floor(time / 60 / 60);
  const minutes = Math.floor(time / 60 % 60);
  const seconds = Math.floor(time % 60);

  let string = `${minutes.toString().padStart(useHours ? 2 : 1, "0")}:${seconds.toString().padStart(2, "0")}`;

  if(useHours) {
    string = `${hours.toString()}:${string}`;
  }

  return string;
};

window.formatTime = FormatTime;

const Tag = observer(({objectId, tag, showThumbnails, videoDimensions, active}) => {
  const [ref, setRef] = useState(undefined);
  const visible = useIsVisible(ref);
  const player = mediaStore.availablePlayers[objectId] && mediaStore.players[objectId];

  return (
    <button
      ref={setRef}
      key={tag.id}
      id={`video-tag-${tag.id}`}
      onClick={() => player?.controls.Seek({time: tag.start_time})}
      className={
        S(
          "tag",
          active ? "tag--active" : "",
          showThumbnails ? "tag--thumbnail" : ""
        )
      }
    >
      {
        !showThumbnails ? null :
          !visible ?
            <div
              key={`img-${tag.id}`}
              style={{
                aspectRatio: `${videoDimensions.width}/${videoDimensions.height}`
              }}
              className={S("tag__thumbnail")}
            /> :
            <img
              key={`img-${tag.id}`}
              style={{
                aspectRatio: `${videoDimensions.width}/${videoDimensions.height}`
              }}
              src={player.controls.GetThumbnailImage(tag.start_time)} alt={tag.tag}
              className={S("tag__thumbnail")}
            />
      }
      <div className={S("tag__text")}>
        <div className={S("tag__time")}>
          {
            showThumbnails ?
              `${ FormatTime(tag.start_time) } - ${ FormatTime(tag.end_time) } (${FormatTime(tag.end_time - tag.start_time)})` :
              FormatTime(tag.start_time)
          }
        </div>
        <div className={S("tag__content")}>
          {tag.tag}
        </div>
      </div>
    </button>
  );
});

let filterTimeout;
const FilterInput = observer(({filter, setFilter, placeholder}) => {
  const [filterInput, setFilterInput] = useState(filter);

  useEffect(() => {
    clearTimeout(filterTimeout);

    filterTimeout = setTimeout(() => setFilter(filterInput), 500);
  }, [filterInput]);

  useEffect(() => {
    setFilterInput(filterInput);
  }, [filter]);

  return (
    <TextInput
      value={filterInput}
      onChange={event => setFilterInput(event.target.value)}
      placeholder={placeholder}
      leftSectionWidth={50}
      leftSection={
        <ImageIcon icon={SearchIcon} className={S("search__icon")}/>
      }
      classNames={{
        root: S("search"),
        input: [S("search__input"), "_title"].join(" ")
      }}
    />
  );
});

export const MediaTagSidebar = observer(({mediaItem}) => {
  const [tab, setTab] = useState("CHAPTERS");
  const [containerRef, setContainerRef] = useState(undefined);
  const [activeTags, setActiveTags] = useState([]);
  const [filter, setFilter] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const versionHash = LinkTargetHash(mediaItem.media_link);
  const objectId = mediaPropertyStore.client.utils.DecodeVersionHash(versionHash)?.objectId;
  const player = mediaStore.availablePlayers[objectId] && mediaStore.players[objectId];

  useEffect(() => {
    // Tags should already be loaded so this should be instant
    mediaStore.LoadMediaTags({versionHash})
      .then(() =>
        setTab(
            mediaStore.mediaTags?.hasTranscription ? "TRANSCRIPT" :
              mediaStore.mediaTags?.hasPlayByPlay ? "PLAY-BY-PLAY" : "CHAPTERS"
        ));
  }, []);

  useEffect(() => {
    setFilter("");
    setScrolled(false);
  }, [tab]);

  useEffect(() => {
    if(!player) { return; }

    setCurrentTime(player.controls.GetCurrentTime());

    const TimeUpdateDisposer = player.controls.RegisterVideoEventListener(
      "timeupdate",
      () => {
        setCurrentTime(player.controls.GetCurrentTime());
        setPlaying(player.controls.IsPlaying());
      }
    );

    return () => TimeUpdateDisposer?.();
  }, [mediaStore.availablePlayers[objectId]]);

  useEffect(() => {
    if(!containerRef || filter) { return; }

    const nearestCurrentTag = activeTags.find(tag => currentTime <= tag.end_time);// || activeTags[0];

    if(!nearestCurrentTag) { return; }

    const tagElement = document.querySelector(`#video-tag-${nearestCurrentTag.id}`);

    if(!tagElement) { return; }

    if(
      tagElement.getBoundingClientRect().top - containerRef.getBoundingClientRect().top < 0 ||
      tagElement.getBoundingClientRect().bottom - containerRef.getBoundingClientRect().bottom > 0
    ) {
      containerRef.scrollTo({
        top: tagElement.offsetTop - 180,
        left: 0,
        behavior: scrolled ? "smooth" : "instant"
      });
      setScrolled(true);
    }
  }, [currentTime, activeTags.length]);

  useEffect(() => {
    if(!mediaStore.mediaTags.hasTags) { return; }

    let tabTags = [];
    switch(tab) {
      case "TRANSCRIPT":
        tabTags = mediaStore.mediaTags.transcriptionTags || [];
        break;
      case "PLAY-BY-PLAY":
        tabTags = mediaStore.mediaTags.playByPlayTags || [];
        break;
      case "CHAPTERS":
        tabTags = mediaStore.mediaTags.chapterTags || [];
    }

    setActiveTags(
      tabTags
        .filter(tag =>
          tag.tag.toLowerCase().includes(filter.toLowerCase())
        )
    );
  }, [tab, filter, !!mediaStore.mediaTags.hasTags]);

  if(!mediaStore.mediaTags.hasTags) {
    return (
      <div className={S("sidebar")} />
    );
  }

  const tabs = [
    mediaStore.mediaTags.hasTranscription ? "TRANSCRIPT" : "",
    mediaStore.mediaTags.hasPlayByPlay ? "PLAY-BY-PLAY" : "",
    mediaStore.mediaTags.hasChapters ? "CHAPTERS" : ""
  ]
    .filter(tab => tab);

  const showThumbnails = tab === "CHAPTERS" && player?.controls?.ThumbnailsAvailable();
  const videoDimensions = player?.controls.GetVideoDimensions();

  return (
    <div className={S("sidebar", "sidebar--tags")}>
      <div className={S("header")}>
        <div className={[S("header__title"), "_title"].join(" ")}>
          IN THIS VIDEO
          <ImageIcon icon={AIDescriptionIcon} />
        </div>
        <button onClick={() => mediaStore.SetShowTagSidebar(false)} className={S("header__close")}>
          <ImageIcon icon={XIcon} />
        </button>
      </div>
      <div className={S("tabs-container")}>
        <div className={S("tabs")}>
          {
            tabs.map(t =>
              <button
                onClick={() => setTab(t)}
                key={`tab-${t}`}
                className={S("tab", t === tab ? "tab--active" : "")}
              >
                {t}
              </button>
            )
          }
        </div>
      </div>
      <div className={S("search-container")}>
        <FilterInput
          placeholder={`SEARCH ${tab}`}
          filter={filter}
          setFilter={setFilter}
        />
      </div>
      <div
        key={`tags-${tab}`}
        className={S("tags")}
        ref={setContainerRef}
        style={{
          overflowY: playing && !filter ? "hidden" : "auto"
        }}
      >
        {
          activeTags.map(tag =>
            <Tag
              key={tag.id}
              objectId={objectId}
              tag={tag}
              active={currentTime >= tag.start_time && currentTime <= tag.end_time ? "tag--active" : ""}
              videoDimensions={videoDimensions}
              showThumbnails={showThumbnails}
            />
          )
        }
      </div>
    </div>
  );
});

/* End */

export default MediaSidebar;
