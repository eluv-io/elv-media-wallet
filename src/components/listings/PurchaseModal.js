import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {checkoutStore, cryptoStore, rootStore} from "Stores";
import {ActiveListings} from "Components/listings/TransferTables";
import {ButtonWithLoader, Copy, FormatPriceString, Select} from "Components/common/UIComponents";
import {Redirect, useRouteMatch} from "react-router-dom";
import NFTCard from "Components/nft/NFTCard";
import ImageIcon from "Components/common/ImageIcon";
import {roundToDown} from "round-to";
import WalletConnect from "Components/crypto/WalletConnect";
import {PageLoader} from "Components/common/Loaders";
import {NFTInfo, ValidEmail} from "../../utils/Utils";

import PlusIcon from "Assets/icons/plus.svg";
import MinusIcon from "Assets/icons/minus.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import HelpIcon from "Assets/icons/help-circle.svg";

import StripeLogo from "Assets/icons/stripe-logo.png";
import EbanxLogo from "Assets/icons/ebanx-logo-1-L.png";
import CoinbaseLogo from "Assets/icons/crypto/Coinbase Icon (16x16)(1).svg";
import SolanaLogo from "Assets/icons/solana icon.svg";
import PhantomLogo from "Assets/icons/crypto/phantom.png";


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
          disabled
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
    </div>
  );
};

const PurchaseProviderSelection = observer(({price, usdcAccepted, usdcOnly, errorMessage, disabled, Continue, Cancel}) => {
  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [paymentType, setPaymentType] = useState(usdcOnly || (usdcAccepted && cryptoStore.usdcOnly) ? "linked-wallet" : "stripe");
  const [selectedSection, setSelectedSection] = useState(usdcOnly || (usdcAccepted && cryptoStore.usdcOnly) ? "crypto" : "card");
  const [email, setEmail] = useState(initialEmail);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [showUSDCOnlyMessage, setShowUSDCOnlyMessage] = useState(false);

  const wallet = cryptoStore.WalletFunctions("phantom");
  const connected = paymentType !== "linked-wallet" || cryptoStore.PhantomAddress() && wallet.Connected();

  const requiresEmail = ["coinbase"].includes(paymentType);
  const externalPayment = ["stripe", "ebanx", "coinbase"].includes(paymentType);

  const solanaWallet = cryptoStore.WalletFunctions("phantom");
  const solanaAccount = solanaWallet.ConnectedAccounts()[0];

  return (
    <div className="purchase-modal__payment-options">
      {
        !initialEmail && requiresEmail ?
          <>
            <div className="purchase-modal__payment-message">
              Email
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="purchase-modal__email-input"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </>: null
      }
      <div className="purchase-modal__payment-message">
        Buy with
        {
          usdcOnly ?
            <button onClick={() => setShowUSDCOnlyMessage(!showUSDCOnlyMessage)}>
              <ImageIcon icon={HelpIcon} label="Why is only linked wallet available?"/>
            </button> : null
        }
      </div>


      <div className="purchase-modal__provider-options">
        <div className={`purchase-modal__provider-options__section ${selectedSection !== "card" ? "purchase-modal__provider-options__section--hidden" : ""}`}>
          <button
            className="purchase-modal__provider-options__header"
            onClick={() => {
              setSelectedSection("card");
              setPaymentType("stripe");
            }}
          >
            Credit/Debit Card
          </button>
          <div className="purchase-modal__provider-options__options">
            <div className={`purchase-modal__provider-options__option-container ${paymentType === "stripe" ? "purchase-modal__provider-options__option-container--active" : ""}`}>
              <div className="purchase-modal__provider-options__option">
                <ImageIcon icon={StripeLogo} label="Stripe" className="purchase-modal__provider-options__option__logo" />
                <div className="purchase-modal__provider-options__option__text">
                  Stripe
                </div>
              </div>
              <button onClick={() => setPaymentType("stripe")} className="purchase-modal__provider-options__selected-indicator" />
            </div>
            <div className={`purchase-modal__provider-options__option-container ${paymentType === "ebanx" ? "purchase-modal__provider-options__option-container--active" : ""}`}>
              <div className="purchase-modal__provider-options__option">
                <ImageIcon icon={EbanxLogo} label="Stripe" className="purchase-modal__provider-options__option__logo" />
                <div className="purchase-modal__provider-options__option__text">
                  Ebanx
                </div>
              </div>
              <button onClick={() => setPaymentType("ebanx")} className="purchase-modal__provider-options__selected-indicator" />
            </div>
          </div>
        </div>

        <div className={`purchase-modal__provider-options__section ${selectedSection !== "crypto" ? "purchase-modal__provider-options__section--hidden" : ""}`}>
          <button
            className="purchase-modal__provider-options__header"
            onClick={() => {
              setSelectedSection("crypto");
              setPaymentType("coinbase");
            }}
          >
            Crypto
          </button>
          <div className="purchase-modal__provider-options__options">
            <div className={`purchase-modal__provider-options__option-container ${paymentType === "coinbase" ? "purchase-modal__provider-options__option-container--active" : ""}`}>
              <div className="purchase-modal__provider-options__option purchase-modal__provider-options__option--crypto">
                <ImageIcon icon={CoinbaseLogo} label="Coinbase" className="purchase-modal__provider-options__option__logo" />
                <div className="purchase-modal__provider-options__option__text">
                  Coinbase
                </div>
              </div>
              <button onClick={() => setPaymentType("coinbase")} className="purchase-modal__provider-options__selected-indicator" />
            </div>
            <div className={`purchase-modal__provider-options__option-container ${paymentType === "linked-wallet" ? "purchase-modal__provider-options__option-container--active" : ""}`}>
              <div className="purchase-modal__provider-options__option purchase-modal__provider-options__option--crypto">
                <ImageIcon icon={SolanaLogo} label="USDC on Solana" className="purchase-modal__provider-options__option__logo" />
                <div className="purchase-modal__provider-options__option__text">
                  USDC on Sol
                </div>
                <div className="purchase-modal__provider-options__option__crypto">
                  <ImageIcon icon={PhantomLogo} label="Phantom" className="purchase-modal__provider-options__option__crypto__icon"/>
                  {
                    solanaAccount ?
                      <button onClick={() => Copy(solanaAccount.link_acct)} className="purchase-modal__provider-options__option__crypto__account ellipsis">
                        { solanaAccount.link_acct }
                      </button> :
                      <button onClick={() => solanaWallet.Connect()} className="purchase-modal__provider-options__option__crypto__account">
                        { solanaAccount ? solanaAccount : "Link Wallet" }
                      </button>
                  }
                </div>
              </div>
              <button onClick={() => setPaymentType("linked-wallet")} className="purchase-modal__provider-options__selected-indicator" />
            </div>
          </div>
        </div>
        <div className={`purchase-modal__provider-options__section ${selectedSection !== "wallet-balance" ? "purchase-modal__provider-options__section--hidden" : ""}`}>
          <button
            className="purchase-modal__provider-options__header"
            onClick={() => {
              setSelectedSection("wallet-balance");
              setPaymentType("wallet-balance");
            }}
          >
            Seller Balance
          </button>
        </div>
      </div>

      {
        usdcOnly && showUSDCOnlyMessage ?
          <div className="purchase-modal__help-message">
            The seller has elected to only accept direct purchases with USDC via linked wallet. { cryptoStore.usdcConnected ? null : "Please connect your wallet to purchase this item, or select a different option from the list above." }
          </div> : null
      }
      {
        paymentType === "ebanx" ?
          <>
            <div className="purchase-modal__additional-fields">
              <div className="purchase-modal__payment-message">
                Please specify your country
              </div>
              <Select
                value={selectedCountry}
                onChange={value => setSelectedCountry(value)}
                containerClassName="purchase-modal__country-select"
                options={[
                  ["", "Select your Country"],
                  ["ar", "Argentina"],
                  ["bo", "Bolivia"],
                  ["br", "Brazil"],
                  ["cl", "Chile"],
                  ["co", "Colombia"],
                  ["ec", "Ecuador"],
                  ["sv", "El Salvador"],
                  ["gt", "Guatemala"],
                  ["mx", "Mexico"],
                  ["pa", "Panama"],
                  ["py", "Paraguay"],
                  ["pe", "Peru"],
                  ["uy", "Uruguay"]
                ]}
              />
            </div>
          </> : null
      }
      { paymentType === "linked-wallet" ? <div className="purchase-modal__wallet-connect"><WalletConnect /></div> : null }
      <ButtonWithLoader
        disabled={disabled || !connected || (paymentType === "ebanx" && !selectedCountry) || (requiresEmail && !ValidEmail(email))}
        className="action action-primary purchase-modal__payment-submit"
        onClick={async () => await Continue(paymentType, email, paymentType === "ebanx" ? { name: "Test", country_code: selectedCountry } : {})}
      >
        {
          externalPayment ?
            price ?
              `Buy Now for ${price}` :
              "Buy Now" :
            "Continue"
        }
      </ButtonWithLoader>
      <button
        className="action purchase-modal__payment-cancel"
        onClick={() => Cancel()}
        disabled={checkoutStore.submittingOrder}
      >
        Back
      </button>
      {
        errorMessage ?
          <div className="purchase-modal__error-message">
            { errorMessage }
          </div> : null
      }
    </div>
  );
});

// Confirmation page for wallet balance purchase and linked wallet USDC payment
const PurchaseBalanceConfirmation = observer(({nft, marketplaceItem, selectedListing, listingId, quantity=1, useLinkedWallet, Cancel}) => {
  const match = useRouteMatch();
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [failed, setFailed] = useState(false);
  const [confirmationId, setConfirmationId] = useState(undefined);

  const info = NFTInfo({
    nft,
    item: marketplaceItem,
    listing: selectedListing
  });

  const purchaseStatus = confirmationId && checkoutStore.purchaseStatus[confirmationId] || {};
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const total = info.price * quantity;
  const fee = Math.max(1, roundToDown(total * 0.05, 2));
  const balanceAmount = useLinkedWallet ? cryptoStore.phantomUSDCBalance : rootStore.availableWalletBalance;
  const balanceName = useLinkedWallet ? "USDC Balance" : "Wallet Balance";
  const balanceIcon = useLinkedWallet ? <ImageIcon icon={USDCIcon} label="USDC" title="USDC" /> : null;

  const insufficientBalance = balanceAmount < total + fee;

  useEffect(() => {
    if(useLinkedWallet) {
      cryptoStore.PhantomBalance();
    }

    if(!info.stock || !marketplace) { return; }

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
    <div className="purchase-modal__content">
      <NFTCard
        nft={nft}
        item={marketplaceItem}
        selectedListing={selectedListing}
        hideToken={!selectedListing}
        hideAvailable={!info.available || (marketplaceItem && marketplaceItem.hide_available)}
        truncateDescription
      />
      <div className="purchase-modal__order-details">
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            { nft.metadata.display_name } { quantity > 1 ? <div className="purchase-modal__quantity">&nbsp;x {quantity}</div> : "" }
          </div>
          <div className="purchase-modal__order-price">
            { FormatPriceString(total) }
          </div>
        </div>
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            Service Fee
          </div>
          <div className="purchase-modal__order-price">
            { FormatPriceString(fee) }
          </div>
        </div>
        <div className="purchase-modal__order-separator" />
        <div className="purchase-modal__order-line-item purchase-modal__order-line-item--bold">
          <div className="purchase-modal__order-label">
            Total
          </div>
          <div className="purchase-modal__order-price">
            { FormatPriceString(total + fee) }
          </div>
        </div>
      </div>
      <div className="purchase-modal__order-details purchase-modal__order-details-box">
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            Available { balanceName }
          </div>
          <div className="purchase-modal__order-price">
            {FormatPriceString(balanceAmount || 0)}
          </div>
        </div>
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            Current Purchase
          </div>
          <div className="purchase-modal__order-price">
            {FormatPriceString(total + fee)}
          </div>
        </div>
        <div className="purchase-modal__order-separator"/>
        <div className="purchase-modal__order-line-item purchase-modal__order-line-item--bold">
          <div className="purchase-modal__order-label">
            Remaining { balanceName }
          </div>
          <div className="purchase-modal__order-price">
            { balanceIcon }
            {FormatPriceString(balanceAmount - (total + fee))}
          </div>
        </div>
      </div>
      <div className="purchase-modal__actions purchase-wallet-balance-actions">
        <ButtonWithLoader
          disabled={!info.available || info.outOfStock || insufficientBalance || failed}
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
        errorMessage || !info.available || info.outOfStock || insufficientBalance ?
          <div className="purchase-modal__error-message">
            {
              errorMessage ? errorMessage :
                info.outOfStock ? "This item is out of stock" :
                  !info.available ? "This item is no longer available" :
                    `Insufficient ${balanceName}`
            }
          </div> : null
      }
    </div>
  );
});

const PurchasePayment = observer(({
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
  const [listingStats, setListingStats] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const info = NFTInfo({
    nft,
    item: marketplaceItem,
    listing: selectedListing
  });

  const maxPerCheckout = marketplaceItem?.max_per_checkout || 25;
  const maxPerUser = (info.stock && info.stock.max_per_user && (info.stock.max_per_user - info.stock.current_user)) || 25;
  const quantityAvailable = (info.stock && (info.stock.max - info.stock.minted)) || 25;

  const maxQuantity = Math.max(1, Math.min(maxPerCheckout, Math.min(maxPerUser, quantityAvailable)));

  const purchaseStatus = confirmationId && checkoutStore.purchaseStatus[confirmationId] || {};

  useEffect(() => {
    if(type === "listing") {
      rootStore.walletClient.ListingStats({contractAddress: nft.details.ContractAddr})
        .then(stats => setListingStats(stats));
    }

    if(!info.stock || !marketplace) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  useEffect(() => {
    if(purchaseStatus.status === "complete" && !purchaseStatus.success) {
      setErrorMessage("Purchase failed");
    }
  }, [purchaseStatus]);


  const Continue = async (paymentType, email, additionalParameters={}) => {
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
          email,
          additionalParameters
        });
      } else {
        // Marketplace purchase
        result = await checkoutStore.CheckoutSubmit({
          provider: paymentType,
          tenantId: marketplace.tenant_id,
          marketplaceId: match.params.marketplaceId,
          sku: marketplaceItem.sku,
          quantity,
          email,
          additionalParameters
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

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
    <div className="purchase-modal__content">
      <NFTCard
        nft={nft}
        item={marketplaceItem}
        selectedListing={selectedListing}
        hideToken={!selectedListing}
        truncateDescription
      />
      {
        type === "marketplace" ?
          (maxQuantity > 1 ?
            <div className="purchase-modal__price-details">
              <QuantityInput quantity={quantity} setQuantity={setQuantity} maxQuantity={maxQuantity}/>
              <div className="purchase-modal__price-details__price">
                {FormatPriceString(info.price?.USD || 0, {quantity, includeCurrency: true})}
              </div>
            </div> : null) :
          <>
            {
              listingStats ?
                <div className="purchase-modal__stats">
                  <div className="purchase-modal__stats__label">
                    Buy from a Collector
                  </div>
                  <div className="purchase-modal__stats-list">
                    <div className="purchase-modal__stat">
                      <div className="purchase-modal__stat__label">
                        Highest Price
                      </div>
                      <div className="purchase-modal__stat__price">
                        {FormatPriceString(listingStats.max)}
                      </div>
                    </div>
                    <div className="purchase-modal__stat">
                      <div className="purchase-modal__stat__label">
                        Lowest Price
                      </div>
                      <div className="purchase-modal__stat__price">
                        {FormatPriceString(listingStats.min)}
                      </div>
                    </div>
                  </div>
                </div> : null
            }
            <ActiveListings
              selectedListingId={selectedListingId || initialListingId}
              contractAddress={nft.details.ContractAddr}
              Select={SelectListing}
            />
          </>
      }
      <PurchaseProviderSelection
        price={FormatPriceString(info.price?.USD || 0, {quantity, stringOnly: true})}
        errorMessage={errorMessage}
        usdcAccepted={selectedListing?.details?.USDCAccepted}
        usdcOnly={selectedListing?.details?.USDCOnly}
        disabled={(type === "listing" && !selectedListingId) || !info.available || info.outOfStock || failed}
        Continue={Continue}
        Cancel={Cancel}
      />
    </div>
  );
});

let timeout;
const PurchaseModal = observer(({nft, item, initialListingId, type="marketplace", Close}) => {
  const [loadKey, setLoadKey] = useState(0);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [useLinkedWallet, setUseLinkedWallet] = useState(false);
  const [selectedListing, setSelectedListing] = useState();
  const [selectedListingId, setSelectedListingId] = useState(type === "marketplace" ? "marketplace" : initialListingId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const modal = document.getElementById("purchase-modal");
    modal && modal.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if(initialListingId) {
      rootStore.walletClient.Listing({listingId: initialListingId})
        .then(listing => setSelectedListing(listing));
    }
  }, []);

  const timeToExpired = item && item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : undefined;
  if(timeToExpired > 0) {
    clearTimeout(timeout);
    setTimeout(() => {
      setLoadKey(loadKey + 1);
    }, Math.min(timeToExpired + 1000, 24 * 60 * 60 * 1000));
  }

  let content;
  if(type === "listing" && !selectedListing) {
    content = <PageLoader />;
  } else if(useWalletBalance || useLinkedWallet) {
    // Purchase confirmation screen - not used for stripe/coinbase checkout
    content = (
      <PurchaseBalanceConfirmation
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
      <PurchasePayment
        key={`listing-${loadKey}`}
        type={type}
        nft={nft}
        marketplaceItem={item}
        initialListingId={initialListingId}
        selectedListingId={selectedListingId === "marketplace" ? undefined : selectedListingId}
        selectedListing={selectedListing}
        SelectListing={(listingId, listing) => {
          if(listingId) {
            setSelectedListingId(listingId);
            setSelectedListing(listing);
          }
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
      id="purchase-modal"
      className="purchase-modal-container"
      closable={!checkoutStore.submittingOrder}
      Toggle={() => Close()}
    >
      <div className="purchase-modal">
        <h1 className="purchase-modal__header">
          Checkout
        </h1>
        { content }
      </div>
    </Modal>
  );
});


export default PurchaseModal;
