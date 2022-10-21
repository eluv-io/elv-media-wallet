import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {ActiveListings} from "Components/listings/TransferTables";
import {cryptoStore, rootStore} from "Stores";
import NFTCard from "Components/nft/NFTCard";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";
import {roundToDown, roundToUp} from "round-to";
import ImageIcon from "Components/common/ImageIcon";
import WalletConnect from "Components/crypto/WalletConnect";

import USDIcon from "Assets/icons/crypto/USD icon.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import {Loader} from "Components/common/Loaders";

const ListingModal = observer(({nft, listingId, Close}) => {
  const [price, setPrice] = useState(nft.details.Price ? nft.details.Price.toFixed(2) : "");
  const [errorMessage, setErrorMessage] = useState(undefined);

  const [priceFloor, setPriceFloor] = useState(0);
  const [royaltyRate, setRoyaltyRate] = useState(undefined);

  useEffect(() => {
    rootStore.walletClient.TenantConfiguration({
      contractAddress: nft.details.ContractAddr
    })
      .then(config => {
        setRoyaltyRate(parseFloat((config || {})["nft-royalty"] || 10) / 100);

        if(config["min-list-price"]) {
          const floor = parseFloat(config["min-list-price"]) || 0;
          setPriceFloor(floor);

          const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
          if(parsedPrice < floor) {
            setPrice(Math.max(parsedPrice, floor));
          }
        }
      });
  }, []);

  const parsedPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
  const payout = roundToUp(parsedPrice * (1 - royaltyRate), 2);
  const royaltyFee = roundToDown(parsedPrice - payout, 2);

  return (
    <Modal
      id="listing-modal"
      className="listing-modal-container"
      Toggle={() => Close()}
    >
      <div className="listing-modal">
        <h1 className="listing-modal__header">Sell your NFT</h1>
        <div className="listing-modal__content">
          <NFTCard nft={nft} price={{USD: parsedPrice}} usdcAccepted={cryptoStore.usdcConnected} usdcOnly={cryptoStore.usdcOnly} truncateDescription />
          <div className="listing-modal__form listing-modal__inputs">
            <div className="listing-modal__active-listings">
              <h2 className="listing-modal__active-listings__header">Active Listings for this NFT</h2>
              <ActiveListings
                contractAddress={nft.details.ContractAddr}
                selectedListingId={listingId}
              />
            </div>
            <div className="listing-modal__form__inputs">
              <input
                placeholder="Set Price"
                className={`listing-modal__form__price-input ${parsedPrice > 10000 ? "listing-modal__form__price-input-error" : ""}`}
                value={price}
                onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
                onBlur={() => setPrice(parsedPrice.toFixed(2))}
              />
              <div className="listing-modal__form__price-input-label">
                { cryptoStore.usdcOnly ? null : <ImageIcon icon={USDIcon} /> }
                { cryptoStore.usdcConnected ? <ImageIcon icon={USDCIcon} title="USDC Available" /> : null }
              </div>
              {
                priceFloor && parsedPrice < priceFloor ?
                  <div className="listing-modal__form__error">
                    Minimum listing price is { FormatPriceString({USD: priceFloor}) }
                  </div> : null
              }
              {
                parsedPrice > 10000 ?
                  <div className="listing-modal__form__error">
                    Maximum listing price is $10,000
                  </div> : null
              }
            </div>

            <div className="listing-modal__details">
              {
                royaltyRate ?
                  <>
                    <div className="listing-modal__detail listing-modal__detail-faded">
                      <label>Creator Royalty</label>
                      <div>${royaltyFee.toFixed(2)}</div>
                    </div>
                    <div className="listing-modal__detail listing-modal__detail--bold">
                      <label>Total Payout</label>
                      <div
                        className="listing-modal__payout"
                      >
                        {cryptoStore.usdcConnected ? <ImageIcon icon={USDCIcon} title="USDC Available"/> : null} ${Math.max(0, payout).toFixed(2)}
                      </div>
                    </div>
                  </> : <Loader/>
              }
            </div>
            {
              !cryptoStore.usdcConnected && rootStore.usdcDisabled ?
                <div className="listing-modal__wallet-connect">
                  <WalletConnect showPaymentPreference />
                </div> : null
            }
            <div className="listing-modal__actions">
              <ButtonWithLoader
                disabled={!parsedPrice || isNaN(parsedPrice) || payout <= 0 || parsedPrice > 10000 || (priceFloor && parsedPrice < priceFloor)}
                className="action action-primary listing-modal__action listing-modal__action-primary"
                onClick={async () => {
                  try {
                    setErrorMessage(undefined);
                    const listingId = await rootStore.walletClient.CreateListing({
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
                List now for { FormatPriceString({USD: parsedPrice}) }
              </ButtonWithLoader>
              {
                nft.details.ListingId ?
                  <button
                    className="action action-danger listing-modal__action listing-modal__action-delete"
                    onClick={async () => Confirm({
                      message: "Are you sure you want to remove this listing?",
                      Confirm: async () => {
                        await rootStore.walletClient.RemoveListing({listingId: nft.details.ListingId});
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        Close({deleted: true});
                      }
                    })}
                  >
                    Remove Listing
                  </button> : null
              }
              <button className="action listing-modal__action" onClick={() => Close()}>
                Cancel
              </button>
            </div>
            {
              errorMessage ?
                <div className="listing-modal__error-message">
                  { errorMessage }
                </div> : null
            }

            <div className="listing-modal__message">
              Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT. Account holders acknowledge that, during this hold period, a seller will be unable to withdraw the amounts attributable to such sale(s). The current hold period for withdrawing the balance is 15 days.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default ListingModal;
