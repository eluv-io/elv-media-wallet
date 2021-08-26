import React from "react";
import {rootStore} from "Stores/index";
import {
  Switch,
  Route,
  Link,
  useRouteMatch,
  NavLink,
} from "react-router-dom";
import Path from "path";
import UrlJoin from "url-join";
import AsyncComponent from "Components/common/AsyncComponent";
import NFTPlaceholderIcon from "Assets/icons/nft";
import StripeLogo from "Assets/images/logo-stripe.png";
import ImageIcon from "Components/common/ImageIcon";
import {CopyableField, ExpandableSection, FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {observer} from "mobx-react";
import Drop from "Components/event/Drop";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import NFTDetails from "Components/wallet/NFTDetails";

const MarketplaceNavigation = observer(() => {
  let match = useRouteMatch();

  return (
    <nav className="sub-navigation marketplace-navigation">
      <NavLink exact className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/store`}>Store</NavLink>
      <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/collections`}>Collections</NavLink>
      <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/owned`}>My Collection</NavLink>
    </nav>
  );
});

const Checkout = observer(({item}) => {
  const subtotal = ItemPrice(item, rootStore.currency);
  const platformFee = parseFloat((subtotal * 0.1).toFixed(2));
  const total = subtotal + platformFee;

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

  const itemIndex = marketplace.items.findIndex(item => item.sku === match.params.sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];
  const itemTemplate = item.nft_template ? item.nft_template.nft : {};

  return (
    <div className="details-page">
      <div className="details-page__content-container card-container">
        <div className="details-page__content card card-shadow">
          <MarketplaceImage
            marketplaceHash={marketplace.versionHash}
            item={item}
            path={UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image")}
            className="details-page__content__image"
          />
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

  if(!item.for_sale || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
    return null;
  }

  return (
    <div className="card-container card-shadow">
      <Link
        to={`${match.url}/${item.sku}`}
        className="card nft-card"
      >
        <MarketplaceImage
          marketplaceHash={marketplaceHash}
          item={item}
          path={UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image")}
        />
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


const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const ownedItems = rootStore.nfts.filter(nft =>
    marketplace.items.find(item =>
      item.nft_template && !item.nft_template["/"] && rootStore.client.utils.EqualAddress(item.nft_template.address, nft.details.ContractAddr) || true
    )
  );

  return (
    ownedItems.length === 0 ?
      <h2 className="marketplace__empty">You don't own any items from this marketplace yet!</h2> :
      <div className="card-list">
        {
          ownedItems.map(ownedItem =>
            <div className="card-container card-shadow" key={`marketplace-owned-item-${ownedItem.details.TokenIdStr}`}>
              <Link
                to={`${match.url}/${ownedItem.details.TokenIdStr}`}
                className="card nft-card"
              >
                <NFTImage nft={ownedItem} className="card__image" width={800} />
                <h2 className="card__title">
                  { ownedItem.metadata.display_name || "" }
                </h2>
                <h2 className="card__subtitle">
                  { ownedItem.metadata.display_name || "" }
                </h2>
              </Link>
            </div>
          )
        }
      </div>
  );
});

const Marketplace = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  return (
    <>
      {
        marketplace.storefront.sections.map((section, i) => {
          const items = section.items.map((sku, index) => {
            const item = marketplace.items.find(item => item.sku === sku);

            if(!item || !item.for_sale || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
              return;
            }

            return { item, index };
          }).filter(item => item);

          if(items.length === 0) { return null; }

          return (
            <div className="marketplace__section" key={`marketplace-section-${i}`}>
              <h1 className="page-header">{section.section_header}</h1>
              <h2 className="page-subheader">{section.section_subheader}</h2>
              <div className="card-list">
                {
                  items.map(({item, index}) =>
                    <MarketplaceItemCard
                      marketplaceHash={marketplace.versionHash}
                      item={item}
                      index={index}
                      key={`marketplace-item-${index}`}
                    />
                  )
                }
              </div>
            </div>
          );
        })
      }

      {
        marketplace.events.length === 0 ? null :
          <div className="marketplace__section">
            <h1 className="page-header">Events</h1>
            <div className="card-list">
              {
                marketplace.drops.map((drop, index) => (
                  <div className="card-container card-shadow" key={`drop-card-${index}`}>
                    <Link
                      to={`${Path.dirname(match.url)}/events/${drop.uuid}`}
                      className="card nft-card"
                    >
                      <MarketplaceImage
                        marketplaceHash={marketplace.versionHash}
                        title={drop.event_header}
                        path={UrlJoin("public", "asset_metadata", "info", "events", drop.eventIndex.toString(), "event", "info", "drops", drop.dropIndex.toString(), "event_image")}
                      />
                      <div className="card__text">
                        <h2 className="card__title">
                          <div className="card__title__title">
                            { drop.event_header }
                          </div>
                        </h2>
                      </div>
                    </Link>
                  </div>
                ))
              }
            </div>
          </div>
      }
    </>
  );
});

const MarketplacePage = observer(({children}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  return (
    <div className="marketplace content">
      <div className="marketplace__header">
        <h1 className="page-header">{ marketplace.storefront.header }</h1>
        <h2 className="page-subheader">{ marketplace.storefront.subheader }</h2>
      </div>
      <MarketplaceNavigation />
      { children }
    </div>
  );
});

const MarketplaceWrapper = observer(({children}) => {
  const match = useRouteMatch();

  return (
    <AsyncComponent
      Load={async () => {
        await rootStore.LoadMarketplace(match.params.marketplaceId);
        await rootStore.LoadCollections();
      }}
      loadingClassName="page-loader"
    >
      <MarketplacePage>
        { children }
      </MarketplacePage>
    </AsyncComponent>
  );
});

const MarketplaceBrowser = observer(() => {
  let match = useRouteMatch();

  return (
    <div className="marketplace-browser content">
      <h1 className="page-header">Marketplace</h1>
      <div className="card-list">
        { Object.keys(rootStore.marketplaces).map((marketplaceId, index) => {
          const marketplace = rootStore.marketplaces[marketplaceId];

          if(!marketplace) { return null; }

          const imageUrl = rootStore.PublicLink({
            versionHash: marketplace.versionHash,
            path: UrlJoin("public", "asset_metadata", "info", "images", "image"),
            queryParams: { width: 800 }
          });

          return (
            <div className="card-container card-container-marketplace card-shadow" key={`marketplace-${index}`}>
              <Link
                to={`${match.url}/${marketplaceId}/store`}
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
        <Route exact path={`${path}/:marketplaceId/events/:dropId`}>
          <MarketplaceWrapper>
            <Drop />
          </MarketplaceWrapper>
        </Route>

        <Route exact path={`${path}/:marketplaceId/collections`}>
          <MarketplaceWrapper>
            <Marketplace />
          </MarketplaceWrapper>
        </Route>

        <Route exact path={`${path}/:marketplaceId/owned`}>
          <MarketplaceWrapper>
            <MarketplaceOwned />
          </MarketplaceWrapper>
        </Route>

        <Route exact path={`${path}/:marketplaceId/owned/:tokenId`}>
          <MarketplaceWrapper>
            <NFTDetails/>
          </MarketplaceWrapper>
        </Route>

        <Route exact path={`${path}/:marketplaceId/store`}>
          <MarketplaceWrapper>
            <Marketplace />
          </MarketplaceWrapper>
        </Route>

        <Route exact path={`${path}/:marketplaceId/store/:sku`}>
          <MarketplaceWrapper>
            <MarketplaceItemDetails />
          </MarketplaceWrapper>
        </Route>

        <Route exact path={path}>
          <MarketplaceBrowser />
        </Route>
      </Switch>
    </div>
  );
};

export default MarketplaceRoutes;
