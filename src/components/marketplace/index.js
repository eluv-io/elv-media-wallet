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
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";

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

  useEffect(() => {
    if(match.params.marketplaceId) {
      rootStore.SetMarketplace({marketplaceId: match.params.marketplaceId});
    } else {
      rootStore.ClearMarketplace();
    }
  }, [match.url, rootStore.marketplaces[match.params.marketplaceId]]);

  if(!rootStore.loaded) {
    return <PageLoader />;
  }

  if(match.params.marketplaceId) {
    return (
      <AsyncComponent
        // Store info is cleared when logged in
        loadKey={`marketplace-${match.params.marketplaceId}-${rootStore.loggedIn}`}
        cacheSeconds={30}
        Load={async () => {
          await Promise.all([
            rootStore.LoadMarketplace(match.params.marketplaceId),
            rootStore.LoadNFTContractInfo()
          ]);
        }}
        loadingClassName="page-loader content"
      >
        { children }
      </AsyncComponent>
    );
  }

  return children;
});

const Marketplace = observer(() => {
  return (
    <div className="page-container marketplace-page">
      <Switch>
        <Route exact path="/marketplaces/redirect/:tenantSlug/:marketplaceSlug/:location?">
          <MarketplaceSlugRedirect />
        </Route>

        <RenderRoutes
          basePath="/marketplace/:marketplaceId"
          routeList="marketplace"
          Wrapper={MarketplaceWrapper}
        />
      </Switch>
    </div>
  );
});

export default Marketplace;
