import CommonStyles from "Assets/stylesheets/media_properties/common.module.scss";

import React, {forwardRef, useEffect, useRef, useState} from "react";
import {LinkTargetHash} from "../../utils/Utils";
import {mediaPropertyStore} from "Stores";
import {EluvioPlayerParameters, InitializeEluvioPlayer} from "@eluvio/elv-player-js/lib/index";

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
  onClick,
  className=""
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
          //maxBitrate: 50000,
          ui: EluvioPlayerParameters.ui.WEB,
          appName: mediaPropertyStore.rootStore.appId,
          backgroundColor: "black",
          autoplay: EluvioPlayerParameters.autoplay.ON,
          watermark: EluvioPlayerParameters.watermark.OFF,
          verifyContent: EluvioPlayerParameters.verifyContent.ON,
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
      window.player = player;
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
    return () => {
      if(!player) { return; }

      try {
        player.Destroy();
        window.player = undefined;
      } catch(error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    };
  }, [player]);

  return (
    <div
      ref={ref}
      className={[S("video"), className].join(" ")}
      onClick={onClick}
      style={
        !autoAspectRatio ? {} :
          {aspectRatio: `${videoDimensions?.width || 16} / ${videoDimensions?.height || 9}`}
      }
    >
      <div ref={targetRef} />
    </div>
  );
});

export default Video;
