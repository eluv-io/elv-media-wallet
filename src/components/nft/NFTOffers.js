import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, QRCodeElement, RichText} from "Components/common/UIComponents";
import {Link, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";

import YouRedeemedIcon from "Assets/icons/you-redeemed";
import RedeemedIcon from "Assets/icons/redeemed";
import {MiddleEllipsis} from "../../utils/Utils";

const NFTOfferCodeModal = observer(({offer, Close}) => {
  return (
    <Modal
      closable
      Toggle={Close}
      className="details-page__offer-code-modal-container"
    >
      <div className="details-page__offer-code-modal">
        <div className="details-page__offer-code-modal__header">
          { offer.name }
        </div>
        <QRCodeElement content={JSON.stringify(offer.codeData)} />
      </div>
    </Modal>
  );
});

const NFTOffers = observer(({nftInfo}) => {
  const match = useRouteMatch();
  const [showOfferCode, setShowOfferCode] = useState(undefined);

  useEffect(() => {
    (nftInfo?.offers || []).forEach(offer => {
      if(offer.state?.redeemer) {
        rootStore.UserProfile({userId: offer.state.redeemer});
      }
    });
  }, [nftInfo?.offers]);

  return (
    <>
      { showOfferCode ? <NFTOfferCodeModal nftInfo={nftInfo} offer={showOfferCode} Close={() => setShowOfferCode(undefined)} /> : null }
      <div className="details-page__offers">
        <div className="card-list details-page__offers__list">
          {
            nftInfo.offers.map(offer => {
              if(offer.hidden) { return null; }

              const redeemer = offer.state?.redeemer;
              const redeemerName = redeemer && rootStore.userProfiles[redeemer]?.userName;
              const isRedeemer = Utils.EqualAddress(redeemer, rootStore.CurrentAddress());

              return (
                <div
                  key={`offer-${offer.name}`}
                  className={
                    [
                      "card-container",
                      "card-container--no-border",
                      rootStore.centerItems ? "card-container--centered" : "",
                      "details-page__offer",
                      "redeemable-offer",
                      offer.style ? `redeemable-offer--variant-${offer.style}` : "",
                      redeemer ? "redeemable-offer--redeemed" : ""
                    ]
                      .filter(c => c)
                      .join(" ")
                  }
                >
                  <div className="item-card">
                    {
                      offer.imageUrl ?
                        <div className="item-card__image-container">
                          <img alt={offer.name} src={offer.imageUrl} className="item-card__image details-page__offer__image"/>
                        </div> : null
                    }
                    <div className="item-card__text">
                      <div className="item-card__tag">Redeemable Offer</div>
                      <div className="item-card__title">{offer.name}</div>
                      <RichText richText={offer.description} className="item-card__description" />
                      {
                        offer.releaseDate || offer.expirationDate ?
                          <div className="item-card__dates">
                            {
                              offer.releaseDate ?
                                <div className="item-card__date">
                                  <div className="item-card__date__label">
                                    Redemption Available
                                  </div>
                                  <div className="item-card__date__date">
                                    { offer.releaseDate }
                                  </div>
                                </div> : null
                            }
                            { offer.releaseDate && offer.expirationDate ? <div className="item-card__dates__separator" /> : null }
                            {
                              offer.expirationDate ?
                                <div className="item-card__date">
                                  <div className="item-card__date__label">
                                    Redemption Expires
                                  </div>
                                  <div className="item-card__date__date">
                                    { offer.expirationDate }
                                  </div>
                                </div> : null
                            }
                          </div> : null
                      }
                      {
                        nftInfo.isOwned && !redeemer ?
                          <div className="item-card__actions">
                            <ButtonWithLoader
                              disabled={!offer.released || offer.expired || (!offer.offer_id && typeof offer.offer_id === "string")}
                              className="action action-primary item-card__action"
                              onClick={async () => {
                                await checkoutStore.RedeemOffer({
                                  tenantId: nftInfo.tenantId,
                                  contractAddress: nftInfo.nft.details.ContractAddr,
                                  tokenId: nftInfo.nft.details.TokenIdStr,
                                  offerId: offer.offer_id
                                });

                                let finished = false;
                                while(!finished) {
                                  await new Promise(resolve => setTimeout(resolve, 10000));

                                  const status = await rootStore.OfferRedemptionStatus({
                                    contractAddress: nftInfo.nft.details.ContractAddr,
                                    tokenId: nftInfo.nft.details.TokenIdStr,
                                    offerId: offer.offer_id
                                  });

                                  finished = status?.status === "complete";
                                }

                                await rootStore.LoadNFTData({
                                  contractAddress: nftInfo.nft.details.ContractAddr,
                                  tokenId: nftInfo.nft.details.TokenIdStr,
                                  force: true
                                });
                              }}
                            >
                              Redeem
                            </ButtonWithLoader>
                          </div> : null
                      }
                    </div>
                    {
                      redeemer ?
                        <div className="item-card__text redeemable-offer__redeem-info">
                          <ImageIcon
                            icon={isRedeemer ? YouRedeemedIcon : RedeemedIcon}
                            className="redeemable-offer__redeemed-icon"
                          />
                          {
                            isRedeemer ?
                              <div className="item-card__actions">
                                <ButtonWithLoader
                                  onClick={async () => {
                                    const codeData = await rootStore.GenerateOfferCodeData({nftInfo, offer});

                                    setShowOfferCode({...offer, codeData});
                                  }}
                                  className="action action-primary item-card__action"
                                >
                                  View Redemption Code
                                </ButtonWithLoader>
                              </div> :
                              <Link
                                to={
                                  match.params.marketplaceId ?
                                    UrlJoin("/marketplace", match.params.marketplaceId, "users", redeemerName || redeemer, "items") :
                                    UrlJoin("/wallet", "users", redeemerName || redeemer, "items")
                                }
                                className="redeemable-offer__redeemer"
                              >
                                <div className="redeemable-offer__redeemer__name">
                                  By { redeemerName ? `@${redeemerName}` : MiddleEllipsis(redeemer, 20) }
                                </div>
                                { redeemerName ? <div className="redeemable-offer__redeemer__address">{ redeemer }</div> : null }
                              </Link>
                          }

                          <a
                            className="redeemable-offer__lookout-url"
                            target="_blank"
                            href={
                              rootStore.walletClient.network === "main" ?
                                `https://explorer.contentfabric.io/tx/${offer.state.transaction}` :
                                `https://lookout.qluv.io/tx/${offer.state.transaction}`
                            }
                            rel="noopener"
                          >
                            See More Info on Eluvio Lookout
                          </a>
                        </div> : null
                    }
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </>
  );
});

export default NFTOffers;
