import RedeemableOfferStyles from "Assets/stylesheets/media_properties/redeemable-offer-modal.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {QRCodeElement} from "Components/common/UIComponents";
import {checkoutStore, rootStore, mediaPropertyStore} from "Stores";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {Loader} from "Components/common/Loaders";
import Video from "Components/properties/Video";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {LoginGate} from "Components/common/LoginGate";
import {Button, ExpandableDescription, LoaderImage, Modal, ScaledText} from "Components/properties/Common";
import {NFTInfo} from "../../utils/Utils";
import {useHistory, useRouteMatch} from "react-router-dom";

const S = (...classes) => classes.map(c => RedeemableOfferStyles[c] || "").join(" ");

const RedemptionStatus = observer(({offer, offerKey, setRedemptionFinished}) => {
  const redemptionStatus = checkoutStore.redeemableOfferStatus[offerKey];
  const { redeem_animation, redeem_animation_loop, require_redeem_animation } = offer;

  const [videoEnded, setVideoEnded] = useState(!require_redeem_animation || !redeem_animation);

  useEffect(() => {
    if(redemptionStatus?.status === "complete" && videoEnded) {
      setRedemptionFinished(true);
    }
  }, [redemptionStatus, videoEnded]);

  return (
    <div className={S("form__content", "form__status")}>
      <div className={S("form__header")}>
        {rootStore.l10n.redeemables.redeeming}
      </div>
      <div className={S("form__subheader")}>
        {rootStore.l10n.redeemables.redeeming_subheader}
      </div>
      {
        !redeem_animation ?
          <Loader className={S("form__loader")}/> :
          <Video
            link={redeem_animation}
            playerOptions={{
              loop: EluvioPlayerParameters.loop[redeem_animation_loop ? "ON" : "OFF"],
              autoplay: EluvioPlayerParameters.autoplay.ON,
              muted: EluvioPlayerParameters.muted.OFF_IF_POSSIBLE,
              controls: EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE,
              playerCallback: ({videoElement}) => {
                if(!require_redeem_animation) { return; }

                // Must detect when video has ended
                videoElement.addEventListener("ended", () => {
                  setVideoEnded(true);
                });

                // Looping videos do not emit an 'ended' event, detect when the video has looped
                if(redeem_animation_loop) {
                  let lastTime = 0;
                  videoElement.addEventListener("timeupdate", () => {
                    if(lastTime > videoElement.currentTime) {
                      setVideoEnded(true);
                    }

                    lastTime = videoElement.currentTime;
                  });
                }
              }
            }}
            className={S("form__video")}
          />
      }
      <div className={S("form__footer")}>
        {rootStore.l10n.redeemables.redeeming_footer}
      </div>
    </div>
  );
});

const RedemptionResults = observer(({offer, offerData, showPopupNotice}) => {
  if(!offerData || !offerData.code) {
    // Waiting for offer data to load, show loader
    return (
      <div className={S("form__content", "form__status")}>
        <div className={S("form__header")}>
          {offer.results_header || rootStore.l10n.redeemables.successfully_redeemed}
        </div>
        <div className={S("form__content")}>
          <Loader className={S("form__loader")}/>
          {
            !showPopupNotice ? null :
              <div className={S("form__footer")}>
                { rootStore.l10n.redeemables.popup_notice }
              </div>
          }
        </div>
      </div>
    );
  } else if(offerData.type === "default") {
    // Default view
    return (
      <div className={S("form__content", "form__status")}>
        <div className={S("form__header")}>
          {offer.results_header || rootStore.l10n.redeemables.successfully_redeemed}
        </div>
        <div className={S("form__subheader")}>
          {offer.results_message || rootStore.l10n.redeemables.redeemed_message}
        </div>
        <QRCodeElement
          content={JSON.stringify(offerData.code)}
          className={S("form__qr")}
        />
        {
          !offer?.state?.transaction ? null :
            <a
              className={S("form__link")}
              target="_blank"
              href={rootStore.LookoutURL(offer.state.transaction)}
              rel="noopener noreferrer"
            >
              {rootStore.l10n.redeemables.view_transaction}
            </a>
        }
      </div>
    );
  } else {
    // Custom redemption info view
    return (
      <div className={S("form__content", "form__status")}>
        <div className={S("form__header")}>
          {offer.results_header || rootStore.l10n.redeemables.successfully_redeemed}
        </div>
        <div className={S("form__subheader")}>
          {offer.results_message || rootStore.l10n.redeemables.redeemed_message}
        </div>
        {
          !offerData.code ? null :
            <div className={S("form__code")}>
              {offerData.code?.toString() || ""}
            </div>
        }
        {
          !offerData.url ? null :
            <>
              <QRCodeElement content={offerData.url} className={S("form__qr")} />
              <a
                href={offerData.url}
                target="_blank"
                rel="noreferrer"
                className={["ellipsis", S("form__link")].join(" ")}
              >
                {offerData.url + offerData.url +offerData.url + offerData.url}
              </a>
            </>
        }
      </div>
    );
  }
});

const RedeemableInfo = observer(({offer, nftInfo}) => {
  // Unredeemed, or redeemed but not redeemer
  let state, stateDetails;
  if(!offer.released) {
    state = "Offer Upcoming";
    stateDetails = `Available ${offer.releaseDate}`;
  } else if(offer.expired) {
    state = "Offer Expired";
    stateDetails = `Available ${[offer.releaseDateShort, offer.expirationDateShort].filter(d => d).join(" - ")}`;
  } else {
    state = "Offer Valid";
    stateDetails = `Available ${offer.releaseDate}`;
  }

  return (
    <div className={S("form__content")}>
      <div className={S("form__image-container")}>
        {
          !(offer.image || offer.animation) ? null :
            <div className={S("form__image-container")}>
              <LoaderImage alt={offer.name} src={offer.image.url} width={500}
                           className={S("form__image")}/>
              {
                !offer.animation ? null :
                  <Video
                    link={offer.animation}
                    mute
                    hideControls
                    playerOptions={{
                      loop: EluvioPlayerParameters.loop.ON,
                      showLoader: EluvioPlayerParameters.showLoader.OFF,
                      backgroundColor: "transparent"
                    }}
                    autoAspectRatio={false}
                    className={S("form__video")}
                  />
              }
            </div>
        }
      </div>

      <div className={S("form__state")}>
        <div className={S("form__state__status")}>
          { state }
        </div>
        <div className={S("form__state__details")}>
          { stateDetails }
        </div>
      </div>

      <ScaledText minPx={24} maxPx={32} className={S("form__title")}>
        { offer.name }
      </ScaledText>
      <ExpandableDescription
        description={offer.description_text}
        descriptionRichText={offer.description}
        className={S("form__description")}
      />
      {
        !nftInfo.isOwned ? null :
          <Button
            disabled={!offer.released || offer.expired}
            onClick={async () => await checkoutStore.RedeemOffer({
              tenantId: nftInfo.tenantId,
              contractAddress: nftInfo.nft.details.ContractAddr,
              tokenId: nftInfo.nft.details.TokenIdStr,
              offerId: offer.offer_id
            })}
            className={S("form__action")}
          >
            {rootStore.l10n.redeemables.redeem}
          </Button>
      }
      {
        !offer.state?.redeemer ? null :
          <a
            className={S("form__link")}
            target="_blank"
            href={rootStore.LookoutURL(offer.state.transaction)}
            rel="noopener noreferrer"
          >
            { rootStore.l10n.redeemables.view_transaction }
          </a>
      }
    </div>
  );
});

export const RedeemableOfferContent = observer(({
  nftInfo,
  offerId
}) => {
  const offerKey = `${nftInfo?.nft.details.ContractAddr}-${nftInfo?.nft.details.TokenIdStr}-${offerId}`;
  const offer = nftInfo?.redeemables.find(offer => offer.offer_id === offerId);

  const redeemer = offer.state?.redeemer;
  const redemptionStarted = !!redeemer || checkoutStore.redeemedOffers[offerKey];
  const redemptionStatus = checkoutStore.redeemableOfferStatus[offerKey];
  const redemptionFailed = redemptionStatus?.status === "failed";
  const isRedeemer = Utils.EqualAddress(redeemer, rootStore.CurrentAddress());

  const [offerData, setOfferData] = useState(undefined);
  const [showPopupNotice, setShowPopupNotice] = useState(false);
  const [redemptionFinished, setRedemptionFinished] = useState(isRedeemer);

  useEffect(() => {
    if(!nftInfo || redeemer) { return; }

    checkoutStore.RedeemableOfferStatus({
      tenantId: nftInfo.tenantId,
      contractAddress: nftInfo.nft.details.ContractAddr,
      tokenId: nftInfo.nft.details.TokenIdStr,
      offerId: offer.offer_id
    })
      .then(status => {
        if(status?.status === "complete") {
          // Reload NFT so status is updated
          rootStore.LoadNFTData({
            contractAddress: nftInfo.nft.details.ContractAddr,
            tokenId: nftInfo.nft.details.TokenIdStr,
            force: true
          });
        }
      });
  }, []);

  useEffect(() => {
    if(!nftInfo || offerData || (!redeemer && redemptionStatus?.status !== "complete")) {
      return;
    }

    const transactionId =
      offer?.state?.transaction ||
      redemptionStatus?.extra?.[6] ||
      nftInfo?.nft?.details?.Offers?.find(offer => offer?.id?.toString() === offerId.toString())?.transaction;

    if(!transactionId) {
      // Transaction not determinable - reload nft
      rootStore.LoadNFTData({
        contractAddress: nftInfo.nft.details.ContractAddr,
        tokenId: nftInfo.nft.details.TokenIdStr,
        force: true
      });

      return;
    }

    rootStore.walletClient.RedeemableCustomFulfillmentInfo({redeemableTransactionId: transactionId})
      .then(({fulfillment_data}) => {
        setOfferData({
          type: "custom",
          ...fulfillment_data
        });
      })
      .catch(async error => {
        try {
          if(!rootStore.walletClient.CanSign()) {
            setShowPopupNotice(true);
          }

          const offerData = await rootStore.GenerateOfferCodeData({nftInfo, offer});

          rootStore.Log(error, true);
          setOfferData({
            type: "default",
            code: offerData
          });
        } catch(error) {
          setOfferData({
            type: "default",
            code: undefined,
            error
          });
        }
      });
    // Load offer data
  }, [redeemer, redemptionStatus, offer]);

  let content;
  if(redemptionFailed) {
    // Redemption status not yet loaded - show loader
    content = (
      <div className={S("form__content")}>
        <div className={S("form__error")}>
          Redemption Failed
        </div>
      </div>
    );
  } else if(redemptionFinished) {
    // Redemption complete and current user is redeemer
    content = (
      <RedemptionResults
        offer={offer}
        offerData={offerData}
        showPopupNotice={showPopupNotice}
      />
    );
  } else if(redemptionStarted) {
    // Redemption in progress
    content = (
      <RedemptionStatus
        offer={offer}
        offerKey={offerKey}
        setRedemptionFinished={setRedemptionFinished}
      />
    );
  } else if(!redemptionStatus) {
    // Redemption status not yet loaded - show loader
    content = (
      <div className={S("form__content")}>
        <Loader className={S("form__loader")}/>
      </div>
    );
  } else {
    // Unredeemed or not redeemer - show redeemable offer info
    content = <RedeemableInfo offer={offer} nftInfo={nftInfo} />;
  }

  return (
    <div className={S("form", redemptionStarted && !redemptionFinished && offer.animation ? "form--with-animation" : "")}>
      { content }
    </div>
  );
});

export const RedeemableParams = () => {
  const urlParams = new URLSearchParams(location.search);

  let params = {};
  if(urlParams.has("r")) {
    try {
      params = JSON.parse(rootStore.client.utils.FromB58ToStr(urlParams.get("r")));
    } catch(error) {
      rootStore.Log("Failed to parse URL params", true);
      rootStore.Log(error, true);
    }
  }

  return Object.keys(params).length === 0 ? undefined : params;
};

const RedeemableOfferModal = observer(() => {
  const match = useRouteMatch();
  const history = useHistory();
  const params = RedeemableParams();
  const [info, setInfo] = useState();

  useEffect(() => {
    if(!params) { return; }

    (async () => {
      let contractAddress = params.contractAddress;
      let tokenId = params.tokenId;

      if(params.marketplaceSKU) {
        await mediaPropertyStore.LoadMarketplace({marketplaceId: params.marketplaceId});
        const marketplace = rootStore.marketplaces[params.marketplaceId];
        const item = marketplace.items.find(item => item.sku === params.marketplaceSKU);
        contractAddress = item.nftTemplateMetadata.address;
      }

      if(!params.tokenId) {
        const ownedItem = ((await rootStore.walletClient.UserItems({
          userAddress: rootStore.CurrentAddress(),
          contractAddress: contractAddress,
          limit: 1
        })).results || [])[0];

        tokenId = ownedItem?.tokenId;
      }

      setInfo(
        NFTInfo({
          nft: await rootStore.LoadNFTData({
            contractAddress,
            tokenId
          })
        })
      );
    })();
  }, [location.search]);

  if(!params) { return null; }


  const urlParams = new URLSearchParams(location.search);
  let backPath = params.cancelPath || match.url;
  urlParams.delete("r");

  backPath = backPath + (urlParams.size > 0 ? `?${urlParams.toString()}` : "");

  const Close = () => {
    history.replace(backPath);
  };

  return (
    <LoginGate Condition={() => !!params} Cancel={Close}>
      <Modal
        size="auto"
        centered
        opened
        onClose={Close}
        withCloseButton={rootStore.pageWidth < 800 && !params.confirmationId}
      >
        {
          !info ?
            <div className={S("form")}>
              <div className={S("form__content")}>
                <Loader className={S("form__loader")}/>
              </div>
            </div> :
            <RedeemableOfferContent
              nftInfo={info}
              offerId={params.offerId}
            />
        }
      </Modal>
    </LoginGate>
  );
});

export default RedeemableOfferModal;
