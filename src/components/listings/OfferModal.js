import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {OffersTable} from "Components/listings/TransferTables";
import {checkoutStore, rootStore} from "Stores";
import NFTCard from "Components/nft/NFTCard";
import {ButtonWithLoader, FormatPriceString, ParseMoney, FromUSD, LocalizeString, ToUSD} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Select} from "../common/UIComponents";
import {roundToDown} from "round-to";
import UrlJoin from "url-join";
import {Link, useRouteMatch} from "react-router-dom";

import USDIcon from "Assets/icons/crypto/USD icon.svg";
import CalendarIcon from "Assets/icons/calendar.svg";

const DateOrdinal = date => date + (date > 0 ? ["th", "st", "nd", "rd"][(date > 3 && date < 21) || date % 10 > 3 ? 0 : date % 10] : "");
const ExpirationDate = duration => {
  const date = new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000);

  return `${date.toLocaleString("default", { month: "long" })} ${DateOrdinal(date.getDate())}`;
};

const OfferModal = observer(({nft, offer, Close}) => {
  const match = useRouteMatch();

  const [price, setPrice] = useState(
    offer?.price ? FromUSD(offer.price).toString() :
      nft.details.Price ?
        FromUSD(nft.details.Price).toString() : ""
  );

  const [errorMessage, setErrorMessage] = useState(undefined);

  const priceCeiling = FromUSD(10000).toDecimal();
  const [priceFloor, setPriceFloor] = useState(0);
  const [offerDuration, setOfferDuration] = useState("7");
  const [feeRate, setFeeRate] = useState(0.065);

  const offerId = offer?.id;

  // If editing, add the current offer price to the available balance
  let availableBalance = FromUSD(rootStore.availableWalletBalance);
  if(offer) {
    availableBalance = availableBalance.add(FromUSD(offer.price)).add(FromUSD(offer.fee));
  }

  const parsedPrice = ParseMoney(price, checkoutStore.currency);
  const floatPrice = parsedPrice.toDecimal();
  const fee = ParseMoney(Math.max(1, roundToDown(floatPrice * feeRate, 2)), checkoutStore.currency);
  const insufficientBalance = availableBalance - parsedPrice - fee < 0;

  useEffect(() => {
    rootStore.GetWalletBalance();

    rootStore.walletClient.TenantConfiguration({
      contractAddress: nft.details.ContractAddr
    })
      .then(config => {
        if(config["nft-fee-percent"]) {
          setFeeRate(parseFloat(config["nft-fee-percent"]) / 100);
        }

        if(!config["min-list-price"]) { return; }

        const floor = FromUSD(parseFloat(config["min-list-price"]) || 0).toDecimal();
        setPriceFloor(floor);

        if(floatPrice < floor) {
          setPrice(ParseMoney(Math.max(floatPrice. floor), checkoutStore.currency));
        }
      });
  }, []);

  return (
    <Modal
      id="offer-modal"
      className="offer-modal-container"
      Toggle={() => Close()}
    >
      <div className="offer-modal">
        <h1 className="offer-modal__header">{ rootStore.l10n.offers.make_an_offer }</h1>
        <div className="offer-modal__content">
          <NFTCard nft={nft} truncateDescription />
          <div className="offer-modal__form offer-modal__inputs">
            <div className="offer-modal__active-listings">
              <h2 className="offer-modal__active-listings__header">{ rootStore.l10n.offers.active_offers }</h2>
              <OffersTable
                contractAddress={nft.details.ContractAddr}
                tokenId={nft.details.TokenIdStr}
                statuses={["ACTIVE"]}
                activeView
              />
            </div>
            <div className="offer-modal__form__inputs">
              <div className="offer-modal__form__input-container">
                <input
                  placeholder={rootStore.l10n.offers.set_offer_amount}
                  className={`offer-modal__form__price-input ${floatPrice > priceCeiling ? "offer-modal__form__price-input-error" : ""}`}
                  value={price}
                  onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={() => setPrice(parsedPrice.toString())}
                />
                <div className="offer-modal__form__price-input-label">
                  <ImageIcon icon={USDIcon} />
                </div>
              </div>
              {
                priceFloor && floatPrice < priceFloor ?
                  <div className="offer-modal__form__error">
                    { LocalizeString(rootStore.l10n.offers.min_offer_price, {price: FormatPriceString(priceFloor, {stringOnly: true, noConversion: true})}) }
                  </div> :
                  floatPrice > priceCeiling ?
                    <div className="offer-modal__form__error">
                      { LocalizeString(rootStore.l10n.offers.max_offer_price, {price: FormatPriceString(priceCeiling, {stringOnly: true, noConversion: true})}) }
                    </div> :
                    insufficientBalance ?
                      <div className="offer-modal__form__error">
                        You do not have enough balance to complete the transaction.
                        <Link to={match.params.marketplaceId ? UrlJoin("/marketplace", match.params.marketplaceId, "profile?add-funds") : "/wallet/profile?add-funds"}>
                          Add funds
                        </Link>
                        to complete offer.
                      </div> : null
              }
            </div>

            <div className="offer-modal__duration">
              <Select
                value={offerDuration}
                onChange={duration => setOfferDuration(duration)}
                containerClassName="offer-modal__duration__select-container"
                buttonClassName="offer-modal__duration__select"
                options={[
                  ["1", rootStore.l10n.offers.expires_in_single],
                  ["3", LocalizeString(rootStore.l10n.offers.expires_in, {number: 3})],
                  ["7", LocalizeString(rootStore.l10n.offers.expires_in, {number: 7})],
                  ["14", LocalizeString(rootStore.l10n.offers.expires_in, {number: 14})],
                  ["30", LocalizeString(rootStore.l10n.offers.expires_in, {number: 30})],
                ]}
              />
              <div className="offer-modal__duration__date">
                <ImageIcon icon={CalendarIcon} label="Calendar" />
                <div className="offer-modal__duration__target-date">
                  { ExpirationDate(offerDuration) }
                </div>
              </div>
            </div>

            <div className="offer-modal__order-details">
              <div className="offer-modal__order-line-item">
                <div className="offer-modal__order-label">
                  { nft.metadata.display_name }
                </div>
                <div className="offer-modal__order-price">
                  { FormatPriceString(parsedPrice, {noConversion: true}) }
                </div>
              </div>
              <div className="offer-modal__order-line-item">
                <div className="offer-modal__order-label">
                  { rootStore.l10n.purchase.service_fee }
                </div>
                <div className="offer-modal__order-price">
                  { FormatPriceString(fee, {noConversion: true}) }
                </div>
              </div>
              <div className="offer-modal__order-separator" />
              <div className="offer-modal__order-line-item">
                <div className="offer-modal__order-label">
                  { rootStore.l10n.purchase.total }
                </div>
                <div className="offer-modal__order-price">
                  { FormatPriceString(parsedPrice.add(fee), {noConversion: true}) }
                </div>
              </div>
            </div>
            <div className="offer-modal__order-details offer-modal__order-details-box">
              <div className="offer-modal__order-line-item">
                <div className="offer-modal__order-label">
                  { LocalizeString(rootStore.l10n.purchase.available_balance, {balanceType: rootStore.l10n.purchase.wallet_balance}) }
                </div>
                <div className="offer-modal__order-price">
                  {FormatPriceString(availableBalance, {vertical: true, noConversion: true})}
                </div>
              </div>
              <div className="offer-modal__order-line-item">
                <div className="offer-modal__order-label">
                  { rootStore.l10n.purchase.current_purchase_amount }
                </div>
                <div className="offer-modal__order-price">
                  {FormatPriceString(parsedPrice.add(fee), {vertical: true, noConversion: true})}
                </div>
              </div>
              <div className="offer-modal__order-separator"/>
              <div className="offer-modal__order-line-item">
                <div className="offer-modal__order-label">
                  { LocalizeString(rootStore.l10n.purchase.remaining_balance, {balanceType: rootStore.l10n.purchase.wallet_balance}) }
                </div>
                <div className="offer-modal__order-price">
                  {FormatPriceString(Math.max(0, availableBalance.subtract(parsedPrice).subtract(fee)), {vertical: true, noConversion: true})}
                </div>
              </div>
              {
                checkoutStore.currency === "USD" ? null :
                  <div className="offer-modal__order-note">
                    { rootStore.l10n.purchase.conversion_note }
                  </div>
              }
            </div>
            <div className="offer-modal__actions">
              <ButtonWithLoader
                disabled={!parsedPrice || parsedPrice.toDecimal() <= 0 || insufficientBalance || floatPrice > priceCeiling || (priceFloor && floatPrice < priceFloor)}
                className="action action-primary offer-modal__action offer-modal__action-primary"
                onClick={async () => {
                  try {
                    setErrorMessage(undefined);
                    await rootStore.walletClient.CreateMarketplaceOffer({
                      contractAddress: nft.details.ContractAddr,
                      tokenId: nft.details.TokenIdStr,
                      offerId,
                      price: ToUSD(parsedPrice).toDecimal(),
                      expiresAt: Date.now() + parseInt(offerDuration) * 24 * 60 * 60 * 1000
                    });

                    rootStore.GetWalletBalance();

                    Close();
                  } catch(error) {
                    rootStore.Log("Offer failed", true);
                    rootStore.Log(error, true);

                    setErrorMessage(rootStore.l10n.offers.errors.failed);
                  }
                }}
              >
                { LocalizeString(rootStore.l10n.actions.offers.confirm, { price: FormatPriceString(parsedPrice, {stringOnly: true, noConversion: true}) }) }
              </ButtonWithLoader>
              {
                offerId ?
                  <button
                    className="action action-danger offer-modal__action offer-modal__action-delete"
                    onClick={async () => Confirm({
                      message: rootStore.l10n.actions.offers.remove_confirm,
                      Confirm: async () => {
                        await rootStore.walletClient.RemoveMarketplaceOffer({offerId});
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        rootStore.GetWalletBalance();
                        Close({deleted: true});
                      }
                    })}
                  >
                    { rootStore.l10n.actions.offers.remove }
                  </button> : null
              }
              <button className="action offer-modal__action" onClick={() => Close()}>
                { rootStore.l10n.actions.cancel }
              </button>
            </div>
            {
              errorMessage ?
                <div className="offer-modal__error-message">
                  { errorMessage }
                </div> : null
            }
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default OfferModal;
