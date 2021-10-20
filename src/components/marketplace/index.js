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
import {observer} from "mobx-react";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

import AsyncComponent from "Components/common/AsyncComponent";
import NFTPlaceholderIcon from "Assets/icons/nft";
import {CopyableField, ExpandableSection, FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import Drop from "Components/event/Drop";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import NFTDetails from "Components/wallet/NFTDetails";
import {
  ClaimMintingStatus,
  DropMintingStatus,
  PackOpenStatus,
  PurchaseMintingStatus
} from "Components/marketplace/MintingStatus";
import {Loader, PageLoader} from "Components/common/Loaders";

import DescriptionIcon from "Assets/icons/Description icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
import InfoModal from "Components/common/InfoModal";
import ImageIcon from "Components/common/ImageIcon";
import HelpIcon from "Assets/icons/help-circle.svg";

const MarketplaceNavigation = observer(() => {
  let match = useRouteMatch();

  if(rootStore.hideNavigation || rootStore.sidePanelMode) {
    return null;
  }

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

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
        { (marketplace.storefront.tabs || {}).store || "Store" }
      </NavLink>
      <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/collections`}>
        { (marketplace.storefront.tabs || {}).collection || "My Items" }
      </NavLink>
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
  const [claimed, setClaimed] = useState(false);

  if(confirmationId && checkoutStore.completedPurchases[confirmationId]) {
    return <Redirect to={UrlJoin("/marketplaces", marketplaceId, item.sku, "purchase", confirmationId, "success")} />;
  }

  if(claimed) {
    return <Redirect to={UrlJoin("/marketplaces", marketplaceId, item.sku, "claim")} />;
  }

  const free = !total || item.free;
  const purchaseDisabled = !rootStore.userProfile.email && !validEmail;
  const marketplace = rootStore.marketplaces[marketplaceId];

  if(!marketplace) { return null; }
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
        {
          free ?
            null :
            <div className="checkout__price">
              <div className="checkout__price__header">
                Current Price
              </div>
              <div className="checkout__price__price">
                {FormatPriceString({[checkoutStore.currency]: total})}
              </div>
            </div>
        }
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
                  try {
                    if(free) {
                      const status = await rootStore.ClaimStatus({
                        marketplace,
                        sku: item.sku
                      });

                      if(status && status.status !== "none") {
                        // Already claimed, go to status
                        setClaimed(true);
                      } else if(await checkoutStore.ClaimSubmit({marketplaceId, sku: item.sku})) {
                        // Claim successful
                        setClaimed(true);
                      }
                    } else {
                      setConfirmationId(await checkoutStore.StripeSubmit({marketplaceId, sku: item.sku, email}));
                    }
                  } catch(error) {
                    rootStore.Log("Checkout failed", true);
                    rootStore.Log(error);

                    checkoutStore.MarketplaceStock(marketplace);
                  }
                }}
              >
                { free ? "Claim Now" : "Buy Now" }
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

    return <PageLoader />;
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
  const itemTemplate = item.nft_template ? item.nft_template.nft || {} : {};

  const stock = checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  useEffect(() => {
    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock(marketplace), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  return (
    <div className="details-page">
      <div className="details-page__content-container">
        <div className="details-page__card-padding-container">
          <div className="details-page__card-container card-container">
            <div className="details-page__content card card-shadow">
              <MarketplaceImage
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
                  {
                    item.nftTemplateMetadata.edition_name ?
                      <h2 className="card__title-edition">{ item.nftTemplateMetadata.edition_name }</h2> : null
                  }
                  <h2 className="card__subtitle">
                    <div className="card__subtitle__title">
                      { item.description || item.nftTemplateMetadata.description }
                    </div>
                  </h2>
                </div>
                {
                  stock && stock.max ?
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
          {
            itemTemplate.rich_text ?
              <div
                className="details-page__rich-text rich-text"
                ref={element => {
                  if(!element) { return; }

                  render(
                    <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                      { SanitizeHTML(itemTemplate.rich_text) }
                    </ReactMarkdown>,
                    element
                  );
                }}
              /> :
              item.description || itemTemplate.description
          }

        </ExpandableSection>

        <ExpandableSection header="Details" icon={DetailsIcon}>
          {
            itemTemplate.embed_url ?
              <CopyableField value={itemTemplate.embed_url}>
                Media URL: <a href={itemTemplate.embed_url} target="_blank">{ itemTemplate.embed_url }</a>
              </CopyableField>
              : null
          }
          {
            itemTemplate.image ?
              <CopyableField value={itemTemplate.image}>
                Image URL: <a href={itemTemplate.image} target="_blank">{ itemTemplate.image }</a>
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
            itemTemplate.edition_name ?
              <div>
                Edition: { itemTemplate.edition_name }
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
              <div className="expandable-section__actions">
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
  const total = ItemPrice(item, checkoutStore.currency);
  const isFree = !total || item.free;

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
                { isFree ? "Claim Now!" : FormatPriceString(item.price) }
              </div>
            </h2>
            {
              item.nftTemplateMetadata.edition_name ?
                <h2 className="card__title card__title-edition">{ item.nftTemplateMetadata.edition_name }</h2> : null
            }
            <ResponsiveEllipsis
              component="h2"
              className="card__subtitle"
              text={item.description || item.nftTemplateMetadata.description}
              maxLine="3"
            />
          </div>
          {
            stock && stock.max ?
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

const MarketplaceCollections = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const [modal, setModal] = useState(null);

  if(!marketplace) { return null; }

  const basePath = UrlJoin("/marketplaces", match.params.marketplaceId, "collections");

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

  const collections = marketplace.collections.map((collection, collectionIndex) => {
    let owned = 0;

    // If filters are specified, must match all filters
    if(rootStore.marketplaceFilters.length > 0 && rootStore.marketplaceFilters.find(filter => !(collection.collection_header || "").includes(filter))) {
      return null;
    }


    const collectionItems = collection.items.map((sku, entryIndex) => {
      const key = `collection-card-${collectionIndex}-${entryIndex}`;
      const itemIndex = marketplace.items.findIndex(item => item.sku === sku);
      const item = marketplace.items[itemIndex];

      if(item && marketplaceItems[sku] && marketplaceItems[sku].length > 0) {
        owned += 1;

        const nft = marketplaceItems[sku][0];
        return (
          <div className="card-container card-shadow" key={key}>
            <Link
              to={UrlJoin(basePath, collectionIndex.toString(), "owned", nft.details.ContractId, nft.details.TokenIdStr)}
              className="card nft-card"
            >
              <NFTImage nft={nft} width={400} />
              <div className="card__text">
                <div className="card__titles">
                  <h2 className="card__title">
                    { nft.metadata.display_name || "" }
                  </h2>
                  <ResponsiveEllipsis
                    component="h2"
                    className="card__subtitle"
                    text={item.description || item.nftTemplateMetadata.description}
                    maxLine="3"
                  />
                </div>
              </div>
            </Link>
          </div>
        );
      } else if(item && purchaseableItems[sku]) {
        return (
          <MarketplaceItemCard
            to={`${basePath}/${collectionIndex}/store/${purchaseableItems[sku].item.sku}`}
            className="collection-card collection-card-purchasable collection-card-unowned"
            marketplaceHash={marketplace.versionHash}
            item={purchaseableItems[sku].item}
            index={purchaseableItems[sku].index}
            key={key}
          />
        );
      } else {
        // Not accessible or null item use placeholder

        const placeholder = item || collection.placeholder || {};

        return (
          <div className="card-container card-shadow collection-card collection-card-inaccessible collection-card-unowned" key={key}>
            <div className="card nft-card">
              {
                placeholder.image ?
                  <MarketplaceImage
                    marketplaceHash={marketplace.versionHash}
                    title={placeholder.name}
                    path={
                      item ?
                        UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image") :
                        UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "placeholder", "image")
                    }
                  /> :
                  <MarketplaceImage title={placeholder.name} icon={NFTPlaceholderIcon} />
              }
              <div className="card__text">
                <div className="card__titles">
                  <h2 className="card__title">
                    { placeholder.name }
                  </h2>
                  <ResponsiveEllipsis
                    component="h2"
                    className="card__subtitle"
                    text={placeholder.description}
                    maxLine="3"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }
    });

    const collectionIcon = collection.collection_icon;

    const collectionModalInfo = collection.collection_info_modal || {};
    return (
      <div className="marketplace__section" key={`marketplace-section-${collectionIndex}`}>
        <h1 className="page-header section-header">
          <div className="section-header__left">
            <div className="page-header__title card-shadow">
              <div className="page-header__title__title">
                {collection.collection_header}
              </div>
              { collectionIcon ?
                <MarketplaceImage
                  rawImage
                  className="page-header__icon"
                  marketplaceHash={marketplace.versionHash}
                  title={collection.name}
                  path={
                    UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_icon")
                  }
                /> : null
              }
            </div>
            {
              collectionModalInfo.show ?
                <button
                  className="collection-info__button"
                  onClick={() => setModal(
                    <InfoModal
                      info={collectionModalInfo}
                      marketplaceHash={marketplace.versionHash}
                      imagePath={UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_info_modal", "image")}
                      backgroundImagePath={UrlJoin("public", "asset_metadata", "info", "collections", collectionIndex.toString(), "collection_info_modal", "background_image")}
                      Close={() => setModal(null)}
                    />
                  )}
                >
                  <ImageIcon
                    className="collection-info__button__icon"
                    icon={HelpIcon}
                    title="Click here for more information about this collection!"
                  />
                </button> : null
            }
          </div>
          <div className="page-header__subtitle">{ owned } / { collection.items.length }</div>
        </h1>
        <h2 className="page-subheader">{collection.collection_subheader}</h2>
        <div className="card-list card-list-collections">
          { collectionItems }
        </div>
      </div>
    );
  });

  return (
    <>
      { modal }
      { collections }
    </>
  );
});

const MarketplaceOwned = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);
  const ownedItems = Object.values(marketplaceItems).flat();

  const owned = (
    ownedItems.length === 0 ?
      <div className="marketplace__section">
        <div className="page-header">{ (marketplace.storefront.tabs || {}).collection || "My Items" }</div>
        <h2 className="marketplace__empty">You don't own any items from this marketplace yet!</h2>
      </div> :
      <div className="marketplace__section">
        <div className="page-header">{ (marketplace.storefront.tabs || {}).collection || "My Items" }</div>
        <div className="card-list">
          {
            ownedItems.map(ownedItem =>
              <div className="card-container card-shadow" key={`marketplace-owned-item-${ownedItem.details.ContractAddr}-${ownedItem.details.TokenIdStr}`}>
                <Link
                  to={UrlJoin(match.url, "owned", ownedItem.details.ContractId, ownedItem.details.TokenIdStr)}
                  className="card nft-card"
                >
                  <NFTImage nft={ownedItem} width={400} />
                  <div className="card__text">
                    <div className="card__titles">
                      <h2 className="card__title">
                        { ownedItem.metadata.display_name || "" }
                      </h2>
                      <ResponsiveEllipsis
                        component="h2"
                        className="card__subtitle"
                        text={ownedItem.metadata.description}
                        maxLine="3"
                      />
                    </div>
                  </div>
                </Link>
              </div>
            )
          }
        </div>
      </div>
  );

  return (
    <>
      { ownedItems.length === 0 && marketplace.collections.length > 0 ? null : owned }
      <MarketplaceCollections />
    </>
  );
});


const Marketplace = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const marketplaceItems = rootStore.MarketplaceOwnedItems(marketplace);

  const sections = (marketplace.storefront.sections.map((section, sectionIndex) => {
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
  })).filter(section => section);

  if(sections.length === 0 && marketplace.collections.length === 0) {
    return <h2 className="marketplace__empty">No items available</h2>;
  }

  return (
    <>
      { sections }
      <MarketplaceCollections />
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
      {
        rootStore.hideNavigation || rootStore.sidePanelMode ? null :
          <div className="marketplace__header">
            <h1 className="page-header">{marketplace.storefront.header}</h1>
            <h2 className="page-subheader">{marketplace.storefront.subheader}</h2>
          </div>
      }
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
                    <ResponsiveEllipsis
                      className="card__subtitle"
                      component="h2"
                      text={marketplace.description}
                      maxLine="3"
                    />
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
  }, [match.url, rootStore.marketplaces[match.params.marketplaceId]]);

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

    { name: ((marketplace.storefront || {}).tabs || {}).collection || "My Items", path: "/marketplaces/:marketplaceId/collections", Component: MarketplaceOwned },

    { name: nft.metadata.display_name, path: "/marketplaces/:marketplaceId/collections/owned/:contractId/:tokenId", Component: NFTDetails },
    { name: "Open Pack", path: "/marketplaces/:marketplaceId/collections/owned/:contractId/:tokenId/open", Component: PackOpenStatus, hideNavigation: true },

    { name: "Open Pack", path: "/marketplaces/:marketplaceId/collections/:collectionIndex/owned/:contractId/:tokenId/open", Component: PackOpenStatus, hideNavigation: true },
    { name: nft.metadata.display_name, path: "/marketplaces/:marketplaceId/collections/:collectionIndex/owned/:contractId/:tokenId", Component: NFTDetails },
    { name: item.name, path: "/marketplaces/:marketplaceId/collections/:collectionIndex/store/:sku", Component: MarketplaceItemDetails },

    { name: "Claim", path: "/marketplaces/:marketplaceId/:sku/claim", Component: ClaimMintingStatus, hideNavigation: true },
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
