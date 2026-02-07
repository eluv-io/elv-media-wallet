import SidebarStyles from "Assets/stylesheets/media_properties/media-sidebar.module.scss";

import {observer} from "mobx-react";
import React, {useEffect, useState} from "react";
import {MediaItemImageUrl, MediaItemScheduleInfo, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import {rootStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {Button, LoaderImage, Modal} from "Components/properties/Common";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {SetImageUrlDimensions} from "../../utils/Utils";

import HideIcon from "Assets/icons/right-arrow";
import ShowIcon from "Assets/icons/left-arrow";
import FullscreenIcon from "Assets/icons/full screen";
import PipVideoIcon from "Assets/icons/pip";
import MultiviewIcon from "Assets/icons/media/multiview";
import EyeIcon from "Assets/icons/eye.svg";

const S = (...classes) => classes.map(c => SidebarStyles[c] || "").join(" ");

const Item = observer(({
  imageUrl,
  title,
  subtitle,
  scheduleInfo,
  disabled,
  onClick,
  displayedContent,
  setDisplayedContent,
  primaryMediaId,
  contentItem,
  noBorder,
  noActions,
  toggleOnClick,
  multiviewMode,
  streamLimit
}) => {
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
  sidebarContent,
  showSidebar,
  setShowSidebar,
  displayedContent,
  setDisplayedContent,
  multiviewMode,
  setMultiviewMode,
  contentRef,
  streamLimit
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const tab = sidebarContent?.tabs?.[tabIndex];

  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isLive = scheduleInfo?.isLiveContent && scheduleInfo?.started;

  if(sidebarContent?.tabs?.length === 0) {
    return;
  }

  if(!showSidebar && rootStore.pageWidth >= 850) {
    return (
      <div className={S("hidden-sidebar")}>
        <button onClick={() => setShowSidebar(true)} className={S("show-button")}>
          <ImageIcon icon={ShowIcon} />
        </button>
      </div>
    );
  }

  return (
    <div className={S("sidebar", "sidebar--overlay", sidebarContent.anyMultiview ? "sidebar--with-multiview" : "")}>
      <div className={S("sidebar__actions")}>
        {
          !sidebarContent.anyMultiview ? null :
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
        <button title="Hide Sidbar" onClick={() => setShowSidebar(false)} className={S("hide-button")}>
          <ImageIcon icon={HideIcon}/>
        </button>
      </div>
      <div className={S("header")}>
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
          sidebarContent.tabs.length <= 1 ? null :
            <div className={S("tabs")}>
              {
                sidebarContent.tabs.map((tab, index) =>
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
          rootStore.pageWidth <= 850 || !contentRef || !document.fullscreenEnabled || displayedContent.length <= 1 ? null :
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
                      subtitle={item.display.subtitle}
                      scheduleInfo={item.scheduleInfo}
                      key={`item-${item.id}`}
                      contentItem={{type: "media-item", id: item.mediaItem.id}}
                      primaryMediaId={mediaItem.id}
                      displayedContent={displayedContent}
                      setDisplayedContent={setDisplayedContent}
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
                                displayedContent={displayedContent}
                                setDisplayedContent={setDisplayedContent}
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
  sidebarContent,
  displayedContent,
  setDisplayedContent,
  opened,
  streamLimit,
  Close
}) => {
  let tabs = sidebarContent.tabs.filter(tab =>
    tab.groups.find(group =>
      group.content.find(item =>
        item.scheduleInfo.currentlyLive
      )
    )
  );

  const [selectedContent, setSelectedContent] = useState(displayedContent);
  const [tabIndex, setTabIndex] = useState(0);
  const tab = tabs[tabIndex];

  useEffect(() => {
    if(opened) {
      setSelectedContent(displayedContent);
    }
  }, [opened]);

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
      opened={opened}
      onClose={Close}
      withCloseButton={false}
      header={
        <div className={S("multiview-selection-modal__header")}>
          <Linkish
            className={S("multiview-selection-modal__back")}
            onClick={() => Close()}
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
                          displayedContent={selectedContent}
                          setDisplayedContent={setSelectedContent}
                          multiviewMode="multiview"
                          streamLimit={streamLimit}
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
                                    displayedContent={selectedContent}
                                    setDisplayedContent={setSelectedContent}
                                    multiviewMode="multiview"
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
      <div className={S("multiview-selection-modal__actions")}>
        <Button onClick={Close} variant="subtle" className={S("multiview-selection-modal__action")}>
          Cancel
        </Button>
        <Button
          variant="primary"
          defaultStyles
          disabled={selectedContent.length === 0}
          onClick={() => {
            setDisplayedContent(selectedContent);
            Close();
          }}
          className={S("multiview-selection-modal__action")}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
});

export default MediaSidebar;
