import React, {useState, useEffect} from "react";
import EluvioPlayer, {EluvioPlayerParameters} from "@eluvio/elv-player-js";
import {observer} from "mobx-react";
import {rootStore, checkoutStore, cryptoStore} from "Stores/index";
import {Loader, PageLoader} from "Components/common/Loaders";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import NFTCard from "Components/nft/NFTCard";
import {LinkTargetHash, MobileOption, ScrollTo, SearchParams} from "../../utils/Utils";
import {FormatPriceString, LocalizeString} from "Components/common/UIComponents";
import ItemCard from "Components/common/ItemCard";
import {NFTImage} from "Components/common/Images";

const searchParams = SearchParams();

let statusInterval;
const MintingStatus = observer(({
  text,
  header,
  subheader,
  Status,
  OnFinish,
  redirect,
  videoHash,
  revealVideoHash,
  hideText,
  basePath,
  backText,
  transactionLink,
  transactionLinkText,
  intervalPeriod=10,
  noItems=false
}) => {
  const [initialStatusCheck, setInitialStatusCheck] = useState(false);
  const [ebanxPaymentComplete, setEbanxPaymentComplete] = useState(false);
  const [status, setStatus] = useState(false);
  const [finished, setFinished] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [revealVideoPlayer, setRevealVideoPlayer] = useState(undefined);

  const awaitingPayment = searchParams.provider === "ebanx" && searchParams.method === "pix" && !ebanxPaymentComplete;

  const CheckStatus = async () => {
    try {
      const status = await Status();

      setStatus(status);

      if(searchParams.provider === "ebanx" && searchParams.method === "pix" && !ebanxPaymentComplete && searchParams.hash) {
        // Check ebanx payment status

        const paymentStatus = await checkoutStore.EbanxPurchaseStatus(searchParams.hash);

        if(paymentStatus.status !== "CO") {
          return;
        }

        setEbanxPaymentComplete(true);
      }

      if(status.status === "complete") {
        if(!noItems) {
          // If mint has items, ensure that items are available in the user's wallet
          let items = status.items || (status.extra || []).filter(item => item.token_addr && (item.token_id || item.token_id_str));
          if(status.op === "nft-transfer") {
            items = status.items || [{token_addr: status.address, token_id_str: status.tokenId}];
          }

          if(items.length > 0) {
            const firstItem = await rootStore.LoadNFTData({
              contractAddress: items[0].token_addr,
              tokenId: items[0].token_id_str || items[0].token_id
            });

            if(!firstItem) {
              return;
            }

            await Promise.all(
              items.slice(1).map(async ({token_addr, token_id_str}) =>
                await rootStore.LoadNFTData({contractAddress: token_addr, tokenId: token_id_str})
              )
            );
          }
        }

        if(!revealVideoHash) {
          setRevealed(true);
        }

        setFinished(true);

        clearInterval(statusInterval);
      } else if(status.status === "failed") {
        clearInterval(statusInterval);
      }
    } catch(error) {
      rootStore.Log("Failed to check status:", true);
      rootStore.Log(error);
    } finally {
      setInitialStatusCheck(true);
    }
  };

  useEffect(() => {
    setTimeout(() => ScrollTo(0), 200);

    CheckStatus();

    statusInterval = setInterval(CheckStatus, intervalPeriod * 1000);

    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if(revealed && OnFinish) {
      OnFinish({status});
    }
  }, [revealed]);

  // Play reveal video when minting is finished
  useEffect(() => {
    if(finished && revealVideoPlayer) {
      revealVideoPlayer.video.play();

      setTimeout(() => {
        // Mute video if autoplay is blocked
        if(revealVideoPlayer.video.paused) {
          revealVideoPlayer.video.muted = true;
          revealVideoPlayer.video.play();
        }
      }, 1000);
    }
  }, [finished]);

  if(finished && redirect) {
    return <Redirect to={redirect}/>;
  }

  if(!initialStatusCheck) {
    return <PageLoader />;
  }

  if(status && status.status === "failed") {
    rootStore.Log("Minting failed:", true);
    rootStore.Log(status);
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
      {
        hideText || finished ? null :
          awaitingPayment ?
            <div className="page-headers">
              <div className="page-header">
                { rootStore.l10n.status.minting.awaiting_payment }
              </div>
            </div> :
            <div className="page-headers">
              <div className="page-header">
                {text ? text.header : (header || rootStore.l10n.status.minting.header) }
              </div>
              <div className="page-subheader">
                {text ? text.subheader1 : (subheader || rootStore.l10n.status.minting.subheader1)}
              </div>
            </div>
      }

      {
        videoHash && !awaitingPayment ?
          <div className={`minting-status__video-container ${hideText ? "minting-status__video-container--large" : ""} ${finished ? "minting-status__video-container--hidden" : ""}`}>
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
                      network: rootStore.walletClient.network === "main" ?
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
                      autoplay: EluvioPlayerParameters.autoplay.ON,
                      controls: EluvioPlayerParameters.controls.OFF,
                      loop: EluvioPlayerParameters.loop.ON
                    }
                  }
                );
              }}
            />
          </div> :
          (finished ? null : <Loader className="minting-status__loader" />)
      }

      {
        finished && revealVideoHash && !awaitingPayment ?
          <div className={`minting-status__video-container minting-status__video-container--large ${finished ? "" : "minting-status__video-container--hidden"}`}>
            <Loader />
            <div
              className="minting-status__video"
              ref={element => {
                if(!element || revealVideoPlayer) { return; }

                setRevealVideoPlayer(
                  new EluvioPlayer(
                    element,
                    {
                      clientOptions: {
                        network: rootStore.walletClient.network === "main" ?
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
                        controls: EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE,
                        loop: EluvioPlayerParameters.loop.OFF,
                        playerCallback: ({videoElement}) => {
                          videoElement.addEventListener("ended", () => setRevealed(true));
                        }
                      }
                    }
                  )
                );
              }}
            />
          </div> : null
      }

      {
        rootStore.hideNavigation || hideText || finished || (text && !text.subheader2) ? null :
          <div className="minting-status__text">
            <h2 className="minting-status__navigation-message">
              { text ? text.subheader2 : rootStore.l10n.status.minting.subheader2 }
            </h2>
          </div>
      }
      { transactionLink ? <a href={transactionLink} target="_blank" rel="noopener" className="minting-status__transaction-link">{ transactionLinkText }</a> : null }
    </div>
  );
});

const MintResults = observer(({skipReveal, text, header, subheader, basePath, nftBasePath, items, backText}) => {
  // Only skip if there is one item
  if(skipReveal && items && items.length === 1) {
    const { nft } = rootStore.NFTData({contractAddress: items[0].token_addr, tokenId: items[0].token_id_str || items[0].token_id});

    if(!nft) { return; }

    return <Redirect to={UrlJoin(nftBasePath || basePath, nft.details.ContractId, nft.details.TokenIdStr, nft.metadata.minting_results_page === "media" ? "media" : "")} />;
  }

  return (
    <div className="minting-status-results" key="minting-status-results-card-list">
      <div className="page-headers">
        <div className="page-header">{ text ? text.header : header }</div>
        <div className="page-subheader">{ text ? text.subheader1 : subheader }</div>
      </div>
      {
        !items || items.length === 0 ? null :
          <div className="card-list card-list--centered">
            {
              items.map(({token_addr, token_id, token_id_str}, index) => {
                token_id = token_id_str || token_id;
                const { nft } = rootStore.NFTData({contractAddress: token_addr, tokenId: token_id});

                if(!nft) {
                  return null;
                }

                return (
                  <NFTCard
                    key={`mint-result-${token_addr}-${token_id}`}
                    nft={nft}
                    imageWidth={600}
                    link={UrlJoin(nftBasePath || basePath, nft.details.ContractId, nft.details.TokenIdStr)}
                    truncateDescription
                    style={{
                      animationDelay: `${index + 0.5}s`
                    }}
                  />
                );
              })
            }
          </div>
      }
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
      OnFinish={async () => rootStore.LoadMarketplace(match.params.marketplaceId)}
      videoHash={videoHash}
    />
  );
});

export const ListingPurchaseStatus = observer(() => {
  const match = useRouteMatch();

  const solanaSignature = checkoutStore.solanaSignatures[match.params.confirmationId];
  const ethereumHash = checkoutStore.ethereumHashes[match.params.confirmationId];

  const [status, setStatus] = useState(undefined);
  const [awaitingSolanaTransaction, setAwaitingSolanaTransaction] = useState(solanaSignature);

  const inMarketplace = !!match.params.marketplaceId;

  const listingId = match.params.listingId || match.params.sku;

  const Status = async () => {
    if(awaitingSolanaTransaction) {
      return await cryptoStore.PhantomPurchaseStatus(match.params.confirmationId);
    } else {
      return await rootStore.ListingPurchaseStatus({
        listingId,
        confirmationId: match.params.confirmationId
      });
    }
  };

  let basePath = UrlJoin("/wallet", "users", "me", "items");
  if(inMarketplace) {
    basePath = UrlJoin("/marketplace", match.params.marketplaceId);
  }

  if(!status) {
    return (
      <MintingStatus
        key={`minting-status-${awaitingSolanaTransaction}`}
        header={
          awaitingSolanaTransaction ?
            rootStore.l10n.status.minting.submitting_solana :
            rootStore.l10n.status.minting.transferring
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
            rootStore.l10n.status.back_to_marketplace :
            rootStore.l10n.status.back_to_collection
        }
        intervalPeriod={awaitingSolanaTransaction ? 10000 : 10}
        transactionLink={
          solanaSignature && cryptoStore.SolanaTransactionLink(solanaSignature) ||
          ethereumHash && cryptoStore.EthereumTransactionLink(ethereumHash) ||
          null
        }
        transactionLinkText={LocalizeString(rootStore.l10n.status.minting.view_transaction, {location: solanaSignature ? "Solana Explorer" : "Etherscan"})}
      />
    );
  }

  const items = [{token_addr: status.address, token_id_str: status.tokenId}];

  return (
    <MintResults
      header={rootStore.l10n.status.minting.success_header}
      subheader={`${rootStore.l10n.status.minting.purchase} ${rootStore.l10n.status.minting[items.length === 1 ? "received_item_single" : "received_item_multiple"]}`}
      items={items}
      basePath={basePath}
      nftBasePath={
        inMarketplace ?
          UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items") :
          basePath
      }
      backText={
        inMarketplace ?
          rootStore.l10n.status.back_to_marketplace :
          rootStore.l10n.status.back_to_items
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
  const animation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.purchase_animation, marketplace?.storefront?.purchase_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.reveal_animation, marketplace?.storefront?.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const hideText = marketplace?.storefront?.hide_text;

  const Status = async () => await rootStore.PurchaseStatus({
    marketplaceId: match.params.marketplaceId,
    confirmationId: match.params.confirmationId
  });

  if(status?.status !== "complete") {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText={rootStore.l10n.status.back_to_marketplace}
        videoHash={videoHash}
        revealVideoHash={revealVideoHash}
        hideText={hideText}
      />
    );
  }

  const items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      skipReveal={marketplace?.storefront?.skip_reveal}
      header={rootStore.l10n.status.minting.success_header}
      subheader={`${rootStore.l10n.status.minting.purchase} ${rootStore.l10n.status.minting[items.length === 1 ? "received_item_single" : "received_item_multiple"]}`}
      items={items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items")}
      backText={rootStore.l10n.status.back_to_marketplace}
    />
  );
});

export const GiftPurchaseMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(!rootStore.loggedIn ? {status: "complete"} : undefined);

  const Status = async () => await rootStore.PurchaseStatus({
    marketplaceId: match.params.marketplaceId,
    confirmationId: match.params.confirmationId
  });

  // TODO: When pending status is in, complete once we get pending status
  if(status?.status !== "complete" && rootStore.loggedIn) {
    return (
      <MintingStatus
        text={{
          header: rootStore.l10n.status.minting.confirming_purchase
        }}
        intervalPeriod={3}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText={rootStore.l10n.status.back_to_marketplace}
      />
    );
  }

  return (
    <div className="minting-status-results" key="minting-status-results-card-list">
      <div className="page-headers">
        <div className="page-header">{ rootStore.l10n.status.minting.gift_purchase_1 }</div>
        <div className="page-subheader">{ rootStore.l10n.status.minting.gift_purchase_2 }</div>
      </div>
      <div className="minting-status-results__actions">
        <Link to={UrlJoin("/marketplace", match.params.marketplaceId)} className="action action-primary minting-status-results__back-button">
          { rootStore.l10n.status.back_to_marketplace }
        </Link>
      </div>
    </div>
  );
});

export const GiftRedemptionStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);
  const [redeemed, setRedeemed] = useState(undefined);
  const [error, setError] = useState(undefined);
  const code = match.params.code || SearchParams()["otp_code"];

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const giftOptions = marketplace?.storefront?.gift_options;
  let animation, revealAnimation, skipReveal;
  if(giftOptions?.custom_redemption_settings) {
    animation = MobileOption(rootStore.pageWidth, giftOptions.redeem_animation, giftOptions.redeem_animation_mobile);
    revealAnimation = MobileOption(rootStore.pageWidth, giftOptions.reveal_animation, giftOptions.reveal_animation_mobile);
    skipReveal = giftOptions.skip_reveal;
  } else {
    animation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.purchase_animation, marketplace?.storefront?.purchase_animation_mobile);
    revealAnimation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.reveal_animation, marketplace?.storefront?.reveal_animation_mobile);
    skipReveal = marketplace?.storefront?.skip_reveal;
  }

  const videoHash = LinkTargetHash(animation);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const hideText = marketplace?.storefront?.hide_text;

  const Status = async () => await rootStore.GiftClaimStatus({
    marketplaceId: match.params.marketplaceId,
    confirmationId: match.params.confirmationId
  });

  const Claim = async ({attempt=1}={}) => {
    try {
      await checkoutStore.GiftClaimSubmit({
        marketplaceId: match.params.marketplaceId,
        sku: match.params.sku,
        confirmationId: match.params.confirmationId,
        code
      });
    } catch(error) {
      rootStore.Log(error, true);
      if(error?.status === 400) {
        if(error?.body?.error?.includes("gift tokens not found")) {
          // May not be minted yet

          if(attempt > 4) {
            setError(rootStore.l10n.status.minting.errors.misc);
          } else {
            await new Promise(resolve => setTimeout(resolve, 30000));
            Claim({attempt: attempt + 1});
          }

          return;
        }

        const claimStatus = await Status();

        if(claimStatus?.status === "failed") {
          setError(rootStore.l10n.status.minting.errors.misc);
          return;
        } else if(["complete", "pending"].includes(claimStatus?.status)) {
          // Gift was claimed by this user recently enough for status to be present, and the status is OK
          return;
        }

        setError(rootStore.l10n.status.minting.errors.gift_already_claimed);
      } else {
        setError(rootStore.l10n.status.minting.errors.misc);
      }
    }
  };

  let item = marketplace?.items?.find(item => item.sku === match.params.sku);

  useEffect(() => {
    if(!rootStore.loggedIn || !item) { return; }

    if(!code) {
      setError(rootStore.l10n.status.minting.errors.gift_code_not_found);
    }

    if(item?.gift_presentation?.open_on_claim) {
      // Redemption action will be done when the user manually clicks claim
      return;
    }

    Claim();
  }, [item]);

  if(!item) {
    return <PageLoader />;
  }

  if(error) {
    return (
      <div className="minting-status-results" key="minting-status-results-card-list">
        <div className="page-headers">
          <div className="page-header">{ error }</div>
        </div>
        <div className="minting-status-results__actions">
          <Link to={UrlJoin("/marketplace", match.params.marketplaceId)} className="action action-primary minting-status-results__back-button">
            { rootStore.l10n.status.back_to_marketplace }
          </Link>
        </div>
      </div>
    );
  }

  if(item.use_custom_gift_presentation) {
    item = {
      ...item,
      ...(item.gift_presentation || {})
    };
  }

  if(!redeemed && item?.gift_presentation?.open_on_claim) {
    return (
      <div className="minting-status minting-status--gift-redemption">
        <ItemCard
          name={item.name}
          subtitle1={item.subtitle}
          description={item.description}
          truncateDescription={false}
          className="minting-status__gift-card"
          image={
            <NFTImage
              item={item}
              showVideo
            />
          }
          actions={[
            {
              label: "Claim",
              className: "action action-primary",
              onClick: async () => {
                await Claim();

                setRedeemed(true);
                setTimeout(() => ScrollTo(0), 100);
              }
            }
          ]}
        />
      </div>
    );
  }

  if(!status) {
    return (
      <MintingStatus
        header={rootStore.l10n.status.minting.gift_claim_header}
        key={`status-${videoHash}`}
        videoHash={videoHash}
        revealVideoHash={revealVideoHash}
        hideText={hideText}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText={rootStore.l10n.status.back_to_marketplace}
      />
    );
  }

  return (
    <MintResults
      skipReveal={skipReveal}
      header={rootStore.l10n.status.minting.success_header}
      subheader={rootStore.l10n.status.minting[status.items.length === 1 ? "received_item_single" : "received_item_multiple"]}
      items={status.items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items")}
      backText={rootStore.l10n.status.back_to_marketplace}
    />
  );
});

export const ClaimMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const animation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.purchase_animation, marketplace?.storefront?.purchase_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.reveal_animation, marketplace?.storefront?.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const hideText = marketplace?.storefront?.hide_text;

  const Status = async () => await rootStore.ClaimStatus({
    marketplaceId: match.params.marketplaceId,
    sku: match.params.sku
  });

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        videoHash={videoHash}
        revealVideoHash={revealVideoHash}
        hideText={hideText}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText={rootStore.l10n.status.back_to_marketplace}
      />
    );
  }

  let items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      skipReveal={marketplace?.storefront?.skip_reveal}
      header={rootStore.l10n.status.minting.success_header}
      subheader={rootStore.l10n.status.minting[items.length === 1 ? "received_item_single" : "received_item_multiple"]}
      items={items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items")}
      backText={rootStore.l10n.status.back_to_marketplace}
    />
  );
});

export const EntitlementMintingStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const animation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.purchase_animation, marketplace?.storefront?.purchase_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, marketplace?.storefront?.reveal_animation, marketplace?.storefront?.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const hideText = marketplace?.storefront?.hide_text;

  const Status = async () => await rootStore.EntitlementClaimStatus({
    marketplaceId: match.params.marketplaceId,
    purchaseId: match.params.purchaseId
  });

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        videoHash={videoHash}
        revealVideoHash={revealVideoHash}
        hideText={hideText}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText={rootStore.l10n.status.back_to_marketplace}
      />
    );
  }

  let items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      skipReveal={marketplace?.storefront?.skip_reveal}
      header={rootStore.l10n.status.minting.success_header}
      subheader={rootStore.l10n.status.minting[items.length === 1 ? "received_item_single" : "received_item_multiple"]}
      items={items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items")}
      backText={rootStore.l10n.status.back_to_marketplace}
    />
  );
});

export const PackOpenStatus = observer(() => {
  const [status, setStatus] = useState(undefined);

  const match = useRouteMatch();

  const key = `pack-${match.params.contractId}-${match.params.tokenId}`;

  // Set NFT in state so it doesn't change
  const [nft] = useState(
    (rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId})).nft ||
    rootStore.GetSessionStorageJSON(key, true)
  );

  useEffect(() => {
    const nftData = (rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId})).nft;
    if(nftData) {
      // Save pack info in case of refresh after burn
      rootStore.SetSessionStorage(`pack-${match.params.contractId}-${match.params.tokenId}`, rootStore.client.utils.B64(JSON.stringify(nftData)));
    }
  }, []);

  const packOptions = nft?.metadata?.pack_options || {};
  const hideText = packOptions.hide_text;
  const animation = MobileOption(rootStore.pageWidth, packOptions.open_animation, packOptions.open_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation = MobileOption(rootStore.pageWidth, packOptions.reveal_animation, packOptions.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const basePath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items") :
    UrlJoin("/wallet", "users", "me", "items");

  const Status = async () => await rootStore.PackOpenStatus({
    contractId: match.params.contractId,
    tokenId: match.params.tokenId
  });

  const mintingText = packOptions.use_custom_open_text && packOptions.minting_text || {};

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        text={!packOptions.use_custom_open_text ?
          undefined :
          {
            header: mintingText.minting_header,
            subheader1: mintingText.minting_subheader1,
            subheader2: mintingText.minting_subheader2
          }
        }
        header={rootStore.l10n.status.pack_opening}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        videoHash={videoHash}
        revealVideoHash={revealVideoHash}
        hideText={hideText}
        basePath={basePath}
        backText={rootStore.l10n.status.back_to_items}
      />
    );
  }

  const items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));

  return (
    <MintResults
      text={!packOptions.use_custom_open_text ?
        undefined :
        {
          header: mintingText.reveal_header,
          subheader1: mintingText.reveal_subheader
        }
      }
      header={rootStore.l10n.status.minting.success_header}
      subheader={rootStore.l10n.status.minting[items.length === 1 ? "received_item_single" : "received_item_multiple"]}
      items={items}
      basePath={basePath}
      nftBasePath={basePath}
      backText={rootStore.l10n.status.back_to_items}
    />
  );
});

export const CollectionRedeemStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collectionsInfo = marketplace.collections_info;
  const collection = marketplace.collections.find(collection => collection.sku === match.params.collectionSKU);
  const animation =
    MobileOption(rootStore.pageWidth, collection.redeem_animation, collection.redeem_animation_mobile) ||
    MobileOption(rootStore.pageWidth, collectionsInfo.redeem_animation, collectionsInfo.redeem_animation_mobile);
  const videoHash = LinkTargetHash(animation);

  const revealAnimation =
    MobileOption(rootStore.pageWidth, collection.reveal_animation, collection.reveal_animation_mobile) ||
    MobileOption(rootStore.pageWidth, collectionsInfo.reveal_animation, collectionsInfo.reveal_animation_mobile);
  const revealVideoHash = LinkTargetHash(revealAnimation);

  const hideText = collection.hide_text || collectionsInfo.hide_text;

  const Status = async () => await rootStore.CollectionRedemptionStatus({marketplaceId: marketplace.marketplaceId, confirmationId: match.params.confirmationId});

  if(!status) {
    return (
      <MintingStatus
        key={`status-${videoHash}`}
        videoHash={videoHash}
        revealVideoHash={revealVideoHash}
        hideText={hideText}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
        backText={rootStore.l10n.status.back_to_marketplace}
      />
    );
  }

  let items = status.extra.filter(item => item.token_addr && (item.token_id || item.token_id_str));
  try {
    if(!items || items.length === 0) {
      const marketplaceItem = ((marketplace?.items || []).find(item => item.sku === match.params.sku)) || {};
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
      header={rootStore.l10n.status.minting.success_header}
      subheader={rootStore.l10n.status.minting[items.length === 1 ? "received_item_single" : "received_item_multiple"]}
      items={items}
      basePath={UrlJoin("/marketplace", match.params.marketplaceId)}
      nftBasePath={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items")}
      backText={rootStore.l10n.status.back_to_marketplace}
    />
  );
});

export const DepositStatus = observer(() => {
  const match = useRouteMatch();
  const [status, setStatus] = useState(undefined);

  const Status = async () => await checkoutStore.DepositStatus({
    confirmationId: match.params.confirmationId
  });

  const basePath = match.params.marketplaceId ?
    UrlJoin("/marketplace", match.params.marketplaceId, "profile") :
    "/wallet/profile";

  if(status?.status !== "complete") {
    return (
      <MintingStatus
        text={{
          header: rootStore.l10n.status.deposits.header,
          subheader1: rootStore.l10n.status.deposits.subheader1,
          subheader2: (
            <Link to={basePath + "?deposits"}>
              { rootStore.l10n.status.deposits.subheader2 }
            </Link>
          )
        }}
        Status={Status}
        OnFinish={({status}) => setStatus(status)}
        basePath={basePath}
        backText={rootStore.l10n.status.back_to_profile}
        intervalPeriod={30}
        noItems
      />
    );
  }

  return (
    <MintResults
      header={rootStore.l10n.status.deposits.success_header}
      subheader={LocalizeString(rootStore.l10n.status.deposits.success_subheader, {amount: FormatPriceString(status?.extra?.amount || 0, {stringOnly: true})}) }
      basePath={basePath}
      backText={rootStore.l10n.status.back_to_profile}
    />
  );
});
