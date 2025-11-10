import SidebarStyles from "Assets/stylesheets/media_properties/media-sidebar.module.scss";

import {observer} from "mobx-react";
import React, {useEffect, useState} from "react";
import {MediaItemImageUrl, MediaItemScheduleInfo, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import {rootStore, mediaPropertyStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {Button, LoaderImage, Modal} from "Components/properties/Common";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

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

const Item = observer(({
  imageUrl,
  title,
  subtitle,
  scheduleInfo,
  disabled,
  onClick,
  to,
  active,
  noBorder,
  order
}) => {
  const [hovering, setHovering] = useState(false);

  return (
    <Linkish
      disabled={disabled}
      role="button"
      tabIndex={0}
      onClick={onClick}
      to={to}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={
        S(
          "item",
          disabled ? "item--disabled" : "",
          noBorder ? "item--no-border" : "",
          (hovering && !disabled) ? "item--hover" : "",
          active ? "item--active" : ""
        )
      }
    >
      {
        !imageUrl ? null :
          <div
            className={S("item__image-container", "item__image-container--landscape")}>
            <LoaderImage
              loaderAspectRatio={16 / 9}
              alt={title}
              className={S("item__image")}
              src={imageUrl}
            />
          </div>
      }
      <div className={S("item__text")}>
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
      </div>
      {
        typeof order === "undefined" || order < 0 ? null :
          <div className={S("item__order-badge")}>
            { order + 1 }
          </div>
      }
    </Linkish>
  );
});

const MediaSidebar = observer(({
  mediaItem,
  display,
  sidebarContent,
  showSidebar,
  setShowSidebar,
  displayedContent,
  setSelectedView,
  setShowMultiviewSelectionModal
}) => {
  const match = useRouteMatch();
  const navContext = new URLSearchParams(location.search).get("ctx");
  const {content, section} = sidebarContent || {};

  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isLive = scheduleInfo?.isLiveContent && scheduleInfo?.started;

  if(!content || content.length === 0 || rootStore.pageWidth < 800) {
    return;
  }

  const liveContent = content.filter(item => item.scheduleInfo.isLiveContent && item.scheduleInfo.started && !item.scheduleInfo.ended);
  const upcomingContent = content.filter(item => item.scheduleInfo.isLiveContent && !item.scheduleInfo.started);
  const vodContent = content.filter(item => !item.scheduleInfo.isLiveContent);

  if(!showSidebar) {
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
          {display.headers?.map?.((header, index) =>
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
                  className={S("content__mode-tab")}
                >
                  { sidebarContent.additionalViewLabel || "Additional Views" }
                </button>
                <button
                  onClick={() => setShowMultiviewSelectionModal(true)}
                  className={S("content__mode-tab")}
                >
                  Multiview
                </button>
              </div>
              {sidebarContent.additionalViews.map((item, index) => {
                const isActive = displayedContent.find(otherItem => otherItem.type === "additional-view" && otherItem.id === index);
                return (
                  <Item
                    noBorder={index === 0}
                    imageUrl={item.image?.url}
                    title={item.label}
                    active={isActive}
                    onClick={
                      !isActive ?
                        () => setSelectedView({...item, type: "additional-view", index, id: index}) :
                        displayedContent.length === 1 && isActive ?
                          () => setSelectedView({type: "media-item", id: mediaItem.id}) :
                          undefined

                    }
                    key={`item-${index}`}
                  />
                );
              })}
            </div>
        }
        {
          liveContent.length === 0 ? null :
            <div className={S("content__section")}>
              {
                sidebarContent.additionalViews.length > 0 ?
                  <div className={[S("content__title"), "_title"].join(" ")}>
                    { rootStore.l10n.media_properties.media.sidebar.today }
                  </div> :
                  <div className={[S("content__title", "content__mode"), "_title"].join(" ")}>
                    <button
                      className={S("content__mode-tab")}
                    >
                      { rootStore.l10n.media_properties.media.sidebar.today }
                    </button>
                    <button
                      onClick={() => setShowMultiviewSelectionModal(true)}
                      className={S("content__mode-tab")}
                    >
                      { rootStore.l10n.media_properties.media.sidebar.multiview }
                    </button>
                  </div>
              }
              {liveContent.map((item, index) => {
                const isActive = !!displayedContent.find(otherItem => otherItem.id === (item.mediaItem?.id || item.id));
                const {linkPath} = MediaPropertyLink({match, mediaItem: item.display, navContext}) || "";
                let {imageUrl} = MediaItemImageUrl({
                  mediaItem: item,
                  display: item.display
                });

                return (
                  <Item
                    noBorder={index === 0}
                    to={linkPath}
                    active={isActive}
                    imageUrl={imageUrl}
                    title={item.display.title}
                    subtitle={item.display.subtitle}
                    scheduleInfo={item.scheduleInfo}
                    key={`item-${item.id}`}
                  />
                );
              })}
            </div>
        }
        {
          upcomingContent.length === 0 ? null :
            <div className={S("content__section")}>
              <div className={[S("content__title"), "_title"].join(" ")}>
                { rootStore.l10n.media_properties.media.sidebar.upcoming }
              </div>
              {upcomingContent.map((item, index) => {
                const {linkPath} = MediaPropertyLink({match, mediaItem: item.display, navContext}) || "";

                return (
                  <Item
                    noBorder={index === 0}
                    to={linkPath}
                    title={item.display.title}
                    subtitle={item.display.subtitle}
                    scheduleInfo={item.scheduleInfo}
                    key={`item-${item.id}`}
                  />
                );
              })}
            </div>
        }
        {
          vodContent.length === 0 ? null :
            <div className={S("content__section")}>
              <div className={[S("content__title"), "_title"].join(" ")}>
                { section?.display?.title || rootStore.l10n.media_properties.media.sidebar.more_content }
              </div>
              {vodContent.map((item, index) => {
                const {linkPath} = MediaPropertyLink({match, mediaItem: item.display, navContext}) || "";

                return (
                  <Item
                    noBorder={index === 0}
                    to={linkPath}
                    title={item.display.title}
                    subtitle={item.display.subtitle}
                    scheduleInfo={item.scheduleInfo}
                    key={`item-${item.id}`}
                  />
                );
              })}
            </div>
        }
      </div>
    </div>
  );
});

export const MultiviewSelectionModal = observer(({
  mediaItem,
  sidebarContent,
  displayedContent,
  setDisplayedContent,
  multiviewMode,
  setMultiviewMode,
  opened,
  streamLimit,
  Close
}) => {
  const [selectedContent, setSelectedContent] = useState(displayedContent);
  const [mode, setMode] = useState(multiviewMode || "pip");

  const noPip = window.innerWidth < 600 || window.innerHeight < 600;
  streamLimit = mode === "pip" ? 2 : streamLimit;

  useEffect(() => {
    if(opened) {
      setMode(multiviewMode);
      setSelectedContent(displayedContent);
    }

    if(noPip) {
      setMode("multiview");
    }
  }, [opened]);

  useEffect(() => {
    setSelectedContent(
      selectedContent.slice(0, streamLimit)
    );
  }, [streamLimit]);

  const liveContent = sidebarContent.content.filter(item => item.scheduleInfo.isLiveContent && item.scheduleInfo.started && !item.scheduleInfo.ended);

  const list = [
    mediaItem,
    ...sidebarContent.additionalViews.map((item, index) => ({...item, type: "additional-view", index, id: index})),
    ...liveContent.filter(otherItem => (otherItem.mediaItem?.id || otherItem.id) !== mediaItem.id)
  ]
    .filter(item => item)
    .map(item => ({
      ...item,
      active: !!selectedContent.find(otherItem => (item.mediaItem?.id || item.id) === otherItem.id),
      order: selectedContent.findIndex(otherItem => (item.mediaItem?.id || item.id) === otherItem.id)
    }));

  return (
    <Modal
      size="sm"
      centered
      opened={opened}
      onClose={Close}
      withCloseButton={false}
      header={
        <div className={S("multiview-selection-modal__header")}>
          <Linkish
            className={S("multiview-selection-modal__back")}
            onClick={() => Close()}
          >
            <ImageIcon icon={ChevronLeft} />
          </Linkish>
          <div>
            Select Streams
          </div>
        </div>
      }
      contentClassName={S("multiview-selection-modal")}
      childrenContainerClassName={S("multiview-selection-modal__content")}
    >
      {
        noPip ? null :
          <div className={S("multiview-selection-modal__mode")}>
            <div
              onClick={() => setMode("pip")}
              className={S("multiview-selection-modal__mode-option", mode === "pip" ? "multiview-selection-modal__mode-option--selected" : "")}
            >
              Picture-in-Picture
            </div>
            <div
              onClick={() => setMode("multiview")}
              className={S("multiview-selection-modal__mode-option", mode !== "pip" ? "multiview-selection-modal__mode-option--selected" : "")}
            >
              Multiview
            </div>
          </div>
      }
      <div className={S("multiview-selection-modal__limit")}>
        Select up to {streamLimit} streams
      </div>
      <div className={S("multiview-selection-modal__items")}>
        {
          list.map(item => {
            const imageUrl = item.type === "additional-view" ? item.image?.url :
              MediaItemImageUrl({mediaItem: item, display: item?.display})?.imageUrl;

            return (
              <Item
                disabled={!item.active && selectedContent.length >= streamLimit}
                key={item.mediaItem?.id || item.id}
                imageUrl={imageUrl}
                title={item.display?.title || item.label}
                subtitle={item.display?.subtitle}
                scheduleInfo={item.scheduleInfo}
                active={item.active}
                order={item.order}
                onClick={
                  () => item.active ?
                    setSelectedContent(selectedContent.filter(otherItem => otherItem.id !== (item.mediaItem?.id || item.id))) :
                    setSelectedContent([
                      ...selectedContent,
                      item.type === "additional-view" ? item :
                        { type: "media-item", id: item.mediaItem?.id || item.id }
                    ])
                }
              />
            );
          })
        }
      </div>
      <div className={S("multiview-selection-modal__actions")}>
        <Button onClick={Close} variant="subtle" className={S("multiview-selection-modal__action")}>
          Cancel
        </Button>
        <Button
          disabled={selectedContent.length === 0}
          onClick={() => {
            setMultiviewMode(mode);
            setDisplayedContent(selectedContent);
            Close();
          }}
          className={S("multiview-selection-modal__action")}
        >
          Select
        </Button>
      </div>
    </Modal>
  );
});

export default MediaSidebar;
