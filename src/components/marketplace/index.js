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
import {
  ClaimMintingStatus,
  DropMintingStatus,
  PackOpenStatus,
  PurchaseMintingStatus
} from "Components/marketplace/MintingStatus";
import MarketplaceItemDetails from "Components/marketplace/MarketplaceItemDetails";
import MarketplaceOwned from "Components/marketplace/MarketplaceOwned";
import MarketplaceStorefront from "Components/marketplace/MarketplaceStorefront";
import MarketplaceBrowser from "Components/marketplace/MarketplaceBrowser";
import Listings from "Components/listings/Listings";
import {ErrorBoundary} from "Components/common/ErrorBoundary";
import MyListings from "Components/listings/MyListings";
import {RecentSales} from "Components/listings/Activity";
import Profile from "Components/profile";
import MarketplaceCollections from "Components/marketplace/MarketplaceCollections";
import {LoginGate} from "Components/common/LoginGate";

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
        // Store info is cleared when logged in
        loadKey={`marketplace-${match.params.marketplaceId}-${rootStore.loggedIn}`}
        cacheSeconds={30}
        Load={async () => {
          if(currentRoute.skipLoading) { return; }

          await Promise.all([
            rootStore.LoadMarketplace(match.params.marketplaceId),
            rootStore.LoadNFTInfo()
          ]);
        }}
        loadingClassName="page-loader content"
      >
        <div className="marketplace content">
          { children }
        </div>
      </AsyncComponent>
    );
  }

  return children;
});

const Routes = (match) => {
  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || {};
  const item = (marketplace.items || []).find(item => item.sku === match.params.sku) || {};
  const nft = rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId}) || { metadata: {} };

  const listingName = transferStore.listingNames[match.params.listingId] || "Listing";

  return [
    { name: listingName, path: "/marketplace/:marketplaceId/listings/:listingId", Component: NFTDetails },
    { name: "All Listings", path: "/marketplace/:marketplaceId/listings", Component: Listings },
    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/my-listings/:contractId/:tokenId", Component: NFTDetails, authed: true },
    { name: "My Listings", path: "/marketplace/:marketplaceId/my-listings", Component: MyListings, authed: true },
    { name: "Activity", path: "/marketplace/:marketplaceId/activity", Component: RecentSales },
    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/activity/:contractId/:tokenId", Component: NFTDetails },

    { name: "Drop Event", path: "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId", Component: Drop, hideNavigation: true, authed: true, ignoreLoginCapture: true },
    { name: "Status", path: "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId/status", Component: DropMintingStatus, hideNavigation: true, authed: true },

    { name: ((marketplace.storefront || {}).tabs || {}).collection || "My Items", path: "/marketplace/:marketplaceId/collection", Component: MarketplaceOwned, authed: true },
    { name: "Collections", path: "/marketplace/:marketplaceId/collections", Component: MarketplaceCollections },

    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/collection/owned/:contractId/:tokenId", Component: NFTDetails, authed: true },
    { name: "Open Pack", path: "/marketplace/:marketplaceId/collection/owned/:contractId/:tokenId/open", Component: PackOpenStatus, authed: true },

    { name: "Open Pack", path: "/marketplace/:marketplaceId/collection/:collectionIndex/owned/:contractId/:tokenId/open", Component: PackOpenStatus, authed: true },
    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/collection/:collectionIndex/owned/:contractId/:tokenId", Component: NFTDetails, authed: true },
    { name: item.name, path: "/marketplace/:marketplaceId/collection/:collectionIndex/store/:sku", Component: MarketplaceItemDetails },

    { name: "Claim", path: "/marketplace/:marketplaceId/store/:sku/claim", Component: ClaimMintingStatus, authed: true },
    { name: "Purchase", path: "/marketplace/:marketplaceId/store/:tenantId/:sku/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },

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

    // Duplicate profile in marketplace section so navigating to profile doesn't clear the active marketplace
    { name: "Profile", path: "/marketplace/:marketplaceId/profile", Component: Profile, skipLoading: true, authed: true },

    { name: "Marketplaces", path: "/marketplaces", Component: MarketplaceBrowser }
  ];
};

const MarketplaceRoutes = observer(() => {
  const match = useRouteMatch();

  return (
    <div className="page-container marketplace-page">
      <Switch>
        {
          Routes(match).map(({path, authed, ignoreLoginCapture, Component}) =>
            <Route exact path={path} key={`marketplace-route-${path}`}>
              <ErrorBoundary>
                {
                  authed ?
                    <LoginGate ignoreCapture={ignoreLoginCapture} to="/marketplaces">
                      <MarketplaceWrapper>
                        <Component/>
                      </MarketplaceWrapper>
                    </LoginGate> :

                    <MarketplaceWrapper>
                      <Component/>
                    </MarketplaceWrapper>
                }
              </ErrorBoundary>
            </Route>
          )
        }
      </Switch>
    </div>
  );
});

export default MarketplaceRoutes;
