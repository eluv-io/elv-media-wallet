import React, {useState} from "react";
import {observer} from "mobx-react";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {checkoutStore, transferStore} from "Stores";
import AsyncComponent from "Components/common/AsyncComponent";
import ListingPurchaseModal from "Components/listings/ListingPurchaseModal";

/*
        <div className="checkout card-shadow checkout__email-input">
            <input
              type="text"
              className="checkout__email"
              value={email}
              placeholder="Email Address"
              onChange={event => {
                const email = event.target.value.trim();
                setEmail(email);
                setValidEmail(ValidEmail(email));
              }}
            />
          </div>
 */

const MarketplaceCheckout = observer(({item}) => {
  const [showModal, setShowModal] = useState(false);
  const [listings, setListings] = useState(false);

  const itemTemplate = item.nft_template ? item.nft_template.nft || {} : {};
  const listingPrices = listings.map(listing => listing.details.Price).sort((a, b) => a < b ? -1 : 1);

  const directPrice = ItemPrice(item, checkoutStore.currency);
  const free = !directPrice || item.free;

  const stock = checkoutStore.stock[item.sku] || {};
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;

  const itemToNFT = {
    details: {
      ContractAddr: itemTemplate.address
    },
    metadata: itemTemplate
  };

  return (
    <AsyncComponent
      loadingClassName="marketplace-price marketplace-price__loader"
      Load={async () => {
        setListings(
          await transferStore.FetchTransferListings({
            contractAddress: itemTemplate.address
          })
        );
      }}
    >
      { showModal ? <ListingPurchaseModal nft={itemToNFT} item={item} Close={() => setShowModal(false)} /> : null }
      <div className="marketplace-price">
        <div className="marketplace-price__direct">
          <div className="marketplace-price__direct__price">
            { free ?
              "Free!" :
              outOfStock ? "Out of Stock" : FormatPriceString({USD: directPrice}) }
          </div>
          {
            maxOwned ?
              <h3 className="marketplace-price__direct__max-owned-message">
                You already own the maximum number of this NFT
              </h3> :
              <button
                onClick={() => setShowModal(true)}
                disabled={outOfStock && listings.length === 0}
                className="action action-primary"
              >
                { free && !outOfStock ? "Claim Now" : "Buy Now" }
              </button>
          }
        </div>
        <div className={`marketplace-price__listings ${listings.length === 0 ? "hidden" : ""}`}>
          <h3 className="marketplace-price__listings-count">
            { listings.length } Offer{ listings.length > 1 ? "s" : "" } from Collectors
          </h3>
          <div className="prices-container">
            <div className="price-container">
              <label className="price-container__label">
                Low Price
              </label>
              <div className="price-container__price">
                {FormatPriceString({USD: listingPrices[0]})}
              </div>
            </div>
            <div className="price-container">
              <label className="price-container__label">
                High Price
              </label>
              <div className="price-container__price">
                {FormatPriceString({USD: listingPrices.slice(-1)})}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AsyncComponent>
  );
});

export default MarketplaceCheckout;
