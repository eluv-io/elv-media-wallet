import React, {useEffect} from "react";
import {rootStore} from "Stores/index";
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
import NFTDetails, {ListingDetails, MarketplaceItemDetails2, MintedNFTDetails} from "Components/wallet/NFTDetails";
import {
  ClaimMintingStatus,
  CollectionRedeemStatus,
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
import {LoginGate} from "Components/common/LoginGate";
import {PageLoader} from "Components/common/Loaders";
import MarketplaceCollectionsSummaryPage from "Components/marketplace/MarketplaceCollectionsSummary";
import MarketplaceCollection from "Components/marketplace/MarketplaceCollection";
import MarketplaceCollectionRedemption from "Components/marketplace/MarketplaceCollectionRedemption";

// Given a tenant/marketplace slug, redirect to the proper marketplace
const MarketplaceSlugRedirect = observer(() => {
  const match = useRouteMatch();

  if(!rootStore.loaded) { return <PageLoader />; }

  const marketplaceInfo = rootStore.walletClient.MarketplaceInfo({
    marketplaceParams: {
      tenantSlug: match.params.tenantSlug,
      marketplaceSlug: match.params.marketplaceSlug
    }
  });

  if(!marketplaceInfo) {
    return <Redirect to="/marketplaces" />;
  }

  return <Redirect to={UrlJoin("/marketplace", marketplaceInfo.marketplaceId, match.params.location || "store")} />;
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

  if(!rootStore.loaded) {
    return <PageLoader />;
  }

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
            rootStore.LoadNFTContractInfo()
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

  return [
    { name: "Listing", path: "/marketplace/:marketplaceId/listings/:listingId", Component: ListingDetails },
    { name: "Listings", path: "/marketplace/:marketplaceId/listings", Component: Listings },
    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/my-listings/:contractId/:tokenId", Component: MintedNFTDetails, authed: true },
    { name: "My Listings", path: "/marketplace/:marketplaceId/my-listings", Component: MyListings, authed: true },
    { name: "My Transactions", path: "/marketplace/:marketplaceId/my-listings/transactions", Component: MyListings, authed: true },
    { name: "Activity", path: "/marketplace/:marketplaceId/activity", Component: RecentSales },
    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/activity/:contractId/:tokenId", Component: MintedNFTDetails },

    { name: "Drop Event", path: "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId", Component: Drop, hideNavigation: true, authed: true, ignoreLoginCapture: true },
    { name: "Status", path: "/marketplace/:marketplaceId/events/:tenantSlug/:eventSlug/:dropId/status", Component: DropMintingStatus, hideNavigation: true, authed: true },

    { name: ((marketplace.storefront || {}).tabs || {}).my_items || "My Items", path: "/marketplace/:marketplaceId/my-items", Component: MarketplaceOwned, authed: true },
    { name: nft?.metadata?.display_name, path: "/marketplace/:marketplaceId/my-items/:contractId/:tokenId", Component: MintedNFTDetails, authed: true },
    { name: "Open Pack", path: "/marketplace/:marketplaceId/my-items/:contractId/:tokenId/open", Component: PackOpenStatus, authed: true },

    { name: "Collections", path: "/marketplace/:marketplaceId/collections", Component: MarketplaceCollectionsSummaryPage },
    { name: "Collections", path: "/marketplace/:marketplaceId/collections/:collectionSKU", Component: MarketplaceCollection },
    { name: item.name, path: "/marketplace/:marketplaceId/collections/:collectionSKU/store/:sku", Component: MarketplaceItemDetails2 },
    { name: item.name, path: "/marketplace/:marketplaceId/collections/:collectionSKU/owned/:contractId/:tokenId", Component: MintedNFTDetails },
    { name: "Redeem Collection", path: "/marketplace/:marketplaceId/collections/:collectionSKU/redeem", Component: MarketplaceCollectionRedemption },
    { name: "Redeem Collection", path: "/marketplace/:marketplaceId/collections/:collectionSKU/redeem/:confirmationId/status", Component: CollectionRedeemStatus },

    { name: "Claim", path: "/marketplace/:marketplaceId/store/:sku/claim", Component: ClaimMintingStatus, authed: true },
    { name: "Purchase", path: "/marketplace/:marketplaceId/store/:sku/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },

    { name: item.name, path: "/marketplace/:marketplaceId/store/:sku", Component: MarketplaceItemDetails2 },
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
    { name: "Profile", path: "/marketplace/:marketplaceId/profile", Component: Profile, authed: true },

    { name: "Marketplaces", path: "/marketplaces", Component: MarketplaceBrowser }
  ];
};

const MarketplaceRoutes = observer(() => {
  const match = useRouteMatch();

  return (
    <div className="page-container marketplace-page">
      <Switch>
        <Route exact path="/marketplaces/redirect/:tenantSlug/:marketplaceSlug/:location?">
          <MarketplaceSlugRedirect />
        </Route>

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
