import PurchaseModalStyles from "Assets/stylesheets/media_properties/property-purchase-modal.module.scss";

import React, {useEffect, useState} from "react";
import {checkoutStore, mediaPropertyStore, rootStore, transferStore} from "Stores";
import {observer} from "mobx-react";
import {TextInput} from "@mantine/core";
import {Loader} from "Components/common/Loaders";
import {NFTInfo, ValidEmail} from "../../utils/Utils";
import {Button, LoaderImage, Modal} from "Components/properties/Common";
import {FormatPriceString, LocalizeString, PriceCurrency} from "Components/common/UIComponents";
import SupportedCountries from "../../utils/SupportedCountries";
import {roundToDown} from "round-to";
import {useHistory, useRouteMatch} from "react-router-dom";
import {LoginGate} from "Components/common/LoginGate";
import {
  MediaPropertyBasePath,
  MediaPropertyPurchaseParams,
  PurchaseParamsToItems
} from "../../utils/MediaPropertyUtils";
import UrlJoin from "url-join";

const S = (...classes) => classes.map(c => PurchaseModalStyles[c] || "").join(" ");

const Item = observer(({item, children, hideInfo, hidePrice, Actions}) => {
  const hasDetails = item.subtitle || item.description;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={S("item-container")}>

        {
          !item.imageUrl ? null :
            <LoaderImage
              loaderAspectRatio={1}
              src={item.imageUrl}
              width={400}
              className={S("item-image")}
            />
        }
      <div className={S("item")}>
        {
          hideInfo ? null :
            <>
              {
                hidePrice ? null :
                  <div className={S("item__price")}>
                    {FormatPriceString(item.price)}
                  </div>
              }
              <div className={[S("item__title"), "_title"].join(" ")}>
                {item.title}
              </div>
              {
                !showDetails ? null :
                  <div className={S("item__details")}>
                    <div className={S("item__subtitle")}>
                      { item.subtitle }
                    </div>
                    <div className={S("item__description")}>
                      { item.description }
                    </div>
                  </div>
              }
              {
                !hasDetails ? null :
                  <button onClick={() => setShowDetails(!showDetails)} className={S("item__details-toggle")}>
                    { rootStore.l10n.media_properties.purchase.details[showDetails ? "hide" : "show"] }
                  </button>
              }
            </>
        }
        { children }
        {
          !Actions ? null :
            <div className={S("actions")}>
              { Actions({item}) }
            </div>
        }
      </div>
    </div>
  );
});

const Items = observer(({items, secondaryPurchaseOption, Select}) => {
  items = items
    .filter(item =>
      item.purchasable ||
      (!item.secondaryDisabled && item.showSecondary)
    );

  if(items.length === 0) {
    return (
      <div className={S("items")}>
        <div className={S("items__empty")}>No Items Available</div>
      </div>
    );
  }

  return (
    <div className={S("items")}>
      {
        items?.map(item => {
          // If only one item and option is listing, go to secondary
          if(items.length === 1) {
            if(!item.secondaryDisabled && secondaryPurchaseOption === "only") {
              //return <Redirect key={`item-${item?.id}`} to={item.listingPath} />;
            }
          }

          return (
            <Item
              key={`item-${item?.id}`}
              item={item}
              hidePrice={item.showSecondary && secondaryPurchaseOption !== "show"}
              Actions={({item}) => {
                return (
                  <>
                    {
                      !item.secondaryDisabled && (item?.secondaryPurchaseOption || secondaryPurchaseOption) === "only" ? null :
                        <Button
                          disabled={!item.purchasable || !item.purchaseAuthorized}
                          title={!item.purchaseAuthorized ? "Purchase not available" : ""}
                          onClick={async () => await Select(item.id)}
                          className={S("button")}
                        >
                            {
                              item.itemInfo.free ?
                                rootStore.l10n.media_properties.purchase.claim :
                                LocalizeString(
                                  rootStore.l10n.media_properties.purchase.select,
                                  {price: FormatPriceString(item.price, {stringOnly: true})},
                                  {stringOnly: true}
                                )
                            }
                        </Button>
                    }
                    {
                      !item.showSecondary ? null :
                        <Button
                          to={item.listingPath}
                          variant={secondaryPurchaseOption === "only" ? "primary" : "secondary"}
                          className={S("button")}
                        >
                          {rootStore.l10n.media_properties.purchase.secondary}
                        </Button>
                    }
                  </>
                );
              }}
            />
          );
        })
      }
    </div>
  );
});

const EntitlementClaim = observer(({item, Close}) => {
  const params = MediaPropertyPurchaseParams() || {};
  const [status, setStatus] = useState(undefined);
  const [error, setError] = useState(undefined);

  useEffect(() => {
    rootStore.EntitlementClaimStatus({
      marketplaceId: item.marketplace.marketplace_id,
      purchaseId: params.purchaseId,
    })
      .then(async status => {
        if(!status || status?.status === "none") {
          // Only send claim if not already sent
          await checkoutStore.EntitlementClaim({entitlementSignature: params.entitlementSignature})
            .catch(error => {
              rootStore.Log(`EntitlementClaim error ${error}`, true);
              setError("Error redeeming this item, please try again");
            });
        }
      });
  }, []);

  useEffect(() => {
    if(!params.purchaseId || status?.status === "complete") { return; }

    const interval = setInterval(async () => {
      const status = await rootStore.EntitlementClaimStatus({
        marketplaceId: item.marketplace.marketplace_id,
        purchaseId: params.purchaseId
      });

      setStatus(status);

      if(["complete", "failed"].includes(status?.status)) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [params.purchaseId]);

  let content, actions, loading;
  if(error || status?.status === "failed") {
    content = (
      <div className={S("status__message", "status__error")}>
        {rootStore.l10n.media_properties.purchase_status.claim_failed}
      </div>
    );
  } else if(status?.status === "complete") {
    content = (
      <div className={S("status__message")}>
        {rootStore.l10n.media_properties.purchase_status.claim_complete}
      </div>
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
    loading = true;
    content = (
      <>
        <div className={S("status__message")}>
          { rootStore.l10n.media_properties.purchase_status.pending[item?.itemInfo?.free ? "claiming" : "finalizing"] }
        </div>
        <div className={S("status__message", "status__message--info")}>
          { rootStore.l10n.media_properties.purchase_status.pending.info }
        </div>
      </>
    );
  }

  return (
    <Item item={item} hidePrice hideInfo>
      <div className={S("status")} key={`status-${status?.status}`}>
        { !loading ? null : <Loader className={S("loader", "status__loader")} /> }
        { content }
        { !actions ? null : <div className={S("actions")}>{actions}</div> }
      </div>
    </Item>
  );
});

const WalletBalanceSummary = observer(({item, fee}) => {
  const price = item.price;
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
  const successUrl = new URL(location.href);
  const params = MediaPropertyPurchaseParams() || {};
  params.itemId = item.id;
  successUrl.searchParams.set("p", rootStore.client.utils.B58(JSON.stringify(params)));

  if(item.purchaseRedirectPage) {
    successUrl.searchParams.set("page", item.purchaseRedirectPage);
  }

  const cancelUrl = new URL(location.href);
  cancelUrl.searchParams.delete("p");

  let result;
  if(paymentMethod === "claim") {
    successUrl.searchParams.set("claim", "");
    result = await checkoutStore.ClaimSubmit({
      marketplaceId: item.marketplace.marketplace_id,
      sku: item.marketplace_sku
    });
  } else if(item.listingId) {
    result = await checkoutStore.ListingCheckoutSubmit({
      provider: paymentMethod.provider,
      tenantId: item.itemInfo.nft.details.TenantId,
      listingId: item.listingId,
      quantity: 1,
      successUrl,
      cancelUrl
    });
  } else {
    const { currency } = PriceCurrency(item.price);
    result = await checkoutStore.CheckoutSubmit({
      provider: paymentMethod.provider,
      tenantId: rootStore.marketplaces[item.marketplace?.marketplace_id]?.tenant_id,
      marketplaceId: item.marketplace.marketplace_id,
      sku: item.marketplace_sku,
      quantity: 1,
      currency,
      successUrl,
      cancelUrl
    });
  }

  rootStore.Log(result);

  if(paymentMethod === "claim" || paymentMethod.provider === "wallet-balance") {
    successUrl.searchParams.set("confirmationId", result.confirmationId);
    history.push(successUrl.pathname + successUrl.search);
  }
};

const Payment = observer(({item, Back}) => {
  const history = useHistory();
  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);

  const {currency} = PriceCurrency(item.price);

  let paymentOptions = { stripe: { enabled: true } };

  const isListing = item?.listingId;
  if(!isListing) {
    const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];
    const marketplaceItem = marketplace?.items?.find(({sku}) => sku === item.marketplace_sku);

    if(!marketplaceItem) {
      return null;
    }

    paymentOptions = marketplace?.payment_options || paymentOptions;
  }

  const stripeEnabled = paymentOptions?.stripe?.enabled;
  const walletBalanceEnabled = paymentOptions?.wallet_balance?.enabled !== false;
  const ebanxEnabled = paymentOptions?.ebanx?.enabled;
  const pixEnabled = ebanxEnabled && paymentOptions?.ebanx?.pix_enabled;
  const coinbaseEnabled = paymentOptions?.coinbase?.enabled;

  const [paymentMethod, setPaymentMethod] = useState({
    type: ebanxEnabled ? undefined : "card",
    country: undefined,
    email: initialEmail,
    initialEmail
  });

  const [feeRate, setFeeRate] = useState(0.065);
  useEffect(() => {
    rootStore.walletClient.TenantConfiguration({
      contractAddress: item.itemInfo.nft.details.ContractAddr
    })
      .then(config => {
        if(config["nft-fee-percent"]) {
          setFeeRate(parseFloat(config["nft-fee-percent"]) / 100);
        }
      });
  }, []);

  const fee = Math.max(1, roundToDown(item.price * feeRate, 2));
  const insufficientBalance = rootStore.availableWalletBalance < item.price + fee;

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
    ((item.purchasable && item.purchaseAuthorized) || item.listingId) && (
      (paymentMethod.type === "card" && (!ebanxEnabled || paymentMethod.country)) ||
      (paymentMethod.type === "crypto" && ValidEmail(paymentMethod.email)) ||
      (paymentMethod.type === "balance" && !insufficientBalance) ||
      paymentMethod.type === "pix"
    );


  switch(page) {
    case "ebanx":
      options =
        <>
          <div className={S("payment__message")}>
            { rootStore.l10n.purchase.select_country }
          </div>
          <div role="listbox" className={S("actions")}>
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
          item={item}
          fee={fee}
        />
      );
      break;
    default:
      options =
        <div role="listbox" className={S("actions")}>
          {
            !(coinbaseEnabled || pixEnabled || ebanxEnabled || walletBalanceEnabled) ? null :
              <Button
                variant="option"
                active={paymentMethod.type === "card"}
                className={S("button")}
                onClick={() => setPaymentMethod({...paymentMethod, type: "card", provider: !ebanxEnabled ? "stripe" : undefined})}
              >
                { rootStore.l10n.purchase.purchase_methods.credit_card }
              </Button>
          }
          {
            !coinbaseEnabled ? null :
              <Button
                variant="option"
                active={paymentMethod.type === "crypto"}
                className={S("button")}
                onClick={() => setPaymentMethod({...paymentMethod, type: "crypto", provider: "coinbase"})}
              >
                {rootStore.l10n.purchase.purchase_methods.crypto}
              </Button>
          }
          {
            !pixEnabled ? null :
              <Button
                variant="option"
                active={paymentMethod.type === "pix"}
                onClick={() => setPaymentMethod({...paymentMethod, type: "pix", provider: "pix"})}
              >
                {rootStore.l10n.purchase.purchase_methods.pix}
              </Button>
          }
          {
            !walletBalanceEnabled || currency !== "USD" ? null :
              <Button
                variant="option"
                active={paymentMethod.type === "balance"}
                className={S("button")}
                onClick={() => setPaymentMethod({...paymentMethod, type: "balance", provider: "wallet-balance"})}
              >
                { rootStore.l10n.purchase.purchase_methods.wallet_balance }
              </Button>
          }
        </div>;
  }

  return (
    <Item item={item}>
      <div key={`actions-${page}`} className={S("payment")}>
        { options }
        {
          !errorMessage ? null :
            <div className={S("payment__message", "payment__error")}>
              { errorMessage }
            </div>
        }
        <div className={S("actions")}>

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
            {
              LocalizeString(
                rootStore.l10n.media_properties.purchase.select,
                {price: FormatPriceString(
                    item.price,
                    {
                      additionalFee: page === "balance" ? fee : 0,
                      stringOnly: true
                    }
                  )
                },
                {stringOnly: true}
              )
            }
          </Button>
          <Button
            variant="outline"
            defaultStyles
            onClick={() =>
              page ?
                setPaymentMethod({...paymentMethod, type: ebanxEnabled ? undefined : "card", provider: undefined}) :
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

const PurchaseStatus = observer(({item, confirmationId, Close}) => {
  const match = useRouteMatch();
  const [status, setStatus] = useState();

  useEffect(() => {
    if(!item) { return; }

    const Status =
      item.listingId ?
        () => rootStore.ListingPurchaseStatus({
          listingId: item.listingId,
          confirmationId: confirmationId
        }).then(setStatus) :
        item?.itemInfo?.free ?
          () => rootStore.ClaimStatus({
            marketplaceId: item.marketplace.marketplace_id,
            sku: confirmationId
          }).then(setStatus) :
          () => rootStore.PurchaseStatus({
            marketplaceId: item.marketplace.marketplace_id,
            confirmationId
          }).then(setStatus);

    const statusInterval = setInterval(() => {
      Status();
    }, 5000);

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
        { rootStore.l10n.media_properties.purchase_status?.[item.free ? "claim_failed" : "failed"] }
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
          { rootStore.l10n.media_properties.purchase_status[item?.itemInfo?.free ? "claim_complete" : "complete"] }
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

          let successPath;
          if(item.listingId) {
            successPath = UrlJoin(
              MediaPropertyBasePath(match.params),
              "users/me/items",
              item.listing.contractId,
              item.listing.tokenId
            );
          }

          Close(true, successPath);
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
          { rootStore.l10n.media_properties.purchase_status.pending[item?.itemInfo?.free ? "claiming" : "finalizing"] }
        </div>
        <div className={S("status__message", "status__message--info")}>
          { rootStore.l10n.media_properties.purchase_status.pending.info }
        </div>
      </>
    );
  }

  return (
    <Item item={item} hideInfo>
      <div className={S("status")} key={`status-${status?.status}`}>
        { !loading ? null : <Loader className={S("loader", "status__loader")} /> }
        { content }
        { !actions ? null : <div className={S("actions")}>{actions}</div> }
      </div>
    </Item>
  );
});

const FormatPurchaseItem = (item, secondaryPurchaseOption) => {
  if(!item) { return; }

  if(item.listingId) {
    return {
      ...item,
      price: item.listing.details.Price,
      fee: item.listing.details.Fee,
      itemInfo: NFTInfo({listing: item.listing})
    };
  }

  const marketplace = rootStore.marketplaces[item.marketplace?.marketplace_id];
  const marketplaceItem = marketplace?.items?.find(({sku}) => sku === item.marketplace_sku);

  if(!marketplaceItem) { return; }

  const itemInfo = NFTInfo({item: marketplaceItem});

  const itemName = itemInfo?.nft?.metadata?.display_name || "";
  const editionName = itemInfo?.nft?.metadata?.edition_name || "";
  const listingPath = UrlJoin(
    MediaPropertyBasePath({...rootStore.routeParams}),
    `listings?filter=${itemName}${editionName ? `&edition=${editionName}` : ""}`
  );
  const outOfStock = itemInfo?.outOfStock || itemInfo?.maxOwned;

  secondaryPurchaseOption = item.secondary_market_purchase_option || secondaryPurchaseOption;

  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false;
  let showSecondary = !secondaryDisabled && ["show", "out_of_stock", "only"].includes(secondaryPurchaseOption);
  if(showSecondary && secondaryPurchaseOption === "out_of_stock") {
    showSecondary = outOfStock;
  }

  const showPrimary = !outOfStock && secondaryPurchaseOption !== "only";

  const mediaPropertyRedirect = mediaPropertyStore.MediaProperty({...rootStore.routeParams})
    ?.metadata?.purchase_settings?.purchase_redirect;
  let purchaseRedirectPage = item.redirect_page || mediaPropertyRedirect;
  purchaseRedirectPage = purchaseRedirectPage === "_none" ? undefined : purchaseRedirectPage;

  if(purchaseRedirectPage) {
    purchaseRedirectPage = mediaPropertyStore.MediaPropertyPage({...rootStore.routeParams, pageSlugOrId: purchaseRedirectPage})
      ?.slug || purchaseRedirectPage;
  }

  return {
    ...item,
    free: marketplaceItem.free,
    purchaseRedirectPage,
    itemName,
    editionName,
    listingPath,
    outOfStock,
    purchasable: itemInfo?.marketplacePurchaseAvailable,
    purchaseAuthorized: itemInfo?.marketplacePurchaseAuthorized,
    secondaryDisabled,
    showPrimary,
    showSecondary,
    secondaryPurchaseOption,
    price: item.listingId ?
      { USD: itemInfo.price } :
      marketplaceItem.price,
    imageUrl: item.use_custom_image ?
      item.image?.url :
      itemInfo?.mediaInfo?.imageUrl,
    itemInfo
  };
};

const PurchaseModalContent = observer(({type, items, itemId, confirmationId, secondaryPurchaseOption, setHeader, Close}) => {
  const history = useHistory();
  const [loaded, setLoaded] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(itemId);
  const [purchaseItems, setPurchaseItems] = useState(undefined);
  const selectedItem = selectedItemId && FormatPurchaseItem(items.find(item => item.id === selectedItemId), secondaryPurchaseOption);
  const isListing = selectedItem?.listingId;

  useEffect(() => {
    if(items.length === 1 && !secondaryPurchaseOption) {
      setSelectedItemId(items[0].id);
    }
  }, []);

  useEffect(() => {
    setLoaded(false);

    rootStore.GetWalletBalance();

    if(isListing) {
      setPurchaseItems(items);
      setLoaded(true);
      return;
    }

    // Format purchase items
    Promise.all(
      items?.map(async item =>
        await mediaPropertyStore.LoadMarketplace({marketplaceId: item.marketplace?.marketplace_id})
      )
    ).then(() => {
      const formattedPurchaseItems = (
        (items || [])
          .map(item => FormatPurchaseItem(item, secondaryPurchaseOption))
          .filter(item => item)
      );

      setPurchaseItems(formattedPurchaseItems);
      setLoaded(true);

      const secondaryOnly = !isListing && !formattedPurchaseItems?.find(item => item.showPrimary);

      setHeader(
        type === "entitlement" ? rootStore.l10n.media_properties.purchase.claim :
          rootStore.l10n.media_properties.purchase[secondaryOnly ? "purchase_now_listing" : "purchase_now"]
      );
    });
  }, [items]);

  useEffect(() => {
    if(isListing) { return; }

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
    // Not loaded or no items
    key = 0;
    content = <Loader className={S("loader")}/>;
  } else if(type === "entitlement") {
    content = <EntitlementClaim item={purchaseItems[0]} Close={Close} />;
  } else if((selectedItemId && !selectedItem.free) || confirmationId) {
    // Purchased/claimed
    if(confirmationId) {
      key = 3;
      content = (
        <PurchaseStatus
          item={selectedItem}
          confirmationId={confirmationId}
          Close={Close}
        />
      );
    } else {
      // Purchase
      key = 2;
      content = (
        <div className="purchase">
          <Payment
            item={selectedItem}
            Back={isListing || (items.length === 1 && !secondaryPurchaseOption) ? Close : () => setSelectedItemId(undefined)}
          />
        </div>
      );
    }
  } else {
    // Item Selection / Claim
    key = 1;
    content = (
      <div className="purchase">
        <Items
          items={purchaseItems}
          secondaryPurchaseOption={secondaryPurchaseOption}
          Select={async itemId => {
            const selectedItem = itemId && FormatPurchaseItem(items.find(item => item.id === itemId), secondaryPurchaseOption);

            if(selectedItem?.itemInfo?.free) {
              await Purchase({
                item: selectedItem,
                paymentMethod: "claim",
                history
              });
            }

            setSelectedItemId(itemId);
          }}
        />
      </div>
    );
  }

  return (
    <div key={`step-${key}`} className={S("form")}>
      {content}
    </div>
  );
});

const MediaPropertyPurchaseModal = () => {
  const history = useHistory();
  const match = useRouteMatch();
  const [purchaseItems, setPurchaseItems] = useState([]);
  const params = MediaPropertyPurchaseParams() || {};
  const [header, setHeader] = useState("");

  const urlParams = new URLSearchParams(location.search);

  const redirectPage = urlParams.get("page");

  let backPath = params.cancelPath || match.url;
  urlParams.delete("p");
  urlParams.delete("confirmationId");
  urlParams.delete("page");

  backPath = backPath + (urlParams.size > 0 ? `?${urlParams.toString()}` : "");

  const Close = (success, successPath) => {
    if(success && (successPath || params.successPath)) {
      history.push(successPath || params.successPath);
    } else if(success && redirectPage) {
      const page = mediaPropertyStore.MediaPropertyPage({...match.params, pageSlugOrId: redirectPage});

      if(redirectPage) {
        history.replace(MediaPropertyBasePath({
          ...match.params,
          pageSlugOrId: page.slug || page.id
        }));
      } else {
        Close();
        history.replace(backPath);
      }
    } else {
      history.replace(backPath);
    }
  };

  useEffect(() => {
    if(!params || !["purchase", "entitlement"].includes(params.type)) {
      setPurchaseItems([]);
      return;
    }

    let newPurchaseItems;
    if(params.listingId) {
      transferStore.CurrentNFTStatus({
        listingId: new URLSearchParams(window.location.search).get("listingId"),
        contractId: match.params.contractId,
        tokenId: match.params.tokenId
      }).then(status => {
        const listing = status?.listing;
        if(listing) {
          newPurchaseItems = [{
            listingId: params.listingId,
            id: params.listingId,
            title: listing.metadata?.display_name || "",
            subtitle: listing.metadata?.edition_name,
            description: listing.metadata?.description,
            imageUrl: listing.metadata?.image,
            listing
          }];
        }

        setPurchaseItems(newPurchaseItems);
      });

      return;
    } else {
      newPurchaseItems = PurchaseParamsToItems(params, params.secondaryPurchaseOption);
    }

    if(!newPurchaseItems || newPurchaseItems.length === 0) {
      mediaPropertyStore.Log("Property purchase modal: No purchase items found", true);
      mediaPropertyStore.Log(params, true);
    }

    // Gated on purchase, but user owns one or more of the items (probably just logged in)
    if(params.gate && newPurchaseItems?.find(item => !!item?.ownedItem)) {
      Close(true);
    } else {
      setPurchaseItems(newPurchaseItems);
    }
  }, [location.search]);

  if(params.unlessPermissions) {
    const hasPermissions = !!params.unlessPermissions?.find(permissionItemId =>
      mediaPropertyStore.permissionItems[permissionItemId].authorized
    );

    if(hasPermissions) {
      Close(true);
    }

    return null;
  }

  return (
    <LoginGate backPath={backPath} Condition={() => (purchaseItems || []).length > 0}>
      <Modal
        size="auto"
        centered
        opened={(purchaseItems || []).length > 0}
        onClose={params.confirmationId || params.purchaseId ? () => {} : Close}
        bodyClassName={S("form-container")}
        withCloseButton={rootStore.pageWidth < 800 && !params.confirmationId}
        header={header}
      >
        {
          (purchaseItems || []).length === 0 ? null :
            <PurchaseModalContent
              type={params.type}
              items={purchaseItems}
              itemId={params.itemId || params.listingId}
              secondaryPurchaseOption={params.secondaryPurchaseOption}
              confirmationId={params.confirmationId}
              setHeader={setHeader}
              Close={Close}
            />
        }
      </Modal>
    </LoginGate>
  );
};

export default MediaPropertyPurchaseModal;
