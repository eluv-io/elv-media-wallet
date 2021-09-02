import React from "react";
import {observer} from "mobx-react";
import {
  Switch,
  Route,
  Redirect,
  useRouteMatch, NavLink
} from "react-router-dom";

import {rootStore} from "Stores/index";

import Collections from "Components/wallet/Collections";
import AsyncComponent from "Components/common/AsyncComponent";
import NFTDetails from "Components/wallet/NFTDetails";
import {PackOpenStatus} from "Components/marketplace/MintingStatus";

const WalletNavigation = observer(() => {
  return null;

  return (
    <nav className="sub-navigation wallet-navigation">
      <NavLink className="sub-navigation__link" to="/wallet/collections">My Collections</NavLink>
      <NavLink className="sub-navigation__link" to="/wallet/tickets">Tickets</NavLink>
      <NavLink className="sub-navigation__link" to="/wallet/tokens">Tokens</NavLink>
    </nav>
  );
});

const Placeholder = ({text}) => <div>{ text }</div>;

const Wallet = observer(() => {
  const match = useRouteMatch();

  return (
    <div className="page-container wallet-page">
      <WalletNavigation/>
      <div className="content">
        <Switch>
          <Route path={`${match.path}/tickets`}>
            <Placeholder text={"Tickets"} />
          </Route>

          <Route exact path={`${match.path}/collections/:contractId/:tokenId`}>
            <AsyncComponent
              key="async-component-collections-item"
              loadingClassName="page-loader"
              loadKey="NFTs"
              Load={async () => await rootStore.LoadWalletCollection()}
              render={() => <NFTDetails />}
            />
          </Route>

          <Route exact path={`${match.path}/collections/:contractId/:tokenId/open`}>
            <PackOpenStatus />
          </Route>

          <Route path={`${match.path}/collections`}>
            <AsyncComponent
              key="async-component-collections"
              loadingClassName="page-loader"
              loadKey="NFTs"
              Load={async () => await rootStore.LoadWalletCollection()}
              render={() => <Collections />}
            />
          </Route>

          <Route path={`${match.path}/tokens`}>
            <Placeholder text={"Tokens"} />
          </Route>

          <Route path={match.path}>
            <Redirect to={`${match.path}/collections`} />
          </Route>
        </Switch>
      </div>
    </div>
  );
});

export default Wallet;
