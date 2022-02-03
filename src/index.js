import "Assets/stylesheets/app.scss";

import React, { useEffect, useState } from "react";
import UrlJoin from "url-join";
import { render } from "react-dom";
import { observer} from "mobx-react";

import { rootStore } from "Stores/index.js";
import Header from "Components/Header";
import {Navigation} from "Components/Navigation";

if(
  new URLSearchParams(window.location.search).has("d") ||
  !rootStore.embedded && rootStore.GetSessionStorage("dark-mode")
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
  Redirect, useLocation
} from "react-router-dom";
import Wallet from "Components/wallet";
import Login from "Components/login";
import Profile from "Components/profile";
import ScrollToTop from "Components/common/ScrollToTop";
import { InitializeListener } from "Components/interface/Listener";
import { Auth0Provider } from "@auth0/auth0-react";
import MarketplaceRoutes from "Components/marketplace";
import {ErrorBoundary} from "Components/common/ErrorBoundary";
import {PageLoader} from "Components/common/Loaders";

const DebugFooter = () => {
  if(!EluvioConfiguration["show-debug"]) { return null; }

  return (
    <div className="debug-footer">
      <div>{ EluvioConfiguration.version }</div>
      <div>{ EluvioConfiguration["config-url"].includes("demov3") ? "Demo Network" : "Production Network" }</div>
      <div>Deployed { new Date(EluvioConfiguration["deployed-at"] || Date.now()).toLocaleString(navigator.languages, {year: "numeric", month: "long", weekday: "long", hour: "numeric", minute: "numeric", second: "numeric" }) }</div>
    </div>
  );
};

const Placeholder = ({ text }) => <div>{text}</div>;

const RedirectHandler = ({storageKey}) => {
  if(!rootStore.embedded && rootStore.GetSessionStorage(storageKey)) {
    return <Redirect to={rootStore.GetSessionStorage(storageKey)} />;
  }

  return null;
};

const Routes = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    // Automatically redirect to the intended path, unless opened from an embed window or returning from a purchase
    if(
      rootStore.GetSessionStorage("intendedPath") &&
      !rootStore.fromEmbed &&
      !["/success", "/cancel", "/redirect", "/withdrawal-setup-complete"].includes(history.location.pathname)
    ) {
      history.replace(rootStore.GetSessionStorage("intendedPath"));
    }

    InitializeListener(history);
  }, []);

  useEffect(() => {
    rootStore.SetSessionStorage("intendedPath", location.pathname);
  }, [location.pathname]);

  const RedirectLoading = () => {
    // Safari + stripe has a weird bug in the onboarding flow where it redirects back to /redirect instead of /withdrawal-setup-complete
    // If we've been redirected already in this tab, we must have been sent back here.
    const [returned, setReturned] = useState(false);
    useEffect(() => {
      if(rootStore.GetSessionStorage("redirected")) {
        rootStore.RemoveSessionStorage("redirected");
        setReturned(true);
      } else {
        rootStore.SetSessionStorage("redirected");
      }
    });

    if(returned) {
      return <SetupComplete />;
    }

    return <PageLoader />;
  };

  const SetupComplete = () => {
    window.close();

    return (
      <div className="page-container setup-complete">
        <h1 className="setup-complete__message">
          Setup complete. You can now close this page.
        </h1>
      </div>
    );
  };

  if(location.pathname.startsWith("/withdrawal") || location.pathname === "/redirect") {
    return (
      <Switch>
        <Route exact path="/redirect">
          <RedirectLoading />
        </Route>
        <Route exact path="/withdrawal-setup-complete">
          <SetupComplete />
        </Route>
      </Switch>
    );
  }

  if(!rootStore.loggedIn) {
    return (
      <Switch>
        <Login />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route exact path="/success">
        <RedirectHandler storageKey="successPath" />
      </Route>
      <Route exact path="/cancel">
        <RedirectHandler storageKey="cancelPath" />
      </Route>
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
      <Route path="/marketplace">
        <MarketplaceRoutes />
      </Route>
      <Route path="/">
        <Redirect to="/wallet" />
      </Route>
    </Switch>
  );
};

const App = observer(() => {
  const hasHeader = !rootStore.hideNavigation && (!rootStore.sidePanelMode || rootStore.navigationBreadcrumbs.length > 2);

  return (
    <HashRouter>
      <div
        className={[
          "app-container",
          rootStore.initialized ? "app-container-initialized" : "app-container-not-initialized",
          rootStore.hideNavigation ? "navigation-hidden" : "",
          rootStore.sidePanelMode ? "side-panel" : "",
          hasHeader ? "" : "no-header",
          rootStore.activeModals > 0 ? "modal-active" : "",
          rootStore.fromEmbed ? "popup-from-embedded" : ""
        ]
          .filter(className => className)
          .join(" ")
        }
      >
        <Header />
        { rootStore.DEBUG_ERROR_MESSAGE ? <pre className="debug-error-message">{ rootStore.DEBUG_ERROR_MESSAGE }</pre> : null }
        <ScrollToTop>
          <ErrorBoundary className="page-container">
            <Routes />
          </ErrorBoundary>
        </ScrollToTop>
        <Navigation />
        <DebugFooter />
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
