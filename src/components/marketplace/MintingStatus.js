import React, {useState, useEffect} from "react";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {Loader} from "Components/common/Loaders";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import AsyncComponent from "Components/common/AsyncComponent";
import {NFTImage} from "Components/common/Images";
import Utils from "@eluvio/elv-client-js/src/Utils";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

let statusInterval;
const MintingStatus = observer(({header, subheader, Status, OnFinish, redirect, videoHash, basePath, backText}) => {
  const [status, setStatus] = useState(false);
  const [finished, setFinished] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);

  const CheckStatus = async () => {
    try {
      const status = await Status();
      setStatus(status);

      if(status.status === "complete") {
        // If mint has items, ensure that items are available in the user's wallet
        const items = (status.extra || []).filter(item => item.token_addr && (item.token_id || item.token_id_str));

        if(items.length > 0) {
          await rootStore.LoadWalletCollection(true);

          const firstItem = rootStore.NFT({
            contractAddress: items[0].token_addr,
            tokenId: items[0].token_id_str || items[0].token_id
          });

          if(!firstItem) { return; }
        }

        if(OnFinish) {
          try {
            await OnFinish({status});
          } catch(error) {
            rootStore.Log("OnFinish failed", true);
            rootStore.Log(error, true);
          }
        }

        setFinished(true);
        clearInterval(statusInterval);
      } else if(status.status === "failed") {
        clearInterval(statusInterval);
      }
    } catch(error) {
      rootStore.Log("Failed to check status:", true);
      rootStore.Log(error);
    }
  };

  useEffect(() => {
    CheckStatus();

    statusInterval = setInterval(CheckStatus, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  if(finished && redirect) {
    return <Redirect to={redirect}/>;
  }

  if(status && status.status === "failed") {
    return (
      <div className="minting-status" key="minting-status-failed">
        <div className="minting-status__text">
          <h1 className="content-header">
            Minting Failed
          </h1>
          <div className="minting-status-results__actions">
            <Link to={basePath} className="button minting-status-results__back-button">
              { backText }
            </Link>
          </div>
        </div>
      </div>
    );
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
        <h1 className="content-header">
          { header || "Your items are being minted" }
        </h1>
        <h2 className="content-subheader">
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

  const Status = async () => await rootStore.DropStatus({
    marketplace,
    eventId: drop.eventId,
    dropId: drop.uuid
  });

  return (
    <MintingStatus
      Status={Status}
      redirect={UrlJoin("/marketplaces", match.params.marketplaceId)}
      OnFinish={async () => rootStore.LoadMarketplace(match.params.marketplaceId, true)}
    />
  );
});

const MintResults = observer(({header, subheader, basePath, nftBasePath, items, backText}) => {
  return (
    <AsyncComponent
      loadingClassName="page-loader"
      Load={async () => await rootStore.LoadWalletCollection()}
    >
      <div className="minting-status-results pack-results">
        <h1 className="content-header">{ header }</h1>
        <h2 className="content-subheader">{ subheader }</h2>
        <div className="card-list">
          {
            items.map(({token_addr, token_id, token_id_str}) => {
              token_id = token_id_str || token_id;
              const nft = rootStore.NFT({contractAddress: token_addr, tokenId: token_id});

              if(!nft) { return null; }

              return (
                <div className="card-container card-shadow" key={`mint-result-${token_addr}-${token_id}`}>
                  <Link
                    to={UrlJoin(nftBasePath || basePath, nft.details.ContractId, nft.details.TokenIdStr)}
                    className="card nft-card"
                  >
                    <NFTImage nft={nft} width={400} />
                    <div className="card__text">
                      <div className="card__titles">
                        <h2 className="card__title">
                          { nft.metadata.display_name || "" }
                        </h2>
                        <ResponsiveEllipsis
                          component="h2"
                          className="card__subtitle"
                          text={nft.metadata.description || ""}
                          maxLine="3"
                        />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          }
        </div>
        {
          rootStore.hideNavigation ? null :

            <div className="minting-status-results__actions">
              <Link to={basePath} className="button minting-status-results__back-button">
                {backText}
              </Link>
            </div>
        }
      </div>
    </AsyncComponent>
  );
});

export const PurchaseMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const Status = async () => await rootStore.PurchaseStatus({
    marketplace,
    confirmationId: match.params.confirmationId
  });

  if(!status) {
    return (
      <MintingStatus
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplaces", match.params.marketplaceId)}
        backText="Back to the Marketplace"
      />
    );
  }

  const items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      header="Congratulations!"
      subheader={`Thank you for your purchase! You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={UrlJoin("/marketplaces", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplaces", match.params.marketplaceId, "collections", "owned")}
      backText="Back to the Marketplace"
    />
  );
});

export const ClaimMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const videoHash = marketplace.storefront.purchase_animation &&
    ((marketplace.storefront.purchase_animation["/"] && marketplace.storefront.purchase_animation["/"].split("/").find(component => component.startsWith("hq__")) || marketplace.storefront.purchase_animation["."].source));

  const Status = async () => await rootStore.ClaimStatus({
    marketplace,
    sku: match.params.sku
  });

  useEffect(() => {
    if(status) {
      rootStore.LoadWalletCollection(true);
    }
  }, [status]);

  if(!status) {
    return (
      <MintingStatus
        videoHash={videoHash}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplaces", match.params.marketplaceId)}
        backText="Back to the Marketplace"
      />
    );
  }

  let items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));
  try {
    if(!items || items.length === 0) {
      const marketplaceItem = (marketplace.items.find(item => item.sku === match.params.sku)) || {};
      const itemAddress = ((marketplaceItem.nft_template || {}).nft || {}).address;

      if(itemAddress) {
        items = rootStore.nfts
          .filter(nft => Utils.EqualAddress(itemAddress, nft.details.ContractAddr))
          .map(nft => ({token_id: nft.details.TokenIdStr, token_addr: nft.details.ContractAddr}));
      }
    }
  } catch(error) {
    rootStore.Log("Failed to load backup mint result", true);
    rootStore.Log(error, true);
  }

  return (
    <MintResults
      header="Congratulations!"
      subheader={`You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={UrlJoin("/marketplaces", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplaces", match.params.marketplaceId, "collections", "owned")}
      backText="Back to the Marketplace"
    />
  );
});

export const PackOpenStatus = observer(() => {
  const [status, setStatus] = useState(undefined);

  const match = useRouteMatch();

  // Set NFT in state so it doesn't change
  const [nft] = useState(rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId}));
  const videoHash = nft && nft.metadata && nft.metadata.pack_options && nft.metadata.pack_options.is_openable && nft.metadata.pack_options.open_animation
    && ((nft.metadata.pack_options.open_animation["/"] && nft.metadata.pack_options.open_animation["/"].split("/").find(component => component.startsWith("hq__")) || nft.metadata.pack_options.open_anmiation["."].source));
  const basePath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplaces", match.params.marketplaceId, "collections", "owned") :
    UrlJoin("/wallet", "collection");

  const Status = async () => await rootStore.PackOpenStatus({
    tenantId: nft.details.TenantId,
    contractId: match.params.contractId,
    tokenId: match.params.tokenId
  });

  if(!status) {
    return (
      <MintingStatus
        header="Your pack is opening"
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        videoHash={videoHash}
        basePath={basePath}
        backText="Back to My Collection"
      />
    );
  }

  const items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      header="Congratulations!"
      subheader={`You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={basePath}
      backText="Back to My Collection"
    />
  );
});
