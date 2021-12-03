import React, {useState, useRef} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {ActiveListings} from "Components/listings/TransferTables";
import {transferStore} from "Stores";
import ListingModalCard from "Components/listings/ListingModalCard";

const ListingModal = observer(({nft, Close}) => {
  const [price, setPrice] = useState(nft.details.Total ? nft.details.Total.toFixed(2) : "");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const ref = useRef(null);

  const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
  const serviceFee = Math.max(0.99, parsedPrice - parsedPrice / 1.025);
  const payout = parseFloat((parsedPrice - serviceFee).toFixed(2));

  const InputStage = () => {
    return (
      <div className="listing-modal__form listing-modal__inputs">
        <div className="listing-modal__form__inputs">
          <input
            placeholder="Price"
            className="listing-modal__form__price-input"
            value={price}
            onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
            onBlur={() => setPrice(parsedPrice.toFixed(2))}
          />
          <div className="listing-modal__form__price-input-label">
            USD
          </div>
        </div>
        <div className="listing-modal__details">
          <div className="listing-modal__detail listing-modal__detail-faded">
            <label>Marketplace Service Fee</label>
            <div>${serviceFee.toFixed(2)}</div>
          </div>
          <div className="listing-modal__detail">
            <label>Total Payout</label>
            <div>${Math.max(0, payout).toFixed(2)}</div>
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
            disabled={!parsedPrice || isNaN(parsedPrice) || payout <= 0}
            className="action action-primary listing-modal__action listing-modal__action-primary"
            onClick={() => {
              setShowConfirmation(true);

              ref && ref.current && ref.current.parentElement.scrollTo(0, 0);
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
            <label>Marketplace Service Fee</label>
            <div>${serviceFee.toFixed(2)}</div>
          </div>
          <div className="listing-modal__detail">
            <label>Total Payout</label>
            <div>${payout.toFixed(2)}</div>
          </div>
        </div>
        <div className="listing-modal__actions">
          <button
            className="action listing-modal__action"
            onClick={() => {
              setShowConfirmation(false);

              ref && ref.current && ref.current.parentElement.scrollTo(0, 0);
            }}
          >
            Back
          </button>
          <button
            className="action action-primary listing-modal__action listing-modal__action-primary"
            onClick={async () => Confirm({
              message: "Are you sure you want to list this NFT?",
              Confirm: async () => {
                const listingId = await transferStore.CreateListing({
                  contractAddress: nft.details.ContractAddr,
                  tokenId: nft.details.TokenIdStr,
                  price: payout,
                  listingId: nft.details.ListingId
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                Close({listingId: listingId || nft.details.ListingId});
              }
            })}
          >
            Place for Sale
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      className="listing-modal-container"
      Toggle={() => Close()}
    >
      <div className="listing-modal" ref={ref}>
        <h1 className="listing-modal__header">List Your NFT for Sale</h1>
        <div className="listing-modal__content">
          <ListingModalCard nft={nft} price={{USD: parsedPrice}} />
          { showConfirmation ? ConfirmationStage() : InputStage() }
        </div>
      </div>
    </Modal>
  );
});

export default ListingModal;
