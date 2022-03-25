import React, {useState} from "react";
import {observer} from "mobx-react";
import {ButtonWithLoader, FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {checkoutStore, rootStore, transferStore} from "Stores";
import AsyncComponent from "Components/common/AsyncComponent";
import ListingPurchaseModal from "Components/listings/ListingPurchaseModal";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {LoginClickGate} from "Components/common/LoginGate";

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
  const match = useRouteMatch();

  const [claimed, setClaimed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [listingStats, setListingStats] = useState({total: 0, min: 0, max: 0});

  const itemTemplate = item.nft_template ? item.nft_template.nft || {} : {};

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const directPrice = ItemPrice(item, checkoutStore.currency);
  const free = !directPrice || item.free;

  const stock = checkoutStore.stock[item.sku] || {};
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;

  const timeToAvailable = item.available_at ? new Date(item.available_at).getTime() - Date.now() : 0;
  const timeToExpired = item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : Infinity;
  const available = timeToAvailable <= 0 && timeToExpired > 0;

  const itemToNFT = {
    details: {
      ContractAddr: itemTemplate.address
    },
    metadata: itemTemplate
  };

  if(claimed) {
    return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "store", item.sku, "claim")} />;
  }

  return (
    <AsyncComponent
      loadingClassName="marketplace-price marketplace-price__loader"
      Load={async () => {
        setListingStats(await transferStore.FilteredQuery({mode: "listing-stats", contractAddress: itemTemplate.address}));
      }}
    >
      {
        showModal ?
          <ListingPurchaseModal
            skipListings={!free && listingStats.total === 0}
            nft={itemToNFT}
            item={item}
            Close={() => setShowModal(false)}
          /> : null
      }
      <div className="marketplace-price">
        <div className="marketplace-price__direct">
          <div className="marketplace-price__direct__price">
            { free ?
              "Free!" :
              !available ? "Sale Ended" :
                outOfStock ? "Out of Stock" : FormatPriceString({USD: directPrice}) }
          </div>
          {
            maxOwned ?
              <h3 className="marketplace-price__direct__max-owned-message">
                You already own the maximum number of this NFT
              </h3> :
              <LoginClickGate
                Component={ButtonWithLoader}
                onClick={async () => {
                  if(!free) {
                    setShowModal(true);
                    return;
                  }

                  try {
                    const status = await rootStore.ClaimStatus({
                      marketplace,
                      sku: item.sku
                    });

                    if(status && status.status !== "none") {
                      // Already claimed, go to status
                      setClaimed(true);
                    } else if(await checkoutStore.ClaimSubmit({marketplaceId: match.params.marketplaceId, sku: item.sku})) {
                      // Claim successful
                      setClaimed(true);
                    }
                  } catch(error){
                    rootStore.Log("Checkout failed", true);
                    rootStore.Log(error);
                  }
                }}
                disabled={outOfStock && listingStats.total === 0}
                className="action action-primary"
              >
                {
                  free && !outOfStock ? "Claim Now" :
                    outOfStock || !available ? "View Listings" : "Buy Now"
                }
              </LoginClickGate>
          }
        </div>
        <div className={`marketplace-price__listings ${listingStats.total === 0 ? "hidden" : ""}`}>
          <h3 className="marketplace-price__listings-count">
            { listingStats.total } Offer{ listingStats.total > 1 ? "s" : "" } from Collectors
          </h3>
          <div className="prices-container">
            <div className="price-container">
              <label className="price-container__label">
                Low Price
              </label>
              <div className="price-container__price">
                {FormatPriceString({USD: listingStats.min})}
              </div>
            </div>
            <div className="price-container">
              <label className="price-container__label">
                High Price
              </label>
              <div className="price-container__price">
                {FormatPriceString({USD: listingStats.max})}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AsyncComponent>
  );
});

export default MarketplaceCheckout;
