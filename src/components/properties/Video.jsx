import CommonStyles from "Assets/stylesheets/media_properties/common.module.scss";

import React, {forwardRef, useEffect, useRef, useState} from "react";
import {LinkTargetHash} from "../../utils/Utils";
import {rootStore, mediaPropertyStore} from "Stores";
import {EluvioPlayerParameters, InitializeEluvioPlayer} from "@eluvio/elv-player-js/lib/index";
import ImageIcon from "Components/common/ImageIcon";

import XIcon from "Assets/icons/x.svg";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

const Video = forwardRef(function VideoComponent({
  objectId,
  versionHash,
  link,
  contentInfo={},
  playerOptions={},
  playoutParameters={},
  posterImage,
  isLive,
  callback,
  readyCallback,
  errorCallback,
  settingsUpdateCallback,
  hideControls,
  showTitle,
  mute,
  autoAspectRatio=true,
  mediaPropertySlugOrId,
  mediaItemId,
  saveProgress=false,
  onClick,
  onClose,
  className="",
  containerProps
}, ref) {
  const [contentHash, setContentHash] = useState(undefined);
  const [videoDimensions, setVideoDimensions] = useState(undefined);
  const [player, setPlayer] = useState(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const targetRef = useRef();

  useEffect(() => {
    if(link) {
      versionHash = LinkTargetHash(link);
    }

    mediaPropertyStore.client.LatestVersionHash({versionHash, objectId})
      .then(setContentHash);
  }, [objectId, versionHash, link, reloadKey]);

  useEffect(() => {
    if(!targetRef || !targetRef.current || !contentHash) { return; }

    if(player) {
      try {
        player.Destroy();
        setPlayer(undefined);
      } catch(error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    }

    let startProgress = saveProgress && mediaPropertyStore.GetMediaProgress({mediaPropertySlugOrId, mediaItemId});

    if(startProgress > 0.95) {
      startProgress = 0;
    }

    InitializeEluvioPlayer(
      targetRef.current,
      {
        clientOptions: {
          client: mediaPropertyStore.client
        },
        sourceOptions: {
          contentInfo: {
            ...contentInfo,
            type: EluvioPlayerParameters.type[isLive ? "LIVE" : "VOD"],
            posterImage
          },
          playoutParameters: {
            ...playoutParameters,
            versionHash: contentHash,
          },
        },
        playerOptions: {
          muted: EluvioPlayerParameters.muted[mute ? "ON" : "OFF"],
          controls: EluvioPlayerParameters.controls[hideControls === "off_with_volume_toggle" ? "OFF_WITH_VOLUME_TOGGLE" : (hideControls ? "OFF" : "AUTO_HIDE")],
          title: EluvioPlayerParameters.title[showTitle ? "ON" : "FULLSCREEN_ONLY"],
          maxBitrate: rootStore.isLocal ? 50000 : undefined,
          ui: EluvioPlayerParameters.ui.WEB,
          appName: mediaPropertyStore.rootStore.appId,
          backgroundColor: "black",
          autoplay: EluvioPlayerParameters.autoplay.ON,
          watermark: EluvioPlayerParameters.watermark.OFF,
          verifyContent: EluvioPlayerParameters.verifyContent.ON,
          capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize[rootStore.pageWidth <= 720 ? "ON" : "OFF"],
          startProgress,
          errorCallback,
          // For live content, latest hash instead of allowing player to reload
          restartCallback: async () => {
            if(!isLive) { return false; }

            setContentHash(undefined);
            await new Promise(resolve => setTimeout(resolve, 15000));

            setReloadKey(reloadKey + 1);

            return true;
          },
          ...playerOptions
        }
      }
    ).then(player => {
      window.players = {
        ...(window.players || {}),
        [contentHash]: player,
      };

      setPlayer(player);

      player.controls.RegisterVideoEventListener("canplay", event => {
        setVideoDimensions({width: event.target.videoWidth, height: event.target.videoHeight});
        readyCallback && readyCallback(player);
      });

      if(settingsUpdateCallback) {
        player.controls.RegisterSettingsListener(() => settingsUpdateCallback(player));
      }

      if(callback) {
        callback(player);
      }
    });
  }, [targetRef, contentHash]);

  useEffect(() => {
    if(player) {
      player.playerOptions.controls = EluvioPlayerParameters.controls[hideControls ? "OFF" : "AUTO_HIDE"];
      player.playerOptions.title = EluvioPlayerParameters.title[showTitle ? "ON" : "FULLSCREEN_ONLY"];

      if(mute) {
        player.__wasMuted = player.controls.IsMuted();
        player.controls.Mute();
      } else if(!player.__wasMuted) {
        player.controls.Unmute();
      }
    }
  }, [hideControls, showTitle, mute]);

  useEffect(() => {
    if(!saveProgress || isLive || !player || !mediaPropertySlugOrId || !mediaItemId) {
      return;
    }

    const SaveProgress = () => {
      const progress = player.controls.GetCurrentTime() / player.controls.GetDuration();

      if(progress && !isNaN(progress)) {
        mediaPropertyStore.SetMediaProgress({
          mediaPropertySlugOrId,
          mediaItemId,
          progress
        });
      }
    };

    const progressInterval = setInterval(SaveProgress, 60 * 1000);

    return () => {
      clearInterval(progressInterval);

      SaveProgress();
    };
  }, [player]);

  useEffect(() => {
    return () => {
      if(!player) { return; }

      try {
        player.Destroy();
        delete window.players?.[contentHash];
      } catch(error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    };
  }, [player]);

  return (
    <div
      {...(containerProps || {})}
      ref={ref}
      className={[S("video"), className].join(" ")}
      onClick={onClick}
      style={
        !autoAspectRatio ? containerProps?.style || {} :
          {
            ...(containerProps?.style || {}),
            aspectRatio: `${videoDimensions?.width || 16} / ${videoDimensions?.height || 9}`
          }
      }
    >
      <div ref={targetRef} />
      {
        !onClose ? null :
          <button onClick={() => onClose()} className={S("video__close")}>
            <ImageIcon icon={XIcon} />
          </button>
      }
    </div>
  );
});

export default Video;
