import React, {useEffect, useState} from "react";
import {mediaPropertyStore, rootStore} from "Stores";
import Profile from "Components/profile";
import Leaderboard from "Components/marketplace/Leaderboard";
import UrlJoin from "url-join";
import {MarketplaceItemDetails} from "Components/nft/NFTDetails";
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
import ItemDetailsPage from "Components/properties/ItemDetailsPage";
import RedeemableOfferModal from "Components/properties/RedeemableOfferModal";
import EmailVerification from "Components/login/EmailVerification";
import FAQ from "Components/properties/FAQ";
import Subscription from "Components/profile/Subscription";
import CodeLoginTest from "Components/login/CodeLoginTest";
import {PurchaseGate} from "Components/properties/Common";

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

const UserMarketplaceRoutes = () => {
  return [
    { name: "Collections", path: "collections", includeUserProfile: true, Component: UserCollections }
  ];
};

const TokenRoutes = basePath => {
  return [
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "/:contractId/:tokenId/open", Component: PackOpenStatus, backPath: "" },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "/:contractId", noBreadcrumb: true, noBlock: true, Component: ItemDetailsPage, backPath: "" },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "/:contractId/:tokenId", noBlock: true, Component: ItemDetailsPage, backPath: "" },

    // Deprecated
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "/:contractId/:tokenId/media", noBlock: true, Component: NFTMedia, backPath: "/:contractId/:tokenId" },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "/:contractId/:tokenId/media/:sectionId/:mediaIndex", backPath: "/:contractId/:tokenId", noBlock: true, Component: NFTMedia },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "/:contractId/:tokenId/media/:sectionId/:collectionId/:mediaIndex", backPath: "/:contractId/:tokenId", noBlock: true, Component: NFTMedia },
  ]
    .map(route => ({...route, path: UrlJoin(basePath, route.path), backPath: route.backPath ? UrlJoin(basePath, route.backPath) : basePath }));
};

const UserRoutes = ({includeMarketplaceRoutes}={}) => {
  return [
    {
      name: "Subscriptions",
      path: "details/subscriptions/:subscriptionId",
      backPath: "details",
      Component: Subscription
    },
    {
      name: "Subscriptions",
      path: "items/subscriptions/:subscriptionId",
      backPath: "items",
      Component: Subscription
    },

    ...(includeMarketplaceRoutes ? UserMarketplaceRoutes() : []),

    { name: "Listings", path: "listings", includeUserProfile: true, backPath: "/", Component: UserListings },
    { name: "Listings", path: "listings/:contractId/:tokenId/open", Component: PackOpenStatus, backPath: "/listings" },
    { name: "Listings", path: "listings/:contractId/:tokenId", noBlock: true, Component: ItemDetailsPage, backPath: "/listings" },

    { name: "Activity", path: "activity", includeUserProfile: true, Component: UserActivity },
    { name: "Activity", path: "activity/:contractId/:tokenId/open", Component: PackOpenStatus, backPath: "/activity" },
    { name: "Activity", path: "activity/:contractId/:tokenId", noBlock: true, Component: ItemDetailsPage, backPath: "/activity" },
    { name: "Notifications", path: "notifications", Component: Notifications, includeUserProfile: true, authed: true },
    { name: "Gifts", path: "gifts", Component: UserGifts, includeUserProfile: true, authed: true },
    { name: "Details", path: "details", Component: Profile, includeUserProfile: true, authed: true },

    { name: "Items", includeUserProfile: match => match.params.userId !== "me", path: "items", Component: UserItems },

    ...TokenRoutes("items"),
    ...TokenRoutes("listings"),

    { path: "/", includeUserProfile: true, redirect: "items" },
  ]
    .map(route => ({
      ...route,
      navigationKey: "user",
      locationType: "user",
      loadUser: true,
      path: UrlJoin("users", ":userId", route.path),
      backPath: route.backPath && UrlJoin("users", ":userId", route.backPath)
    }));
};


const PropertyMediaRoutes = (basePath="") => {
  const GetPropertyPageTitle = match => GetProperty(match)?.metadata?.meta_tags?.title || GetProperty(match)?.metadata?.page_title;
  return [
    { path: UrlJoin(basePath, "c/:mediaCollectionSlugOrId"), Component: MediaPropertyCollectionPage },
    { path: UrlJoin(basePath, "c/:mediaCollectionSlugOrId/l/:mediaListSlugOrId"), Component: MediaPropertyCollectionPage },
    { path: UrlJoin(basePath, "l/:mediaListSlugOrId"), Component: MediaPropertySectionPage },
    { path: UrlJoin(basePath, "m/:mediaItemSlugOrId"), Component: MediaPropertyMediaPage },
    { path: UrlJoin(basePath, "l/:mediaListSlugOrId/m/:mediaItemSlugOrId"), Component: MediaPropertyMediaPage, backPath: "l/:mediaListSlugOrId" },
    { path: UrlJoin(basePath, "c/:mediaCollectionSlugOrId/l/:mediaListSlugOrId/m/:mediaItemSlugOrId"), Component: MediaPropertyMediaPage, backPath: "c/:mediaCollectionSlugOrId?l=:mediaListSlugOrId" },
  ].map(route => ({...route, name: GetPropertyPageTitle, backPath: route.backPath ? UrlJoin(basePath, route.backPath) : basePath, noBlock: true}));
};

const PropertyRoutes = ({basePath="/", rootPath="/", authed, additionalRoutes=[]}) => {
  const GetPropertyPageTitle = match => GetProperty(match)?.metadata?.meta_tags?.title || GetProperty(match)?.metadata?.page_title;

  // All possible permutations of property or parent property/subproperty with or without page slug/id
  const propertyPaths = [
    { path: ":mediaPropertySlugOrId", backPath: rootPath },
    { path: ":mediaPropertySlugOrId/:pageSlugOrId", backPath: ":mediaPropertySlugOrId" },
    { path: ":parentMediaPropertySlugOrId/p/:mediaPropertySlugOrId", backPath: ":parentMediaPropertySlugOrId" },
    { path: ":parentMediaPropertySlugOrId/:parentPageSlugOrId/p/:mediaPropertySlugOrId", backPath: ":parentMediaPropertySlugOrId/:parentPageSlugOrId" },
    { path: ":parentMediaPropertySlugOrId/p/:mediaPropertySlugOrId/:pageSlugOrId", backPath: ":parentMediaPropertySlugOrId/p/:mediaPropertySlugOrId/" },
    { path: ":parentMediaPropertySlugOrId/:parentPageSlugOrId/p/:mediaPropertySlugOrId/:pageSlugOrId", backPath: ":parentMediaPropertySlugOrId/:parentPageSlugOrId/p/:mediaPropertySlugOrId" }
  ];

  const prefixPaths = propertyPaths.map(({path}) => path);

  return [
    // Search
    ...((prefixPaths.map(path => [
      { path: UrlJoin(basePath, path, "search"), Component: MediaPropertySearchPage, backPath: UrlJoin(basePath, path) },
    ])).flat()),

    // Media within section
    ...((prefixPaths.map(path => PropertyMediaRoutes(UrlJoin(basePath, path, "s/:sectionSlugOrId"))).flat())),

    // Media without section
    ...((prefixPaths.map(path => PropertyMediaRoutes(UrlJoin(basePath, path))).flat())),

    // Section pages
    ...(prefixPaths.map(path => ({
      name: GetPropertyPageTitle,
      path: UrlJoin(basePath, path, "s/:sectionSlugOrId"),
      backPath: UrlJoin(basePath, path),
      Component: MediaPropertySectionPage
    }))),

    // Additional routes (item details)
    ...additionalRoutes.map(route => [
      ...prefixPaths.map(path =>
        ({
          ...route,
          name: route.name || GetPropertyPageTitle,
          path: UrlJoin(basePath, path, route.path),
          backPath: UrlJoin(basePath, path)
        })
      )
    ]).flat(),

    // User routes
    ...UserRoutes().map(route => [
      ...(prefixPaths.map(path =>
        ({
          ...route,
          path: UrlJoin(basePath, path, route.path),
          includePageBlock: true,
          backPath: UrlJoin(basePath, path, route.backPath || "")
        })
      ))
    ]).flat(),

    // Email Verification
    ...prefixPaths.map(path => ({
      name: "Email Verification",
      path: UrlJoin(basePath, path, "verify"),
      backPath: UrlJoin(basePath, path),
      Component: EmailVerification
    })),

    ...prefixPaths.map(path => ({
      name: GetPropertyPageTitle,
      path: UrlJoin(basePath, path, "faq"),
      backPath: UrlJoin(basePath, path),
      Component: FAQ
    })),

    ...prefixPaths.map(path => ({
      name: GetPropertyPageTitle,
      path: UrlJoin(basePath, path, "faq", ":slug"),
      backPath: UrlJoin(basePath, path),
      Component: FAQ
    })),

    // Listings
    ...prefixPaths.map(path => ({
      name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item),
      path: UrlJoin(basePath, path, "listings/:contractId/:tokenId/open"),
      backPath: UrlJoin(basePath, path, "listings"),
      includePageBlock: true,
      Component: PackOpenStatus
    })),

    ...prefixPaths.map(path => ({
      name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item),
      path: UrlJoin(basePath, path, "listings/:contractId/:tokenId"),
      backPath: UrlJoin(basePath, path, "listings"),
      noBlock: true,
      Component: ItemDetailsPage
    })),

    ...prefixPaths.map(path => ({
      name: "Listings",
      path: UrlJoin(basePath, path, "listings"),
      backPath: UrlJoin(basePath, path),
      Component: Listings,
      includePageBlock: true
    })),

    ...prefixPaths.map(path => ({
      name: GetPropertyPageTitle,
      path: UrlJoin(basePath, path, "code-login-test"),
      backPath: UrlJoin(basePath, path),
      Component: CodeLoginTest
    })),

    // Base property pages
    ...(propertyPaths.map(({path, backPath}) => ({
      name: GetPropertyPageTitle,
      path: UrlJoin(basePath, path),
      backPath,
      Component: MediaPropertyPage
    }))),
  ].map(route => ({
    ...route,
    propertyRoute: true,
    authed: route.authed || authed,
    noBlock: route.noBlock || !route.includePageBlock
  }));
};

const BundledPropertyRoutes = () => {
  const basePath = "/m/:propertyItemContractId/:propertyItemTokenId/p";

  return PropertyRoutes({
    basePath,
    rootPath: "/",
    authed: true,
    additionalRoutes: [
      {path: "/details", Component: ItemDetailsPage, backPath: basePath}
    ]
  });
};

const SharedRoutes = ({includeMarketplaceRoutes}) => {
  return [
    ...UserRoutes({includeMarketplaceRoutes}),

    { name: "Listing", path: "listings/:contractId/:tokenId/open", backPath: "listings", Component: PackOpenStatus },
    { name: "Listing", path: "listings/:contractId/:tokenId", backPath: "listings", noBlock: true, Component: ItemDetailsPage },
    { name: "Listings", path: "listings", Component: Listings },

    { name: "Activity", path: "activity", Component: RecentSales },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "activity/:contractId/:tokenId/open", backPath: "activity", Component: PackOpenStatus },
    { name: match => (GetNFT(match)?.metadata?.display_name || rootStore.l10n.item_details.item), path: "activity/:contractId/:tokenId", backPath: "activity", noBlock: true, Component: ItemDetailsPage },
    { name: "Leaderboard", path: "leaderboard", Component: Leaderboard },

    { name: "Profile", path: "profile", Component: Profile, authed: true },
    { name: "Deposit Status", path: "profile/deposit/:confirmationId", Component: DepositStatus, authed: true }
  ]
    .map(route => ({
      ...route,
      backPath: route.backPath || (includeMarketplaceRoutes ? "store" : undefined),
      navigationKey: route.navigationKey || "shared",
      locationType: "shared"
    }));
};

const MarketplaceRoutes = () => {
  return [
    { name: "Offer Redemption", path: "code/:eventSlug/:offerId", Component: CodeRedemption },

    { name: "Collections", path: "collections", Component: MarketplaceCollectionsSummaryPage },
    { name: "Collections", path: "collections/:collectionSKU", backPath: "collections", Component: MarketplaceCollection },
    { name: match => (GetItem(match)?.name || "Item"), path: "collections/:collectionSKU/store/:sku", backPath: "collections/:collectionSKU/store", noBlock: true, Component: MarketplaceItemDetails },
    { name: match => (GetItem(match)?.name || "Item"), path: "collections/:collectionSKU/store/:sku/:action", backPath: "collections/:collectionSKU/store/:sku", authed: true, noBlock: true, Component: MarketplaceItemDetails },

    { name: "Redeem Collection", path: "collections/:collectionSKU/redeem", backPath: "collections", Component: MarketplaceCollectionRedemption },
    { name: "Redeem Collection", path: "collections/:collectionSKU/redeem/:confirmationId/status", backPath: "collections", Component: CollectionRedeemStatus },

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
  ].map(route => ({
    ...route,
    navigationKey: "marketplace",
    locationType: "marketplace",
    backPath: route.backPath || route.path !== "store" && "store"
  }));
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
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    if(!rootStore.loggedIn) { return; }

    setCheckingSession(true);

    rootStore.CheckAuthSession()
      .finally(() => setCheckingSession(false));
  }, [match.path, rootStore.loggedIn]);

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

    const title = breadcrumbs.slice(-1)[0]?.name;
    if(title) {
      document.title = title;
    }

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

    rootStore.SetRouteParams(match.params);
    rootStore.SetBackPath(currentRoute.backPath);

    if(currentRoute?.hideNavigation) {
      rootStore.ToggleNavigation(false);
      return () => rootStore.ToggleNavigation(true);
    }
  });

  if(checkingSession || rootStore.signingOut) {
    return <PageLoader />;
  }

  return children;
});

const PropertyRouteWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const permissions = mediaPropertyStore.ResolvePermission(match.params);
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(page?.permissions?.authorized && permissions?.authorized) {
    return children;
  }

  return (
    <PurchaseGate
      routeParams={match.params}
      purchasePageSettings={mediaProperty.metadata.purchase_page || {}}
      noPurchaseAvailablePageSettings={mediaProperty.metadata.no_purchase_available_page || {}}
      id={
        !page?.permissions?.authorized ?
          page.id :
          permissions.causeId
      }
      permissions={
        !page.permissions.authorized ?
          page.permissions :
          permissions
      }
    >
      {children}
    </PurchaseGate>
  );
});

const GlobalWrapper = observer(({routes, children}) => {
  const match = useRouteMatch();

  const currentRoute = routes.find(route => match.path === route.path);

  useEffect(() => {
    rootStore.SetCurrentProperty(match.params.mediaPropertySlugOrId);
  }, [match.params.mediaPropertySlugOrId]);

  if(currentRoute?.redirect) {
    return <Redirect to={UrlJoin(match.url, currentRoute.redirect)} />;
  }

  if(currentRoute?.noBlock) {
    return (
      <>
        { children }
        <RedeemableOfferModal />
      </>
    );
  }

  return (
    <div className="page-block page-block--main-content" key={currentRoute?.routeKey || `main-content-${match.url}`}>
      <div className="page-block__content">
        {children}
        <RedeemableOfferModal />
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
        ...PropertyRoutes({basePath: "/", rootPath: "/"})
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

  routes = routes.map(route => ({
    ...route,
    path: UrlJoin(basePath, route.path),
    backPath: route.backPath ? UrlJoin(basePath, route.backPath) : undefined
  }));

  return (
    <Switch>
      {
        routes.map(({path, exact, authed, loadUser, includeUserProfile, ignoreLoginCapture, propertyRoute, Component}) => {
          let result = (
            <GlobalWrapper routes={[...routes]}>
              { Component ? <Component key={`component-${path}-${location.pathname}`} /> : null }
            </GlobalWrapper>
          );

          if(propertyRoute) {
            result = (
              <PropertyRouteWrapper>
                {result}
              </PropertyRouteWrapper>
            );
          }

          if(includeUserProfile) {
            result = (
              <UserProfileContainer includeUserProfile={includeUserProfile}>
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
