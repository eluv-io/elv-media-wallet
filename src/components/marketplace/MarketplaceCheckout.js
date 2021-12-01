import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {checkoutStore, rootStore, transferStore} from "Stores";
import {Redirect} from "react-router-dom";
import UrlJoin from "url-join";
import {Loader} from "Components/common/Loaders";
import {ValidEmail} from "../../utils/Utils";
import AsyncComponent from "Components/common/AsyncComponent";
import ListingPurchaseModal from "Components/listings/ListingPurchaseModal";

const MarketplaceCheckout = observer(({item}) => {
  const [showModal, setShowModal] = useState(false);

  const itemTemplate = item.nft_template ? item.nft_template.nft || {} : {};
  const listings = transferStore.TransferListings({contractAddress: itemTemplate.address});
  const listingPrices = listings.map(listing => listing.details.Total).sort((a, b) => a < b ? -1 : 1);

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
        await transferStore.FetchTransferListings({
          contractAddress: itemTemplate.address
        });
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

const MarketplaceCheckout2 = observer(({marketplaceId, item, maxQuantity}) => {
  if(!maxQuantity) { maxQuantity = 100; }

  const total = ItemPrice(item, checkoutStore.currency);

  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);
  const [confirmationId, setConfirmationId] = useState(undefined);
  const [claimed, setClaimed] = useState(false);

  const UpdateQuantity = value => {
    if(!value) {
      setQuantity("");
    } else {
      setQuantity(Math.min(100, maxQuantity, Math.max(1, parseInt(value || 1))));
    }
  };

  useEffect(() => {
    if(quantity) {
      // If maxQuantity has changed, for example due to available stock changing, ensure quantity is clamped at max
      UpdateQuantity(quantity);
    }
  });

  if(confirmationId && checkoutStore.completedPurchases[confirmationId]) {
    return <Redirect to={UrlJoin("/marketplaces", marketplaceId, item.sku, "purchase", confirmationId, "success")} />;
  }

  if(claimed) {
    return <Redirect to={UrlJoin("/marketplaces", marketplaceId, item.sku, "claim")} />;
  }

  const free = !total || item.free;
  const purchaseDisabled = !rootStore.userProfile.email && !validEmail;
  const marketplace = rootStore.marketplaces[marketplaceId];

  if(!marketplace) { return null; }
  return (
    <>
      {
        !rootStore.userProfile.email ?
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
          </div> : null
      }
      <div className="checkout card-shadow">
        {
          free ?
            null :
            <div className="checkout__price">
              <div className="checkout__price__header">
                Current Price
              </div>
              <div className="checkout__price__price">
                {FormatPriceString({[checkoutStore.currency]: total})}
              </div>
            </div>
        }
        <div className="checkout__actions">
          {
            maxQuantity === 1 ? null :
              <div className="checkout__quantity-container">
                <button
                  disabled={quantity === 1}
                  className="checkout__quantity-button checkout-quantity-button-minus"
                  onClick={() => UpdateQuantity(quantity - 1)}
                >
                  -
                </button>
                <input
                  title="quantity"
                  name="quantity"
                  type="number"
                  step={1}
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={event => UpdateQuantity(event.target.value)}
                  onBlur={() => UpdateQuantity(quantity || 1)}
                  className="checkout__quantity"
                />
                <button
                  disabled={quantity === maxQuantity}
                  className="checkout__quantity-button checkout-quantity-button-plus"
                  onClick={() => UpdateQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
          }
          {
            checkoutStore.submittingOrder || (confirmationId && checkoutStore.pendingPurchases[confirmationId]) ?
              <Loader className="checkout__loader"/> :
              <>
                <button
                  title={purchaseDisabled ? "Please enter your email address" : ""}
                  disabled={purchaseDisabled}
                  className="checkout__button"
                  role="link"
                  onClick={async () => {
                    try {
                      if(free) {
                        const status = await rootStore.ClaimStatus({
                          marketplace,
                          sku: item.sku
                        });

                        if(status && status.status !== "none") {
                          // Already claimed, go to status
                          setClaimed(true);
                        } else if(await checkoutStore.ClaimSubmit({marketplaceId, sku: item.sku})) {
                          // Claim successful
                          setClaimed(true);
                        }
                      } else {
                        setConfirmationId(await checkoutStore.CheckoutSubmit({
                          provider: "stripe",
                          tenantId: marketplace.tenant_id,
                          marketplaceId,
                          sku: item.sku,
                          quantity,
                          email
                        }));
                      }
                    } catch(error) {
                      rootStore.Log("Checkout failed", true);
                      rootStore.Log(error);

                      checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});
                    }
                  }}
                >
                  {free ? "Claim Now" : "Buy Now"}
                </button>
                {
                  !free ?
                    <button
                      className="checkout__button checkout__button-coinbase"
                      onClick={async () => {
                        setConfirmationId(await checkoutStore.CheckoutSubmit({
                          provider: "coinbase",
                          tenantId: marketplace.tenant_id,
                          marketplaceId,
                          sku: item.sku,
                          quantity,
                          email
                        }));
                      }}
                    >
                      Pay with Crypto
                    </button> : null
                }
              </>
          }
        </div>
      </div>
    </>
  );
});

export default MarketplaceCheckout;
