import React from "react";
import {rootStore} from "Stores/index";
import {
  Switch,
  Route,
  Link,
  useRouteMatch
} from "react-router-dom";
import {FUNDING, PayPalButtons, PayPalScriptProvider} from "@paypal/react-paypal-js";
import UrlJoin from "url-join";
import AsyncComponent from "Components/common/AsyncComponent";
import SVG from "react-inlinesvg";
import NFTPlaceholderIcon from "Assets/icons/nft";
import StripeLogo from "Assets/images/logo-stripe.png";
import ImageIcon from "Components/common/ImageIcon";
import {CopyableField, ExpandableSection, FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {observer} from "mobx-react";

const MarketplaceItemImage = ({marketplaceHash, item, index, className=""}) => {
  let url;
  if(item.image) {
    url = rootStore.PublicLink({
      versionHash: marketplaceHash,
      path: UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image"),
      queryParams: { width: 100 }
    });
  } else if(item.nft_template) {
    url = (item.nft_template.nft || {}).image;
  } else {
    return <SVG src={NFTPlaceholderIcon} className="nft-image nft-image-placeholder" alt={item.name} />;
  }

  return (
    <ImageIcon
      title={item.name}
      icon={url || NFTPlaceholderIcon}
      alternateIcon={NFTPlaceholderIcon}
      className={`nft-image card__image ${className}`}
    />
  );
};

const Checkout = observer(({item}) => {
  console.log(item.price);
  const subtotal = ItemPrice(item, rootStore.currency);
  const platformFee = parseFloat((subtotal * 0.1).toFixed(2));
  const total = subtotal + platformFee;

  console.log(subtotal, platformFee, total);

  return (
    <div className="checkout">
      <div className="checkout__totals card-shadow">
        <div className="checkout__totals__row">
          <label className="checkout__totals__row__label">Subtotal</label>
          <div className="checkout__totals__row__price">
            { FormatPriceString({[rootStore.currency]: subtotal}) }
          </div>
        </div>
        <div className="checkout__totals__row">
          <label className="checkout__totals__row__label">Platform Fee</label>
          <div className="checkout__totals__row__price">
            { FormatPriceString({[rootStore.currency]: platformFee}) }
          </div>
        </div>
        <div className="checkout__totals__row">
          <label className="checkout__totals__row__label">Subtotal</label>
          <div className="checkout__totals__row__price">
            { FormatPriceString({[rootStore.currency]: total}) }
          </div>
        </div>
      </div>

      <div className="checkout__payment-actions">
        <button
          className="checkout-button"
          role="link"
          onClick={rootStore.StripeSubmit}
        >
          Pay with Card
          <img className="stripe-checkout-logo" src={StripeLogo} alt="Stripe Logo"/>
        </button>
        <div className="paypal-button">
          <PayPalScriptProvider
            key={`paypal-button-${rootStore.currency}`}
            options={{
              "client-id": rootStore.PaymentServicePublicKey("paypal"),
              currency: rootStore.currency
            }}
          >
            <PayPalButtons
              createOrder={rootStore.PaypalSubmit}
              onApprove={async (data, actions) => {
                await retryRequest(actions.order.capture);

                this.setState({redirect: true});
              }}
              onError={error => rootStore.PaymentSubmitError(error)}
              style={{
                color:  "gold",
                shape:  "rect",
                label:  "paypal",
                layout: "horizontal",
                tagline: false,
                height: 50
              }}
              fundingSource={FUNDING.PAYPAL}
            />
          </PayPalScriptProvider>
        </div>
        <button className="checkout-button coinbase-button" onClick={rootStore.CoinbaseSubmit}>
          Pay with Crypto
        </button>
      </div>
    </div>
  );
});

const MarketplaceItemDetails = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const itemIndex = marketplace.items.findIndex(item => item.uuid === match.params.itemUUID);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];
  const itemTemplate = item.nft_template ? item.nft_template.nft : {};

  return (
    <div className="content details-page">
      <div className="details-page__content-container card-container">
        <div className="details-page__content card card-shadow">
          <MarketplaceItemImage marketplaceHash={marketplace.versionHash} item={item} index={itemIndex} className="details-page__content__image" />
          <div className="card__subtitle">
            { item.name }
          </div>

          <h2 className="card__title">
            { item.description }
          </h2>
        </div>
      </div>

      <div className="details-page__info">
        <ExpandableSection header="Description">
          { itemTemplate.description || item.description }
        </ExpandableSection>

        <ExpandableSection header="Details">
          {
            itemTemplate.embed_url ?
              <CopyableField value={itemTemplate.embed_url}>
                Media URL: { itemTemplate.embed_url }
              </CopyableField>
              : null
          }
          {
            itemTemplate.creator ?
              <div>
                Creator: { itemTemplate.creator }
              </div>
              : null
          }
          {
            itemTemplate.total_supply ?
              <div>
                Total Supply: { itemTemplate.total_supply }
              </div>
              : null
          }
          <br />
          <div>
            { itemTemplate.copyright }
          </div>
        </ExpandableSection>

        {
          itemTemplate.address ?
            <ExpandableSection header="Contract">
              <CopyableField value={itemTemplate.address}>
                Contract Address: {itemTemplate.address}
              </CopyableField>
              <div>
                <a
                  className="lookout-url"
                  target="_blank"
                  href={`https://lookout.qluv.io/address/${itemTemplate.address}/transactions`} rel="noopener"
                >
                  See More Info on Eluvio Lookout
                </a>
              </div>
            </ExpandableSection> : null
        }

        <Checkout item={item} />
      </div>
    </div>
  );
});

const MarketplaceItemCard = ({marketplaceHash, item, index}) => {
  const match = useRouteMatch();

  return (
    <div className="card-container card-shadow">
      <Link
        to={`${match.url}/${item.uuid}`}
        className="card nft-card"
      >
        <MarketplaceItemImage marketplaceHash={marketplaceHash} item={item} index={index} />
        <div className="card__text">
          <h2 className="card__title">
            <div className="card__title__title">
              { item.name }
            </div>
            <div className="card__title__price">
              { FormatPriceString(item.price) }
            </div>
          </h2>
          <h2 className="card__subtitle">
            { item.description }
          </h2>
        </div>
      </Link>
    </div>
  );
};

const Marketplace = observer(() => {
  const match = useRouteMatch();

  return (
    <AsyncComponent
      Load={async () => rootStore.LoadMarketplace(match.params.marketplaceId)}
      loadingClassName="page-loader"
      render={() => {
        const marketplace = rootStore.marketplaces[match.params.marketplaceId];

        if(!marketplace) { return null; }

        return (
          <div className="marketplace content">
            <h1 className="page-header">{ marketplace.name }</h1>
            <h2 className="page-subheader">{ marketplace.description }</h2>
            <div className="card-list">
              {
                marketplace.items.map((item, index) =>
                  <MarketplaceItemCard marketplaceHash={marketplace.versionHash} item={item} index={index} key={`marketplace-item-${index}`} />
                )
              }
            </div>
          </div>
        );
      }}
    />
  );
});

const MarketplaceBrowser = observer(() => {
  let match = useRouteMatch();

  return (
    <div className="marketplace-browser content">
      <h1 className="page-header">Collectible Marketplace</h1>
      <div className="card-list">
        { Object.keys(rootStore.marketplaces).map(marketplaceId => {
          const marketplace = rootStore.marketplaces[marketplaceId];

          if(!marketplace) { return null; }

          const imageUrl = rootStore.PublicLink({
            versionHash: marketplace.versionHash,
            path: UrlJoin("public", "asset_metadata", "info", "images", "image"),
            queryParams: { width: 100 }
          });

          return (
            <div className="card-container card-shadow">
              <Link
                to={`${match.url}/${marketplaceId}`}
                className="card nft-card"
              >
                <ImageIcon
                  title={marketplace.name}
                  icon={imageUrl || NFTPlaceholderIcon}
                  alternateIcon={NFTPlaceholderIcon}
                  className="nft-image card__image"
                />
                <div className="card__text">
                  <h2 className="card__title">
                    { marketplace.name }
                  </h2>
                  <h2 className="card__subtitle">
                    { marketplace.description }
                  </h2>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const MarketplaceRoutes = () => {
  let { path } = useRouteMatch();

  return (
    <div className="page-container marketplace-page">
      <Switch>
        <Route path={`${path}/:marketplaceId/:itemUUID`}>
          <MarketplaceItemDetails />
        </Route>

        <Route path={`${path}/:marketplaceId`}>
          <Marketplace />
        </Route>

        <Route path={path}>
          <MarketplaceBrowser />
        </Route>
      </Switch>
    </div>
  );
};

export default MarketplaceRoutes;
