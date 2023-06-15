import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, QRCodeElement, RichText} from "Components/common/UIComponents";
import {checkoutStore, rootStore} from "Stores";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import {Loader} from "Components/common/Loaders";
import Video from "Components/common/Video";

export const NFTRedeemableOfferModal = observer(({nftInfo, offerId, Close}) => {
  const offerKey = `${nftInfo.nft.details.ContractAddr}-${nftInfo.nft.details.TokenIdStr}-${offerId}`;

  const [offerData, setOfferData] = useState(undefined);

  const offer = nftInfo.redeemables.find(offer => offer.offer_id === offerId);

  const redeemer = offer.state?.redeemer;
  const redeemed = !!redeemer || checkoutStore.redeemedOffers[offerKey];

  if(!offer) {
    return null;
  }

  const status = checkoutStore.redeemableOfferStatus[offerKey];

  useEffect(() => {
    if(redeemer) { return; }

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
    if(offerData || (!redeemer && status?.status !== "complete")) {
      return;
    }

    const transactionId =
      offer?.state?.transaction ||
      nftInfo?.nft?.details?.Offers?.[parseInt(offerId)]?.transaction ||
      status?.extra?.[6];

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
        rootStore.Log(error, true);
        setOfferData({
          type: "default",
          code: await rootStore.GenerateOfferCodeData({nftInfo, offer})
        });
      });
    // Load offer data
  }, [redeemer, status, offer]);


  let content;
  if(redeemer || status?.status === "complete") {
    if(!offerData) {
      content = (
        <div className="redeemable-offer-modal__container">
          <div className="redeemable-offer-modal__header">
            {rootStore.l10n.redeemables.successfully_redeemed}
          </div>
          <div className="redeemable-offer-modal__content">
            <Loader className="redeemable-offer-modal__loader"/>
          </div>
        </div>
      );
    } else if(offerData.type === "default") {
      content = (
        <div className="redeemable-offer-modal__container">
          <div className="redeemable-offer-modal__header">
            {rootStore.l10n.redeemables.successfully_redeemed}
          </div>
          <div className="redeemable-offer-modal__content">
            <div className="redeemable-offer-modal__image-container">
              <QRCodeElement content={JSON.stringify(offerData.code)} className="redeemable-offer-modal__image" />
            </div>
            <div className="redeemable-offer-modal__message">
            </div>
            <div className="redeemable-offer-modal__name">
              {offer.name}
            </div>
            <RichText className="markdown-document redeemable-offer-modal__description" richText={offer.description}/>
            {
              offer.expirationDate ?
                <>
                  <div className="redeemable-offer-modal__date-header">
                    {rootStore.l10n.redeemables[offer.releaseDate ? "reward_valid" : "reward_expires"]}
                  </div>
                  <div className="redeemable-offer-modal__date">
                    {offer.releaseDate ? offer.releaseDate + " - " : ""}
                    {offer.expirationDate}
                  </div>
                </> : null
            }
            {
              offer?.state?.transaction ?
                <a
                  className="redeemable-offer-modal__lookout-url"
                  target="_blank"
                  href={rootStore.LookoutURL(offer.state.transaction)}
                  rel="noopener"
                >
                  {rootStore.l10n.redeemables.view_transaction}
                </a> : null
            }
          </div>
        </div>
      );
    } else {
      content = (
        <div className="redeemable-offer-modal__container">
          <div className="redeemable-offer-modal__header">
            {rootStore.l10n.redeemables.successfully_redeemed}
          </div>
          <div className="redeemable-offer-modal__content">
            <div className="redeemable-offer-modal__redeem-message">
              { rootStore.l10n.redeemables.redeemed_message }
            </div>
            {
              offerData.url ?
                <>
                  <div className="redeemable-offer-modal__image-container">
                    <QRCodeElement content={offerData.url} className="redeemable-offer-modal__image"/>
                  </div>
                  <a href={offerData.url} target="_blank" className="ellipsis redeemable-offer-modal__link">
                    { offerData.url }
                  </a>
                </> : null
            }

            {
              offerData.code ?
                <>
                  <div className="redeemable-offer-modal__code-header">
                    { rootStore.l10n.redeemables.code }
                  </div>
                  <div className="redeemable-offer-modal__code">
                    { offerData.code }
                  </div>
                </> : null
            }
          </div>
        </div>
      );
    }
  } else if(redeemed) {
    content = (
      <div className="redeemable-offer-modal__container">
        <div className="redeemable-offer-modal__header">
          {rootStore.l10n.redeemables.redeeming}
        </div>
        <div className="redeemable-offer-modal__content">
          <div className="redeemable-offer-modal__subheader">
            {rootStore.l10n.redeemables.redeeming_subheader}
          </div>
          <Loader className="redeemable-offer-modal__loader"/>
          <div className="redeemable-offer-modal__footer">
            {rootStore.l10n.redeemables.redeeming_footer}
          </div>
        </div>
      </div>
    );
  } else if(!status) {
    content = (
      <div className="redeemable-offer-modal__container">
        <div className="redeemable-offer-modal__header">
          {rootStore.l10n.redeemables.redeem_reward}
        </div>
        <div className="redeemable-offer-modal__content">
          <Loader className="redeemable-offer-modal__loader"/>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="redeemable-offer-modal__container">
        <div className="redeemable-offer-modal__header">
          { rootStore.l10n.redeemables.redeem_reward }
        </div>
        <div className="redeemable-offer-modal__content">
          {
            offer.image || offer.animation ?
              <div className="redeemable-offer-modal__image-container">
                {
                  offer.animation ?
                    <Video videoLink={offer.animation} className="redeemable-offer-modal__image redeemable-offer-modal__video"/> :
                    <ImageIcon label={offer.name} icon={offer.image.url} className="redeemable-offer-modal__image"/>
                }
              </div> : null
          }

          <div className="redeemable-offer-modal__name">
            { offer.name }
          </div>
          <RichText className="markdown-document redeemable-offer-modal__description" richText={offer.description} />
          {
            offer.expirationDate ?
              <>
                <div className="redeemable-offer-modal__date-header">
                  { rootStore.l10n.redeemables[offer.releaseDate ? "reward_valid" : "reward_expires"] }
                </div>
                <div className="redeemable-offer-modal__date">
                  { offer.releaseDate ? offer.releaseDate + " - " : "" }
                  { offer.expirationDate }
                </div>
              </> : null
          }
          {
            nftInfo.isOwned ?
              <div className="redeemable-offer-modal__actions">
                <ButtonWithLoader
                  disabled={!offer.released || offer.expired}
                  onClick={async () => await checkoutStore.RedeemOffer({
                    tenantId: nftInfo.tenantId,
                    contractAddress: nftInfo.nft.details.ContractAddr,
                    tokenId: nftInfo.nft.details.TokenIdStr,
                    offerId: offer.offer_id
                  })}
                  className="redeemable-offer-modal__action"
                >
                  {rootStore.l10n.redeemables.redeem}
                </ButtonWithLoader>
              </div> : null
          }
          {
            redeemer ?
              <a
                className="redeemable-offer-modal__lookout-url"
                target="_blank"
                href={rootStore.LookoutURL(offer.state.transaction)}
                rel="noopener"
              >
                { rootStore.l10n.redeemables.view_transaction }
              </a> : null
          }
        </div>
      </div>
    );
  }

  return (
    <Modal
      closable
      Toggle={Close}
      className="redeemable-offer-modal"
    >
      { content }
    </Modal>
  );
});


const NFTRedeemableOffers = observer(({nftInfo}) => {
  const [modalInfo, setModalInfo] = useState(undefined);

  useEffect(() => {
    (nftInfo?.redeemables || []).forEach(offer => {
      if(offer.state?.redeemer) {
        rootStore.UserProfile({userId: offer.state.redeemer});
      }
    });
  }, [nftInfo?.redeemables]);

  return (
    <>
      { modalInfo ? <NFTRedeemableOfferModal nftInfo={nftInfo} offerId={modalInfo.offerId} codeData={modalInfo.codeData} Close={() => setModalInfo(undefined)} /> : null }
      <div className="redeemable-offers">
        {
          nftInfo.redeemables.map(offer => {
            if(offer.hidden) { return null; }

            const redeemer = offer.state?.redeemer;
            const isRedeemer = Utils.EqualAddress(redeemer, rootStore.CurrentAddress());

            const disabled = !nftInfo.isOwned || (redeemer && !isRedeemer);

            let details;
            if(!redeemer || isRedeemer) {
              details = (
                <>
                  {
                    nftInfo.isOwned ?
                      <div className="redeemable-offer__cta">
                        {rootStore.l10n.redeemables[redeemer ? "view_redemption" : (offer.released && !offer.expired ? "claim_reward" : "view_details")]}
                      </div> : null
                  }
                  {
                    offer.releaseDate || offer.expirationDate ?
                      <div className="redeemable-offer__date-container">
                        <div className="redeemable-offer__date-header">
                          { rootStore.l10n.redeemables[offer.releaseDate ? "reward_valid" : "reward_expires"] }
                        </div>
                        <div className="redeemable-offer__date">
                          { offer.releaseDate || "" }
                          { offer.releaseDate && offer.expirationDate ? " - " : "" }
                          { offer.expirationDate || "" }
                        </div>
                      </div> : null
                  }
                </>
              );
            } else {
              details = (
                <div className="redeemable-offer__message">
                  { rootStore.l10n.redeemables.redeemed_by_previous }
                  &nbsp;
                  <a href={rootStore.LookoutURL(offer.state?.transaction)} rel="noopener" target="_blank" className="redeemable-offer__link">
                    { rootStore.l10n.redeemables.view_transaction }
                  </a>
                </div>
              );
            }

            return (
              <button
                key={`redeemable-offer-${offer.offer_id}`}
                onClick={() => setModalInfo({offerId: offer.offer_id})}
                disabled={disabled}
                className={`redeemable-offer ${redeemer ? "redeemable-offer--redeemed" : ""} ${offer.style ? `redeemable-offer--variant-${offer.style}` : ""}`}
              >
                <div className="redeemable-offer__header">
                  { rootStore.l10n.redeemables[redeemer ? "reward_redeemed" : "reward"] }
                </div>
                {
                  offer.image || offer.animation ?
                    <div className="redeemable-offer__image-container">
                      {
                        offer.animation ?
                          <Video videoLink={offer.animation} className="redeemable-offer__image redeemable-offer__video"/> :
                          <ImageIcon label={offer.name} icon={offer.image.url} className="redeemable-offer__image"/>
                      }
                    </div> : null
                }
                <div className="redeemable-offer__name">
                  { offer.name }
                </div>
                <RichText richText={offer.description} className="markdown-document redeemable-offer__description" />
                { details }
              </button>
            );
          })
        }
      </div>
    </>
  );
});

export default NFTRedeemableOffers;