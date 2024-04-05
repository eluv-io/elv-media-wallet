import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import Profile from "Components/profile";
import Leaderboard from "Components/marketplace/Leaderboard";
import UrlJoin from "url-join";
import {ListingDetails, MarketplaceItemDetails, MintedNFTDetails, MintedNFTRedirect} from "Components/nft/NFTDetails";
import Listings from "Components/listings/Listings";
import {RecentSales} from "Components/listings/Activity";
import {
  ClaimMintingStatus,
  CollectionRedeemStatus,
  DropMintingStatus,
  PackOpenStatus,
  PurchaseMintingStatus,
  DepositStatus, GiftRedemptionStatus, GiftPurchaseMintingStatus
} from "Components/marketplace/MintingStatus";
import UserListings from "Components/user/UserListings";
import UserItems from "Components/user/UserItems";
import {Link, Redirect, Route, Switch, useRouteMatch} from "react-router-dom";
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
import UserOffers from "Components/user/UserOffers";
import UserCollections from "Components/user/UserCollections";
import {PageLoader} from "Components/common/Loaders";
import NFTMedia from "Components/nft/media/index";
import Notifications from "Components/header/NotificationsMenu";
import CodeRedemption from "Components/marketplace/CodeRedemption";
import UserGifts from "Components/user/UserGifts";

import MediaPropertyPage from "Components/properties/MediaPropertyPage";
import MediaPropertySectionPage from "Components/properties/MediaPropertySection";
import MediaPropertyMediaPage from "Components/properties/MediaPropertyMediaPage";
import MediaPropertyCollectionPage from "Components/properties/MediaPropertyCollectionPage";
import MediaPropertySearchPage from "Components/properties/MediaPropertySearchPage";

const GetProperty = (match) => {
  return rootStore.mediaPropertyStore.MediaProperty({mediaPropertySlugOrId: match.params.mediaPropertySlugOrId});
};

const GetMarketplace = (match) => {
  return rootStore.marketplaces[match.params.marketplaceId] || {};
};

const GetItem = (match) => {
  const marketplace = GetMarketplace(match);
  return (marketplace.items || []).find(item => item.sku === match.params.sku) || {};
};

const GetNFT = (match) => {
  return (rootStore.NFTData({contractId: match.params.contractId, tokenId: match.params.tokenId})).nft || { metadata: {} };
};

const PropertyMediaRoutes = (basePath="") => {
  const GetPropertyPageTitle = match => GetProperty(match)?.metadata?.page_title || rootStore.l10n.media_properties.media_property;
  return [
    { path: UrlJoin(basePath, "c/:mediaCollectionSlugOrId"), Component: MediaPropertyCollectionPage },
    { path: UrlJoin(basePath, "c/:mediaCollectionSlugOrId/l/:mediaListSlugOrId"), Component: MediaPropertyCollectionPage },
    { path: UrlJoin(basePath, "l/:mediaListSlugOrId"), Component: MediaPropertySectionPage },
    { path: UrlJoin(basePath, "m/:mediaItemSlugOrId"), Component: MediaPropertyMediaPage },
    { path: UrlJoin(basePath, "l/:mediaListSlugOrId/m/:mediaItemSlugOrId"), Component: MediaPropertyMediaPage },
    { path: UrlJoin(basePath, "c/:mediaCollectionSlugOrId/l/:mediaListSlugOrId/m/:mediaItemSlugOrId"), Component: MediaPropertyMediaPage },
  ].map(route => ({...route, name: GetPropertyPageTitle, noBlock: true}));
};

const PropertyRoutes = (basePath="") => {
  const GetPropertyPageTitle = match => GetProperty(match)?.metadata?.page_title || rootStore.l10n.media_properties.media_property;

  // All possible permutations of property or parent property/subproperty with or without page slug/id
  const prefixPaths = [
    ":mediaPropertySlugOrId",
    ":mediaPropertySlugOrId/:pageSlugOrId",
    ":parentMediaPropertySlugOrId/p/:mediaPropertySlugOrId",
    ":parentMediaPropertySlugOrId/:parentPageSlugOrId/p/:mediaPropertySlugOrId",
    ":parentMediaPropertySlugOrId/p/:mediaPropertySlugOrId/:pageSlugOrId",
    ":parentMediaPropertySlugOrId/:parentPageSlugOrId/p/:mediaPropertySlugOrId/:pageSlugOrId"
  ];

  return [
    // Search
    ...((prefixPaths.map(path => [
      { path: UrlJoin(basePath, path, "search"), Component: MediaPropertySearchPage},
    ])).flat()),

    // Media within section
    ...((prefixPaths.map(path => PropertyMediaRoutes(UrlJoin(basePath, path, "s/:sectionSlugOrId"))).flat())),

    // Media without section
    ...((prefixPaths.map(path => PropertyMediaRoutes(UrlJoin(basePath, path))).flat())),

    // Section pages
    ...(prefixPaths.map(path => ({ name: GetPropertyPageTitle, path: UrlJoin(basePath, path, "s/:sectionSlugOrId"), Component: MediaPropertySectionPage }))),


    ...(prefixPaths.map(path => ({ name: GetPropertyPageTitle, path: UrlJoin(basePath, path), Component: MediaPropertyPage }))),
  ].map(route => ({...route, noBlock: true, clearMarketplace: true}));
};

const BundledPropertyRoutes = (basePath="") => {
  return PropertyRoutes(UrlJoin(basePath, "/:contractId/:tokenId/p"));
};

const UserMarketplaceRoutes = () => {
  return [
    { name: "Collections", path: "collections", includeUserProfile: true, Component: UserCollections }
  ];
};

const TokenRoutes = basePath => {
  return [
    { name: "Open Pack", path: UrlJoin(basePath, "/:contractId/:tokenId/open"), authed: true, Component: PackOpenStatus },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: UrlJoin(basePath, "/:contractId"), noBreadcrumb: true, noBlock: true, Component: MintedNFTRedirect },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: UrlJoin(basePath, "/:contractId/:tokenId"), noBlock: true, Component: MintedNFTDetails },

    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: UrlJoin(basePath, "/:contractId/:tokenId/media"), noBlock: true, Component: NFTMedia },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: UrlJoin(basePath, "/:contractId/:tokenId/media/:sectionId/:mediaIndex"), noBlock: true, Component: NFTMedia },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: UrlJoin(basePath, "/:contractId/:tokenId/media/:sectionId/:collectionId/:mediaIndex"), noBlock: true, Component: NFTMedia },

    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: UrlJoin(basePath, "/:contractId/:tokenId/:action"), authed: true, noBlock: true, Component: MintedNFTDetails }
  ];
};

const UserRoutes = ({includeMarketplaceRoutes}) => {
  return [
    ...(includeMarketplaceRoutes ? UserMarketplaceRoutes() : []),
    { name: "Listings", path: "listings", includeUserProfile: true, Component: UserListings },
    { name: "Listing", path: "listings/:listingId", noBlock: true, Component: ListingDetails },
    { name: "Listing", path: "listings/:listingId/:action", authed: true, noBlock: true, Component: ListingDetails },
    { name: "Purchase Listing", path: "listings/:listingId/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },

    { name: "Activity", path: "activity", includeUserProfile: true, Component: UserActivity },
    { name: "Offers", path: "offers", includeUserProfile: true, Component: UserOffers, authed: true },
    { name: "Notifications", path: "notifications", Component: Notifications, includeUserProfile: true, authed: true },
    { name: "Gifts", path: "gifts", Component: UserGifts, includeUserProfile: true, authed: true },

    { name: match => (GetMarketplace(match)?.storefront?.tabs?.my_items || "Items"), includeUserProfile: true, path: "items", Component: UserItems },

    ...TokenRoutes("items"),
    ...TokenRoutes("listings"),

    { path: "/", includeUserProfile: true, redirect: "items" },
  ]
    .map(route => ({ ...route, navigationKey: "user", locationType: "user", loadUser: true, path: UrlJoin("users", ":userId", route.path) }));
};

const SharedRoutes = ({includeMarketplaceRoutes}) => {
  return [
    ...UserRoutes({includeMarketplaceRoutes}),

    { name: "Listing", path: "listings/:listingId", noBlock: true, Component: ListingDetails },
    { name: "Listing", path: "listings/:listingId/:action", authed: true, noBlock: true, Component: ListingDetails },
    { name: "Listings", path: "listings", Component: Listings },

    { name: "Activity", path: "activity", Component: RecentSales },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "activity/:contractId/:tokenId", noBlock: true, Component: MintedNFTDetails },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "activity/:contractId/:tokenId/:action", authed: true, noBlock: true, Component: MintedNFTDetails },
    { name: "Leaderboard", path: "leaderboard", Component: Leaderboard },

    { name: "Purchase Listing", path: "listings/:listingId/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },
    { name: "Profile", path: "profile", Component: Profile, authed: true },
    { name: "Deposit Status", path: "profile/deposit/:confirmationId", Component: DepositStatus, authed: true }
  ]
    .map(route => ({ ...route, navigationKey: route.navigationKey || "shared", locationType: "shared"}));
};

const MarketplaceRoutes = () => {
  return [
    { name: "Offer Redemption", path: "code/:eventSlug/:offerId", Component: CodeRedemption },

    { name: "Collections", path: "collections", Component: MarketplaceCollectionsSummaryPage },
    { name: "Collections", path: "collections/:collectionSKU", Component: MarketplaceCollection },
    { name: match => (GetItem(match)?.name || "Item"), path: "collections/:collectionSKU/store/:sku", noBlock: true, Component: MarketplaceItemDetails },
    { name: match => (GetItem(match)?.name || "Item"), path: "collections/:collectionSKU/store/:sku/:action", authed: true, noBlock: true, Component: MarketplaceItemDetails },

    { name: "Redeem Collection", path: "collections/:collectionSKU/redeem", Component: MarketplaceCollectionRedemption },
    { name: "Redeem Collection", path: "collections/:collectionSKU/redeem/:confirmationId/status", Component: CollectionRedeemStatus },

    ...TokenRoutes("collections/:collectionSKU/owned"),

    { name: "Drop Event", path: "events/:tenantSlug/:eventSlug/:dropId", Component: Drop, hideNavigation: true, authed: true, ignoreLoginCapture: true },
    { name: "Drop Status", path: "events/:tenantSlug/:eventSlug/:dropId/status", Component: DropMintingStatus, hideNavigation: true, authed: true },

    { name: "Claim", path: "store/:sku/claim/status", Component: ClaimMintingStatus, authed: true },
    { name: "Purchase", path: "store/:sku/purchase/:confirmationId", Component: PurchaseMintingStatus, authed: true },
    { name: "Purchase", path: "store/:sku/purchase-gift/:confirmationId", Component: GiftPurchaseMintingStatus },
    { name: "Purchase", path: "store/:sku/gift/:confirmationId/:code?", Component: GiftRedemptionStatus, authed: true },

    { name: match => (GetItem(match)?.name || rootStore.l10n.item_details.item), path: "store/:sku", noBlock: true, Component: MarketplaceItemDetails },
    { name: match => (GetItem(match)?.name || rootStore.l10n.item_details.item), path: "store/:sku/:action", authed: match => match.params.action !== "purchase-gift", noBlock: true, Component: MarketplaceItemDetails },
    { name: match => (GetMarketplace(match)?.branding?.name || rootStore.l10n.item_details.marketplace), path: "store", noBlock: true, Component: MarketplaceStorefront },

    { name: match => (GetItem(match)?.name || rootStore.l10n.item_details.item), path: "store/:sku/media", noBlock: true, Component: NFTMedia },
    { name: match => (GetItem(match)?.name || rootStore.l10n.item_details.item), path: "store/:sku/media/:sectionId/:mediaIndex", noBlock: true, Component: NFTMedia },
    { name: match => (GetItem(match)?.name || rootStore.l10n.item_details.item), path: "store/:sku/media/:sectionId/:collectionId/:mediaIndex", noBlock: true, Component: NFTMedia },

    { path: "/", redirect: "/store" }
  ].map(route => ({ ...route, navigationKey: "marketplace", locationType: "marketplace" }));
};

const UserRouteWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const [userNotFound, setUserNotFound] = useState(false);

  useEffect(() => {
    rootStore.ToggleMarketplaceNavigation(false);

    return () => rootStore.ToggleMarketplaceNavigation(true);
  }, []);

  useEffect(() => {
    setUserNotFound(false);
    rootStore.UserProfile({userId: match.params.userId})
      .then(profile => {
        if(!profile) {
          setUserNotFound(true);
        }
      })
      .catch(() => {
        setUserNotFound(true);
      });
  }, [match.params.userId]);

  if(match.params.userId === "me") {
    return (
      <LoginGate>
        { children }
      </LoginGate>
    );
  }

  if(userNotFound) {
    return (
      <div className="details-page details-page-message">
        <div className="details-page__message-container">
          <h2 className="details-page__message">
            User not found
          </h2>
          <div className="actions-container">
            <Link className="button action" to={match.params.marketplaceId ? UrlJoin("/marketplace", match.params.marketplaceId, "listings") : "/wallet/listings"}>
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if(!rootStore.userProfiles[match.params.userId]) {
    return <PageLoader />;
  }

  return children;
});

const RouteWrapper = observer(({routes, children}) => {
  const match = useRouteMatch();

  useEffect(() => {
    const currentRoute = routes.find(route => match.path === route.path);

    const breadcrumbs = routes
      .filter(route => !route.noBreadcrumb && match.path.includes(route.path))
      .sort((a, b) => a.path.length < b.path.length ? -1 : 1)
      .map(route => {
        route = { ...route };

        Object.keys(match.params).map(key => route.path = route.path.replace(`:${key}`, match.params[key]));

        return {
          name: typeof route.name === "function" ? route.name(match) : route.name,
          path: route.path
        };
      });

    document.title = breadcrumbs.slice(-1)[0]?.name || "Eluvio Media Wallet";

    let navigationKey = currentRoute.navigationKey;
    if(navigationKey === "shared") {
      navigationKey = match.params.marketplaceId ? "marketplace" : "global";
    }

    rootStore.SetNavigationInfo({
      navigationKey,
      locationType: currentRoute.locationType,
      marketplaceId: match.params.marketplaceId,
      url: match.url,
      path: match.path,
      breadcrumbs
    });

    if(currentRoute?.hideNavigation) {
      rootStore.ToggleNavigation(false);
      return () => rootStore.ToggleNavigation(true);
    }
  });

  return children;
});

const GlobalWrapper = observer(({routes, children}) => {
  const match = useRouteMatch();

  useEffect(() => {
    rootStore.SetRouteParams(match.params);
  }, [match.params]);

  const currentRoute = routes.find(route => match.path === route.path);

  if(currentRoute?.redirect) {
    return <Redirect to={UrlJoin(match.url, currentRoute.redirect)} />;
  }

  if(currentRoute?.noBlock) {
    return children;
  }

  return (
    <div className="page-block page-block--main-content" key={currentRoute?.routeKey || `main-content-${match.url}`}>
      <div className="page-block__content">
        {children}
      </div>
    </div>
  );
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

    case "property":
      routes = [
        ...PropertyRoutes()
      ];

      break;

    case "bundledProperty":
      routes = [
        ...BundledPropertyRoutes()
      ];

      break;

    default:
      throw Error("Invalid route list: " + routeList);
  }

  routes = routes.map(route => ({ ...route, path: UrlJoin(basePath, route.path) }));

  return (
    <Switch>
      {
        routes.map(({path, exact, authed, loadUser, includeUserProfile, ignoreLoginCapture, Component}) => {
          let result = (
            <GlobalWrapper routes={[...routes]}>
              { Component ? <Component key={`component-${path}-${location.pathname}`} /> : null }
            </GlobalWrapper>
          );

          if(includeUserProfile) {
            result = (
              <UserProfileContainer>
                {result}
              </UserProfileContainer>
            );
          }

          if(Wrapper) {
            result = (
              <Wrapper>
                {result}
              </Wrapper>
            );
          }

          if(loadUser) {
            result = (
              <UserRouteWrapper>
                {result}
              </UserRouteWrapper>
            );
          }

          if(authed) {
            result = (
              <LoginGate Condition={typeof authed === "function" ? authed : undefined} ignoreCapture={ignoreLoginCapture} to="/marketplaces">
                { result }
              </LoginGate>
            );
          }

          return (
            <Route exact={typeof exact === "undefined" ? true : exact} path={path} key={`wallet-route-${path}`}>
              <ErrorBoundary>
                <RouteWrapper routes={routes}>
                  { result }
                </RouteWrapper>
              </ErrorBoundary>
            </Route>
          );
        })
      }
    </Switch>
  );
});

export default RenderRoutes;
