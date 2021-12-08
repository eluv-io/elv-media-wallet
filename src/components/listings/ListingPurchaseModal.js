import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import AsyncComponent from "Components/common/AsyncComponent";
import {checkoutStore, rootStore, transferStore} from "Stores";
import {ActiveListings} from "Components/listings/TransferTables";
import {ButtonWithLoader, FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {NFTImage} from "Components/common/Images";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ListingModalCard from "Components/listings/ListingModalCard";
import ImageIcon from "Components/common/ImageIcon";

import CreditCardIcon from "Assets/icons/credit card icon.svg";
import EthereumIcon from "Assets/icons/ethereum-eth-logo.svg";
import SolanaIcon from "Assets/icons/solana icon.svg";

const QuantityInput = ({quantity, setQuantity, maxQuantity}) => {
  if(maxQuantity <= 1) { return null; }

  const UpdateQuantity = value => {
    if(!value) {
      setQuantity("");
    } else {
      setQuantity(Math.min(100, maxQuantity, Math.max(1, parseInt(value || 1))));
    }
  };

  return (
    <div className="quantity">
      <div className="quantity__inputs">
        <button
          disabled={quantity === 1}
          className="quantity__button quantity__button-minus"
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
          className="quantity__input"
        />
        <button
          disabled={quantity === maxQuantity}
          className="quantity__button quantity__button-plus"
          onClick={() => UpdateQuantity(quantity + 1)}
        >
          +
        </button>
      </div>
      <label className="quantity__label">Quantity</label>
    </div>
  );
};

const ListingPurchaseConfirmation = observer(({nft, marketplaceItem, listingId, quantity, setQuantity}) => {
  const match = useRouteMatch();
  const [paymentType, setPaymentType] = useState("stripe");
  const [confirmationId, setConfirmationId] = useState(undefined);
  const [errorMessage, setErrorMessage] = useState(undefined);

  const listings = transferStore.TransferListings({contractAddress: nft.details.ContractAddr});
  const selectedListing = listings.find(listing => listing.details.ListingId === listingId);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  marketplaceItem = marketplaceItem || (!listingId && marketplace && rootStore.MarketplaceItemByTemplateId(marketplace, nft.metadata.template_id));
  const stock = marketplaceItem && checkoutStore.stock[marketplaceItem.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxQuantity = stock && (stock.max_per_user || stock.max - stock.minted) || 100;

  const price = listingId ? { USD: selectedListing.details.Price } : marketplaceItem.price;

  useEffect(() => {
    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  // In iframe - child window confirmed purchase
  if(confirmationId && checkoutStore.completedPurchases[confirmationId]) {
    const tenantId = selectedListing ? selectedListing.details.TenantId : marketplace.tenant_id;
    const sku = selectedListing ? selectedListing.details.ListingId : marketplaceItem.sku;

    if(match.params.marketplaceId) {
      return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, tenantId, sku, "purchase", confirmationId, "success")} />;
    } else {
      return <Redirect to={UrlJoin("/wallet", "collection", tenantId, sku, "purchase", confirmationId, "success")} />;
    }
  }

  return (
    <div className="listing-purchase-confirmation-modal">
      <div className="listing-purchase-confirmation-modal__header">
        Select Payment Method
      </div>
      <div className="listing-purchase-confirmation-modal__content">
        <ListingModalCard
          nft={nft}
          selectedListing={selectedListing}
          price={price}
          stock={stock}
        />
        {
          !listingId && maxQuantity > 1 ?
            <div className="listing-purchase-confirmation-modal__price-details">
              <div className="price-container">
                <div className="price-container__label">
                  Total
                </div>
                <div className="price-container__price">
                  {FormatPriceString(price, {quantity})}
                </div>
              </div>

              <QuantityInput quantity={quantity} setQuantity={setQuantity} maxQuantity={maxQuantity}/>
            </div> : null
        }
        <div className="listing-purchase-confirmation-modal__payment-options">
          <div className="listing-purchase-confirmation-modal__payment-message">
            Buy NFT With
          </div>
          <div className="listing-purchase-confirmation-modal__payment-selection-container">
            <button
              onClick={() => setPaymentType("stripe")}
              className={`action listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-credit-card ${paymentType === "stripe" ? "listing-purchase-confirmation-modal__payment-selection-selected" : ""}`}
            >
              <div className="listing-purchase-confirmation-modal__payment-selection-icons">
                <ImageIcon icon={CreditCardIcon} className="listing-purchase-confirmation-modal__payment-selection-icon" title="Pay with Credit Card" />
              </div>
              Credit Card
            </button>
            <button
              onClick={() => setPaymentType("coinbase")}
              className={`action listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-crypto ${paymentType === "coinbase" ? "listing-purchase-confirmation-modal__payment-selection-selected" : ""}`}
            >
              <div className="listing-purchase-confirmation-modal__payment-selection-icons">
                <ImageIcon icon={EthereumIcon} className="listing-purchase-confirmation-modal__payment-selection-icon" title="Ethereum" />
                <ImageIcon icon={SolanaIcon} className="listing-purchase-confirmation-modal__payment-selection-icon" title="Solana" />
              </div>
              Crypto
            </button>
          </div>
          <ButtonWithLoader
            disabled={outOfStock || errorMessage}
            className="action action-primary listing-purchase-confirmation-modal__payment-submit"
            onClick={async () => {
              try {
                setErrorMessage(undefined);

                if(selectedListing) {
                  // Listing purchase
                  setConfirmationId(await checkoutStore.ListingCheckoutSubmit({
                    provider: paymentType,
                    marketplaceId: match.params.marketplaceId,
                    listingId,
                    email: undefined
                  }));
                } else {
                  // Marketplace purchase
                  setConfirmationId(await checkoutStore.CheckoutSubmit({
                    provider: paymentType,
                    tenantId: marketplace.tenant_id,
                    marketplaceId: match.params.marketplaceId,
                    sku: marketplaceItem.sku,
                    quantity,
                    email: undefined
                  }));
                }
              } catch(error) {
                rootStore.Log("Checkout failed", true);
                rootStore.Log(error, true);

                // TODO: Figure out what kind of error it is
                setErrorMessage("This listing is no longer available");
              }
            }}
          >
            Buy Now for { FormatPriceString(price, {quantity}) }
          </ButtonWithLoader>
          {
            errorMessage ?
              <div className="listing-purchase-confirmation-modal__error-message">
                { errorMessage }
              </div> : null
          }
        </div>
      </div>
    </div>
  );
});

const ListingPurchaseSelection = observer(({nft, marketplaceItem, initialListingId, quantity, setQuantity, Select}) => {
  const match = useRouteMatch();
  const [selectedListingId, setSelectedListingId] = useState(initialListingId);
  const [claimed, setClaimed] = useState(false);

  const listings = transferStore.TransferListings({contractAddress: nft.details.ContractAddr});
  const selectedListing = selectedListingId && listings.find(listing => listing.details.ListingId === selectedListingId);
  const prices = listings.map(listing => listing.details.Price).sort((a, b) => a < b ? -1 : 1);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  marketplaceItem = marketplaceItem || (marketplace && rootStore.MarketplaceItemByTemplateId(marketplace, nft.metadata.template_id));
  const stock = marketplaceItem && checkoutStore.stock[marketplaceItem.sku];
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxQuantity = stock && (stock.max_per_user || stock.max - stock.minted) || 100;

  const directPrice = marketplaceItem ? ItemPrice(marketplaceItem, checkoutStore.currency) : undefined;
  const free = marketplaceItem && (!directPrice || marketplaceItem.free);

  if(claimed) {
    return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, marketplaceItem.sku, "claim")} />;
  }

  return (
    <div className="listing-purchase-modal">
      <div className="listing-purchase-modal__header">
        <div className="listing-purchase-modal__nft-info-container">
          <NFTImage width={400} nft={nft} className="listing-purchase-modal__image" />
          <div className="listing-purchase-modal__nft-info">
            <h3 className="listing-purchase-modal__token-id ellipsis">
              { typeof nft.details.TokenOrdinal !== "undefined" ? `${parseInt(nft.details.TokenOrdinal) + 1} / ${nft.details.Cap}` : nft.details.TokenIdStr }
            </h3>
            <h2 className="listing-purchase-modal__name ellipsis">
              { nft.metadata.display_name }
            </h2>
          </div>
        </div>
        {
          maxOwned ?
            <h3 className="listing-purchase-modal__max-owned-message">
              You already own the maximum number of this NFT
            </h3> : null
        }
        {
          marketplaceItem ?
            <div className={`listing-purchase-modal__buy-container ${maxQuantity > 1 ? "listing-purchase-modal__buy-container-with-quantity" : ""}`}>
              <div className="listing-purchase-modal__direct-price">
                <div className="price-container">
                  <label className="price-container__label">
                    Buy from Creator
                  </label>
                  <div className="price-container__price">
                    { FormatPriceString(marketplaceItem.price, {quantity}) }
                  </div>
                </div>
                <QuantityInput quantity={quantity} setQuantity={setQuantity} maxQuantity={maxQuantity} />
              </div>
              <ButtonWithLoader
                disabled={outOfStock || maxOwned}
                className="action action-primary listing-purchase-modal__action listing-purchase-modal__action-primary"
                onClick={async () => {
                  try {
                    if(free) {
                      const status = await rootStore.ClaimStatus({
                        marketplace,
                        sku: marketplaceItem.sku
                      });

                      if(status && status.status !== "none") {
                        // Already claimed, go to status
                        setClaimed(true);
                      } else if(await checkoutStore.ClaimSubmit({marketplaceId: match.params.marketplaceId, sku: marketplaceItem.sku})) {
                        // Claim successful
                        setClaimed(true);
                      }
                    } else {
                      Select("marketplace");
                    }
                  } catch(error){
                    rootStore.Log("Checkout failed", true);
                    rootStore.Log(error);
                  }
                }}
              >
                { free ? "Claim Now" : "Buy Now" }
              </ButtonWithLoader>
            </div> : null
        }
        {
          marketplaceItem && stock && stock.max ?
            <div className="listing-purchase-modal__stock">
              <div className="header-dot" style={{backgroundColor: outOfStock ? "#a4a4a4" : "#ff0000"}} />
              { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available from Creator` }
            </div> : null
        }
      </div>
      <div className="listing-purchase-modal__listing-info">
        <div className="listing-purchase-modal__listing-count-container">
          <div className="listing-purchase-modal__listing-count-label">
            Buy from a Collector
          </div>
          <div className="listing-purchase-modal__listing-count">
            <div className="header-dot" style={{backgroundColor: listings.length > 0 ? "#08b908" : "#a4a4a4"}} />
            { listings.length } Available for Trade
          </div>
        </div>
        {
          prices.length > 1 ?
            <div className="listing-purchase-modal__prices-container">
              <div className="listing-purchase-modal__price-container">
                <label className="listing-purchase-modal__price-label">
                  Low Price
                </label>
                <div className="listing-purchase-modal__price">
                  {FormatPriceString({USD: prices[0]})}
                </div>
              </div>
              <div className="listing-purchase-modal__price-container">
                <label className="listing-purchase-modal__price-label">
                  High Price
                </label>
                <div className="listing-purchase-modal__price">
                  {FormatPriceString({USD: prices.slice(-1)})}
                </div>
              </div>
            </div> : null
        }
      </div>
      <ActiveListings
        initialSelectedListingId={selectedListingId}
        contractAddress={nft.details.ContractAddr}
        Select={listingId => setSelectedListingId(listingId)}
      />
      <div className="listing-purchase-modal__footer">
        <div className="listing-purchase-modal__price-container">
          {
            selectedListing ?
              <>
                <label className="listing-purchase-modal__price-label">
                  Selected Price
                </label>
                <div className="listing-purchase-modal__price">
                  {FormatPriceString({USD: selectedListing.details.Price})}
                </div>
              </> : null
          }
        </div>
        <button
          onClick={() => Select(selectedListingId)}
          disabled={
            !selectedListing ||
            Utils.EqualAddress(rootStore.userAddress, selectedListing.details.SellerAddress)
            || maxOwned
          }
          className="action action-primary listing-purchase-modal__action"
        >
          Buy Selection
        </button>
      </div>
    </div>
  );
});

const ListingPurchaseModal = observer(({nft, item, initialListingId, Close}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [selectedListingId, setSelectedListingId] = useState(undefined);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const modal = document.getElementById("listing-purchase-modal");
    modal && modal.scrollTo(0, 0);
  }, [selectedListingId]);

  return (
    <Modal id="listing-purchase-modal" className="listing-purchase-modal-container" Toggle={() => Close()}>
      <AsyncComponent
        loadingClassName="page-loader"
        Load={async () => {
          await transferStore.FetchTransferListings({
            contractAddress: nft.details.ContractAddr,
            forceUpdate: true
          });

          if(marketplace) {
            await checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});
          }
        }}
      >
        {
          selectedListingId ?
            <ListingPurchaseConfirmation
              nft={nft}
              marketplaceItem={item}
              listingId={selectedListingId === "marketplace" ? undefined : selectedListingId}
              quantity={selectedListingId === "marketplace" ? quantity : 1}
              setQuantity={setQuantity}
            /> :
            <ListingPurchaseSelection
              nft={nft}
              marketplaceItem={item}
              initialListingId={initialListingId}
              Select={setSelectedListingId}
              quantity={quantity}
              setQuantity={setQuantity}
            />
        }
      </AsyncComponent>
    </Modal>
  );
});

export default ListingPurchaseModal;
