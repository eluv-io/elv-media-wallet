import React, {useEffect} from "react";
import {rootStore, checkoutStore, transferStore} from "Stores/index";
import {
  Switch,
  Route,
  useRouteMatch,
  NavLink,
  Redirect
} from "react-router-dom";
import UrlJoin from "url-join";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import Drop from "Components/event/Drop";
import NFTDetails from "Components/wallet/NFTDetails";
import {
  ClaimMintingStatus,
  DropMintingStatus,
  PackOpenStatus,
  PurchaseMintingStatus
} from "Components/marketplace/MintingStatus";
import { PageLoader} from "Components/common/Loaders";
import MarketplaceItemDetails from "Components/marketplace/MarketplaceItemDetails";
import MarketplaceOwned from "Components/marketplace/MarketplaceOwned";
import MarketplaceStorefront from "Components/marketplace/MarketplaceStorefront";
import MarketplaceBrowser from "Components/marketplace/MarketplaceBrowser";
import MarketplaceListings from "Components/marketplace/MarketplaceListings";

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
          !match.path.includes("/marketplaces/:marketplaceId/owned") &&
          !match.path.includes("/marketplaces/:marketplaceId/listings")
        }
      >
        { ((marketplace.storefront || {}).tabs || {}).store || "Store" }
      </NavLink>
      <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/collections`}>
        { ((marketplace.storefront || {}).tabs || {}).collection || "My Items" }
      </NavLink>
      <NavLink className="sub-navigation__link" to={`/marketplaces/${match.params.marketplaceId}/listings`}>
        All Listings
      </NavLink>
      <div className="sub-navigation__separator" />
    </nav>
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

      const checkoutProvider = new URLSearchParams(window.location.search).get("provider");
      const tenantId = new URLSearchParams(window.location.search).get("tenantId");
      const quantity = parseInt(new URLSearchParams(window.location.search).get("quantity") || 1);

      checkoutStore.CheckoutSubmit({
        provider: checkoutProvider,
        tenantId,
        marketplaceId: match.params.marketplaceId,
        sku: match.params.sku,
        quantity,
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
            <h1 className="page-header">{(marketplace.storefront || {}).header}</h1>
            <h2 className="page-subheader">{(marketplace.storefront || {}).subheader}</h2>
          </div>
      }
      <MarketplaceNavigation />
      { children }
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
  const listing = !match.params.listingId ? undefined :
    transferStore.TransferListings({marketplaceId: match.params.marketplaceId})
      .find(listing => listing.details.ListingId === match.params.listingId);

  return [
    { name: "All Listings", path: "/marketplaces/:marketplaceId/listings", Component: MarketplaceListings },
    { name: ((listing || {}).metadata || {}).display_name, path: "/marketplaces/:marketplaceId/listings/:listingId", Component: NFTDetails },

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
    { name: marketplace.name, path: "/marketplaces/:marketplaceId", Component: MarketplaceStorefront },

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
