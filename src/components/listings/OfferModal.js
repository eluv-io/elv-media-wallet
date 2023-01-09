import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {OffersTable} from "Components/listings/TransferTables";
import {rootStore} from "Stores";
import NFTCard from "Components/nft/NFTCard";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Select} from "../common/UIComponents";

import USDIcon from "Assets/icons/crypto/USD icon.svg";
import CalendarIcon from "Assets/icons/calendar.svg";

const DateOrdinal = date => date + (date > 0 ? ["th", "st", "nd", "rd"][(date > 3 && date < 21) || date % 10 > 3 ? 0 : date % 10] : "");
const ExpirationDate = duration => {
  const date = new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000);

  return `${date.toLocaleString("default", { month: "long" })} ${DateOrdinal(date.getDate())}`;
};

const OfferModal = observer(({nft, offer, Close}) => {
  const [price, setPrice] = useState(
    offer?.price ? offer.price.toFixed(2) :
      nft.details.Price ? nft.details.Price.toFixed(2) : ""
  );
  const [errorMessage, setErrorMessage] = useState(undefined);

  const [priceFloor, setPriceFloor] = useState(0);
  const [offerDuration, setOfferDuration] = useState("7");

  const offerId = offer?.id;

  useEffect(() => {
    rootStore.walletClient.TenantConfiguration({
      contractAddress: nft.details.ContractAddr
    })
      .then(config => {
        if(!config["min-list-price"]) { return; }

        const floor = parseFloat(config["min-list-price"]) || 0;
        setPriceFloor(floor);

        const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
        if(parsedPrice < floor) {
          setPrice(Math.max(parsedPrice, floor));
        }
      });
  }, []);

  const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
  const insufficientBalance = rootStore.availableWalletBalance - parsedPrice < 0;

  return (
    <Modal
      id="offer-modal"
      className="offer-modal-container"
      Toggle={() => Close()}
    >
      <div className="offer-modal">
        <h1 className="offer-modal__header">Make an Offer</h1>
        <div className="offer-modal__content">
          <NFTCard nft={nft} truncateDescription />
          <div className="offer-modal__form offer-modal__inputs">
            <div className="offer-modal__active-listings">
              <h2 className="offer-modal__active-listings__header">Active Offers for this NFT</h2>
              <OffersTable
                contractAddress={nft.details.ContractAddr}
                tokenId={nft.details.TokenIdStr}
                statuses={["ACTIVE"]}
                activeView
              />
            </div>
            <div className="offer-modal__form__inputs">
              <input
                placeholder="Set Offer Amount"
                className={`offer-modal__form__price-input ${parsedPrice > 10000 ? "offer-modal__form__price-input-error" : ""}`}
                value={price}
                onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
                onBlur={() => setPrice(parsedPrice.toFixed(2))}
              />
              <div className="offer-modal__form__price-input-label">
                <ImageIcon icon={USDIcon} />
              </div>
              {
                priceFloor && parsedPrice < priceFloor ?
                  <div className="offer-modal__form__error">
                    Minimum offer price is { FormatPriceString(priceFloor, {stringOnly: true}) }
                  </div> :
                  parsedPrice > 10000 ?
                    <div className="offer-modal__form__error">
                      Maximum offer price is $10,000
                    </div> :
                    insufficientBalance ?
                      <div className="offer-modal__form__error">
                        You do not have enough balance to complete the transaction. Add funds to complete offer.
                      </div> : null
              }
            </div>

            <div className="offer-modal__details">
              <div className="offer-modal__detail offer-modal__detail-faded">
                <label>Available Balance</label>
                {FormatPriceString(rootStore.availableWalletBalance)}
              </div>
              <div className="offer-modal__detail offer-modal__detail--bold">
                <label>Remaining Balance</label>
                <div className="offer-modal__payout">
                  {FormatPriceString(Math.max(0, rootStore.availableWalletBalance - parsedPrice))}
                </div>
              </div>
            </div>
            <div className="offer-modal__duration">
              <Select
                value={offerDuration}
                onChange={duration => setOfferDuration(duration)}
                activeValuePrefix="Expires in "
                containerClassName="offer-modal__duration__select-container"
                buttonClassName="offer-modal__duration__select"
                options={[
                  ["1", "1 Day"],
                  ["3", "3 Days"],
                  ["7", "7 Days"],
                  ["14", "14 Days"],
                  ["30", "30 Days"]
                ]}
              />
              <div className="offer-modal__duration__date">
                <ImageIcon icon={CalendarIcon} label="Calendar" />
                <div className="offer-modal__duration__target-date">
                  { ExpirationDate(offerDuration) }
                </div>
              </div>
            </div>
            <div className="offer-modal__actions">
              <ButtonWithLoader
                disabled={!parsedPrice || isNaN(parsedPrice) || insufficientBalance || parsedPrice > 10000 || (priceFloor && parsedPrice < priceFloor)}
                className="action action-primary offer-modal__action offer-modal__action-primary"
                onClick={async () => {
                  try {
                    setErrorMessage(undefined);
                    await rootStore.walletClient.CreateMarketplaceOffer({
                      contractAddress: nft.details.ContractAddr,
                      tokenId: nft.details.TokenIdStr,
                      offerId,
                      price: parsedPrice,
                      expiresAt: Date.now() + parseInt(offerDuration) * 24 * 60 * 60 * 1000
                    });

                    Close();
                  } catch(error) {
                    rootStore.Log("Offer failed", true);
                    rootStore.Log(error, true);

                    setErrorMessage("Unable to make this offer");
                  }
                }}
              >
                Confirm Offer for { FormatPriceString(parsedPrice, {stringOnly: true}) }
              </ButtonWithLoader>
              {
                offerId ?
                  <button
                    className="action action-danger offer-modal__action offer-modal__action-delete"
                    onClick={async () => Confirm({
                      message: "Are you sure you want to cancel this offer?",
                      Confirm: async () => {
                        await rootStore.walletClient.RemoveMarketplaceOffer({offerId});
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        Close({deleted: true});
                      }
                    })}
                  >
                    Cancel Offer
                  </button> : null
              }
              <button className="action offer-modal__action" onClick={() => Close()}>
                Cancel
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
