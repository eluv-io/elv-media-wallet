import React, {useState, useRef} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {NFTImage} from "Components/common/Images";
import Confirm from "Components/common/Confirm";
import {ActiveListings} from "Components/sales/TransferTables";
import {transferStore} from "Stores";

const ListingModal = observer(({nft, Close}) => {
  const [price, setPrice] = useState(nft.details.Total ? nft.details.Total.toFixed(2) : "");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const ref = useRef(null);

  const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
  const serviceFee = 0.99; //parsedPrice * 0.1;

  const InputStage = () => {
    return (
      <div className="nft-listing__form nft-listing__inputs">
        <div className="nft-listing__form__inputs">
          <input
            placeholder="Price"
            className="nft-listing__form__price-input"
            value={price}
            onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
            onBlur={() => setPrice(parsedPrice.toFixed(2))}
          />
          <div className="nft-listing__form__price-input-label">
            USD
          </div>
        </div>
        <div className="nft-listing__details">
          <div className="nft-listing__detail nft-listing__detail-faded">
            <label>Marketplace Service Fee</label>
            <div>${serviceFee.toFixed(2)}</div>
          </div>
          <div className="nft-listing__detail">
            <label>Total Payout</label>
            <div>${Math.max(0, (parsedPrice - serviceFee)).toFixed(2)}</div>
          </div>
        </div>
        <div className="nft-listing__active-listings">
          <h2 className="nft-listing__active-listings__header">Active Listings for this NFT</h2>
          <ActiveListings contractAddress={nft.details.ContractAddr} />
        </div>
        <div className="nft-listing__actions">
          <button className="nft-listing__action" onClick={Close}>
            Cancel
          </button>
          <button
            disabled={!parsedPrice || isNaN(parsedPrice) || parsedPrice - serviceFee <= 0}
            className="nft-listing__action nft-listing__action-primary"
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
      <div className="nft-listing__form nft-listing__confirmation">
        <div className="nft-listing__details">
          <div className="nft-listing__detail">
            <label>Listing Price</label>
            <div>${(parsedPrice).toFixed(2)}</div>
          </div>
          <div className="nft-listing__detail-separator" />
          <div className="nft-listing__detail nft-listing__detail-faded">
            <label>Marketplace Service Fee</label>
            <div>${serviceFee.toFixed(2)}</div>
          </div>
          <div className="nft-listing__detail">
            <label>Total Payout</label>
            <div>${(parsedPrice + serviceFee).toFixed(2)}</div>
          </div>
        </div>
        <div className="nft-listing__actions">
          <button
            className="nft-listing__action"
            onClick={() => {
              setShowConfirmation(false);

              ref && ref.current && ref.current.parentElement.scrollTo(0, 0);
            }}
          >
            Back
          </button>
          <button
            className="nft-listing__action nft-listing__action-primary"
            onClick={async () => Confirm({
              message: "Are you sure you want to list this NFT?",
              Confirm: async () => {
                const listingId = await transferStore.CreateListing({
                  contractAddress: nft.details.ContractAddr,
                  tokenId: nft.details.TokenIdStr,
                  price: parsedPrice - serviceFee,
                  listingId: nft.details.ListingId
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                Close(listingId || nft.details.ListingId);
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
      className="nft-listing-modal"
      Toggle={Close}
    >
      <div className="nft-listing" ref={ref}>
        <h1 className="nft-listing__header">List Your NFT for Sale</h1>
        <div className="nft-listing__content">
          <div className="nft-listing__image-container">
            <div className="card-padding-container">
              <NFTImage nft={nft} className="nft-listing__image" />
            </div>
          </div>
          <div className="nft-listing__nft-info">
            <div className="card__titles">
              <div className="card__subtitle">
                { typeof nft.details.TokenOrdinal !== "undefined" ? `${parseInt(nft.details.TokenOrdinal)} / ${nft.details.Cap}` : nft.details.TokenIdStr }
              </div>
              <h2 className="card__title">
                { nft.metadata.display_name }
              </h2>
            </div>
          </div>
          { showConfirmation ? ConfirmationStage() : InputStage() }
        </div>
      </div>
    </Modal>
  );
});

export default ListingModal;
