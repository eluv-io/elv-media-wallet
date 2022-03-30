import React, {useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {ActiveListings} from "Components/listings/TransferTables";
import {cryptoStore, rootStore, transferStore} from "Stores";
import NFTCard from "Components/common/NFTCard";
import {ButtonWithLoader} from "Components/common/UIComponents";
import { roundToUp } from "round-to";
import ImageIcon from "Components/common/ImageIcon";

import USDCIcon from "Assets/icons/USDC coin icon.svg";
import WalletConnect from "Components/crypto/WalletConnect";

const ListingModal = observer(({nft, Close}) => {
  const [price, setPrice] = useState(nft.details.Price ? nft.details.Price.toFixed(2) : "");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);

  const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
  const payout = roundToUp(parsedPrice * 0.9, 2);

  const royaltyFee = parsedPrice - payout;

  const InputStage = () => {
    return (
      <div className="listing-modal__form listing-modal__inputs">
        <div className="listing-modal__form__inputs">
          <input
            placeholder="Price"
            className={`listing-modal__form__price-input ${parsedPrice > 10000 ? "listing-modal__form__price-input-error" : ""}`}
            value={price}
            onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
            onBlur={() => setPrice(parsedPrice.toFixed(2))}
          />
          <div className="listing-modal__form__price-input-label">
            USD
            { cryptoStore.usdcConnected ? <ImageIcon icon={USDCIcon} title="USDC Available" /> : null }
          </div>
          {
            parsedPrice > 10000 ?
              <div className="listing-modal__form__error">
                Maximum listing price is $10,000
              </div> : null
          }
        </div>

        <div className="listing-modal__wallet-connect">
          <WalletConnect />
        </div>

        <div className="listing-modal__details">
          <div className="listing-modal__detail listing-modal__detail-faded">
            <label>Creator Royalty</label>
            <div>${royaltyFee.toFixed(2)}</div>
          </div>
          <div className="listing-modal__detail">
            <label>Total Payout</label>
            <div className="listing-modal__payout">{ cryptoStore.usdcConnected ? <ImageIcon icon={USDCIcon} title="USDC Available" /> : null }${Math.max(0, payout).toFixed(2)}</div>
          </div>
        </div>
        <div className="listing-modal__active-listings">
          <h2 className="listing-modal__active-listings__header">Active Listings for this NFT</h2>
          <ActiveListings contractAddress={nft.details.ContractAddr} />
        </div>
        <div className="listing-modal__actions">
          <button className="action listing-modal__action" onClick={() => Close()}>
            Cancel
          </button>
          {
            nft.details.ListingId ?
              <button
                className="action action-danger listing-modal__action listing-modal__action-delete"
                onClick={async () => Confirm({
                  message: "Are you sure you want to remove this listing?",
                  Confirm: async () => {
                    await transferStore.RemoveListing({listingId: nft.details.ListingId});
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    Close({deleted: true});
                  }
                })}
              >
                Remove Listing
              </button> : null
          }
          <button
            disabled={!parsedPrice || isNaN(parsedPrice) || payout <= 0 || parsedPrice > 10000}
            className="action action-primary listing-modal__action listing-modal__action-primary"
            onClick={() => {
              setShowConfirmation(true);

              const modal = document.getElementById("listing-modal");
              modal && modal.scrollTo(0, 0);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  const ConfirmationStage = () => {
    return (
      <div className="listing-modal__form listing-modal__confirmation">
        <div className="listing-modal__details">
          <div className="listing-modal__detail">
            <label>Listing Price</label>
            <div>${(parsedPrice).toFixed(2)}</div>
          </div>
          <div className="listing-modal__detail-separator" />
          <div className="listing-modal__detail listing-modal__detail-faded">
            <label>Creator Royalty</label>
            <div>${royaltyFee.toFixed(2)}</div>
          </div>
          <div className="listing-modal__detail">
            <label>Total Payout</label>
            <div className="listing-modal__payout">{ cryptoStore.usdcConnected ? <ImageIcon icon={USDCIcon} title="USDC Available" /> : null }${payout.toFixed(2)}</div>
          </div>
        </div>
        <div className="listing-modal__message">
          Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT. Account holders acknowledge that, during this hold period, a seller will be unable to use or withdraw the amounts attributable to such sale(s).  The current hold period for spending the balance is 7 days, and withdrawing the balance is 30 days.
        </div>
        <div className="listing-modal__actions">
          <button
            className="action listing-modal__action"
            onClick={() => {
              setShowConfirmation(false);

              const modal = document.getElementById("listing-modal");
              modal && modal.scrollTo(0, 0);
            }}
          >
            Back
          </button>
          <ButtonWithLoader
            className="action action-primary listing-modal__action listing-modal__action-primary"
            onClick={async () => {
              try {
                setErrorMessage(undefined);
                const listingId = await transferStore.CreateListing({
                  contractAddress: nft.details.ContractAddr,
                  tokenId: nft.details.TokenIdStr,
                  price: parsedPrice,
                  listingId: nft.details.ListingId
                });

                Close({listingId: listingId || nft.details.ListingId});
              } catch(error) {
                rootStore.Log("Listing failed", true);
                rootStore.Log(error, true);

                // TODO: Figure out what the error is
                setErrorMessage("Unable to list this NFT");
              }
            }}
          >
            Place for Sale
          </ButtonWithLoader>
        </div>
        {
          errorMessage ?
            <div className="listing-modal__error-message">
              { errorMessage }
            </div> : null
        }
      </div>
    );
  };

  return (
    <Modal
      id="listing-modal"
      className="listing-modal-container"
      Toggle={() => Close()}
    >
      <div className="listing-modal">
        <h1 className="listing-modal__header">List Your NFT for Sale</h1>
        <div className="listing-modal__content">
          <NFTCard nft={nft} price={{USD: parsedPrice}} usdcAccepted={cryptoStore.usdcConnected} showOrdinal />
          { showConfirmation ? ConfirmationStage() : InputStage() }
        </div>
      </div>
    </Modal>
  );
});

export default ListingModal;
