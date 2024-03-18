import MediaStyles from "Assets/stylesheets/media_properties/property-media.module.scss";

import React, {useEffect, useState, useRef} from "react";
import {observer} from "mobx-react";
import {NavLink, Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import {LinkTargetHash, SetImageUrlDimensions} from "../../utils/Utils";
import {InitializeEluvioPlayer, EluvioPlayerParameters} from "@eluvio/elv-player-js";
import ImageIcon from "Components/common/ImageIcon";
import Countdown from "./Countdown";
import {MediaItemImageUrl, MediaItemScheduleInfo} from "../../utils/MediaPropertyUtils";

import ClockIcon from "Assets/icons/clock";
import ArrowLeft from "Assets/icons/arrow-left";
import MediaErrorIcon from "Assets/icons/media-error-icon";

import SwiperCore, {Lazy} from "swiper";
SwiperCore.use([Lazy]);


const S = (...classes) => classes.map(c => MediaStyles[c] || "").join(" ");

const MediaVideo = observer(({mediaItem, setControlsVisible}) => {
  const [scheduleInfo, setScheduleInfo] = useState(MediaItemScheduleInfo(mediaItem));
  const [contentHash, setContentHash] = useState(undefined);
  const [error, setError] = useState();
  const [videoDimensions, setVideoDimensions] = useState(undefined);
  const targetRef = useRef();

  const {imageUrl} = MediaItemImageUrl({mediaItem, display: mediaItem, aspectRatio: "square", width: 400});

  useEffect(() => {
    const linkHash = LinkTargetHash(mediaItem.media_link);
    mediaPropertyStore.client.LatestVersionHash({versionHash: linkHash})
      .then(setContentHash);
  }, [mediaItem?.id]);

  useEffect(() => {
    if(
      (scheduleInfo.isLiveContent && !scheduleInfo.started) ||
      !targetRef || !targetRef.current ||
      !contentHash
    ) { return; }

    // eslint-disable-next-line no-async-promise-executor
    const playerPromise = InitializeEluvioPlayer(
      targetRef.current,
      {
        clientOptions: {
          client: mediaPropertyStore.client
        },
        sourceOptions: {
          contentInfo: {
            /*
            title: display.title,
            description: display.subtitle,
            image: imageUrl,
            headers: display.headers,
             */
            posterImage: SetImageUrlDimensions({
              url: mediaItem.poster_image?.url,
              width: mediaPropertyStore.rootStore.fullpageImageWidth
            })
          },
          playoutParameters: {
            versionHash: contentHash
          },
        },
        playerOptions: {
          muted: true,
          ui: EluvioPlayerParameters.ui.WEB,
          appName: mediaPropertyStore.rootStore.appId,
          backgroundColor: "black",
          autoplay: EluvioPlayerParameters.autoplay.ON,
          watermark: EluvioPlayerParameters.watermark.OFF,
          playerProfile: EluvioPlayerParameters.playerProfile[scheduleInfo.isLiveContent ? "LOW_LATENCY" : "DEFAULT"],
          errorCallback: () => setError("Something went wrong")
        }
      }
    )
      .then(player => {
        window.player = player;
        player.controls.RegisterVideoEventListener("canplay", event => {
          setVideoDimensions({width: event.target.videoWidth, height: event.target.videoHeight});
        });

        player.controls.RegisterSettingsListener(() => setControlsVisible(player.controls.IsVisible()));
      });

    return async () => {
      if(!playerPromise) { return; }

      try {
        (await playerPromise)?.Destroy();
      } catch(error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    };
  }, [targetRef, contentHash, scheduleInfo, mediaItem?.id]);

  if(scheduleInfo.isLiveContent && !scheduleInfo.started) {
    return (
      <div className={S("media__error")}>
        <ImageIcon icon={ClockIcon} className={S("media__error-icon")} />
        <ImageIcon icon={imageUrl} className={S("media__error-image")} />
        <div className={S("media__error-cover")} />
        <div className={S("media__error-message")}>
          { rootStore.l10n.media_properties.media.errors.not_started }
        </div>
        <Countdown
          time={scheduleInfo.startTime}
          showSeconds
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
    <div
      className={S("media", "video")}
      style={{aspectRatio: `${videoDimensions?.width || 16} / ${videoDimensions?.height || 9}`}}
    >
      <div ref={targetRef} />
    </div>
  );
});

const MediaPropertyMediaPage = observer(() => {
  const match = useRouteMatch();
  const [controlsVisible, setControlsVisible] = useState(true);

  const mediaItem = mediaPropertyStore.MediaPropertyMediaItem(match.params);

  const context = new URLSearchParams(location.search).get("ctx");
  let backPath = UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.mediaPageSlugOrId || "");
  if(!match.params.mediaCollectionSlugOrId && !match.params.mediaListSlugOrId) {
    if(match.params.sectionSlugOrId) {
      if(context === "s") {
        // Go back to section page
        backPath = UrlJoin(backPath, "s", match.params.sectionSlugOrId);
      } else {
        // Don't go back to section page, but add context to scroll to the proper section
        backPath += match.params.sectionSlugOrId ? `?ctx=${match.params.sectionSlugOrId}` : "";
      }
    }
  } else {
    if(match.params.sectionSlugOrId) {
      backPath = UrlJoin(backPath, "s", match.params.sectionSlugOrId);
    }

    if(match.params.mediaCollectionSlugOrId) {
      backPath = UrlJoin(backPath, "c", match.params.mediaCollectionSlugOrId, `?l=${match.params.mediaListSlugOrId}`);
    } else if(match.params.mediaListSlugOrId) {
      backPath = UrlJoin(backPath, "l", match.params.mediaListSlugOrId);
    }
  }

  if(context) {
    backPath += backPath.includes("?") ? `&ctx=${context}` : `?ctx=${context}`;
  }

  if(!mediaItem) {
    return <Redirect to={backPath} />;
  }

  const display = mediaItem.override_settings_when_viewed ? mediaItem.viewed_settings : mediaItem;

  return (
    <div className={S("media-page")}>
      <NavLink to={backPath} className={S("media-page__back-link", controlsVisible ? "media-page__back-link--visible" : "")}>
        <ImageIcon icon={ArrowLeft} />
        <div>Back</div>
      </NavLink>
      <div className={S("media-container")}>
        <MediaVideo mediaItem={mediaItem} setControlsVisible={setControlsVisible} />
      </div>
      <div className={S("media-info")}>
        <div className={S("media-text")}>
          {
            !display.title ? null :
              <h1 className={S("media-text__title")}>{ display.title }</h1>
          }
          {
            !display.subtitle ? null :
              <h2 className={S("media-text__subtitle")}>{ display.subtitle }</h2>
          }
          <div className={S("media-text__description-block")}>
            {
              (display.headers || []).length === 0 ? null :
                <div className={S("media-text__headers")}>
                  { display.headers.map((header, index) => <div key={`header-${index}`} className={S("media-text__header")}>{ header }</div>) }
                </div>
            }
            {
              !display.description ? null :
                <div className={S("media-text__description")}>{ display.description }</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
});

export default MediaPropertyMediaPage;
