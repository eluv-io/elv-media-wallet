import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Confirm from "Components/common/Confirm";
import {ActiveListings} from "Components/listings/TransferTables";
import {checkoutStore, cryptoStore, rootStore} from "Stores";
import NFTCard from "Components/nft/NFTCard";
import {
  FormatPriceString,
  FromUSD,
  LocalizeString,
  ParseMoney,
  ToUSD
} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import WalletConnect from "Components/crypto/WalletConnect";

import USDIcon from "Assets/icons/crypto/USD icon.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import {Loader} from "Components/common/Loaders";
import {Button, Modal} from "Components/properties/Common";

const ListingModal = observer(({nft, listingId, Close}) => {
  const [price, setPrice] = useState(nft.details.Price ? FromUSD(nft.details.Price).toString() : "");
  const [errorMessage, setErrorMessage] = useState(undefined);

  const priceCeiling = FromUSD(10000).toDecimal();
  const [priceFloor, setPriceFloor] = useState(0);
  const [royaltyRate, setRoyaltyRate] = useState(0);

  useEffect(() => {
    rootStore.walletClient.TenantConfiguration({
      contractAddress: nft.details.ContractAddr
    })
      .then(config => {
        setRoyaltyRate(parseFloat((config || {})["nft-royalty"] || 10));

        if(config["min-list-price"]) {
          const floor = parseFloat(config["min-list-price"]) || 0;
          setPriceFloor(FromUSD(floor).toDecimal());

          const parsedPrice = ParseMoney(price);
          if(parsedPrice < floor) {
            setPrice(Math.max(parsedPrice.toDecimal(), floor.toDecimal()).toString);
          }
        }
      });
  }, []);

  const inputPrice = ParseMoney(price, checkoutStore.currency);
  const parsedPrice = checkoutStore.currency === "USD" ? inputPrice : FromUSD(ToUSD(inputPrice, "floor"));
  const floatPrice = parsedPrice.toDecimal();
  const [payout, royaltyFee] = parsedPrice.allocate([100 - royaltyRate, royaltyRate]);

  return (
    <Modal
      size="auto"
      centered
      opened
      onClose={Close}
      header={rootStore.l10n.purchase.list_for_sale}
      withCloseButton={rootStore.pageWidth < 800}
    >
      <div className="listing-modal">
        <div className="listing-modal__content">
          <NFTCard nft={nft} price={{USD: parsedPrice.toString()}} usdcAccepted={cryptoStore.usdcConnected} usdcOnly={cryptoStore.usdcOnly} truncateDescription />
          <div className="listing-modal__form listing-modal__inputs">
            <div className="listing-modal__active-listings">
              <h2 className="listing-modal__active-listings__header">
                { rootStore.l10n.tables.active_listings }
              </h2>
              <ActiveListings
                perPage={10}
                contractAddress={nft.details.ContractAddr}
                selectedListingId={listingId}
              />
            </div>
            <div className="listing-modal__form__inputs">
              <div className="listing-modal__form__input-container">
                <input
                  placeholder={rootStore.l10n.purchase.set_price}
                  className={`listing-modal__form__price-input ${floatPrice > priceCeiling || floatPrice < priceFloor ? "listing-modal__form__price-input-error" : ""}`}
                  value={parseFloat(price) === 0 ? "" : price}
                  onChange={event => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={() => setPrice(inputPrice.toString())}
                />
                <div className="listing-modal__form__price-input-label">
                  <ImageIcon icon={USDIcon} />
                </div>
              </div>
              {
                priceFloor && floatPrice < priceFloor ?
                  <div className="listing-modal__form__error">
                    { LocalizeString(rootStore.l10n.purchase.min_listing_price, {price: FormatPriceString(priceFloor, {stringOnly: true, noConversion: true})}) }
                  </div> : null
              }
              {
                floatPrice > priceCeiling ?
                  <div className="listing-modal__form__error">
                    { LocalizeString(rootStore.l10n.purchase.max_listing_price, {price: FormatPriceString(priceCeiling, {stringOnly: true, noConversion: true})}) }
                  </div> : null
              }
            </div>

            <div className="listing-modal__details">
              {
                checkoutStore.currency === "USD" ? null :
                  <div className="listing-modal__detail listing-modal__detail-faded">
                    <label>{ rootStore.l10n.purchase.conversion_amount }</label>
                    {FormatPriceString(parsedPrice, { noConversion: true })}
                  </div>
              }
              {
                royaltyRate ?
                  <>
                    <div className="listing-modal__detail listing-modal__detail-faded">
                      <label>{ rootStore.l10n.purchase.creator_royalty }</label>
                      {FormatPriceString(royaltyFee, { noConversion: true })}
                    </div>
                    <div className="listing-modal__detail listing-modal__detail--bold">
                      <label>{ rootStore.l10n.purchase.total_payout }</label>
                      <div className="listing-modal__payout">
                        {cryptoStore.usdcConnected ? <ImageIcon icon={USDCIcon} title="USDC Available"/> : null}
                        {FormatPriceString(Math.max(0, payout), { noConversion: true })}
                      </div>
                    </div>
                  </> : <Loader/>
              }
              {
                checkoutStore.currency === "USD" ? null :
                  <div className="listing-modal__order-note">
                    { rootStore.l10n.purchase.conversion_note }
                  </div>
              }
            </div>
            {
              !cryptoStore.usdcConnected && rootStore.usdcDisabled ?
                <div className="listing-modal__wallet-connect">
                  <WalletConnect showPaymentPreference />
                </div> : null
            }
            <div className="listing-modal__actions">
              <Button
                className="listing-modal__action"
                disabled={!parsedPrice || isNaN(parsedPrice) || payout <= 0 || parsedPrice > 10000 || (priceFloor && parsedPrice < priceFloor)}
                onClick={async () => {
                  try {
                    setErrorMessage(undefined);
                    const listingId = await rootStore.walletClient.CreateListing({
                      contractAddress: nft.details.ContractAddr,
                      tokenId: nft.details.TokenIdStr,
                      price: ToUSD(inputPrice, "floor"),
                      listingId: nft.details.ListingId
                    });

                    Close({listingId: listingId || nft.details.ListingId});
                  } catch(error) {
                    rootStore.Log("Listing failed", true);
                    rootStore.Log(error, true);

                    // TODO: Figure out what the error is
                    setErrorMessage(rootStore.l10n.purchase.errors.listing_failed);
                  }
                }}
              >
                { LocalizeString(rootStore.l10n.actions.listings.create_for, {price: FormatPriceString(parsedPrice, {stringOnly: true, noConversion: true})})}
              </Button>
              {
                nft.details.ListingId ?
                  <Button
                    className="listing-modal__action"
                    variant="secondary"
                    onClick={async () => Confirm({
                      message: rootStore.l10n.actions.listings.remove_confirm,
                      Confirm: async () => {
                        await rootStore.walletClient.RemoveListing({listingId: nft.details.ListingId});
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        Close({deleted: true});
                      }
                    })}
                  >
                    { rootStore.l10n.actions.listings.remove }
                  </Button> : null
              }
              <Button className="listing-modal__action" variant="outline" onClick={() => Close()}>
                { rootStore.l10n.actions.cancel }
              </Button>
            </div>
            {
              errorMessage ?
                <div className="listing-modal__error-message">
                  { errorMessage }
                </div> : null
            }

            <div className="listing-modal__message">
              { rootStore.l10n.profile.payout_terms }
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default ListingModal;
