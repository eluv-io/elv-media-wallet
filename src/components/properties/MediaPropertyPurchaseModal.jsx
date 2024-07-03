import PurchaseModalStyles from "Assets/stylesheets/media_properties/property-purchase-modal.module.scss";

import React, {useEffect, useState} from "react";
import {checkoutStore, mediaPropertyStore, rootStore} from "Stores";
import {observer} from "mobx-react";
import {TextInput} from "@mantine/core";
import {Loader} from "Components/common/Loaders";
import {NFTInfo, ValidEmail} from "../../utils/Utils";
import {Button, Description, LoaderImage, Modal, ScaledText} from "Components/properties/Common";
import {LocalizeString} from "Components/common/UIComponents";
import SupportedCountries from "../../utils/SupportedCountries";
import {roundToDown} from "round-to";
import {useHistory, useRouteMatch} from "react-router-dom";
import {LoginGate} from "Components/common/LoginGate";
import {MediaPropertyPurchaseParams} from "../../utils/MediaPropertyUtils";

const S = (...classes) => classes.map(c => PurchaseModalStyles[c] || "").join(" ");

const Item = observer(({item, children, Actions}) => {
  return (
    <div className={S("item-container")}>
        <div className={S("item-image-container")}>
          {
            !item.imageUrl ? null :
              <LoaderImage
                src={item.imageUrl}
                width={400}
                className={S("item-image")}
              />
          }
        </div>
      <div className={S("item")}>
        <div className={S("item__price")}>
          { FormatPriceString(item.itemInfo.price) }
        </div>
        <ScaledText maxPx={32} className={[S("item__title"), "_title"].join(" ")}>
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
            <div className={S("actions")}>
              { Actions({item, itemInfo: item.itemInfo}) }
            </div>
        }
      </div>
    </div>
  );
});

const Items = observer(({items, Select}) => {
  return (
    <div className={S("items")}>
      {
        items?.map(item => (
          <Item
            key={`item-${item?.id}`}
            item={item}
            Actions={({item, itemInfo}) =>
              <Button onClick={() => Select(item.id)} className={S("button")}>
                <ScaledText maxPx={18} minPx={10}>
                  {
                    LocalizeString(
                      rootStore.l10n.media_properties.purchase.select,
                      { title: item.title, price: FormatPriceString(itemInfo.price, { stringOnly: true}) },
                      { stringOnly: true }
                    )
                  }
                </ScaledText>
              </Button>
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

  const successUrl = new URL(location.href);
  const params = MediaPropertyPurchaseParams() || {};
  params.itemId = item.id;
  successUrl.searchParams.set("p", rootStore.client.utils.B58(JSON.stringify(params)));

  const cancelUrl = new URL(location.href);
  cancelUrl.searchParams.delete("p");

  const result = await checkoutStore.CheckoutSubmit({
    provider: paymentMethod.provider,
    tenantId: marketplace.tenant_id,
    marketplaceId: item.marketplace.marketplace_id,
    sku: item.marketplace_sku,
    quantity: 1,
    successUrl,
    cancelUrl
  });

  if(paymentMethod.provider === "wallet-balance") {
    successUrl.searchParams.set("confirmationId", result.confirmationId);
    history.push(successUrl.pathname + successUrl.search);
  }
};

// TODO: Submit, stock, status, routing
const Payment = observer(({item, Back}) => {
  const history = useHistory();
  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [paymentMethod, setPaymentMethod] = useState({type: undefined, country: undefined, email: initialEmail, initialEmail});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);

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
          <div className={S("actions")}>
            {
              ebanxAvailableCountries.map(([code, name]) => (
                <Button
                  variant="option"
                  active={paymentMethod.country === code}
                  key={`country-select-${code}`}
                  className={S("button")}
                  onClick={() => setPaymentMethod({...paymentMethod, country: code, provider: code === "other" ? "stripe" : "ebanx"})}
                >
                  { name }
                </Button>
              ))
            }
          </div>
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
        <div className={S("actions")}>
          <Button
            variant="outline"
            className={S("button")}
            onClick={() => setPaymentMethod({...paymentMethod, type: "card", provider: !ebanxEnabled ? "stripe" : undefined})}
          >
            { rootStore.l10n.purchase.purchase_methods.credit_card }
          </Button>
          {
            !coinbaseEnabled ? null :
              <Button
                variant="outline"
                className={S("button")}
                onClick={() => setPaymentMethod({...paymentMethod, type: "crypto", provider: "coinbase"})}
              >
                {rootStore.l10n.purchase.purchase_methods.crypto}
              </Button>
          }
          {
            !pixEnabled ? null :
              <Button
                variant="outline"
                className={S("button")}
                onClick={() => setPaymentMethod({...paymentMethod, type: "pix", provider: "pix"})}
              >
                {rootStore.l10n.purchase.purchase_methods.pix}
              </Button>
          }
          <Button
            variant="outline"
            className={S("button")}
            onClick={() => setPaymentMethod({...paymentMethod, type: "balance", provider: "wallet-balance"})}
          >
            { rootStore.l10n.purchase.purchase_methods.wallet_balance }
          </Button>
        </div>;
  }

  return (
    <Item item={item}>
      <div key={`actions-${page}`} className={S("payment")}>
        { options }
        <br />
        {
          !errorMessage ? null :
            <div className={S("payment__message", "payment__error")}>
              { errorMessage }
            </div>
        }
        <div className={S("actions")}>
          {
            !canPurchase ? null :
              <Button
                loading={submitting}
                disabled={!canPurchase}
                onClick={async () => {
                  setErrorMessage(undefined);
                  setSubmitting(true);

                  try {
                    await Purchase({
                      item,
                      paymentMethod,
                      history
                    });
                  } catch(error) {
                    rootStore.Log(error, true);
                    setErrorMessage(error?.uiMessage || rootStore.l10n.purchase.errors.failed);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className={S("button")}
              >
                <ScaledText maxPx={18} minPx={10}>
                  {
                    LocalizeString(
                      rootStore.l10n.media_properties.purchase.select,
                      {title: item.title, price: FormatPriceString(itemInfo.price, {stringOnly: true})},
                      {stringOnly: true}
                    )
                  }
                </ScaledText>
              </Button>
          }
          <Button
            variant="outline"
            onClick={() =>
              page ?
                setPaymentMethod({...paymentMethod, type: undefined, provider: undefined}) :
                Back()
            }
            className={S("button")}
          >
            { rootStore.l10n.actions.back }
          </Button>
        </div>
      </div>
    </Item>
  );
});

const MediaPropertyPurchaseStatus = observer(({item, confirmationId, Close}) => {
  const match = useRouteMatch();
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

  let content, actions;
  let loading = true;
  if(!status) {
    content = null;
  } else if(status.status === "failed") {
    loading = false;
    content = (
      <div className={S("status__message", "status__error")}>
        { rootStore.l10n.media_properties.purchase_status.failed }
      </div>
    );

    actions = (
      <Button onClick={Close} className={S("button")}>
        { rootStore.l10n.actions.close }
      </Button>
    );
  } else if(status.status === "complete") {
    loading = false;
    content = (
      <>
        <div className={S("status__message")}>
          { rootStore.l10n.media_properties.purchase_status.complete }
        </div>
      </>
    );

    actions = (
      <Button
        onClick={async () => {
          try {
            await mediaPropertyStore.LoadMediaProperty({
              mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
              force: true
            });
          } catch(error) {
            mediaPropertyStore.Log(error, true);
          }

          Close(true);
        }}
        className={S("button")}
      >
        { rootStore.l10n.actions.close }
      </Button>
    );
  } else {
    content = (
      <>
        <div className={S("status__message")}>
          { rootStore.l10n.media_properties.purchase_status.pending.finalizing }
        </div>
        <div className={S("status__message", "status__message--info")}>
          { rootStore.l10n.media_properties.purchase_status.pending.info }
        </div>
      </>
    );
  }

  return (
    <Item item={item}>
      <div className={S("status")} key={`status-${status?.status}`}>
        { !loading ? null : <Loader className={S("loader", "status__loader")} /> }
        { content }
        { !actions ? null : <div className={S("actions")}>{actions}</div> }
      </div>
    </Item>
  );
});

const FormatPurchaseItem = item => {
  if(!item) { return; }

  const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];
  const marketplaceItem = marketplace?.items?.find(({sku}) => sku === item.marketplace_sku);

  if(!marketplaceItem) { return; }

  const itemInfo = NFTInfo({item: marketplaceItem});

  return {
    ...item,
    imageUrl: item.use_custom_image ?
      item.image?.url :
      itemInfo?.mediaInfo?.imageUrl,
    itemInfo
  };
};

const MediaPropertyPurchaseModalContent = observer(({items, itemId, confirmationId, Close}) => {
  const [loaded, setLoaded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(itemId);
  const [purchaseItems, setPurchaseItems] = useState(undefined);
  const selectedItem = selectedItemId && FormatPurchaseItem(items.find(item => item.id === selectedItemId));
  const anyImages = selectedItem ? selectedItem?.imageUrl : !!purchaseItems?.find(item => item.imageUrl);

  useEffect(() => {
    setLoaded(false);

    rootStore.GetWalletBalance();

    Promise.all(
      items?.map(async item =>
        await rootStore.LoadMarketplace(item.marketplace?.marketplace_id)
      )
    ).then(() => {
      setPurchaseItems(
        (items || [])
          .map(FormatPurchaseItem)
          .filter(item => item)
      );
      setLoaded(true);
    });
  }, [items]);

  useEffect(() => {
    const tenantIds = items?.map(item =>
      rootStore.marketplaces[item?.marketplace?.marketplace_id]?.tenant_id
    )
      .filter((tenantId, index, array) => tenantId && array.indexOf(tenantId) === index);

    const CheckStock = () => {
      tenantIds.forEach(tenantId => checkoutStore.MarketplaceStock({tenantId}));
      rootStore.GetWalletBalance();
    };

    // If item has stock, periodically update
    CheckStock();

    const stockCheckInterval = setInterval(CheckStock, 30000);

    return () => clearInterval(stockCheckInterval);
  }, [loaded]);

  let content, key;
  if(!loaded || (purchaseItems || []).length === 0) {
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
        <Items items={purchaseItems} Select={setSelectedItemId} />
      </div>
    );
  }

  return (
    <div key={`step-${key}`} className={S("form", anyImages ? "form--with-images" : "")}>
      { content }
    </div>
  );
});

const MediaPropertyPurchaseModal = () => {
  const history = useHistory();
  const match = useRouteMatch();
  const [purchaseItems, setPurchaseItems] = useState([]);
  const params = MediaPropertyPurchaseParams() || {};

  useEffect(() => {
    if(!params || params.type !== "purchase") {
      setPurchaseItems([]);
      return;
    }

    let newPurchaseItems;
    if(params.permissionItemIds) {
      newPurchaseItems = (
        params.permissionItemIds
          .map(permissionItemId => mediaPropertyStore.PermissionItem({permissionItemId}))
          .filter(item => item)
      );
    } else if(params.sectionItemId) {
      const sections = params.sectionSlugOrId ?
        [mediaPropertyStore.MediaPropertySection({...match.params, sectionSlugOrId: params.sectionSlugOrId})] :
        Object.values(mediaPropertyStore.MediaProperty({...match.params}).metadata.sections || {});

      for(const section of sections) {
        const matchingItem = section.content?.find(sectionItem => sectionItem.id === params.sectionItemId);

        if(matchingItem) {
          newPurchaseItems = (
            (matchingItem.items || [])
              .map(item => ({
                ...item,
                ...(mediaPropertyStore.permissionItems[item.permission_item_id] || {}),
                id: item.id
              }))
              .filter(item => item)
          );
        }
      }
    } else if(params.actionId) {
      const page = mediaPropertyStore.MediaPropertyPage({...match.params});
      const action = page.actions?.find(action => action.id === params.actionId);
      newPurchaseItems = (
        (action.items || [])
          .map(item => ({
            ...item,
            ...(mediaPropertyStore.permissionItems[item.permission_item_id] || {}),
            id: item.id
          }))
          .filter(item => item)
      );
    }

    if(!newPurchaseItems || newPurchaseItems.length === 0) {
      mediaPropertyStore.Log("Property purchase modal: No purchase items found", true);
      mediaPropertyStore.Log(params, true);
    }

    setPurchaseItems(newPurchaseItems);

  }, [location.search]);

  const urlParams = new URLSearchParams(location.search);

  let backPath = params.cancelPath || match.url;
  urlParams.delete("p");
  urlParams.delete("confirmationId");

  backPath = backPath + (urlParams.size > 0 ? `?${urlParams.toString()}` : "");

  const Close = () => history.push(backPath);

  if(params.unlessPermissions) {
    const hasPermissions = !!params.unlessPermissions?.find(permissionItemId =>
      mediaPropertyStore.permissionItems[permissionItemId].authorized
    );

    if(hasPermissions) {
      Close();
    }
  }

  return (
    <LoginGate backPath={backPath} Condition={() => (purchaseItems || []).length > 0}>
      <Modal
        size="auto"
        centered
        opened={(purchaseItems || []).length > 0}
        onClose={params.confirmationId ? () => {} : Close}
        withCloseButton={rootStore.pageWidth < 800 && !params.confirmationId}
      >
        {
          (purchaseItems || []).length === 0 ? null :
            <MediaPropertyPurchaseModalContent
              items={purchaseItems}
              itemId={params.itemId}
              confirmationId={params.confirmationId}
              Close={success => {
                if(success && params.successPath) {
                  history.push(params.successPath);
                } else {
                  Close();
                }
              }}
            />
        }
      </Modal>
    </LoginGate>
  );
};

export default MediaPropertyPurchaseModal;
