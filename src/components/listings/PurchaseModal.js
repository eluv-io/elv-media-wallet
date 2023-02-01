import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {checkoutStore, cryptoStore, rootStore} from "Stores";
import {ActiveListings} from "Components/listings/TransferTables";
import {ButtonWithLoader, FormatPriceString, LocalizeString} from "Components/common/UIComponents";
import {Redirect, useRouteMatch} from "react-router-dom";
import NFTCard from "Components/nft/NFTCard";
import ImageIcon from "Components/common/ImageIcon";
import {roundToDown} from "round-to";
import WalletConnect from "Components/crypto/WalletConnect";
import {PageLoader} from "Components/common/Loaders";
import {NFTInfo, ScrollTo, ValidEmail} from "../../utils/Utils";
import SupportedCountries from "../../utils/SupportedCountries";

import PlusIcon from "Assets/icons/plus.svg";
import MinusIcon from "Assets/icons/minus.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";

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

const PurchaseProviderSelection = observer(({
  paymentOptions,
  price,
  usdcOptions={},
  errorMessage,
  disabled,
  Continue,
  Cancel
}) => {
  /*
    Notes:
      - Country only needs collecting if ebanx is enabled
        - If ebanx is disabled but stripe is enabled, only one step needed for CC
      - Pix is only available if ebanx is enabled
      - If usdcOnly is specified, go directly to crypto + linked wallet
  */


  const usdcAccepted = usdcOptions.SolUSDCAccepted || usdcOptions.EthUSDCAccepted;
  const usdcOnly = usdcOptions.SolUSDCOnly || usdcOptions.EthUSDCOnly;

  const phantomWallet = cryptoStore.WalletFunctions("phantom");
  const metamaskWallet = cryptoStore.WalletFunctions("metamask");

  // card, pix, crypto, wallet-balance
  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [type, setType] = useState(usdcOnly ? "crypto" : "");
  const [selectedMethod, setSelectedMethod] = useState(usdcOnly ? "linked-wallet-sol" : "card");
  const [email, setEmail] = useState(initialEmail);
  const [country, setCountry] = useState("");
  const [phantomConnected, setPhantomConnected] = useState(cryptoStore.PhantomAddress() && phantomWallet.Connected());
  const [metamaskConnected, setMetamaskConnected] = useState(metamaskWallet.Connected());

  const stripeEnabled = paymentOptions?.stripe?.enabled;
  const ebanxEnabled = paymentOptions?.ebanx?.enabled;
  const pixEnabled = ebanxEnabled && paymentOptions?.ebanx?.pix_enabled;
  const coinbaseEnabled = paymentOptions?.coinbase?.enabled;

  const UpdateCountry = (countryCode) => {
    setCountry(countryCode);

    if(countryCode === "other") {
      setSelectedMethod("stripe");
    } else {
      setSelectedMethod("ebanx");
    }
  };

  let options;
  switch(type) {
    case "card":
      // Credit card selected, ebanx enabled - Must collect country
      let ebanxAvailableCountries = [];

      if(paymentOptions?.ebanx?.allowed_countries?.length > 0) {
        ebanxAvailableCountries = SupportedCountries.ebanx.filter(([code]) => paymentOptions.ebanx.allowed_countries.includes(code));
      } else {
        ebanxAvailableCountries = SupportedCountries.ebanx;
      }

      // Unless ebanx is preferred, remove options where stripe is available
      if(stripeEnabled && !paymentOptions?.ebanx?.preferred) {
        ebanxAvailableCountries = ebanxAvailableCountries.filter(([code]) => !SupportedCountries.stripe.find(([otherCode]) => code === otherCode));
      }

      options = (
        <>
          <div className="purchase-modal__provider-options">
            <div className="purchase-modal__additional-fields">
              <div className="purchase-modal__payment-message">
                { rootStore.l10n.purchase.select_country }
              </div>
              {
                ebanxAvailableCountries.map(([code, name]) => (
                  <button
                    key={`country-select-${code}`}
                    onClick={() => UpdateCountry(code)}
                    className={`purchase-modal__provider-options__option ${country === code ? "active" : ""}`}
                  >
                    { name }
                  </button>
                ))
              }

              {
                stripeEnabled ?
                  <button
                    onClick={() => UpdateCountry("other")}
                    className={`purchase-modal__provider-options__option ${country === "other" ? "active" : ""}`}
                  >
                    { rootStore.l10n.purchase.all_other_countries }
                  </button> : null
              }
            </div>
          </div>
          <ButtonWithLoader
            disabled={disabled || !rootStore.loggedIn || !country}
            className="action action-primary purchase-modal__payment-submit"
            onClick={async () => {
              await Continue({
                paymentType: selectedMethod,
                email,
                additionalParameters: selectedMethod === "stripe" ?
                  {} :
                  {
                    country_code: country.toLowerCase(),
                    payment_method: "_creditcard"
                  }
              });
            }}
          >
            { LocalizeString(rootStore.l10n.actions.purchase.buy_now_for, {price}) }
          </ButtonWithLoader>
          <button
            className="action purchase-modal__payment-cancel"
            onClick={() => {
              setSelectedMethod("");
              setType("");
            }}
            disabled={checkoutStore.submittingOrder}
          >
            { rootStore.l10n.actions.back }
          </button>
        </>
      );

      break;

    case "crypto":
      options = (
        <>
          {
            usdcOnly || !coinbaseEnabled ? null :
              <button
                onClick={() => {
                  setSelectedMethod("coinbase");
                }}
                className={`purchase-modal__provider-options__option ${selectedMethod === "coinbase" ? "active" : ""}`}
              >
                Coinbase
              </button>
          }
          {
            usdcOptions.SolUSDCAccepted ?
              <button
                onClick={() => {
                  setSelectedMethod("linked-wallet-sol");
                }}
                className={`purchase-modal__provider-options__option ${selectedMethod === "linked-wallet-sol" ? "active" : ""}`}
              >
                USDC on Sol
              </button> : null
          }
          {
            usdcOnly ?
              <div className="purchase-modal__help-message">
                The seller has elected to only accept direct purchases with USDC via linked wallet. { cryptoStore.usdcConnected ? null : "Please connect your wallet to purchase this item, or select a different option from the list above." }
              </div> : null
          }
          {
            usdcOptions.EthUSDCAccepted ?
              <button
                onClick={() => {
                  setSelectedMethod("linked-wallet-eth");
                }}
                className={`purchase-modal__provider-options__option ${selectedMethod === "linked-wallet-eth" ? "active" : ""}`}
              >
                USDC on Eth
              </button> : null
          }
          {
            usdcOnly ?
              <div className="purchase-modal__help-message">
                The seller has elected to only accept direct purchases with USDC via linked wallet. { cryptoStore.usdcConnected ? null : "Please connect your wallet to purchase this item, or select a different option from the list above." }
              </div> : null
          }
          {
            selectedMethod === "linked-wallet-sol" ?
              <div className="purchase-modal__wallet-connect">
                <WalletConnect type="phantom" onConnect={() => setPhantomConnected(true)} />
              </div> : null
          }
          {
            selectedMethod === "linked-wallet-eth" ?
              <div className="purchase-modal__wallet-connect">
                <WalletConnect type="metamask" onConnect={() => setMetamaskConnected(true)} />
              </div> : null
          }
          {
            selectedMethod === "coinbase" && !ValidEmail(initialEmail) ?
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
              </> : null
          }
          <ButtonWithLoader
            disabled={
              disabled ||
              !rootStore.loggedIn ||
              !selectedMethod ||
              (selectedMethod === "coinbase" && !ValidEmail(email)) ||
              (selectedMethod === "linked-wallet-sol" && !(phantomConnected || phantomWallet.Connected())) ||
              (selectedMethod === "linked-wallet-eth" && !(metamaskConnected || metamaskWallet.Connected()))
            }
            className="action action-primary purchase-modal__payment-submit"
            onClick={async () => {
              await Continue({paymentType: selectedMethod, email});
            }}
          >
            {
              selectedMethod === "coinbase" ?
                LocalizeString(rootStore.l10n.actions.purchase.buy_now_for, {price}) :
                rootStore.l10n.actions.continue
            }
          </ButtonWithLoader>
          {
            usdcOnly ? null :
              <button
                className="action purchase-modal__payment-cancel"
                onClick={() => {
                  setSelectedMethod("");
                  setType("");
                }}
                disabled={checkoutStore.submittingOrder}
              >
                { rootStore.l10n.actions.back }
              </button>
          }
        </>
      );

      break;

    case "wallet-balance":
      options = (
        <>
          <div className="purchase-modal__payment-message">
            { rootStore.l10n.purchase.buy_with_wallet_balance }
          </div>
        </>
      );

      break;

    default:
      options = (
        <>
          <div className="purchase-modal__provider-options">
            {
              stripeEnabled || ebanxEnabled ?
                <button
                  onClick={() => {
                    setSelectedMethod("card");
                  }}
                  className={`purchase-modal__provider-options__option ${selectedMethod === "card" ? "active" : ""}`}
                >
                  { rootStore.l10n.purchase.credit_card }
                </button> : null
            }
            {
              ebanxEnabled && pixEnabled ?
                <button
                  onClick={() => {
                    setSelectedMethod("pix");
                  }}
                  className={`purchase-modal__provider-options__option ${selectedMethod === "pix" ? "active" : ""}`}
                >
                  Pix
                </button> :
                null
            }
            {
              coinbaseEnabled || usdcAccepted ?
                <button
                  onClick={() => {
                    setSelectedMethod("crypto");
                  }}
                  className={`purchase-modal__provider-options__option ${selectedMethod === "crypto" ? "active" : ""}`}
                >
                  Crypto
                </button> :
                null
            }
            <button
              onClick={() => {
                setSelectedMethod("wallet-balance");
              }}
              className={`purchase-modal__provider-options__option ${selectedMethod === "wallet-balance" ? "active" : ""}`}
            >
              { rootStore.l10n.purchase.wallet_balance }
            </button>
          </div>
          <ButtonWithLoader
            disabled={disabled || !rootStore.loggedIn || !selectedMethod}
            className="action action-primary purchase-modal__payment-submit"
            onClick={async () => {
              if(stripeEnabled && !ebanxEnabled && selectedMethod === "card") {
                await Continue({paymentType: "stripe"});
              } else if(selectedMethod === "pix") {
                await Continue({
                  paymentType: "ebanx",
                  additionalParameters: {
                    country_code: "br",
                    payment_method: "pix"
                  }
                });
              } else if(selectedMethod === "crypto" && !usdcAccepted && ValidEmail(email)) {
                await Continue({paymentType: "coinbase", email});
              } else if(selectedMethod === "wallet-balance") {
                await Continue({paymentType: "wallet-balance"});
              } else {
                setType(selectedMethod);

                if(selectedMethod === "crypto" && !usdcAccepted) {
                  setSelectedMethod("coinbase");
                } else {
                  setSelectedMethod("");
                }
              }
            }}
          >
            {
              // Pix is only available in brazil
              selectedMethod === "pix" ||
              // Stripe doesn't need any additional info
              (stripeEnabled && !ebanxEnabled && selectedMethod === "card") ||
              // If coinbase is the only option and we already have the user's email, we can proceed
              (selectedMethod === "crypto" && !usdcAccepted && ValidEmail(email)) ?
                LocalizeString(rootStore.l10n.actions.purchase.buy_now_for, {price}) :
                rootStore.l10n.actions.continue
            }
          </ButtonWithLoader>
          <button
            className="action purchase-modal__payment-cancel"
            onClick={() => Cancel()}
            disabled={checkoutStore.submittingOrder}
          >
            { rootStore.l10n.actions.back }
          </button>
        </>
      );
  }

  return (
    <div className="purchase-modal__payment-options">

      { options }

      {
        errorMessage || !rootStore.loggedIn ?
          <div className="purchase-modal__error-message">
            { errorMessage || "You must be logged in to complete this purchase." }
          </div> : null
      }
    </div>
  );
});

// Confirmation page for wallet balance purchase and linked wallet USDC payment
const PurchaseBalanceConfirmation = observer(({nft, marketplaceItem, selectedListing, listingId, quantity=1, linkedWallet, Cancel}) => {
  const match = useRouteMatch();
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [failed, setFailed] = useState(false);
  const [confirmationId, setConfirmationId] = useState(undefined);
  const [feeRate, setFeeRate] = useState(0.065);

  useEffect(() => {
    rootStore.walletClient.TenantConfiguration({
      contractAddress: nft.details.ContractAddr
    })
      .then(config => {
        if(config["nft-fee-percent"]) {
          setFeeRate(parseFloat(config["nft-fee-percent"]) / 100);
        }
      });
  }, []);

  const info = NFTInfo({
    nft,
    item: marketplaceItem,
    listing: selectedListing
  });

  const purchaseStatus = confirmationId && checkoutStore.purchaseStatus[confirmationId] || {};
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const total = info.price * quantity;
  const fee = Math.max(1, roundToDown(total * feeRate, 2));

  let balanceAmount = rootStore.availableWalletBalance;
  let balanceName = rootStore.l10n.purchase.wallet_balance;
  let balanceIcon;
  if(linkedWallet === "linked-wallet-sol") {
    balanceName = "USDC Balance (Sol)";
    balanceAmount = cryptoStore.phantomUSDCBalance;
    balanceIcon = <ImageIcon icon={USDCIcon} label="USDC" title="USDC" />;
  } else if(linkedWallet === "linked-wallet-eth") {
    balanceName = "USDC Balance (Eth)";
    balanceAmount = cryptoStore.metamaskUSDCBalance;
    balanceIcon = <ImageIcon icon={USDCIcon} label="USDC" title="USDC" />;
  }

  const insufficientBalance = balanceAmount < total + fee;

  useEffect(() => {
    if(linkedWallet === "linked-wallet-sol") {
      cryptoStore.PhantomBalance();
    } else if(linkedWallet === "linked-wallet-eth") {
      cryptoStore.MetamaskBalance();
    }
  }, [cryptoStore.metamaskAddress, cryptoStore.metamaskChainId, cryptoStore.phantomAddress]);

  useEffect(() => {
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
      setErrorMessage(rootStore.l10n.purchase.errors.failed);
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
            { rootStore.l10n.purchase.service_fee }
          </div>
          <div className="purchase-modal__order-price">
            { FormatPriceString(fee) }
          </div>
        </div>
        <div className="purchase-modal__order-separator" />
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            { rootStore.l10n.purchase.total_amount }
          </div>
          <div className="purchase-modal__order-price">
            { FormatPriceString(total + fee) }
          </div>
        </div>
      </div>
      <div className="purchase-modal__order-details purchase-modal__order-details-box">
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            { LocalizeString(rootStore.l10n.purchase.available_balance, {balanceType: balanceName})}
          </div>
          <div className="purchase-modal__order-price">
            {FormatPriceString(balanceAmount || 0, {vertical: true})}
          </div>
        </div>
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            { rootStore.l10n.purchase.current_purchase_amount }
          </div>
          <div className="purchase-modal__order-price">
            {FormatPriceString(total + fee, {vertical: true})}
          </div>
        </div>
        <div className="purchase-modal__order-separator"/>
        <div className="purchase-modal__order-line-item">
          <div className="purchase-modal__order-label">
            { LocalizeString(rootStore.l10n.purchase.remaining_balance, {balanceType: balanceName})}
          </div>
          <div className="purchase-modal__order-price">
            { balanceIcon }
            {FormatPriceString(balanceAmount - (total + fee), {vertical: true})}
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
                  provider: linkedWallet || "wallet-balance",
                  marketplaceId: match.params.marketplaceId,
                  listingId,
                  tenantId: selectedListing.details.TenantId
                });
              } else {
                // Marketplace purchase
                result = await checkoutStore.CheckoutSubmit({
                  provider: linkedWallet || "wallet-balance",
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

              setErrorMessage(error.uiMessage || rootStore.l10n.purchase.errors.failed);
            }
          }}
        >
          { rootStore.l10n.actions.purchase.buy_now }
        </ButtonWithLoader>
        <button className="action" onClick={() => Cancel()} disabled={checkoutStore.submittingOrder}>
          { rootStore.l10n.actions.back }
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
  setLinkedWallet,
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

  const marketplacePaymentOptions = marketplace?.payment_options || { stripe: { enabled: true }, coinbase: { enabled: true }, ebanx: { enabled: false }};

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
      setErrorMessage(rootStore.l10n.purchase.errors.failed);
    }
  }, [purchaseStatus]);


  const Continue = async ({paymentType, email, additionalParameters={}}) => {
    if(paymentType === "wallet-balance") {
      setUseWalletBalance(true);
      return;
    } else if(["linked-wallet-sol", "linked-wallet-eth"].includes(paymentType)) {
      setLinkedWallet(paymentType);
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

      setErrorMessage(error.uiMessage || rootStore.l10n.purchase.errors.failed);
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
                {FormatPriceString(info.price || 0, {quantity, includeCurrency: true})}
              </div>
            </div> : null) :
          <>
            {
              listingStats ?
                <div className="purchase-modal__stats">
                  <div className="purchase-modal__stats__label">
                    { rootStore.l10n.stats.listings.buy_from_collector }
                  </div>
                  <div className="purchase-modal__stats-list">
                    <div className="purchase-modal__stat">
                      <div className="purchase-modal__stat__label">
                        { rootStore.l10n.stats.listings.highest }
                      </div>
                      <div className="purchase-modal__stat__price">
                        {FormatPriceString(listingStats.max)}
                      </div>
                    </div>
                    <div className="purchase-modal__stat">
                      <div className="purchase-modal__stat__label">
                        { rootStore.l10n.stats.listings.lowest }
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
        paymentOptions={marketplacePaymentOptions}
        price={FormatPriceString(info.price || 0, {quantity, stringOnly: true})}
        errorMessage={errorMessage}
        usdcOptions={selectedListing?.details}
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
  const [linkedWallet, setLinkedWallet] = useState(undefined);
  const [selectedListing, setSelectedListing] = useState();
  const [selectedListingId, setSelectedListingId] = useState(type === "marketplace" ? "marketplace" : initialListingId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    ScrollTo(0, document.getElementById("purchase-modal"));
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
  } else if(useWalletBalance || linkedWallet) {
    // Purchase confirmation screen - not used for stripe/coinbase checkout
    content = (
      <PurchaseBalanceConfirmation
        key={`listing-${loadKey}`}
        type={type}
        linkedWallet={linkedWallet}
        nft={nft}
        marketplaceItem={item}
        selectedListing={selectedListing}
        listingId={selectedListingId === "marketplace" ? undefined : selectedListingId}
        quantity={selectedListingId === "marketplace" ? quantity : 1}
        Cancel={() => {
          setUseWalletBalance(false);
          setLinkedWallet(undefined);
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
        setLinkedWallet={setLinkedWallet}
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
          { rootStore.l10n.purchase.checkout }
        </h1>
        { content }
      </div>
    </Modal>
  );
});


export default PurchaseModal;
