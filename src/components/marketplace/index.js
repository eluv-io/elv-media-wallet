import React, {useState, useEffect} from "react";
import {rootStore, checkoutStore} from "Stores/index";
import {
  Switch,
  Route,
  Link,
  useRouteMatch,
  NavLink,
  Redirect
} from "react-router-dom";
import UrlJoin from "url-join";
import AsyncComponent from "Components/common/AsyncComponent";
import NFTPlaceholderIcon from "Assets/icons/nft";
import {CopyableField, ExpandableSection, FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {observer} from "mobx-react";
import Drop from "Components/event/Drop";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import NFTDetails from "Components/wallet/NFTDetails";
import {DropMintingStatus, PackOpenStatus, PurchaseMintingStatus} from "Components/marketplace/MintingStatus";
import {Loader, PageLoader} from "Components/common/Loaders";

import DescriptionIcon from "Assets/icons/Description icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";

const MarketplaceNavigation = observer(() => {
  let match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  return (
    <nav className="sub-navigation marketplace-navigation">
      <NavLink
        className="sub-navigation__link"
        to={`/marketplaces/${match.params.marketplaceId}`}
        isActive={() =>
          !match.path.includes("/marketplaces/:marketplaceId/collections") &&
          !match.path.includes("/marketplaces/:marketplaceId/owned")
        }
      >
        Store
      </NavLink>
      {
        marketplace && marketplace.collections && marketplace.collections.length > 0 ?
          <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/collections`}>Collections</NavLink> :
          null
      }
      <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/owned`}>My Collection</NavLink>
    </nav>
  );
});

const ValidEmail = email => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    .test(email);
};

const Checkout = observer(({marketplaceId, item}) => {
  const total = ItemPrice(item, checkoutStore.currency);

  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);
  const [confirmationId, setConfirmationId] = useState(undefined);

  if(confirmationId && checkoutStore.completedPurchases[confirmationId]) {
    return <Redirect to={UrlJoin("/marketplaces", marketplaceId, item.sku, "purchase", confirmationId, "success")} />;
  }

  const purchaseDisabled = !rootStore.userProfile.email && !validEmail;
  return (
    <>
      {
        !rootStore.userProfile.email ?
          <div className="checkout card-shadow checkout__email-input">
            <input
              type="text"
              className="checkout__email"
              value={email}
              placeholder="Email Address"
              onChange={event => {
                const email = event.target.value.trim();
                setEmail(email);
                setValidEmail(ValidEmail(email));
              }}
            />
          </div> : null
      }
      <div className="checkout card-shadow">
        <div className="checkout__price">
          <div className="checkout__price__header">
            Current Price
          </div>
          <div className="checkout__price__price">
            { FormatPriceString({[checkoutStore.currency]: total}) }
          </div>
        </div>
        <div className="checkout__actions">
          {
            checkoutStore.submittingOrder || (confirmationId && checkoutStore.pendingPurchases[confirmationId]) ?
              <Loader/> :
              <button
                title={purchaseDisabled ? "Please enter your email address" : ""}
                disabled={purchaseDisabled}
                className="checkout__button"
                role="link"
                onClick={async () => {
                  setConfirmationId(await checkoutStore.StripeSubmit({marketplaceId, sku: item.sku, email}));
                }}
              >
                Buy Now
              </button>
          }
        </div>
      </div>
    </>
  );
});

const MarketplacePurchase = observer(() => {
  const match = useRouteMatch();

  const fromEmbed = new URLSearchParams(window.location.search).has("embed");
  const success = match.path.endsWith("/success");
  const cancel = match.path.endsWith("/cancel");

  if(fromEmbed && (success || cancel)) {
    useEffect(() => {
      window.opener.postMessage({
        type: "ElvMediaWalletClientRequest",
        action: "purchase",
        params: {
          confirmationId: match.params.confirmationId,
          success
        }
      });

      window.close();
    }, []);
  } else if(fromEmbed) {
    // Opened from iframe - Initiate stripe purchase
    useEffect(() => {
      rootStore.ToggleNavigation(false);

      checkoutStore.StripeSubmit({
        marketplaceId: match.params.marketplaceId,
        sku: match.params.sku,
        confirmationId: match.params.confirmationId
      });
    }, []);

    return <PageLoader/>;
  } else if(success) {
    return (
      <AsyncComponent
        Load={async () => {
          await rootStore.LoadMarketplace(match.params.marketplaceId);
          await rootStore.LoadWalletCollection();
        }}
        loadingClassName="page-loader"
      >
        <MarketplacePage>
          <PurchaseMintingStatus />
        </MarketplacePage>
      </AsyncComponent>
    );
  } else if(cancel) {
    return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, match.params.sku)} />;
  }
});

const MarketplaceItemDetails = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const itemIndex = marketplace.items.findIndex(item => item.sku === match.params.sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];
  const itemTemplate = item.nft_template ? item.nft_template.nft : {};

  const stock = checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  useEffect(() => {
    if(!stock) { return; }

    checkoutStore.MarketplaceStock(marketplace);

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock(marketplace), 7500);

    return () => clearInterval(stockCheck);
  }, []);

  return (
    <div className="details-page">
      <div className="details-page__content-container">
        <div className="details-page__card-padding-container">
          <div className="details-page__card-container card-container">
            <div className="details-page__content card card-shadow">
              <MarketplaceImage
                templateImage
                marketplaceHash={marketplace.versionHash}
                item={item}
                path={UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image")}
                className="details-page__content__image"
              />
              <div className="details-page__content__info card__text">
                <div className="card__titles">
                  <h2 className="card__title">
                    <div className="card__title__title">
                      { item.name }
                    </div>
                    <div className="card__title__price">
                      { FormatPriceString(item.price) }
                    </div>
                  </h2>
                  <h2 className="card__subtitle">
                    <div className="card__subtitle__title">
                      { item.description }
                    </div>
                  </h2>
                </div>
                {
                  stock && stock.max && stock.max - stock.minted < 100 ?
                    <div className="card__stock">
                      <div className={`card__stock__indicator ${outOfStock ? "card__stock__indicator-unavailable" : ""}`} />
                      { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
                    </div> : null
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="details-page__info">
        {
          outOfStock ?
            null :
            <Checkout marketplaceId={match.params.marketplaceId} item={item} />
        }

        <ExpandableSection header="Description" icon={DescriptionIcon}>
          { itemTemplate.description || item.description }
        </ExpandableSection>

        <ExpandableSection header="Details" icon={DetailsIcon}>
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
            <ExpandableSection header="Contract" icon={ContractIcon} className="no-padding">
              <div className="expandable-section__content-row">
                <CopyableField value={itemTemplate.address}>
                  Contract Address: {itemTemplate.address}
                </CopyableField>
              </div>
              <div>
                <a
                  className="lookout-url"
                  target="_blank"
                  href={
                    EluvioConfiguration["config-url"].includes("main.net955305") ?
                      `https://explorer.contentfabric.io/address/${itemTemplate.address}/transactions` :
                      `https://lookout.qluv.io/address/${itemTemplate.address}/transactions`
                  }
                  rel="noopener"
                >
                  See More Info on Eluvio Lookout
                </a>
              </div>
            </ExpandableSection> : null
        }
      </div>
    </div>
  );
});

const MarketplaceItemCard = ({marketplaceHash, to, item, index, className=""}) => {
  const match = useRouteMatch();

  if(!item.for_sale || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
    return null;
  }

  const stock = checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  return (
    <div className={`card-container card-shadow ${className}`}>
      <Link
        to={to || `${match.url}/${item.sku}`}
        className={`card nft-card ${outOfStock ? "card-disabled" : ""}`}
      >
        <MarketplaceImage
          marketplaceHash={marketplaceHash}
          item={item}
          path={UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image")}
        />
        <div className="card__text">
          <div className="card__titles">
            <h2 className="card__title">
              <div className="card__title__title">
                { item.name }
              </div>
              <div className="card__title__price">
                { FormatPriceString(item.price) }
              </div>
            </h2>
            <h2 className="card__subtitle">
              <div className="card__subtitle__title">
                { item.description }
              </div>
            </h2>
          </div>
          {
            stock && stock.max && stock.max - stock.minted < 100 ?
              <div className="card__stock">
                <div className={`card__stock__indicator ${outOfStock ? "card__stock__indicator-unavailable" : ""}`} />
                { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
              </div> : null
          }
        </div>
      </Link>
    </div>
  );
};

const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);
  const ownedItems = Object.values(marketplaceItems).flat();

  return (
    ownedItems.length === 0 ?
      <h2 className="marketplace__empty">You don't own any items from this marketplace yet!</h2> :
      <div className="card-list">
        {
          ownedItems.map(ownedItem =>
            <div className="card-container card-shadow" key={`marketplace-owned-item-${ownedItem.details.ContractAddr}-${ownedItem.details.TokenIdStr}`}>
              <Link
                to={UrlJoin(match.url, ownedItem.details.ContractId, ownedItem.details.TokenIdStr)}
                className="card nft-card"
              >
                <NFTImage nft={ownedItem} width={400} />
                <div className="card__text">
                  <div className="card__titles">
                    <h2 className="card__title">
                      { ownedItem.metadata.display_name || "" }
                    </h2>
                    <h2 className="card__subtitle">
                      { ownedItem.metadata.display_name || "" }
                    </h2>
                  </div>
                </div>
              </Link>
            </div>
          )
        }
      </div>
  );
});

const MarketplaceCollections = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  let purchaseableItems = {};
  marketplace.storefront.sections.forEach(section =>
    section.items.forEach(sku => {
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      // For sale / authorization
      if(!item || !item.for_sale || (item.requires_permissions && !item.authorized)) { return; }

      if(item.max_per_user && checkoutStore.stock[item.sku] && checkoutStore.stock[item.sku].current_user >= item.max_per_user) {
        // Purchase limit
        return;
      }

      purchaseableItems[sku] = {
        item,
        index: itemIndex
      };
    })
  );

  return marketplace.collections.map((collection, collectionIndex) => {
    let owned = 0;
    const collectionItems = collection.items.map((sku, entryIndex) => {
      const key = `collection-card-${collectionIndex}-${entryIndex}`;
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      if(!item) { return; }

      if(marketplaceItems[sku] && marketplaceItems[sku].length > 0) {
        owned += 1;

        const nft = marketplaceItems[sku][0];

        return (
          <div className="card-container card-shadow" key={key}>
            <Link
              to={UrlJoin(match.url, collectionIndex.toString(), "owned", nft.details.ContractId, nft.details.TokenIdStr)}
              className="card nft-card"
            >
              <NFTImage nft={nft} width={400} />
              <div className="card__text">
                <div className="card__titles">
                  <h2 className="card__title">
                    { nft.metadata.display_name || "" }
                  </h2>
                  <h2 className="card__subtitle">
                    { nft.metadata.display_name || "" }
                  </h2>
                </div>
              </div>
            </Link>
          </div>
        );
      } else if(purchaseableItems[sku]) {
        return (
          <MarketplaceItemCard
            to={`${match.url}/${collectionIndex}/store/${purchaseableItems[sku].item.sku}`}
            className="collection-card collection-card-purchasable collection-card-unowned"
            marketplaceHash={marketplace.versionHash}
            item={purchaseableItems[sku].item}
            index={purchaseableItems[sku].index}
            key={key}
          />
        );
      } else {
        // Not accessible, use placeholder
        return (
          <div className="card-container card-shadow collection-card collection-card-inaccessible collection-card-unowned" key={key}>
            <div className="card nft-card">
              {
                item.image ?
                  <MarketplaceImage
                    marketplaceHash={marketplace.versionHash}
                    title={item.name}
                    path={UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image")}
                  /> :
                  <MarketplaceImage title={item.name} icon={NFTPlaceholderIcon} />
              }
              <div className="card__text">
                <div className="card__titles">
                  <h2 className="card__title">
                    { item.name }
                  </h2>
                  <h2 className="card__subtitle">
                    { item.description }
                  </h2>
                </div>
              </div>
            </div>
          </div>
        );
      }
    });

    return (
      <div className="marketplace__section" key={`marketplace-section-${collectionIndex}`}>
        <h1 className="page-header">
          <div className="page-header__title">{collection.collection_header}</div>
          <div className="page-header__subtitle">{ owned } / { collection.items.length }</div>
        </h1>
        <h2 className="page-subheader">{collection.collection_subheader}</h2>
        <div className="card-list card-list-collections">
          { collectionItems }
        </div>
      </div>
    );
  });
});

const Marketplace = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  return (
    <>
      {
        marketplace.storefront.sections.map((section, sectionIndex) => {
          const items = section.items.map((sku) => {
            const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
            const item = itemIndex >= 0 && marketplace.items[itemIndex];

            // Authorization
            if(!item || !item.for_sale || (item.requires_permissions && !item.authorized) || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
              return;
            }

            if(item.max_per_user && marketplaceItems[item.sku] && marketplaceItems[item.sku].length >= item.max_per_user) {
              // Purchase limit
              return;
            }

            // If filters are specified, item must have all tags
            if(rootStore.marketplaceFilters.length > 0 && rootStore.marketplaceFilters.find(filter => !(item.tags || []).includes(filter))) {
              return;
            }

            return { item, itemIndex };
          }).filter(item => item);

          if(items.length === 0) { return null; }

          return (
            <div className="marketplace__section" key={`marketplace-section-${sectionIndex}`}>
              <h1 className="page-header">{section.section_header}</h1>
              <h2 className="page-subheader">{section.section_subheader}</h2>
              <div className="card-list">
                {
                  items.map(({item, itemIndex}) =>
                    <MarketplaceItemCard
                      marketplaceHash={marketplace.versionHash}
                      item={item}
                      index={itemIndex}
                      key={`marketplace-item-${itemIndex}`}
                    />
                  )
                }
              </div>
            </div>
          );
        })
      }
    </>
  );
});

const MarketplacePage = observer(({children}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  if(rootStore.hideNavigation) {
    return (
      <div className="marketplace content">
        { children }
      </div>
    );
  }

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

const MarketplaceBrowser = observer(() => {
  let match = useRouteMatch();

  useEffect(() => rootStore.SetMarketplaceFilters([]), []);

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
            queryParams: { width: 400 }
          });

          return (
            <div className="card-container card-container-marketplace" key={`marketplace-${index}`}>
              <Link
                to={`${match.url}/${marketplaceId}`}
                className="card nft-card"
              >
                <MarketplaceImage title={marketplace.name} url={imageUrl} />
                <div className="card__text">
                  <div className="card__titles">
                    <h2 className="card__title">
                      { marketplace.name }
                    </h2>
                    <h2 className="card__subtitle">
                      { marketplace.description }
                    </h2>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const MarketplaceWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const currentRoute = Routes(match).find(route => match.path === route.path);

  useEffect(() => {
    const routes = Routes(match)
      .filter(route => !route.noBreadcrumb && match.path.includes(route.path))
      .sort((a, b) => a.path.length < b.path.length ? -1 : 1)
      .map(route => {
        let path = route.path;
        Object.keys(match.params).map(key => path = path.replace(`:${key}`, match.params[key]));

        return {
          name: route.name,
          path
        };
      });

    rootStore.SetNavigationBreadcrumbs(routes);

    if(currentRoute.hideNavigation) {
      rootStore.ToggleNavigation(false);
      return () => rootStore.ToggleNavigation(true);
    }
  }, [match.url]);

  if(currentRoute.skipLoading) {
    return children;
  }

  if(match.params.marketplaceId) {
    return (
      <AsyncComponent
        Load={async () => {
          if(currentRoute.skipLoading) { return; }

          await Promise.all([
            rootStore.LoadMarketplace(match.params.marketplaceId),
            rootStore.LoadWalletCollection()
          ]);

          const marketplace = rootStore.marketplaces[match.params.marketplaceId];
          if(marketplace) {
            await checkoutStore.MarketplaceStock(marketplace);
          }
        }}
        loadingClassName="page-loader"
      >
        <MarketplacePage>
          { children }
        </MarketplacePage>
      </AsyncComponent>
    );
  }

  return (
    <AsyncComponent
      Load={async () => {
        await Promise.all(
          rootStore.marketplaceIds.map(async marketplaceId => {
            await rootStore.LoadMarketplace(marketplaceId);
          })
        );
      }}
      loadingClassName="page-loader"
    >
      { children }
    </AsyncComponent>
  );
});

const Routes = (match) => {
  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || {};
  const event = rootStore.eventMetadata || {};
  const item = (marketplace.items || []).find(item => item.sku === match.params.sku) || {};
  const nft = rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId}) || { metadata: {} };

  return [
    { name: (event.event_info || {}).event_title, path: "/marketplaces/:marketplaceId/events/:dropId", Component: Drop, hideNavigation: true },
    { name: "Status", path: "/marketplaces/:marketplaceId/events/:dropId/status", Component: DropMintingStatus, hideNavigation: true },

    { name: "Collections", path: "/marketplaces/:marketplaceId/collections", Component: MarketplaceCollections },

    { name: "Open Pack", path: "/marketplaces/:marketplaceId/collections/:collectionIndex/owned/:contractId/:tokenId/open", Component: PackOpenStatus, hideNavigation: true },
    { name: nft.metadata.display_name, path: "/marketplaces/:marketplaceId/collections/:collectionIndex/owned/:contractId/:tokenId", Component: NFTDetails },
    { name: item.name, path: "/marketplaces/:marketplaceId/collections/:collectionIndex/store/:sku", Component: MarketplaceItemDetails },

    { name: "My Collection", path: "/marketplaces/:marketplaceId/owned", Component: MarketplaceOwned },
    { name: "Open Pack", path: "/marketplaces/:marketplaceId/owned/:contractId/:tokenId/open", Component: PackOpenStatus, hideNavigation: true },
    { name: nft.metadata.display_name, path: "/marketplaces/:marketplaceId/owned/:contractId/:tokenId", Component: NFTDetails },

    { name: "Purchase", path: "/marketplaces/:marketplaceId/:sku/purchase/:confirmationId/success", Component: MarketplacePurchase, hideNavigation: true, skipLoading: true },
    { name: "Purchase", path: "/marketplaces/:marketplaceId/:sku/purchase/:confirmationId/cancel", Component: MarketplacePurchase, skipLoading: true },
    { name: "Purchase", path: "/marketplaces/:marketplaceId/:sku/purchase/:confirmationId", Component: MarketplacePurchase, noBreadcrumb: true, skipLoading: true },
    { name: item.name, path: "/marketplaces/:marketplaceId/:sku", Component: MarketplaceItemDetails },
    { name: marketplace.name, path: "/marketplaces/:marketplaceId", Component: Marketplace },

    { name: "Marketplaces", path: "/marketplaces", Component: MarketplaceBrowser }
  ];
};

const MarketplaceRoutes = () => {
  const match = useRouteMatch();

  return (
    <div className="page-container marketplace-page">
      <Switch>
        {
          Routes(match).map(({path, Component}) =>
            <Route exact path={path} key={`marketplace-route-${path}`}>
              <MarketplaceWrapper>
                <Component/>
              </MarketplaceWrapper>
            </Route>
          )
        }
      </Switch>
    </div>
  );
};

export default MarketplaceRoutes;
