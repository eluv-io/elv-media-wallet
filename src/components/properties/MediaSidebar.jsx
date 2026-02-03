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
  multiviewMode,
  streamLimit,
  displayedContent,
  setDisplayedContent
}) => {
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
    } else {
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
          !scheduleInfo?.isLiveContent ? null :
            <div className={S("item__date")}>
              {scheduleInfo.displayStartDateLong} at {scheduleInfo.displayStartTime}
            </div>
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
  multiviewMode,
  setMultiviewMode,
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
                onClick={() => setMultiviewMode("pip")}
                title="Picture-in-Picture Mode"
                className={S("multiview-switch__button", multiviewMode === "pip" ? "multiview-switch__button--active" : "")}
              >
                <ImageIcon icon={PipVideoIcon}/>
              </button>
              <button
                onClick={() => setMultiviewMode("multiview")}
                title="Multiview Mode"
                className={S("multiview-switch__button", multiviewMode === "multiview" ? "multiview-switch__button--active" : "")}
              >
                <ImageIcon icon={MultiviewIcon}/>
              </button>
            </div>
        }
        <button title="Hide Sidbar" onClick={() => mediaStore.SetShowSidebar(false)} className={S("hide-button")}>
          <ImageIcon icon={HideIcon}/>
        </button>
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
          mediaStore.sidebarContent.tabs.length <= 1 ? null :
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
        {
          rootStore.pageWidth <= 850 || !contentRef || !document.fullscreenEnabled || mediaStore.displayedContent.length <= 1 ? null :
            <div className={S("content__actions")}>
              <button
                onClick={() => contentRef.requestFullscreen()}
                title="View Content in Full Screen"
                className={S("content__fullscreen-button")}
              >
                <ImageIcon icon={FullscreenIcon}/>
              </button>
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
                      scheduleInfo={item.scheduleInfo}
                      key={`item-${item.id}`}
                      contentItem={{type: "media-item", id: item.mediaItem.id}}
                      primaryMediaId={mediaItem.id}
                      multiviewMode={multiviewMode}
                      noActions={!item.authorized || !item.scheduleInfo.currentlyLive}
                      streamLimit={streamLimit}
                    />
                    {
                      (item?.additional_views || [])?.length === 0 || !item.authorized || !item.scheduleInfo.currentlyLive ? null :
                        <div className={S("content__views-container")}>
                          {
                            (item.additional_views || []).map((view, index) =>
                              <Item
                                imageUrl={SetImageUrlDimensions({url: view.image?.url, width: 400})}
                                title={view.label}
                                key={`item-${item.id}-${index}`}
                                contentItem={{
                                  ...view,
                                  type: "additional-view",
                                  id: `${item.id}-${index}`,
                                  mediaItemId: item.id,
                                  index,
                                  label: `${item.display.title} - ${view.label}`
                                }}
                                primaryMediaId={mediaItem.id}
                                multiviewMode={multiviewMode}
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
  let tabs = mediaStore.sidebarContent.tabs.filter(tab =>
    tab.groups.find(group =>
      group.content.find(item =>
        item.scheduleInfo.currentlyLive
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
          tab.groups.map(group =>
            !group.content.find(item => item.authorized && item.scheduleInfo.currentlyLive) ? null :
              <div key={`group-${group.id}`} className={S("content__section")}>
                {
                  !group.title ? null :
                    <div className={[S("content__title"), "_title"].join(" ")}>
                      {group.title}
                    </div>
                }
                {group.content
                  .filter(item => item.authorized)
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
                          (item?.additional_views || [])?.length === 0 || item.mediaItem.id !== mediaItem.id || !item.scheduleInfo.currentlyLive ? null :
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
          Select
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

let filterTimeout;
export const MediaTagSidebar = observer(({mediaItem}) => {
  const [tab, setTab] = useState("TRANSCRIPT");
  const [activeTags, setActiveTags] = useState([]);
  const [filterInput, setFilterInput] = useState("");
  const [filter, setFilter] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  const versionHash = LinkTargetHash(mediaItem.media_link);
  const objectId = mediaPropertyStore.client.utils.DecodeVersionHash(versionHash)?.objectId;
  const player = window.players[objectId];

  useEffect(() => {
    // Tags should already be loaded so this should be instant
    mediaStore.LoadMediaTags({versionHash});
  }, []);

  useEffect(() => {
    setFilterInput("");
    setFilter("");
  }, [tab]);

  useEffect(() => {
    if(!player) { return; }

    setCurrentTime(player.controls.GetCurrentTime());

    const Disposer = player.controls.RegisterVideoEventListener(
      "timeupdate",
      () => setCurrentTime(player.controls.GetCurrentTime())
    );

    return () => Disposer?.();
  }, [player?.id]);

  useEffect(() => {
    clearTimeout(filterTimeout);

    filterTimeout = setTimeout(() => setFilter(filterInput), 500);
  }, [filterInput]);

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
    mediaStore.mediaTags.hasChapters ? "CHAPTERS" : "",
    mediaStore.mediaTags.hasTranscription ? "TRANSCRIPT" : "",
    mediaStore.mediaTags.hasPlayByPlay ? "PLAY-BY-PLAY" : ""
  ]
    .filter(tab => tab);

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
        <TextInput
          value={filterInput}
          onChange={event => setFilterInput(event.target.value)}
          placeholder={`SEARCH ${tab}`}
          leftSectionWidth={50}
          leftSection={
            <ImageIcon icon={SearchIcon} className={S("search__icon")}/>
          }
          classNames={{
            root: S("search"),
            input: [S("search__input"), "_title"].join(" ")
          }}
        />
      </div>
      <div key={`tags-${tab}-${filter}`} className={S("tags")}>
        {
          activeTags.map(tag =>
            <button
              key={tag.id}
              onClick={() => player?.controls.Seek({time: tag.start_time})}
              className={
                S(
                  "tag",
                  currentTime >= tag.start_time && currentTime <= tag.end_time ? "tag--active" : ""
                )
              }
            >
              <div className={S("tag__time")}>
                { FormatTime(tag.start_time) }
              </div>
              <div className={S("tag__content")}>
                { tag.tag }
              </div>
            </button>
          )
        }
      </div>
    </div>
  );
});

/* End */

export default MediaSidebar;
