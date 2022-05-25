import React, {useState, useEffect} from "react";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import {observer} from "mobx-react";
import {rootStore, checkoutStore, cryptoStore} from "Stores/index";
import {Loader, PageLoader} from "Components/common/Loaders";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import NFTCard from "Components/common/NFTCard";
import {LinkTargetHash, MobileOption} from "../../utils/Utils";

let statusInterval;
const MintingStatus = observer(({
  header,
  subheader,
  Status,
  OnFinish,
  redirect,
  videoHash,
  basePath,
  backText,
  transactionLink,
  transactionLinkText,
  intervalPeriod=10
}) => {
  const [status, setStatus] = useState(false);
  const [finished, setFinished] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);

  const CheckStatus = async () => {
    try {
      const status = await Status();

      setStatus(status);

      if(status.status === "complete") {
        // If mint has items, ensure that items are available in the user's wallet
        let items = (status.extra || []).filter(item => item.token_addr && (item.token_id || item.token_id_str));
        if(status.op === "nft-transfer") {
          items = [{ token_addr: status.address, token_id_str: status.tokenId }];
        }

        if(items.length > 0) {
          await rootStore.LoadNFTInfo();

          const firstItem = rootStore.NFTInfo({
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

    statusInterval = setInterval(CheckStatus, intervalPeriod * 1000);

    return () => clearInterval(statusInterval);
  }, []);

  if(finished && redirect) {
    return <Redirect to={redirect}/>;
  }

  if(status && status.status === "failed") {
    return (
      <div className="minting-status" key="minting-status-failed">
        <div className="minting-status__text">
          <div className="page-headers">
            <h1 className="page-header">
              { status.errorMessage || "Minting Failed" }
            </h1>
          </div>
          <div className="minting-status-results__actions">
            <Link to={basePath} className="action action-primary minting-status-results__back-button">
              { backText }
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`minting-status ${videoHash ? "minting-status-video" : ""}`}>
      <div className="page-headers">
        <div className="page-header">
          { header || "Your items are being minted" }
        </div>
        <div className="page-subheader">
          { subheader || "This may take several minutes" }
        </div>
      </div>

      {
        videoHash ?
          <div className="minting-status__video-container">
            <Loader />
            <div
              className="minting-status__video"
              ref={element => {
                if(!element || videoInitialized) { return; }

                setVideoInitialized(true);
                new EluvioPlayer(
                  element,
                  {
                    clientOptions: {
                      network: EluvioConfiguration["config-url"].includes("main.net955305") ?
                        EluvioPlayerParameters.networks.MAIN : EluvioPlayerParameters.networks.DEMO,
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
                      loop: EluvioPlayerParameters.loop.ON
                    }
                  }
                );
              }}
            />
          </div> :
          <Loader className="minting-status__loader" />
      }

      {
        rootStore.hideNavigation ? null :
          <div className="minting-status__text">
            <h2 className="minting-status__navigation-message">
              You can navigate away from this page if you don't want to wait. Your items will be available in your wallet when the process is complete.
            </h2>
          </div>
      }
      { transactionLink ? <a href={transactionLink} target="_blank" rel="noopener" className="minting-status__transaction-link">{ transactionLinkText }</a> : null }
    </div>
  );
});

export const DropMintingStatus = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [drop, setDrop] = useState(undefined);

  useEffect(() => {
    rootStore.LoadDrop({tenantSlug: match.params.tenantSlug, eventSlug: match.params.eventSlug, dropId: match.params.dropId})
      .then(drop => setDrop(drop));
  }, []);

  const videoHash = LinkTargetHash(drop.minting_animation);

  const Status = async () => await rootStore.DropStatus({
    marketplace,
    eventId: drop.eventId,
    dropId: drop.uuid
  });

  return (
    <MintingStatus
      Status={Status}
      redirect={UrlJoin("/marketplace", match.params.marketplaceId)}
      OnFinish={async () => rootStore.LoadMarketplace(match.params.marketplaceId, true)}
      videoHash={videoHash}
    />
  );
});

const MintResults = observer(({header, subheader, basePath, nftBasePath, items, revealVideoHash, backText}) => {
  const [loading, setLoading] = useState(true);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(!revealVideoHash);

  useEffect(() => {
    rootStore.LoadNFTInfo(true)
      .then(async () => {
        await Promise.all(
          items.map(async ({token_addr, token_id_str}) =>
            await rootStore.LoadNFTData({contractAddress: token_addr, tokenId: token_id_str})
          )
        );

        setLoading(false);
      });
  }, []);

  if(loading) {
    return (
      <div className="minting-status-results">
        <PageLoader />
      </div>
    );
  } else if(!animationComplete) {
    return (
      <div className="minting-status-results" key="minting-status-results-animation">
        <div className="minting-status-results__video-container">
          <Loader />
          <div
            className="minting-status-results__video"
            ref={element => {
              if(!element || videoInitialized) { return; }

              setVideoInitialized(true);

              new EluvioPlayer(
                element,
                {
                  clientOptions: {
                    network: EluvioConfiguration["config-url"].includes("main.net955305") ?
                      EluvioPlayerParameters.networks.MAIN : EluvioPlayerParameters.networks.DEMO,
                    client: rootStore.client
                  },
                  sourceOptions: {
                    playoutParameters: {
                      versionHash: revealVideoHash
                    }
                  },
                  playerOptions: {
                    watermark: EluvioPlayerParameters.watermark.OFF,
                    muted: EluvioPlayerParameters.muted.OFF_IF_POSSIBLE,
                    autoplay: EluvioPlayerParameters.autoplay.ON,
                    controls: EluvioPlayerParameters.controls.OFF,
                    loop: EluvioPlayerParameters.loop.OFF,
                    playerCallback: ({videoElement}) => {
                      videoElement.addEventListener("ended", () => setAnimationComplete(true));
                    }
                  }
                }
              );
            }}
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="minting-status-results" key="minting-status-results-card-list">
        <div className="page-headers">
          <div className="page-header">{ header }</div>
          <div className="page-subheader">{ subheader }</div>
        </div>
        <div className="card-list card-list--marketplace card-list--centered">
          {
            items.map(({token_addr, token_id, token_id_str}) => {
              token_id = token_id_str || token_id;
              const nft = rootStore.NFTData({contractAddress: token_addr, tokenId: token_id});

              if(!nft) { return null; }

              return (
                <NFTCard
                  key={`mint-result-${token_addr}-${token_id}`}
                  nft={nft}
                  showOrdinal
                  link={UrlJoin(nftBasePath || basePath, nft.details.ContractId, nft.details.TokenIdStr)}
                  truncateDescription
                />
              );
            })
          }
        </div>
        {
          rootStore.hideNavigation ? null :

            <div className="minting-status-results__actions">
              <Link to={basePath} className="action minting-status-results__back-button">
                {backText}
              </Link>
            </div>
        }
      </div>
    );
  }
});

export const ListingPurchaseStatus = observer(() => {
  const match = useRouteMatch();

  const solanaSignature = checkoutStore.solanaSignatures[match.params.confirmationId];

  const [status, setStatus] = useState(undefined);
  const [awaitingSolanaTransaction, setAwaitingSolanaTransaction] = useState(solanaSignature);

  const inMarketplace = !!match.params.marketplaceId;

  const Status = async () => {
    if(awaitingSolanaTransaction) {
      return await cryptoStore.PhantomPurchaseStatus(match.params.confirmationId);
    } else {
      return await rootStore.ListingPurchaseStatus({
        tenantId: match.params.tenantId,
        confirmationId: match.params.confirmationId
      });
    }
  };

  let basePath = UrlJoin("/wallet", "collection");
  if(inMarketplace) {
    basePath = UrlJoin("/marketplace", match.params.marketplaceId);
  }

  if(!status) {
    return (
      <MintingStatus
        key={`minting-status-${awaitingSolanaTransaction}`}
        header={
          awaitingSolanaTransaction ?
            "Submitting payment transaction to Solana" :
            "Your item is being transferred"
        }
        Status={Status}
        OnFinish={({status}) => {
          if(awaitingSolanaTransaction) {
            setAwaitingSolanaTransaction(false);
          } else {
            setStatus(status);
          }
        }}
        basePath={basePath}
        backText={
          inMarketplace ?
            "Back to the Marketplace" :
            "Back to My Collection"
        }
        intervalPeriod={awaitingSolanaTransaction ? 10000 : 10}
        transactionLink={solanaSignature ? cryptoStore.SolanaTransactionLink(solanaSignature) : undefined}
        transactionLinkText="View your transaction on Solana Explorer"
      />
    );
  }

  const items = [{token_addr: status.address, token_id_str: status.tokenId}];

  return (
    <MintResults
      header="Congratulations!"
      subheader={`Thank you for your purchase! You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={basePath}
      nftBasePath={
        inMarketplace ?
          UrlJoin("/marketplace", match.params.marketplaceId, "collection", "owned") :
          basePath
      }
      backText={
        inMarketplace ?
          "Back to the Marketplace" :
          "Back to My Items"
      }
    />
  );
});

export const PurchaseMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  if(!match.params.confirmationId.startsWith("M-")) {
    return <ListingPurchaseStatus />;
  }

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const animation = MobileOption(rootStore.pageWidth, marketplace.storefront?.purchase_animation, marketplace.storefront?.purchase_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, marketplace.storefront?.reveal_animation, marketplace.storefront?.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);


  const Status = async () => await rootStore.PurchaseStatus({
    marketplace,
    confirmationId: match.params.confirmationId
  });

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText="Back to the Marketplace"
        videoHash={videoHash}
      />
    );
  }

  const items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      key={`results-${revealVideoHash}`}
      revealVideoHash={revealVideoHash}
      header="Congratulations!"
      subheader={`Thank you for your purchase! You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "collection", "owned")}
      backText="Back to the Marketplace"
    />
  );
});

export const ClaimMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const animation = MobileOption(rootStore.pageWidth, marketplace.storefront?.purchase_animation, marketplace.storefront?.purchase_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, marketplace.storefront?.reveal_animation, marketplace.storefront?.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const Status = async () => await rootStore.ClaimStatus({
    marketplace,
    sku: match.params.sku
  });

  useEffect(() => {
    if(status) {
      rootStore.LoadNFTInfo(true);
    }
  }, [status]);

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        videoHash={videoHash}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
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
        items = Object.values(rootStore.nftInfo)
          .filter(details => Utils.EqualAddress(itemAddress, details.ContractAddr))
          .map(details => ({token_id: details.TokenIdStr, token_addr: details.ContractAddr}));
      }
    }
  } catch(error) {
    rootStore.Log("Failed to load backup mint result", true);
    rootStore.Log(error, true);
  }

  return (
    <MintResults
      key={`results-${revealVideoHash}`}
      revealVideoHash={revealVideoHash}
      header="Congratulations!"
      subheader={`You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "collection", "owned")}
      backText="Back to the Marketplace"
    />
  );
});

export const PackOpenStatus = observer(() => {
  const [status, setStatus] = useState(undefined);

  const match = useRouteMatch();

  const key = `pack-${match.params.contractId}-${match.params.tokenId}`;

  // Set NFT in state so it doesn't change
  const [nft] = useState(
    rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId}) ||
    rootStore.GetSessionStorageJSON(key)
  );

  useEffect(() => {
    const nftData = rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId});
    if(nftData) {
      // Save pack info in case of refresh after burn
      rootStore.SetSessionStorage(`pack-${match.params.contractId}-${match.params.tokenId}`, btoa(JSON.stringify(nftData)));
    }
  }, []);

  const packOptions = nft?.metadata?.pack_options || {};
  const animation = MobileOption(rootStore.pageWidth, packOptions.open_animation, packOptions.open_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, packOptions.reveal_animation, packOptions.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const basePath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "collection") :
    UrlJoin("/wallet", "collection");
  const nftBasePath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "collection", "owned") :
    UrlJoin("/wallet", "collection");

  if(!nft) {
    return <Redirect to={basePath} />;
  }

  const Status = async () => await rootStore.PackOpenStatus({
    tenantId: nft.details.TenantId,
    contractId: match.params.contractId,
    tokenId: match.params.tokenId
  });

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        header="Your pack is opening"
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        videoHash={videoHash}
        basePath={basePath}
        backText="Back to My Items"
      />
    );
  }

  const items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      key={`results-${revealVideoHash}`}
      revealVideoHash={revealVideoHash}
      header="Congratulations!"
      subheader={`You've received the following ${items.length === 1 ? "item" : "items"}:`}
      items={items}
      basePath={basePath}
      nftBasePath={nftBasePath}
      backText="Back to My Items"
    />
  );
});
