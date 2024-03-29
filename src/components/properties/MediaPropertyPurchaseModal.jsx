import PurchaseModalStyles from "Assets/stylesheets/media_properties/property-purchase-modal.module.scss";

import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {Modal, TextInput} from "@mantine/core";
import {Loader} from "Components/common/Loaders";
import {NFTInfo, ValidEmail} from "../../utils/Utils";
import {Description, ScaledText} from "Components/properties/Common";
import {LocalizeString} from "Components/common/UIComponents";
import SupportedCountries from "../../utils/SupportedCountries";
import {roundToDown} from "round-to";

const S = (...classes) => classes.map(c => PurchaseModalStyles[c] || "").join(" ");

const Item = observer(({item, Actions}) => {
  const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];
  const marketplaceItem = marketplace?.items?.find(({sku}) => sku === item.marketplace_sku);

  if(!marketplaceItem) { return null; }

  const itemInfo = NFTInfo({item: marketplaceItem});

  return (
    <div className={S("item")}>
      <div className={S("item__price")}>
        { FormatPriceString(itemInfo.price) }
      </div>
      <ScaledText maxPx={32} className={S("item__title")}>
        { item.title }
      </ScaledText>
      <div className={S("item__subtitle")}>
        { item.subtitle }
      </div>
      <Description
        description={item.description}
        className={S("item__description")}
      />
      {
        !Actions ? null :
          <div className={S("item__actions")}>
            { Actions({item, itemInfo}) }
          </div>
      }
    </div>
  );
});

const Items = observer(({sectionItem, Select}) => {
  return (
    <div className={S("items")}>
      {
        sectionItem.items?.map(item => (
          <Item
            item={item}
            Actions={({item, itemInfo}) =>
              <button onClick={() => Select(item.id)} className={S("payment__button", "payment__select")}>
                <ScaledText maxPx={18} minPx={10}>
                  {
                    LocalizeString(
                      rootStore.l10n.media_properties.purchase.select,
                      { title: item.title, price: FormatPriceString(itemInfo.price, { stringOnly: true}) },
                      { stringOnly: true }
                    )
                  }
                </ScaledText>
              </button>
            }
          />
        ))
      }
    </div>
  );
});

const WalletBalanceSummary = observer(({itemInfo, fee}) => {
  const price = itemInfo.price;
  const total = price + fee;
  const insufficientBalance = rootStore.availableWalletBalance < total + fee;

  return (
    <>
      <div className={S("summary")}>
        <div className={S("summary__line")}>
          <label>{ rootStore.l10n.purchase.price }</label>
          <div>{ FormatPriceString(price) }</div>
        </div>
        <div className={S("summary__line")}>
          <label>{ rootStore.l10n.purchase.service_fee }</label>
          <div>{ FormatPriceString(fee) }</div>
        </div>
        <div className={S("summary__separator")} />
        <div className={S("summary__line")}>
          <label>{ rootStore.l10n.purchase.total_amount }</label>
          <div>{ FormatPriceString(total) }</div>
        </div>
        <div className={S("summary__box")}>
          <div className={S("summary__line")}>
            <label>{ rootStore.l10n.purchase.available_wallet_balance }</label>
            <div>{ FormatPriceString(rootStore.availableWalletBalance) }</div>
          </div>
          <div className={S("summary__line")}>
            <label>{ rootStore.l10n.purchase.remaining_wallet_balance }</label>
            <div>{ FormatPriceString(rootStore.availableWalletBalance - total) }</div>
          </div>
        </div>
        {
          !insufficientBalance ? null :
            <div className={S("payment__message", "payment__error", "summary__error")}>
              {rootStore.l10n.purchase.errors.insufficient_funds}
            </div>
        }
      </div>
    </>
  );
});

// TODO: Submit, stock, status, routing
const PaymentOptions = observer(({item, itemInfo, paymentMethod, setPaymentMethod}) => {
  const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];
  const paymentOptions = marketplace?.payment_options || { stripe: { enabled: true } };

  const stripeEnabled = paymentOptions?.stripe?.enabled;
  const ebanxEnabled = paymentOptions?.ebanx?.enabled;
  const pixEnabled = ebanxEnabled && paymentOptions?.ebanx?.pix_enabled;
  const coinbaseEnabled = paymentOptions?.coinbase?.enabled;

  const [feeRate, setFeeRate] = useState(0.065);

  useEffect(() => {
    rootStore.walletClient.TenantConfiguration({
      contractAddress: itemInfo.nft.details.ContractAddr
    })
      .then(config => {
        if(config["nft-fee-percent"]) {
          setFeeRate(parseFloat(config["nft-fee-percent"]) / 100);
        }
      });
  }, []);

  const fee = Math.max(1, roundToDown(itemInfo.price * feeRate, 2));
  const insufficientBalance = rootStore.availableWalletBalance < itemInfo.price + fee;

  // Credit card selected, ebanx enabled - Must collect country
  let ebanxAvailableCountries = [];

  if(paymentOptions?.ebanx?.allowed_countries?.length > 0) {
    ebanxAvailableCountries = SupportedCountries.ebanx.filter(([code]) => paymentOptions.ebanx.allowed_countries.includes(code));
  } else {
    ebanxAvailableCountries = SupportedCountries.ebanx;
  }

  // Unless ebanx is preferred, remove options where stripe is available
  if(stripeEnabled) {
    if(!paymentOptions?.ebanx?.preferred) {
      ebanxAvailableCountries = ebanxAvailableCountries.filter(([code]) => !SupportedCountries.stripe.find(([otherCode]) => code === otherCode));
    }

    ebanxAvailableCountries.push(["other", rootStore.l10n.purchase.all_other_countries]);
  }

  let page, options;
  if(paymentMethod.type === "card" && ebanxEnabled) {
    page = "ebanx";
  } else if(paymentMethod.type === "crypto" && !ValidEmail(paymentMethod.initialEmail)) {
    page = "crypto";
  } else if(paymentMethod.type === "balance") {
    page = "balance";
  }

  const canPurchase =
    (paymentMethod.type === "card" && (!ebanxEnabled || paymentMethod.country)) ||
    (paymentMethod.type === "crypto" && ValidEmail(paymentMethod.email)) ||
    (paymentMethod.type === "balance" && !insufficientBalance) ||
    paymentMethod.type === "pix";


  switch(page) {
    case "ebanx":
      options =
        <>
          <div className={S("payment__message")}>
            { rootStore.l10n.purchase.select_country }
          </div>
          {
            ebanxAvailableCountries.map(([code, name]) => (
              <button
                key={`country-select-${code}`}
                onClick={() => setPaymentMethod({...paymentMethod, country: code})}
                className={S("payment__option", paymentMethod.country === code ? "payment__option--active" : "")}
              >
                { name }
              </button>
            ))
          }
        </>;
      break;
    case "crypto":
      options =
        <TextInput
          fz="xl"
          label={rootStore.l10n.purchase.email}
          value={paymentMethod.email}
          onChange={event => setPaymentMethod({...paymentMethod, email: event.target.value})}
          classNames={{
            label: S("payment__input-label"),
            input: S("payment__input")
          }}
        />;
      break;
    case "balance":
      // Wallet balance handled separately
      options = (
        <WalletBalanceSummary
          itemInfo={itemInfo}
          fee={fee}
        />
      );
      break;
    default:
      options =
        <>
          <button
            onClick={() => setPaymentMethod({...paymentMethod, type: "card"})}
            className={S("payment__option", paymentMethod.type === "card" ? "payment__option--active" : "")}
          >
            { rootStore.l10n.purchase.purchase_methods.credit_card }
          </button>
          {
            !coinbaseEnabled ? null :
              <button
                onClick={() => setPaymentMethod({...paymentMethod, type: "crypto"})}
                className={S("payment__option", paymentMethod.type === "crypto" ? "payment__option--active" : "")}
              >
                {rootStore.l10n.purchase.purchase_methods.crypto}
              </button>
          }
          {
            !pixEnabled ? null :
              <button
                onClick={() => setPaymentMethod({...paymentMethod, type: "pix"})}
                className={S("payment__option", paymentMethod.type === "pix" ? "payment__option--active" : "")}
              >
                {rootStore.l10n.purchase.purchase_methods.pix}
              </button>
          }
          <button
            onClick={() => setPaymentMethod({...paymentMethod, type: "balance"})}
            className={S("payment__option", paymentMethod.type === "balance" ? "payment__option--active" : "")}
          >
            { rootStore.l10n.purchase.purchase_methods.wallet_balance }
          </button>
        </>;
  }

  return (
    <div key={`actions-${page}`} className={S("payment")}>
      { options }
      <br />
      {
        !canPurchase ? null :
          <button disabled={!canPurchase} onClick={() => console.log("purchase")} className={S("payment__button", "payment__select")}>
            <ScaledText maxPx={18} minPx={10}>
              {
                LocalizeString(
                  rootStore.l10n.media_properties.purchase.select,
                  {title: item.title, price: FormatPriceString(itemInfo.price, {stringOnly: true})},
                  {stringOnly: true}
                )
              }
            </ScaledText>
          </button>
      }
      {
        !page ? null :
          <button onClick={() => setPaymentMethod({...paymentMethod, type: undefined})} className={S("payment__button", "payment__back")}>
            { rootStore.l10n.actions.back }
          </button>
      }
    </div>
  );
});

const Payment = observer(({item}) => {
  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [paymentMethod, setPaymentMethod] = useState({type: undefined, country: undefined, email: initialEmail, initialEmail});

  return (
    <Item
      item={item}
      Actions={({itemInfo}) =>
        <PaymentOptions
          item={item}
          itemInfo={itemInfo}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
        />
      }
    />
  );
});

const MediaPropertyPurchaseModal = observer(({sectionItem, Close}) => {
  const [loaded, setLoaded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(undefined);

  useEffect(() => {
    rootStore.GetWalletBalance();

    Promise.all(
      sectionItem.items?.map(async item =>
        await rootStore.LoadMarketplace(item.marketplace?.marketplace_id)
      )
    ).then(() => {
      setLoaded(true);
    });
  }, [sectionItem]);

  let content, key;
  if(!loaded) {
    key = 0;
    content = <Loader className={S("loader")}/>;
  } else if(selectedItemId) {
    key = 2;
    content = (
      <div className="purchase">
        <Payment
          item={sectionItem.items.find(item => item.id === selectedItemId)}
        />
      </div>
    );
  } else {
    key = 1;
    content = (
      <div className="purchase">
        <Items sectionItem={sectionItem} Select={setSelectedItemId} />
      </div>
    );
  }

  return (
    <Modal
      size="auto"
      centered
      opened
      withCloseButton={rootStore.pageWidth < 600}
      onClose={Close}
      classNames={{
        root: S("purchase-modal"),
        overlay: S("purchase-modal__overlay"),
        content: S("purchase-modal__content")
      }}
    >
      <div key={`step-${key}`} className={S("form")}>
        {
          content
        }
      </div>
    </Modal>
  );
});

export default MediaPropertyPurchaseModal;
