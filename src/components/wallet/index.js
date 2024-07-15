import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {
  Switch,
  Route,
  Redirect, useRouteMatch,
} from "react-router-dom";

import {rootStore} from "Stores/index";

//import UrlJoin from "url-join";
import RenderRoutes from "Routes";
import MarketplaceBrowser, {MediaPropertiesBrowser} from "Components/marketplace/MarketplaceBrowser";
import Header from "Components/header/Header";
import UrlJoin from "url-join";

const WalletWrapper = ({children}) => {
  useEffect(() => {
    rootStore.ClearMarketplace();
  }, []);

  return children;
};

const GlobalWrapper = ({children}) => {
  const match = useRouteMatch();

  useEffect(() => {
    rootStore.ClearMarketplace();
    rootStore.SetRouteParams(match.params);
  }, [match.params]);


  if(rootStore.domainProperty && match.url === "/") {
    if(["localhost", "contentfabric.io"].includes(location.hostname)) {
      rootStore.ClearDomainCustomization();
    } else {
      return <Redirect to={UrlJoin("/", rootStore.domainProperty)}/>;
    }
  }

  return children;
};

const Wallet = observer(() => {
  if(rootStore.hideGlobalNavigation && rootStore.specifiedMarketplaceId) {
    //return <Redirect to={UrlJoin("/marketplace", rootStore.specifiedMarketplaceId, "store")} />;
  }

  return (
    <div className="page-container">
      <Header key="header" />

      <Switch>
        <Route path="/wallet" exact>
          <Redirect to="/" />
        </Route>

        <Route path="/marketplaces" exact>
          <GlobalWrapper>
            <MarketplaceBrowser />
          </GlobalWrapper>
        </Route>

        <Route path="/" exact>
          <GlobalWrapper>
            <MediaPropertiesBrowser />
          </GlobalWrapper>
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
