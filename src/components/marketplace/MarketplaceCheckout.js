import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {checkoutStore, rootStore} from "Stores";
import {Redirect} from "react-router-dom";
import UrlJoin from "url-join";
import {Loader} from "Components/common/Loaders";
import {ValidEmail} from "../../utils/Utils";

const MarketplaceCheckout = observer(({marketplaceId, item, maxQuantity}) => {
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
