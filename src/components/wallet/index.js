import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

import {rootStore} from "Stores/index";

import UrlJoin from "url-join";
import RenderRoutes from "Routes";
import MarketplaceBrowser from "Components/marketplace/MarketplaceBrowser";

const WalletWrapper = ({children}) => {
  useEffect(() => {
    rootStore.ClearMarketplace();
  });

  return children;
};

const Wallet = observer(() => {
  if(rootStore.hideGlobalNavigation && rootStore.specifiedMarketplaceId) {
    return <Redirect to={UrlJoin("/marketplace", rootStore.specifiedMarketplaceId, "store")} />;
  }

  return (
    <div className="page-container error-page">
      <Switch>
        <Route path="/wallet" exact>
          <Redirect to="/marketplaces" />
        </Route>

        <Route path="/marketplaces" exact>
          <MarketplaceBrowser />
        </Route>

        <RenderRoutes
          routeList="wallet"
          basePath="/wallet"
          Wrapper={WalletWrapper}
        />
      </Switch>
    </div>
  );
});

export default Wallet;
