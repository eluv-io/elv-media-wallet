import React, {useState, useEffect} from "react";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {Loader} from "Components/common/Loaders";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Path from "path";

let statusInterval;
const MintingStatus = observer(({header, subheader, Status, redirect, videoHash}) => {
  const [finished, setFinished] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);

  const CheckStatus = async () => {
    const status = await Status();

    if(status === "complete") {
      setFinished(true);
      clearInterval(statusInterval);
    }
  };

  useEffect(() => {
    CheckStatus();

    statusInterval = setInterval(CheckStatus, 10000);
  }, []);

  if(finished) {
    return <Redirect to={redirect} />;
  }

  return (
    <div className={`minting-status ${videoHash ? "minting-status-video" : ""}`}>
      {
        !videoHash ? null :
          <div className="minting-status__video-container">
            <Loader />
            <div
              className="minting-status__video"
              ref={element => {
                if(!element || videoInitialized) { return; }

                new EluvioPlayer(
                  element,
                  {
                    clientOptions: {
                      network: EluvioConfiguration["config-url"].includes("main.net955305") ?
                        EluvioPlayerParameters.networks.MAIN : EluvioPlayerParameters.networks.DEMO,
                      // TODO: Once channel tokens are allowed for remote users, re-enable
                      client: rootStore.client
                    },
                    sourceOptions: {
                      playoutParameters: {
                        versionHash: videoHash
                      }
                    },
                    playerOptions: {
                      watermark: EluvioPlayerParameters.watermark.OFF,
                      muted: EluvioPlayerParameters.muted.ON,
                      autoplay: EluvioPlayerParameters.autoplay.WHEN_VISIBLE,
                      controls: EluvioPlayerParameters.controls.OFF,
                      loop: EluvioPlayerParameters.loop.ON,
                      playerCallback: () => {
                        setVideoInitialized(true);
                      }
                    }
                  }
                );
              }}
            />
          </div>
      }

      <div className="minting-status__text">
        <h1 className="page-header">
          { header || "Your item(s) are being minted" }
        </h1>
        <h2 className="page-subheader">
          { subheader || "This may take several minutes" }
        </h2>
      </div>

      { videoHash ? null : <Loader/> }
    </div>
  );
});

export const DropMintingStatus = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const drop = marketplace.drops.find(drop => drop.uuid === match.params.dropId);

  const Status = async () => (await rootStore.DropStatus({
    eventId: drop.eventId,
    dropId: drop.uuid
  })).status;

  return <MintingStatus Status={Status} redirect={UrlJoin("/marketplaces", match.params.marketplaceId, "store")} />;
});

export const PurchaseMintingStatus = observer(() => {
  const match = useRouteMatch();

  const Status = async () => (await rootStore.PurchaseStatus({
    confirmationId: match.params.confirmationId
  })).status;

  return <MintingStatus Status={Status} redirect={UrlJoin("/marketplaces", match.params.marketplaceId, "store")} />;
});

export const PackOpenStatus = observer(() => {
  const match = useRouteMatch();

  // Set NFT in state so it doesn't change
  const [nft] = useState(rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId}));
  const videoHash = nft && nft.metadata && nft.metadata.pack_options && nft.metadata.pack_options.is_openable && nft.metadata.pack_options.open_animation
    && ((nft.metadata.pack_options.open_animation["/"] && nft.metadata.pack_options.open_animation["/"].split("/").find(component => component.startsWith("hq__")) || nft.metadata.pack_options.open_anmiation["."].source));

  const Status = async () => (await rootStore.PackOpenStatus({
    contractId: match.params.contractId,
    tokenId: match.params.tokenId
  })).status;

  return (
    <MintingStatus
      header="Your pack is opening"
      Status={Status}
      redirect={Path.dirname(Path.dirname(Path.dirname(match.url)))}
      videoHash={videoHash}
    />
  );
});
