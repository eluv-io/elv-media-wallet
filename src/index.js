import "Assets/stylesheets/app.scss";

import AsyncComponent from "Components/common/AsyncComponent";

import React from "react";
import {render} from "react-dom";
import { observer} from "mobx-react";

import { rootStore } from "Stores/index.js";
import Header from "Components/Header";
import Navigation from "Components/Navigation";

import {
  HashRouter,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import Wallet from "Components/wallet";

const Placeholder = ({text}) => <div>{ text }</div>;

const Routes = () => {
  return (
    <Switch>
      <Route path="/discover">
        <Placeholder text={"Discover"} />
      </Route>
      <Route path="/wallet">
        <Wallet />
      </Route>
      <Route path="/profile">
        <Placeholder text={"Profile"} />
      </Route>
      <Route path="/">
        <Redirect to="/wallet" />
      </Route>
    </Switch>
  );
};

const App = observer(() => {
  return (
    <HashRouter>
      <div className={`app-container ${rootStore.initialized ? "app-container-initialized" : "app-container-not-initialized"}`}>
        <Header />
        <AsyncComponent
          Load={() => rootStore.InitializeClient()}
          render={Routes}
        />
        <Navigation />
      </div>
    </HashRouter>
  );
});


render(<App />, document.getElementById("app"));
