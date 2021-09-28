import "Assets/stylesheets/app.scss";

import React, { useEffect } from "react";
import UrlJoin from "url-join";
import { render } from "react-dom";
import { observer} from "mobx-react";

import { rootStore } from "Stores/index.js";
import Header from "Components/Header";
import Navigation from "Components/Navigation";

if(
  new URLSearchParams(window.location.search).has("d") ||
  !rootStore.embedded && sessionStorage.getItem("dark-mode")
) {
  rootStore.ToggleDarkMode(true);
}

if(new URLSearchParams(window.location.search).has("n")) {
  rootStore.ToggleNavigation(false);
}

import {
  useHistory,
  HashRouter,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import Wallet from "Components/wallet";
import Login from "Components/login";
import Profile from "Components/profile";
import ScrollToTop from "Components/common/ScrollToTop";
import { InitializeListener } from "Components/interface/Listener";
import { Auth0Provider } from "@auth0/auth0-react";
import MarketplaceRoutes from "Components/marketplace";
import {ErrorBoundary} from "Components/common/ErrorBoundary";

const Placeholder = ({ text }) => <div>{text}</div>;

const Routes = () => {
  const history = useHistory();

  useEffect(() => InitializeListener(history));

  if(!rootStore.loggedIn) {
    return (
      <Switch>
        <Login />
      </Switch>
    );
  }

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
      <Route path="/marketplaces">
        <MarketplaceRoutes />
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
      <div className={`app-container ${rootStore.initialized ? "app-container-initialized" : "app-container-not-initialized"} ${rootStore.hideNavigation ? "navigation-hidden" : ""} ${rootStore.sidePanelMode ? "side-panel" : ""}`}>
        <Header />
        <ScrollToTop>
          <ErrorBoundary className="page-container">
            <Routes />
          </ErrorBoundary>
        </ScrollToTop>
        <Navigation />
      </div>
    </HashRouter>
  );
});

if(!rootStore.embedded) {
  render(
    <Auth0Provider
      domain={EluvioConfiguration["auth0-domain"]}
      clientId={EluvioConfiguration["auth0-configuration-id"]}
      redirectUri={UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, "")}
      useRefreshTokens
      darkMode={rootStore.darkMode}
    >
      <React.StrictMode>
        <App/>
      </React.StrictMode>
    </Auth0Provider>,
    document.getElementById("app")
  );
} else {
  render(
    <React.StrictMode>
      <App/>
    </React.StrictMode>,
    document.getElementById("app")
  );
}
