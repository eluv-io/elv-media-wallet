import React, {useEffect, useRef} from "react";
import {rootStore} from "Stores";
import {InitializeEluvioPlayer, EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {LinkTargetHash} from "../../utils/Utils";
import {observer} from "mobx-react";

// Fabric video - Default options is muted looping animation
const Video = observer(({posterUrl, videoLink, videoHash, playerOptions={}, className=""}) => {
  const targetRef = useRef();

  useEffect(() => {
    if(!targetRef || !targetRef.current) { return; }

    const playerPromise = InitializeEluvioPlayer(
      targetRef.current,
      {
        clientOptions: {
          network: rootStore.walletClient.network === "main" ?
            EluvioPlayerParameters.networks.MAIN : EluvioPlayerParameters.networks.DEMO,
          client: rootStore.client
        },
        sourceOptions: {
          playoutParameters: {
            versionHash: videoHash || LinkTargetHash(videoLink)
          }
        },
        playerOptions: {
          posterUrl,
          watermark: EluvioPlayerParameters.watermark.OFF,
          muted: EluvioPlayerParameters.muted.ON,
          autoplay: EluvioPlayerParameters.autoplay.ON,
          controls: EluvioPlayerParameters.controls.OFF,
          loop: EluvioPlayerParameters.loop.ON,
          ...playerOptions
        }
      }
    );

    return async () => {
      if(!playerPromise) { return; }

      const player = await playerPromise;
      player.Destroy();
    };
  }, [targetRef]);

  return <div className={className} ref={targetRef} />;
});

export default Video;
