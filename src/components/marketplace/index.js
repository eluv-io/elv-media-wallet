import React, {useEffect} from "react";
import {rootStore, transferStore} from "Stores/index";
import {
  Switch,
  Route,
  useRouteMatch,
  Redirect,
} from "react-router-dom";
import UrlJoin from "url-join";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import Drop from "Components/event/Drop";
import NFTDetails from "Components/wallet/NFTDetails";
import {ClaimMintingStatus, DropMintingStatus, PackOpenStatus} from "Components/marketplace/MintingStatus";
import MarketplaceItemDetails from "Components/marketplace/MarketplaceItemDetails";
import MarketplaceOwned from "Components/marketplace/MarketplaceOwned";
import MarketplaceStorefront from "Components/marketplace/MarketplaceStorefront";
import MarketplaceBrowser from "Components/marketplace/MarketplaceBrowser";
import Listings from "Components/listings/Listings";
import {ErrorBoundary} from "Components/common/ErrorBoundary";
import MyListings from "Components/listings/MyListings";
import PurchaseHandler from "Components/marketplace/PurchaseHandler";
import {RecentSales} from "Components/listings/Activity";

const MarketplacePurchase = observer(() => {
  const match = useRouteMatch();

  return (
    <PurchaseHandler
      cancelPath={UrlJoin("/marketplace", match.params.marketplaceId, "store", match.params.sku)}
    />
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

    if(match.params.marketplaceId) {
      rootStore.SetMarketplace({marketplaceId: match.params.marketplaceId});
    } else {
      rootStore.ClearMarketplace();
    }
  }, [match.url, rootStore.marketplaces[match.params.marketplaceId]]);

  if(currentRoute.skipLoading) {
    return children;
  }

  if(match.params.marketplaceId) {
    return (
      <AsyncComponent
        loadKey={`marketplace-${match.params.marketplaceId}`}
        cacheSeconds={30}
        Load={async () => {
          if(currentRoute.skipLoading) { return; }

          await Promise.all([
            rootStore.LoadMarketplace(match.params.marketplaceId),
            rootStore.LoadWalletCollection()
          ]);
        }}
        loadingClassName="page-loader"
      >
        <div className="marketplace content">
          { children }
        </div>
      </AsyncComponent>
    );
  }

  return (
    <AsyncComponent
      loadKey="marketplace-list"
      cacheSeconds={1000}
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
  const item = (marketplace.items || []).find(item => item.sku === match.params.sku) || {};
  const nft = rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId}) || { metadata: {} };

  const listingName = transferStore.listingNames[match.params.listingId] || "Listing";

  return [
    { name: listingName, path: "/marketplace/:marketplaceId/listings/:listingId", Component: NFTDetails },
    { name: "All Listings", path: "/marketplace/:marketplaceId/listings", Component: Listings },
    { name: nft.metadata.display_name, path: "/marketplace/:marketplaceId/my-listings/:contractId/:tokenId", Component: NFTDetails },
    { name: "My Listings", path: "/marketplace/:marketplaceId/my-listings", Component: MyListings },
    { name: "Activity", path: "/marketplace/:marketplaceId/activity", Component: RecentSales },

    { name: "Drop Event", path: "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId", Component: Drop, hideNavigation: true },
    { name: "Status", path: "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId/status", Component: DropMintingStatus, hideNavigation: true },

    { name: ((marketplace.storefront || {}).tabs || {}).collection || "My Items", path: "/marketplace/:marketplaceId/collections", Component: MarketplaceOwned },

    { name: nft.metadata.display_name, path: "/marketplace/:marketplaceId/collections/owned/:contractId/:tokenId", Component: NFTDetails },
    { name: "Open Pack", path: "/marketplace/:marketplaceId/collections/owned/:contractId/:tokenId/open", Component: PackOpenStatus },

    { name: "Open Pack", path: "/marketplace/:marketplaceId/collections/:collectionIndex/owned/:contractId/:tokenId/open", Component: PackOpenStatus },
    { name: nft.metadata.display_name, path: "/marketplace/:marketplaceId/collections/:collectionIndex/owned/:contractId/:tokenId", Component: NFTDetails },
    { name: item.name, path: "/marketplace/:marketplaceId/collections/:collectionIndex/store/:sku", Component: MarketplaceItemDetails },

    { name: "Claim", path: "/marketplace/:marketplaceId/store/:sku/claim", Component: ClaimMintingStatus },
    { name: "Purchase", path: "/marketplace/:marketplaceId/store/:tenantId/:sku/purchase/:confirmationId/success", Component: MarketplacePurchase, hideNavigation: rootStore.sidePanelMode },
    { name: "Purchase", path: "/marketplace/:marketplaceId/store/:tenantId/:sku/purchase/:confirmationId/cancel", Component: MarketplacePurchase },
    { name: "Purchase", path: "/marketplace/:marketplaceId/store/:tenantId/:sku/purchase/:confirmationId", Component: MarketplacePurchase, noBreadcrumb: true },
    { name: item.name, path: "/marketplace/:marketplaceId/store/:sku", Component: MarketplaceItemDetails },
    { name: marketplace.name, path: "/marketplace/:marketplaceId/store", Component: MarketplaceStorefront },
    {
      name: marketplace.name,
      path: "/marketplace/:marketplaceId",
      Component: () => {
        const match = useRouteMatch();

        return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "store")} />;
      }
    },

    { name: "Marketplaces", path: "/marketplaces", Component: MarketplaceBrowser }
  ];
};

const MarketplaceRoutes = observer(() => {
  const match = useRouteMatch();

  return (
    <div className="page-container marketplace-page">
      <Switch>
        {
          Routes(match).map(({path, Component}) =>
            <Route exact path={path} key={`marketplace-route-${path}`}>
              <MarketplaceWrapper>
                <ErrorBoundary>
                  <Component/>
                </ErrorBoundary>
              </MarketplaceWrapper>
            </Route>
          )
        }
      </Switch>
    </div>
  );
});

export default MarketplaceRoutes;
