import PurchaseModalStyles from "Assets/stylesheets/media_properties/property-purchase-modal.module.scss";

import React, {useEffect, useState} from "react";
import {checkoutStore, mediaPropertyStore, rootStore} from "Stores";
import {observer} from "mobx-react";
import {Modal, TextInput} from "@mantine/core";
import {Loader} from "Components/common/Loaders";
import {NFTInfo, ValidEmail} from "../../utils/Utils";
import {Description, ScaledText} from "Components/properties/Common";
import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
import SupportedCountries from "../../utils/SupportedCountries";
import {roundToDown} from "round-to";
import {useHistory, useRouteMatch} from "react-router-dom";

const S = (...classes) => classes.map(c => PurchaseModalStyles[c] || "").join(" ");

const PurchaseParams = () => {
  const urlParams = new URLSearchParams(location.search);

  let params = {};
  if(urlParams.has("p")) {
    try {
      params = JSON.parse(rootStore.client.utils.FromB58ToStr(urlParams.get("p")));
    } catch(error) {
      rootStore.Log("Failed to parse URL params", true);
      rootStore.Log(error, true);
    }
  }

  params.confirmationId = urlParams.get("confirmationId");

  return params;
};

const Item = observer(({item, children, Actions}) => {
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
      { children }
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

const Purchase = async ({item, paymentMethod, history}) => {
  const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];

  if(!marketplace) { throw Error("Marketplace not found"); }

  const cancelUrl = new URL(location.href);
  cancelUrl.searchParams.delete("p");

  const result = await checkoutStore.CheckoutSubmit({
    provider: paymentMethod.provider,
    tenantId: marketplace.tenant_id,
    marketplaceId: item.marketplace.marketplace_id,
    sku: item.marketplace_sku,
    quantity: 1,
    successUrl: location.href,
    cancelUrl
  });

  if(paymentMethod.provider === "wallet-balance") {
    const urlParams = new URLSearchParams(location.search);
    let statusPath = location.pathname;
    urlParams.set("confirmationId", result.confirmationId);
    statusPath = statusPath + (urlParams.size > 0 ? `?${urlParams.toString()}` : "");
    history.push(statusPath);
  }
};

// TODO: Submit, stock, status, routing
const Payment = observer(({item, Back}) => {
  const history = useHistory();
  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [paymentMethod, setPaymentMethod] = useState({type: undefined, country: undefined, email: initialEmail, initialEmail});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(undefined);

  const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];
  const marketplaceItem = marketplace?.items?.find(({sku}) => sku === item.marketplace_sku);

  if(!marketplaceItem) { return null; }

  const itemInfo = NFTInfo({item: marketplaceItem});

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
                onClick={() => setPaymentMethod({...paymentMethod, country: code, provider: code === "other" ? "stripe" : "ebanx"})}
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
            onClick={() => setPaymentMethod({...paymentMethod, type: "card", provider: !ebanxEnabled ? "stripe" : undefined})}
            className={S("payment__option", paymentMethod.type === "card" ? "payment__option--active" : "")}
          >
            { rootStore.l10n.purchase.purchase_methods.credit_card }
          </button>
          {
            !coinbaseEnabled ? null :
              <button
                onClick={() => setPaymentMethod({...paymentMethod, type: "crypto", provider: "coinbase"})}
                className={S("payment__option", paymentMethod.type === "crypto" ? "payment__option--active" : "")}
              >
                {rootStore.l10n.purchase.purchase_methods.crypto}
              </button>
          }
          {
            !pixEnabled ? null :
              <button
                onClick={() => setPaymentMethod({...paymentMethod, type: "pix", provider: "pix"})}
                className={S("payment__option", paymentMethod.type === "pix" ? "payment__option--active" : "")}
              >
                {rootStore.l10n.purchase.purchase_methods.pix}
              </button>
          }
          <button
            onClick={() => setPaymentMethod({...paymentMethod, type: "balance", provider: "wallet-balance"})}
            className={S("payment__option", paymentMethod.type === "balance" ? "payment__option--active" : "")}
          >
            { rootStore.l10n.purchase.purchase_methods.wallet_balance }
          </button>
        </>;
  }

  return (
    <Item item={item}>
      <div key={`actions-${page}`} className={S("payment")}>
        { options }
        <br />
        {
          !canPurchase ? null :
            <button
              disabled={!canPurchase}
              onClick={async () => {
                setError(undefined);
                setSubmitting(true);

                try {
                  await Purchase({item, paymentMethod, history});
                } catch(error) {
                  setError(error);
                } finally {
                  setSubmitting(false);
                }
              }}
              className={S("payment__button", "payment__select")}
            >
              {
                submitting ?
                  <Loader className={S("payment__button-loader")}/> :
                  <ScaledText maxPx={18} minPx={10}>
                    {
                      LocalizeString(
                        rootStore.l10n.media_properties.purchase.select,
                        {title: item.title, price: FormatPriceString(itemInfo.price, {stringOnly: true})},
                        {stringOnly: true}
                      )
                    }
                  </ScaledText>
              }
            </button>
        }
        <button
          onClick={() =>
            page ?
              setPaymentMethod({...paymentMethod, type: undefined, provider: undefined}) :
              Back()
          }
          className={S("payment__button", "payment__back")}
        >
          { rootStore.l10n.actions.back }
        </button>
      </div>
    </Item>
  );
});

const MediaPropertyPurchaseStatus = observer(({item, confirmationId, Close}) => {
  const [status, setStatus] = useState();
  useEffect(() => {
    if(!item || !item.marketplace || !item.marketplace.marketplace_id) { return; }

    const Status = () => rootStore.PurchaseStatus({
      marketplaceId: item.marketplace.marketplace_id,
      confirmationId: confirmationId
    }).then(setStatus);

    const statusInterval = setInterval(() => {
      Status();
    }, 10000);

    Status();

    return () => clearInterval(statusInterval);
  }, []);

  let content;
  if(!status) {
    content = null;
  } else if(status.status === "failed") {
    content = (
      <div className={S("status__error")}>
        Failed
      </div>
    );
  } else if(status.status === "complete") {
    content = (
      <div className={S("status__message")}>
        Complete
      </div>
    );
  } else {
    content = (
      <div className={S("status__message")}>
        Pending
      </div>
    );
  }

  return (
    <Item item={item}>
      { content }
    </Item>
  );
});

const MediaPropertyPurchaseModalContent = observer(({sectionItem, confirmationId, Close}) => {
  const [loaded, setLoaded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(undefined);
  const selectedItem = selectedItemId && sectionItem.items.find(item => item.id === selectedItemId);

  useEffect(() => {
    setLoaded(false);

    rootStore.GetWalletBalance();

    Promise.all(
      sectionItem.items?.map(async item =>
        await rootStore.LoadMarketplace(item.marketplace?.marketplace_id)
      )
    ).then(() => {
      setLoaded(true);
    });
  }, [sectionItem]);

  useEffect(() => {
    const tenantIds = sectionItem.items.map(item =>
      rootStore.marketplaces[item?.marketplace?.marketplace_id]?.tenant_id
    )
      .filter((tenantId, index, array) => tenantId && array.indexOf(tenantId) === index);

    // If item has stock, periodically update
    const stockCheck = setInterval(() => {
      tenantIds.forEach(tenantId => checkoutStore.MarketplaceStock({tenantId}));
      rootStore.GetWalletBalance();
    }, 30000);

    return () => clearInterval(stockCheck);
  }, [loaded]);

  let content, key;
  if(!loaded) {
    key = 0;
    content = <Loader className={S("loader")}/>;
  } else if(selectedItemId) {
    if(confirmationId) {
      key = 3;
      content = (
        <MediaPropertyPurchaseStatus
          item={selectedItem}
          confirmationId={confirmationId}
          Close={Close}
        />
      );
    } else {
      key = 2;
      content = (
        <div className="purchase">
          <Payment
            item={selectedItem}
            Back={() => setSelectedItemId(undefined)}
          />
        </div>
      );
    }
  } else {
    key = 1;
    content = (
      <div className="purchase">
        <Items sectionItem={sectionItem} Select={setSelectedItemId} />
      </div>
    );
  }

  return (
    <div key={`step-${key}`} className={S("form")}>
      { content }
    </div>
  );
});

const MediaPropertyPurchaseModal = () => {
  const history = useHistory();
  const match = useRouteMatch();
  const [purchaseSectionItem, setPurchaseSectionItem] = useState(undefined);
  const params = PurchaseParams();

  useEffect(() => {
    setPurchaseSectionItem(undefined);

    if(!params || params.type !== "purchase" || !params.sectionItemId) {
      return;
    }

    const sections = params.sectionSlugOrId ?
      [mediaPropertyStore.MediaPropertySection({...match.params, sectionSlugOrId: params.sectionSlugOrId})] :
      Object.values(mediaPropertyStore.MediaProperty({...match.params}).metadata.sections || {});

    for(const section of sections) {
      const matchingItem = section.content?.find(sectionItem => sectionItem.id === params.sectionItemId);

      if(matchingItem) {
        setPurchaseSectionItem({...matchingItem, sectionId: section.id});
        return;
      }
    }
  }, [location.search]);


  const urlParams = new URLSearchParams(location.search);

  let backPath = match.url;
  urlParams.delete("p");
  urlParams.delete("confirmationId");
  backPath = backPath + (urlParams.size > 0 ? `?${urlParams.toString()}` : "");

  return (
    <Modal
      size="auto"
      centered
      opened={!!purchaseSectionItem}
      withCloseButton={rootStore.pageWidth < 600}
      onClose={() => history.push(backPath)}
      transitionProps={{ transition: "fade", duration: 250, timingFunction: "linear" }}
      classNames={{
        root: S("purchase-modal"),
        overlay: S("purchase-modal__overlay"),
        body: S("purchase-modal__content"),
      }}
    >
      {
        !purchaseSectionItem ? null :
          <MediaPropertyPurchaseModalContent
            sectionItem={purchaseSectionItem}
            confirmationId={params.confirmationId}
            Close={() => history.push(backPath)}
          />
      }
    </Modal>
  );
};

export default MediaPropertyPurchaseModal;
