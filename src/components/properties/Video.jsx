import CommonStyles from "Assets/stylesheets/media_properties/common.module.scss";

import {observer} from "mobx-react";
import React, {useEffect, useRef, useState} from "react";
import {LinkTargetHash} from "../../utils/Utils";
import {mediaPropertyStore} from "Stores";
import {EluvioPlayerParameters, InitializeEluvioPlayer} from "@eluvio/elv-player-js";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

const Video = observer(({
  objectId,
  versionHash,
  link,
  contentInfo={},
  playerOptions={},
  playoutParameters={},
  posterImage,
  callback,
  errorCallback,
  className=""
}) => {
  const [contentHash, setContentHash] = useState(undefined);
  const [videoDimensions, setVideoDimensions] = useState(undefined);
  const [player, setPlayer] = useState(undefined);
  const targetRef = useRef();

  useEffect(() => {
    if(link) {
      versionHash = LinkTargetHash(link);
    }

    mediaPropertyStore.client.LatestVersionHash({versionHash, objectId})
      .then(setContentHash);
  }, [objectId, versionHash, link]);

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

    // eslint-disable-next-line no-async-promise-executor
    InitializeEluvioPlayer(
      targetRef.current,
      {
        clientOptions: {
          client: mediaPropertyStore.client
        },
        sourceOptions: {
          contentInfo: {
            ...contentInfo,
            posterImage
          },
          playoutParameters: {
            ...playoutParameters,
            versionHash: contentHash,
          },
        },
        playerOptions: {
          //muted: true,
          ui: EluvioPlayerParameters.ui.WEB,
          appName: mediaPropertyStore.rootStore.appId,
          backgroundColor: "black",
          autoplay: EluvioPlayerParameters.autoplay.ON,
          watermark: EluvioPlayerParameters.watermark.OFF,
          errorCallback,
          ...playerOptions
        }
      }
    ).then(player => {
      window.player = player;
      setPlayer(player);

      player.controls.RegisterVideoEventListener("canplay", event => {
        setVideoDimensions({width: event.target.videoWidth, height: event.target.videoHeight});
      });

      if(callback) {
        callback(player);
      }
    });
  }, [targetRef, contentHash]);

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
      className={[S("video"), className].join(" ")}
      style={{aspectRatio: `${videoDimensions?.width || 16} / ${videoDimensions?.height || 9}`}}
    >
      <div ref={targetRef} />
    </div>
  );
});

export default Video;
