import React, {useEffect} from "react";
import {rootStore} from "Stores";
import Profile from "Components/profile";
import Leaderboard from "Components/marketplace/Leaderboard";
import UrlJoin from "url-join";
import {ListingDetails, MarketplaceItemDetails, MintedNFTDetails} from "Components/nft/NFTDetails";
import Listings from "Components/listings/Listings";
import {RecentSales} from "Components/listings/Activity";
import {
  ClaimMintingStatus,
  CollectionRedeemStatus,
  DropMintingStatus,
  PackOpenStatus,
  PurchaseMintingStatus
} from "Components/marketplace/MintingStatus";
import UserListings from "Components/user/UserListings";
import UserItems from "Components/user/UserItems";
import {Redirect, Route, Switch, useRouteMatch} from "react-router-dom";
import {ErrorBoundary} from "Components/common/ErrorBoundary";
import MarketplaceCollectionsSummaryPage from "Components/marketplace/MarketplaceCollectionsSummary";
import MarketplaceCollection from "Components/marketplace/MarketplaceCollection";
import MarketplaceCollectionRedemption from "Components/marketplace/MarketplaceCollectionRedemption";
import {LoginGate} from "Components/common/LoginGate";
import {observer} from "mobx-react";
import UserProfileContainer from "Components/profile/UserProfileContainer";
import Drop from "Components/event/Drop";
import MarketplaceStorefront from "Components/marketplace/MarketplaceStorefront";
import UserActivity from "Components/user/UserActivity";
import UserCollections from "Components/user/UserCollections";

const GetMarketplace = (match) => {
  return rootStore.marketplaces[match.params.marketplaceId] || {};
};

const GetItem = (match) => {
  const marketplace = GetMarketplace(match);
  return (marketplace.items || []).find(item => item.sku === match.params.sku) || {};
};

const GetNFT = (match) => {
  return rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId}) || { metadata: {} };
};


const UserMarketplaceRoutes = () => {
  return [
    { name: "Collections", path: "collections", includeUserProfile: true, Component: UserCollections }
  ];
};

const UserRoutes = ({includeMarketplaceRoutes}) => {
  return [
    ...(includeMarketplaceRoutes ? UserMarketplaceRoutes() : []),

    { name: "Listings", path: "listings", includeUserProfile: true, Component: UserListings },
    { name: "Listing", path: "listings/:listingId", Component: ListingDetails },
    { name: "Purchase Listing", path: "listings/:listingId/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },

    { name: "Activity", path: "activity", includeUserProfile: true, Component: UserActivity },

    { name: match => (GetNFT(match)?.metadata?.display_name || "NFT"), path: "listings/:contractId/:tokenId", Component: MintedNFTDetails },

    { name: match => (GetMarketplace(match)?.storefront?.tabs?.my_items || "Items"), includeUserProfile: true, path: "items", Component: UserItems },
    { name: match => (GetNFT(match)?.metadata?.display_name || "NFT"), path: "items/:contractId/:tokenId", Component: MintedNFTDetails },
    { name: "Open Pack", path: "items/:contractId/:tokenId/open", Component: PackOpenStatus },
  ]
    .map(route => ({ ...route, path: UrlJoin("users", ":userId", route.path) }));
};

const SharedRoutes = ({includeMarketplaceRoutes}) => {
  return [
    ...UserRoutes({includeMarketplaceRoutes}),
    { name: "Leaderboard", path: "leaderboard", Component: Leaderboard },

    { name: "Listing", path: "listings/:listingId", Component: ListingDetails },
    { name: "Listings", path: "listings", Component: Listings },

    { name: "Activity", path: "activity", Component: RecentSales },
    { name: match => (GetNFT(match)?.metadata?.display_name || "NFT"), path: "activity/:contractId/:tokenId", Component: MintedNFTDetails },

    { name: "Purchase Listing", path: "listings/:listingId/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },

    { name: "Profile", path: "profile", Component: Profile, authed: true }
  ];
};

const MarketplaceRoutes = () => {
  return [
    { name: "Collections", path: "collections", Component: MarketplaceCollectionsSummaryPage },
    { name: "Collections", path: "collections/:collectionSKU", Component: MarketplaceCollection },
    { name: match => (GetItem(match)?.name || "Item"), path: "collections/:collectionSKU/store/:sku", Component: MarketplaceItemDetails },
    { name: match => (GetNFT(match)?.metadata?.display_name || "NFT"), path: "collections/:collectionSKU/owned/:contractId/:tokenId", Component: MintedNFTDetails },
    { name: "Redeem Collection", path: "collections/:collectionSKU/redeem", Component: MarketplaceCollectionRedemption },
    { name: "Redeem Collection", path: "collections/:collectionSKU/redeem/:confirmationId/status", Component: CollectionRedeemStatus },

    { name: "Drop Event", path: "events/:tenantSlug/:eventSlug/:dropId", Component: Drop, hideNavigation: true, authed: true, ignoreLoginCapture: true },
    { name: "Drop Status", path: "events/:tenantSlug/:eventSlug/:dropId/status", Component: DropMintingStatus, hideNavigation: true, authed: true },

    { name: "Claim", path: "store/:sku/claim", Component: ClaimMintingStatus, authed: true },
    { name: "Purchase", path: "store/:sku/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },

    { name: match => (GetItem(match)?.name || "Item"), path: "store/:sku", Component: MarketplaceItemDetails },
    { name: match => (GetMarketplace(match)?.branding?.name || "Marketplace"), path: "store", Component: MarketplaceStorefront },

    { path: "/", redirect: "/store" }
  ];
};

const RouteWrapper = observer(({routes, children}) => {
  const match = useRouteMatch();

  useEffect(() => {
    const currentRoute = routes.find(route => match.path === route.path);

    const breadcrumbs = routes
      .filter(route => !route.noBreadcrumb && match.path.includes(route.path))
      .sort((a, b) => a.path.length < b.path.length ? -1 : 1)
      .map(route => {
        Object.keys(match.params).map(key => route.path = route.path.replace(`:${key}`, match.params[key]));

        return {
          name: typeof route.name === "function" ? route.name(match) : route.name,
          path: route.path
        };
      });

    rootStore.SetNavigationBreadcrumbs(breadcrumbs);

    if(currentRoute?.hideNavigation) {
      rootStore.ToggleNavigation(false);
      return () => rootStore.ToggleNavigation(true);
    }
  });

  const currentRoute = routes.find(route => match.path === route.path);

  if(currentRoute?.redirect) {
    return <Redirect to={UrlJoin(match.url, currentRoute.redirect)} />;
  }

  return children;
});

const RenderRoutes = observer(({basePath, routeList, Wrapper}) => {
  let routes = [];
  switch(routeList) {
    case "marketplace":
      routes = [
        ...SharedRoutes({includeMarketplaceRoutes: true}),
        ...(MarketplaceRoutes())
      ];

      break;

    case "wallet":
      routes = [
        ...SharedRoutes({includeMarketplaceRoutes: false})
      ];

      break;

    default:
      throw Error("Invalid route list: " + routeList);
  }

  routes = routes.map(route => ({ ...route, path: UrlJoin(basePath, route.path) }));

  return (
    <Switch>
      {
        routes.map(({path, exact, authed, includeUserProfile, ignoreLoginCapture, Component}) => {
          let result = (
            <RouteWrapper routes={routes}>
              { Component ? <Component key={`component-${path}`} /> : null }
            </RouteWrapper>
          );

          if(Wrapper) {
            result = (
              <Wrapper>
                { result }
              </Wrapper>
            );
          }

          if(includeUserProfile) {
            result = (
              <UserProfileContainer>
                { result }
              </UserProfileContainer>
            );
          }

          if(authed) {
            result = (
              <LoginGate ignoreCapture={ignoreLoginCapture} to="/marketplaces">
                { result }
              </LoginGate>
            );
          }

          return (
            <Route exact={typeof exact === "undefined" ? true : exact} path={path} key={`wallet-route-${path}`}>
              <ErrorBoundary>
                { result }
              </ErrorBoundary>
            </Route>
          );
        })
      }
    </Switch>
  );
});

export default RenderRoutes;
