import "Assets/stylesheets/app.scss";

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
import Login from "Components/login";
import Profile from "Components/profile";

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
        <Profile />
      </Route>
      <Route path="/">
        <Redirect to="/wallet" />
      </Route>
    </Switch>
  );
};

const App = observer(() => {
  if(!rootStore.loggedIn) {
    return <Login />;
  }

  return (
    <HashRouter>
      <div className={`app-container ${rootStore.initialized ? "app-container-initialized" : "app-container-not-initialized"}`}>
        <Header />
        <Routes />
        <Navigation />
      </div>
    </HashRouter>
  );
});


render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));
