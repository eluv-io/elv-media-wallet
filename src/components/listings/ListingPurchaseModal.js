import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {checkoutStore, cryptoStore, rootStore, transferStore} from "Stores";
import {ActiveListings} from "Components/listings/TransferTables";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";
import {Redirect, useRouteMatch} from "react-router-dom";
import NFTCard from "Components/common/NFTCard";
import ImageIcon from "Components/common/ImageIcon";
import {roundToDown} from "round-to";
import WalletConnect from "Components/crypto/WalletConnect";

import CreditCardIcon from "Assets/icons/credit card icon.svg";
import WalletIcon from "Assets/icons/wallet balance button icon.svg";
import CoinbaseIcon from "Assets/icons/crypto/Coinbase Icon (16x16)(1).svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";

import PlusIcon from "Assets/icons/plus.svg";
import MinusIcon from "Assets/icons/minus.svg";
import {PageLoader} from "Components/common/Loaders";

const QuantityInput = ({quantity, setQuantity, maxQuantity}) => {
  if(maxQuantity <= 1) { return null; }

  const UpdateQuantity = value => {
    if(!value) {
      setQuantity("");
    } else {
      setQuantity(Math.min(25, maxQuantity, Math.max(1, parseInt(value || 1))));
    }
  };

  return (
    <div className="quantity">
      <div className="quantity__inputs">
        <button
          disabled={quantity === 1}
          className="action quantity__button quantity__button-minus"
          onClick={() => UpdateQuantity(quantity - 1)}
        >
          <ImageIcon icon={MinusIcon} label="Quantity down" />
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
          className="action quantity__button quantity__button-plus"
          onClick={() => UpdateQuantity(quantity + 1)}
        >
          <ImageIcon icon={PlusIcon} label="Quantity up" />
        </button>
      </div>
      <label className="quantity__label">Quantity</label>
    </div>
  );
};

const PurchaseProviderSelection = observer(({price, usdcAccepted, errorMessage, disabled, Continue, Cancel}) => {
  const [paymentType, setPaymentType] = useState("stripe");
  const wallet = cryptoStore.WalletFunctions("phantom");
  const connected = paymentType !== "linked-wallet" || cryptoStore.PhantomAddress() && wallet.Connected();

  return (
    <div className="listing-purchase-confirmation-modal__payment-options">
      <div className="listing-purchase-confirmation-modal__payment-message">
        Buy NFT With
      </div>
      <div className="listing-purchase-confirmation-modal__payment-selection-container">
        <button
          onClick={() => setPaymentType("stripe")}
          className={`action action-selection listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-credit-card ${paymentType === "stripe" ? "action-selection--active listing-purchase-confirmation-modal__payment-selection--selected" : ""}`}
        >
          <div className="listing-purchase-confirmation-modal__payment-selection-icons">
            <ImageIcon icon={CreditCardIcon} className="listing-purchase-confirmation-modal__payment-selection-icon" title="Pay with Credit Card" />
          </div>
          Credit Card
        </button>
        <button
          onClick={() => setPaymentType("coinbase")}
          className={`action action-selection listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-crypto ${paymentType === "coinbase" ? "action-selection--active listing-purchase-confirmation-modal__payment-selection--selected" : ""}`}
        >
          <div className="listing-purchase-confirmation-modal__payment-selection-icons listing-purchase-confirmation-modal__payment-selection-icons-crypto">
            <ImageIcon icon={CoinbaseIcon} className="listing-purchase-confirmation-modal__payment-selection-icon" title="Coinbase" />
          </div>
          Crypto via Coinbase
        </button>
        <button
          onClick={() => setPaymentType("wallet-balance")}
          className={`action action-selection listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-wallet-balance ${paymentType === "wallet-balance" ? "action-selection--active listing-purchase-confirmation-modal__payment-selection--selected" : ""}`}
        >
          <div className="listing-purchase-confirmation-modal__payment-selection-icons">
            <ImageIcon
              icon={WalletIcon}
              className="listing-purchase-confirmation-modal__payment-selection-icon"
              title="Wallet Balance"
            />
          </div>
          Wallet Balance
        </button>
        {
          usdcAccepted ?
            <button
              onClick={() => setPaymentType("linked-wallet")}
              className={`action action-selection listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-linked-wallet ${paymentType === "linked-wallet" ? "action-selection--active listing-purchase-confirmation-modal__payment-selection--selected" : ""}`}
            >
              <div className="listing-purchase-confirmation-modal__payment-selection-icons listing-purchase-confirmation-modal__payment-selection-icons-crypto">
                <ImageIcon
                  icon={USDCIcon}
                  className="listing-purchase-confirmation-modal__payment-selection-icon"
                  title="Linked Wallet"
                />
              </div>
              Linked Wallet
            </button> : null
        }
      </div>
      { paymentType === "linked-wallet" ? <div className="listing-purchase-confirmation-modal__wallet-connect"><WalletConnect /></div> : null }
      <ButtonWithLoader
        disabled={disabled || !connected}
        className="action action-primary listing-purchase-confirmation-modal__payment-submit"
        onClick={async () => await Continue(paymentType)}
      >
        Buy Now for { price }
      </ButtonWithLoader>
      <button
        className="action listing-purchase-confirmation-modal__payment-cancel"
        onClick={() => Cancel()}
        disabled={checkoutStore.submittingOrder}
      >
        Back
      </button>
      {
        errorMessage ?
          <div className="listing-purchase-confirmation-modal__error-message">
            { errorMessage }
          </div> : null
      }
    </div>
  );
});


// Confirmation page for wallet balance purchase and linked wallet USDC payment
const ListingPurchaseBalanceConfirmation = observer(({nft, marketplaceItem, selectedListing, listingId, quantity=1, useLinkedWallet, Cancel}) => {
  const match = useRouteMatch();
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [failed, setFailed] = useState(false);
  const [confirmationId, setConfirmationId] = useState(undefined);

  const purchaseStatus = confirmationId && checkoutStore.purchaseStatus[confirmationId] || {};

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  marketplaceItem = marketplaceItem || (!listingId && marketplace && rootStore.MarketplaceItemByTemplateId(marketplace, nft.metadata.template_id));
  const stock = marketplaceItem && checkoutStore.stock[marketplaceItem.sku];
  const outOfStock = stock && stock.max && (stock.max - stock.minted) < quantity;

  const timeToAvailable = marketplaceItem && marketplaceItem.available_at ? new Date(marketplaceItem.available_at).getTime() - Date.now() : 0;
  const timeToExpired = marketplaceItem && marketplaceItem.expires_at ? new Date(marketplaceItem.expires_at).getTime() - Date.now() : Infinity;
  const available = timeToAvailable <= 0 && timeToExpired > 0;

  const price = listingId ? { USD: selectedListing.details.Price } : marketplaceItem.price;
  const total = price.USD * quantity;
  const fee = Math.max(1, roundToDown(total * 0.05, 2));
  const balanceAmount = useLinkedWallet ? cryptoStore.phantomUSDCBalance : rootStore.availableWalletBalance;
  const balanceName = useLinkedWallet ? "USDC Balance" : "Wallet Balance";
  const balanceIcon = useLinkedWallet ? <ImageIcon icon={USDCIcon} label="USDC" title="USDC" /> : null;

  const insufficientBalance = balanceAmount < total + fee;


  useEffect(() => {
    if(useLinkedWallet) {
      cryptoStore.PhantomBalance();
    }

    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => {
      checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});
      rootStore.GetWalletBalance();
    }, 10000);

    return () => clearInterval(stockCheck);
  }, []);


  useEffect(() => {
    if(purchaseStatus.status === "complete" && !purchaseStatus.success) {
      setErrorMessage("Purchase failed");
    }
  }, [purchaseStatus]);


  if(purchaseStatus.status === "complete" && purchaseStatus.success) {
    return <Redirect to={purchaseStatus.successPath} />;
  }

  return (
    <div className="listing-purchase-confirmation-modal__content">
      <NFTCard
        nft={nft}
        selectedListing={selectedListing}
        price={price}
        stock={stock}
        showOrdinal={!!selectedListing}
        hideAvailable={!available || (marketplaceItem && marketplaceItem.hide_available)}
        truncateDescription
      />
      <div className="listing-purchase-modal__order-details">
        <div className="listing-purchase-modal__order-line-item">
          <div className="listing-purchase-modal__order-label">
            { nft.metadata.display_name } { quantity > 1 ? <div className="listing-purchase-modal__quantity">&nbsp;x {quantity}</div> : "" }
          </div>
          <div className="listing-purchase-modal__order-price">
            { FormatPriceString({USD: total}) }
          </div>
        </div>
        <div className="listing-purchase-modal__order-line-item">
          <div className="listing-purchase-modal__order-label">
            Service Fee
          </div>
          <div className="listing-purchase-modal__order-price">
            { FormatPriceString({USD: fee}) }
          </div>
        </div>
        <div className="listing-purchase-modal__order-separator" />
        <div className="listing-purchase-modal__order-line-item">
          <div className="listing-purchase-modal__order-label">
            Total
          </div>
          <div className="listing-purchase-modal__order-price">
            { FormatPriceString({USD: total + fee}) }
          </div>
        </div>
      </div>
      <div className="listing-purchase-modal__order-details listing-purchase-modal__order-details-box">
        <div className="listing-purchase-modal__order-line-item">
          <div className="listing-purchase-modal__order-label">
            Available { balanceName }
          </div>
          <div className="listing-purchase-modal__order-price">
            {FormatPriceString({USD: balanceAmount || 0})}
          </div>
        </div>
        <div className="listing-purchase-modal__order-line-item">
          <div className="listing-purchase-modal__order-label">
            Current Purchase
          </div>
          <div className="listing-purchase-modal__order-price">
            {FormatPriceString({USD: total + fee})}
          </div>
        </div>
        <div className="listing-purchase-modal__order-separator"/>
        <div className="listing-purchase-modal__order-line-item">
          <div className="listing-purchase-modal__order-label">
            Remaining { balanceName }
          </div>
          <div className="listing-purchase-modal__order-price">
            { balanceIcon }
            {FormatPriceString({USD: balanceAmount - (total + fee)})}
          </div>
        </div>
      </div>
      <div className="listing-purchase-modal__actions listing-purchase-wallet-balance-actions">
        <ButtonWithLoader
          disabled={!available || outOfStock || insufficientBalance || failed}
          className="action action-primary"
          onClick={async () => {
            try {
              setErrorMessage(undefined);

              let result;
              if(selectedListing) {
                // Listing purchase
                result = await checkoutStore.ListingCheckoutSubmit({
                  provider: useLinkedWallet ? "linked-wallet" : "wallet-balance",
                  marketplaceId: match.params.marketplaceId,
                  listingId,
                  tenantId: selectedListing.details.TenantId
                });
              } else {
                // Marketplace purchase
                result = await checkoutStore.CheckoutSubmit({
                  provider: useLinkedWallet ? "linked-wallet" : "wallet-balance",
                  tenantId: marketplace.tenant_id,
                  marketplaceId: match.params.marketplaceId,
                  sku: marketplaceItem.sku,
                  quantity,
                });
              }

              if(result) {
                setConfirmationId(result.confirmationId);
              }
            } catch(error) {
              rootStore.Log("Checkout failed", true);
              rootStore.Log(error, true);

              if(!error.recoverable) {
                setFailed(true);
              }

              setErrorMessage(error.uiMessage || "Purchase failed");
            }
          }}
        >
          Buy Now
        </ButtonWithLoader>
        <button className="action" onClick={() => Cancel()} disabled={checkoutStore.submittingOrder}>
          Back
        </button>
      </div>
      {
        errorMessage || !available || outOfStock || insufficientBalance ?
          <div className="listing-purchase-confirmation-modal__error-message">
            {
              errorMessage ? errorMessage :
                outOfStock ? "This item is out of stock" :
                  !available ? "This item is no longer available" :
                    `Insufficient ${balanceName}`
            }
          </div> : null
      }
    </div>
  );
});

const ListingPurchasePayment = observer(({
  type="marketplace",
  nft,
  marketplaceItem,
  initialListingId,
  selectedListingId,
  selectedListing,
  quantity,
  setQuantity,
  setUseWalletBalance,
  setUseLinkedWallet,
  SelectListing,
  Cancel
}) => {
  const match = useRouteMatch();
  const [confirmationId, setConfirmationId] = useState(undefined);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [failed, setFailed] = useState(false);
  const [listingStats, setListingStats] = useState({min: 0, max: 0, total: 0});

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  marketplaceItem = marketplaceItem || (type === "marketplace" && marketplace && rootStore.MarketplaceItemByTemplateId(marketplace, nft.metadata.template_id));
  const stock = marketplaceItem && checkoutStore.stock[marketplaceItem.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxQuantity = stock && (stock.max_per_user || stock.max - stock.minted) || 100;

  const timeToAvailable = marketplaceItem && marketplaceItem.available_at ? new Date(marketplaceItem.available_at).getTime() - Date.now() : 0;
  const timeToExpired = marketplaceItem && marketplaceItem.expires_at ? new Date(marketplaceItem.expires_at).getTime() - Date.now() : Infinity;
  const available = timeToAvailable <= 0 && timeToExpired > 0;

  const price = type === "marketplace" ? marketplaceItem.price : { USD: selectedListing.details.Price };

  const purchaseStatus = confirmationId && checkoutStore.purchaseStatus[confirmationId] || {};

  useEffect(() => {
    if(type === "listing") {
      transferStore.FilteredQuery({mode: "listing-stats", contractAddress: nft.details.ContractAddr})
        .then(stats => setListingStats(stats));
    }

    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  useEffect(() => {
    if(purchaseStatus.status === "complete" && !purchaseStatus.success) {
      setErrorMessage("Purchase failed");
    }
  }, [purchaseStatus]);


  const Continue = async (paymentType) => {
    if(paymentType === "wallet-balance") {
      setUseWalletBalance(true);
      return;
    } else if(paymentType === "linked-wallet") {
      setUseLinkedWallet(true);
      return;
    }

    try {
      setErrorMessage(undefined);

      let result;
      if(selectedListing) {
        // Listing purchase
        result = await checkoutStore.ListingCheckoutSubmit({
          provider: paymentType,
          marketplaceId: match.params.marketplaceId,
          listingId: selectedListingId,
          tenantId: selectedListing.details.TenantId,
          email: undefined
        });
      } else {
        // Marketplace purchase
        result = await checkoutStore.CheckoutSubmit({
          provider: paymentType,
          tenantId: marketplace.tenant_id,
          marketplaceId: match.params.marketplaceId,
          sku: marketplaceItem.sku,
          quantity,
          email: undefined
        });
      }

      if(result) {
        setConfirmationId(result.confirmationId);
      }
    } catch(error) {
      rootStore.Log("Checkout failed", true);
      rootStore.Log(error, true);

      if(!error.recoverable) {
        setFailed(true);
      }

      setErrorMessage(error.uiMessage || "Purchase failed");
    }
  };

  if(purchaseStatus.status === "complete" && purchaseStatus.success) {
    return <Redirect to={purchaseStatus.successPath} />;
  }

  return (
    <div className="listing-purchase-confirmation-modal__content">
      <NFTCard
        nft={nft}
        selectedListing={selectedListing}
        price={price}
        stock={stock}
        showOrdinal={!!selectedListing}
        hideAvailable={!available || (marketplaceItem && marketplaceItem.hide_available)}
        truncateDescription
      />
      {
        type === "marketplace" ?
          (maxQuantity > 1 ?
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
            </div> : null) :
          <>
            <div className="listing-purchase-modal__listing-info">
              <div className="listing-purchase-modal__listing-count-container">
                <div className="listing-purchase-modal__listing-count-label">
                  Buy from a Collector
                </div>
                <div className="listing-purchase-modal__listing-count">
                  <div className="header-dot" style={{backgroundColor: listingStats.total > 0 ? "#08b908" : "#a4a4a4"}} />
                  { listingStats.total } Available for Trade
                </div>
              </div>
              {
                listingStats.max ?
                  <div className="listing-purchase-modal__prices-container">
                    <div className="listing-purchase-modal__price-container">
                      <label className="listing-purchase-modal__price-label">
                        Low Price
                      </label>
                      <div className="listing-purchase-modal__price">
                        {FormatPriceString({USD: listingStats.min})}
                      </div>
                    </div>
                    <div className="listing-purchase-modal__price-container">
                      <label className="listing-purchase-modal__price-label">
                        High Price
                      </label>
                      <div className="listing-purchase-modal__price">
                        {FormatPriceString({USD: listingStats.max})}
                      </div>
                    </div>
                  </div> : null
              }
            </div>
            <ActiveListings
              initialSelectedListingId={initialListingId}
              contractAddress={nft.details.ContractAddr}
              Select={SelectListing}
            />
          </>
      }
      <PurchaseProviderSelection
        price={FormatPriceString(price, {quantity})}
        errorMessage={errorMessage}
        usdcAccepted={selectedListing && selectedListing?.details?.USDCAccepted}
        disabled={!available || outOfStock || failed}
        Continue={Continue}
        Cancel={Cancel}
      />
    </div>
  );
});

let timeout;
const ListingPurchaseModal = observer(({nft, item, initialListingId, type="marketplace", Close}) => {
  const [loadKey, setLoadKey] = useState(0);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [useLinkedWallet, setUseLinkedWallet] = useState(false);
  const [selectedListing, setSelectedListing] = useState(undefined);
  const [selectedListingId, setSelectedListingId] = useState(type === "marketplace" ? "marketplace" : initialListingId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const modal = document.getElementById("listing-purchase-modal");
    modal && modal.scrollTo(0, 0);
  }, [useWalletBalance]);

  useEffect(() => {
    if(initialListingId) {
      transferStore.FetchTransferListings({listingId: initialListingId, forceUpdate: true})
        .then(listings => setSelectedListing(listings[0]));
    }
  }, []);

  const timeToExpired = item && item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : undefined;
  if(timeToExpired > 0) {
    clearTimeout(timeout);
    setTimeout(() => {
      setLoadKey(loadKey + 1);
    }, timeToExpired + 1000);
  }

  let content;
  if(type === "listing" && !selectedListing) {
    content = <PageLoader />;
  } else if(useWalletBalance || useLinkedWallet) {
    // Purchase confirmation screen - not used for stripe/coinbase checkout
    content = (
      <ListingPurchaseBalanceConfirmation
        key={`listing-${loadKey}`}
        type={type}
        useLinkedWallet={useLinkedWallet}
        nft={nft}
        marketplaceItem={item}
        selectedListing={selectedListing}
        listingId={selectedListingId === "marketplace" ? undefined : selectedListingId}
        quantity={selectedListingId === "marketplace" ? quantity : 1}
        Cancel={() => {
          setUseWalletBalance(false);
          setUseLinkedWallet(false);
        }}
      />
    );
  } else {
    content = (
      <ListingPurchasePayment
        key={`listing-${loadKey}`}
        type={type}
        nft={nft}
        marketplaceItem={item}
        initialListingId={initialListingId}
        selectedListingId={selectedListingId === "marketplace" ? undefined : selectedListingId}
        selectedListing={selectedListing}
        SelectListing={(listingId, listing) => {
          setSelectedListingId(listingId);
          setSelectedListing(listing);
        }}
        quantity={selectedListingId === "marketplace" ? quantity : 1}
        setQuantity={setQuantity}
        setUseLinkedWallet={setUseLinkedWallet}
        setUseWalletBalance={setUseWalletBalance}
        Cancel={() => Close()}
      />
    );
  }

  return (
    <Modal
      id="listing-purchase-modal"
      className="listing-purchase-modal-container"
      closable={!checkoutStore.submittingOrder}
      Toggle={() => Close()}
    >
      <div className="listing-purchase-modal">
        <div className="listing-purchase-modal__header">
          Checkout
        </div>
        { content }
      </div>
    </Modal>
  );
});


export default ListingPurchaseModal;
