import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {
  Switch,
  Route,
  Redirect,
  useRouteMatch
} from "react-router-dom";

import {rootStore, transferStore} from "Stores/index";

import Collections from "Components/wallet/Collections";
import AsyncComponent from "Components/common/AsyncComponent";
import NFTDetails from "Components/wallet/NFTDetails";
import {PackOpenStatus} from "Components/marketplace/MintingStatus";
import MyListings from "Components/listings/MyListings";
import Listings from "Components/listings/Listings";
import PurchaseHandler from "Components/marketplace/PurchaseHandler";
import UrlJoin from "url-join";
import {RecentSales} from "Components/listings/Activity";

const WalletPurchase = observer(() => {
  return (
    <PurchaseHandler
      cancelPath={UrlJoin("/wallet", "collection")}
    />
  );
});

const WalletWrapper = observer(({children}) => {
  const match = useRouteMatch();

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

    const currentRoute = Routes(match).find(route => match.path === route.path);
    if(currentRoute.hideNavigation) {
      rootStore.ToggleNavigation(false);
      return () => rootStore.ToggleNavigation(true);
    }

    rootStore.ClearMarketplace();
  }, [match.url]);

  return (
    <AsyncComponent
      loadKey="wallet-collection"
      cacheSeconds={30}
      Load={async () => {
        await rootStore.LoadWalletCollection();
      }}
      loadingClassName="page-loader"
    >
      { children }
    </AsyncComponent>
  );
});

const Routes = (match) => {
  const nft = rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId}) || { metadata: {} };
  const listingName = transferStore.listingNames[match.params.listingId] || "Listing";

  return [
    { name: nft.metadata.display_name, path: "/wallet/my-listings/:contractId/:tokenId", Component: NFTDetails },
    { name: "My Listings", path: "/wallet/my-listings", Component: MyListings },
    { name: "My Listings", path: "/wallet/my-listings/transactions", Component: MyListings },

    { name: "Activity", path: "/wallet/activity", Component: RecentSales },

    { name: listingName, path: "/wallet/listings/:listingId", Component: NFTDetails },
    { name: "All Listings", path: "/wallet/listings", Component: Listings },
    { name: "Open Pack", path: "/wallet/collection/:contractId/:tokenId/open", Component: PackOpenStatus },
    { name: nft.metadata.display_name, path: "/wallet/collection/:contractId/:tokenId", Component: NFTDetails },
    { name: "Wallet", path: "/wallet/collection", Component: Collections },

    { name: "Purchase", path: "/wallet/listings/:tenantId/:listingId/purchase/:confirmationId/success", Component: WalletPurchase },
    { name: "Purchase", path: "/wallet/listings/:tenantId/:listingId/purchase/:confirmationId/cancel", Component: WalletPurchase },
    { name: "Purchase", path: "/wallet/listings/:tenantId/:listingId/purchase/:confirmationId", Component: WalletPurchase },
    { path: "/wallet", Component: () => <Redirect to={`${match.path}/collection`} />, noBreadcrumb: true}
  ];
};

const Wallet = observer(() => {
  const match = useRouteMatch();

  if(rootStore.hideGlobalNavigation && rootStore.specifiedMarketplaceId) {
    return <Redirect to={UrlJoin("/marketplace", rootStore.specifiedMarketplaceId, "store")} />;
  }

  return (
    <div className="page-container wallet-page">
      <div className="content">
        <Switch>
          {
            Routes(match).map(({path, Component}) =>
              <Route exact path={path} key={`wallet-route-${path}`}>
                <WalletWrapper>
                  <Component/>
                </WalletWrapper>
              </Route>
            )
          }
        </Switch>
      </div>
    </div>
  );
});

export default Wallet;
