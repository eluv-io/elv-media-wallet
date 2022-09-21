import React, {useEffect} from "react";
import {rootStore} from "Stores/index";
import {Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";
import PreviewPasswordPrompt from "Components/login/PreviewPasswordPrompt";

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

          const passwordDigest = rootStore.marketplaces[match.params.marketplaceId]?.preview_password_digest;
          if(passwordDigest && (rootStore.walletClient.mode === "staging" || match.params.marketplaceId === rootStore.previewMarketplaceId)) {
            await PreviewPasswordPrompt({
              marketplaceId: match.params.marketplaceId,
              passwordDigest
            });
          }
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
