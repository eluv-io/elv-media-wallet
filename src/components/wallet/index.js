import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {
  Switch,
  Route,
  Redirect,
  useRouteMatch
} from "react-router-dom";

import {rootStore} from "Stores/index";

import Collections from "Components/wallet/Collections";
import AsyncComponent from "Components/common/AsyncComponent";
import NFTDetails from "Components/wallet/NFTDetails";
import {PackOpenStatus} from "Components/marketplace/MintingStatus";

const WalletNavigation = observer(() => {
  return null;
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
  }, [match.url]);

  return (
    <AsyncComponent Load={async () => await rootStore.LoadWalletCollection()} loadingClassName="page-loader">
      { children }
    </AsyncComponent>
  );
});

const Routes = (match) => {
  const nft = rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId}) || { metadata: {} };

  return [
    { name: "Open Pack", path: "/wallet/collection/:contractId/:tokenId/open", Component: PackOpenStatus, hideNavigation: true },
    { name: nft.metadata.display_name, path: "/wallet/collection/:contractId/:tokenId", Component: NFTDetails },
    { name: "Wallet", path: "/wallet/collection", Component: Collections },
    { path: "/wallet", Component: () => <Redirect to={`${match.path}/collection`} />, noBreadcrumb: true}
  ];
};

const Wallet = observer(() => {
  const match = useRouteMatch();

  return (
    <div className="page-container wallet-page content">
      <WalletNavigation/>
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
  );
});

export default Wallet;
