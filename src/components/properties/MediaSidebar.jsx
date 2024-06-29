import SidebarStyles from "Assets/stylesheets/media_properties/media-sidebar.module.scss";

import {observer} from "mobx-react";
import React, {useEffect, useState} from "react";
import {MediaItemImageUrl, MediaItemScheduleInfo, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import {mediaPropertyStore} from "Stores";
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

const SidebarItem = observer(({item, showActions, secondaryMediaSettings, setSecondaryMediaSettings}) => {
  const match = useRouteMatch();
  const mediaItem = item.mediaItem;

  let {imageUrl} = MediaItemImageUrl({
    mediaItem,
    display: mediaItem,
    aspectRatio: "Landscape",
    width: 400
  });

  const itemIsLive = item.scheduleInfo?.isLiveContent && item.scheduleInfo?.started;

  const navContext = new URLSearchParams(location.search).get("ctx");
  const { linkPath } = MediaPropertyLink({match, mediaItem: mediaItem, navContext}) || "";

  return (
    <Linkish to={linkPath} className={S("item")}>
      {
        !itemIsLive ? null :
          <div className={S("item__image-container")}>
            <div className={S("live-badge")}>Live</div>
            <LoaderImage loaderAspectRatio={16 / 9} className={S("item__image")} src={imageUrl}/>
          </div>
      }
      <div className={S("item__text")}>
        <div className={S("item__title")}>
          { mediaItem.title }
        </div>
        <div className={S("item__subtitle")}>
          {
            item.scheduleInfo.isLiveContent ?
              `${ item.scheduleInfo.displayStartDateLong } @ ${ item.scheduleInfo.displayStartTime }` :
              mediaItem.subtitle
          }
        </div>
      </div>
      {
        !showActions || !itemIsLive ? null :
          <div className={S("item__actions")}>
            <button
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                if(secondaryMediaSettings?.mediaId === item.id) {
                  if(secondaryMediaSettings.display === "side-by-side") {
                    setSecondaryMediaSettings({mediaId: item.id, display: "picture-in-picture", pip: "secondary"});
                  } else {
                    setSecondaryMediaSettings(undefined);
                  }
                } else {
                  setSecondaryMediaSettings({mediaId: item.id, display: "side-by-side"});
                }
              }}
              className={S("item__action", secondaryMediaSettings?.mediaId !== item.id ? "item__action--faded" : "")}
            >
              <ImageIcon
                icon={
                  secondaryMediaSettings?.mediaId !== item.id ? NoVideoIcon :
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
  showActions,
  secondaryMediaSettings,
  setSecondaryMediaSettings
}) => {
  const match = useRouteMatch();
  const [hidden, setHidden] = useState(false);
  const [content, setContent] = useState(undefined);

  const scheduleInfo = MediaItemScheduleInfo(mediaItem);
  const isLive = scheduleInfo?.isLiveContent && scheduleInfo?.started;

  useEffect(() => {
    mediaPropertyStore.SearchMedia({
      ...match.params,
      searchOptions: { schedule: "live_and_upcoming" }
    })
      .then(results => setContent(
        results
          .filter(result =>
            result.id !== mediaItem.id
          )
          .map(result => ({
            ...result,
            scheduleInfo: MediaItemScheduleInfo(result.mediaItem)
          }))
          .sort((a, b) => a.mediaItem.start_time < b.mediaItem.start_time ? -1 : 1)
        )
      );
  }, []);

  if(!content || content.length === 0) { return; }

  let liveContent = content.filter(item => item.scheduleInfo.isLiveContent && item.scheduleInfo.started);
  const upcomingContent = content.filter(item => item.scheduleInfo.isLiveContent && !item.scheduleInfo.started);
  //liveContent = [...liveContent, ...liveContent];

  if(hidden) {
    return (
      <div className={S("hidden-sidebar")}>
        <button onClick={() => setHidden(false)} className={S("show-button")}>
          <ImageIcon icon={ChevronLeft} />
        </button>
      </div>
    );
  }

  return (
    <div className={S("sidebar", secondaryMediaSettings?.display === "side-by-side" ? "sidebar--overlay" : "")}>
      <button onClick={() => setHidden(true)} className={S("hide-button")}>
        <ImageIcon icon={XIcon} />
      </button>
      <div className={S("header")}>
        {
          !isLive ? null :
            <div className={S("live-badge")}>
              Live
            </div>
        }
        <div className={S("header__title")}>
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
              <div className={S("content__title")}>
                Today
              </div>
              {liveContent.map(item =>
                <SidebarItem
                  item={item}
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
              <div className={S("content__title")}>
                Upcoming
              </div>
              {upcomingContent.map(item =>
                <SidebarItem
                  item={item}
                  showActions={showActions}
                  secondaryMediaSettings={secondaryMediaSettings}
                  setSecondaryMediaSettings={setSecondaryMediaSettings}
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
