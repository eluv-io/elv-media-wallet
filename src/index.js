import "Assets/fonts/fonts.css";
import "Assets/stylesheets/app.scss";

import React, { lazy, Suspense, useEffect } from "react";
import UrlJoin from "url-join";
import { render } from "react-dom";
import { observer} from "mobx-react";

import { rootStore } from "Stores/index.js";
import Header from "Components/Header";

const searchParams = new URLSearchParams(window.location.search);

let sessionStorageAvailable = false;
try {
  sessionStorage.getItem("test");
  sessionStorageAvailable = true;
// eslint-disable-next-line no-empty
} catch(error) {}

if(searchParams.has("n")) {
  rootStore.ToggleNavigation(false);
}

let newWindowAuth0Login = false;
try {
  newWindowAuth0Login =
    searchParams.has("l") ||
    sessionStorage.getItem("new-window-login");
// eslint-disable-next-line no-empty
} catch(error) {}

import {
  useHistory,
  HashRouter,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import Login from "./login/Login";
import ScrollToTop from "Components/common/ScrollToTop";
import { InitializeListener } from "Components/interface/Listener";
import {Auth0Provider, useAuth0} from "@auth0/auth0-react";
import {ErrorBoundary} from "Components/common/ErrorBoundary";
import {PageLoader} from "Components/common/Loaders";
import Modal from "Components/common/Modal";
import {LoginRedirectGate} from "Components/common/LoginGate";
import Flows from "Components/interface/Flows";
import Actions from "Components/interface/Actions";

const WalletRoutes = lazy(() => import("Components/wallet/index"));
const MarketplaceRoutes = lazy(() => import("Components/marketplace/index"));
const Profile = lazy(() => import("Components/profile"));

const DebugFooter = observer(() => {
  if(!EluvioConfiguration["show-debug"]) { return null; }

  return (
    <>
      <div className="debug-footer">
        <div>{ EluvioConfiguration.version }</div>
        <div>{ EluvioConfiguration["config-url"].includes("demov3") ? "Demo Network" : "Production Network" }</div>
        <div>Deployed { new Date(EluvioConfiguration["deployed-at"] || Date.now()).toLocaleString(navigator.languages, {year: "numeric", month: "long", weekday: "long", hour: "numeric", minute: "numeric", second: "numeric" }) }</div>
      </div>
      {
        rootStore.DEBUG_ERROR_MESSAGE ?
          <pre className="debug-error-message">
            { rootStore.DEBUG_ERROR_MESSAGE }
          </pre> : null
      }
    </>
  );
});

const RedirectHandler = ({storageKey}) => {
  if(!rootStore.embedded && rootStore.GetSessionStorage(storageKey)) {
    return <Redirect to={rootStore.GetSessionStorage(storageKey)} />;
  }

  return null;
};

const LoginModal = observer(() => {
  if(newWindowAuth0Login) {
    // Window has been opened specifically to log in to auth0 in native frame
    return (
      <Login
        key="login-window"
        silent
        darkMode={rootStore.darkMode}
        Loaded={() => rootStore.SetLoginLoaded()}
        LoadCustomizationOptions={async () => ({})}
        SignIn={async params => await rootStore.Authenticate({...params, silent: true})}
        SignOut={async returnURL => await rootStore.SignOut(returnURL)}
      />
    );
  }

  if(rootStore.loggedIn && !rootStore.loginOnly) {
    return null;
  }

  if(rootStore.showLogin || rootStore.loginOnly) {
    const redirectUrl = new URL(UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, ""));
    redirectUrl.hash = window.location.hash;

    if(rootStore.requireLogin) {
      redirectUrl.searchParams.set("rl", "");
    }

    if(rootStore.loginOnly) {
      redirectUrl.searchParams.set("lo", "");
    }

    return (
      <Modal
        className="login-modal"
        Toggle={rootStore.requireLogin ? undefined : () => rootStore.HideLogin()}
        noFade={rootStore.requireLogin}
      >
        <Login
          key="login-main"
          darkMode={rootStore.darkMode}
          callbackUrl={redirectUrl.toString()}
          authenticating={rootStore.authenticating || rootStore.loggedIn}
          signedIn={rootStore.loggedIn}
          Loaded={() => rootStore.SetLoginLoaded()}
          LoadCustomizationOptions={async () => await rootStore.LoadLoginCustomization()}
          SignIn={async params => await rootStore.Authenticate(params)}
          Close={rootStore.requireLogin ? undefined : () => rootStore.HideLogin()}
        />
      </Modal>
    );
  } else {
    // Load component silently by default - handles auth0 logged-in case
    return (
      <Login
        key="login-silent"
        silent
        darkMode={rootStore.darkMode}
        Loaded={() => rootStore.SetLoginLoaded()}
        LoadCustomizationOptions={async () => await rootStore.LoadLoginCustomization()}
        SignIn={async params => await rootStore.Authenticate(params)}
      />
    );
  }
});

const Routes = observer(() => {
  const history = useHistory();

  useEffect(() => InitializeListener(history), []);

  if(rootStore.loginOnly) {
    return null;
  }

  if(!rootStore.loaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Header />
      <ScrollToTop>
        <ErrorBoundary className="page-container">
          <Switch>
            <Route exact path="/success">
              <RedirectHandler storageKey="successPath" />
            </Route>
            <Route exact path="/cancel">
              <RedirectHandler storageKey="cancelPath" />
            </Route>
            <Route path="/wallet">
              <Suspense fallback={<PageLoader />}>
                <WalletRoutes />
              </Suspense>
            </Route>
            <Route path="/profile">
              <LoginRedirectGate to="/marketplaces">
                <Suspense fallback={<PageLoader />}>
                  <Profile />
                </Suspense>
              </LoginRedirectGate>
            </Route>
            <Route path="/marketplaces">
              <Suspense fallback={<PageLoader />}>
                <MarketplaceRoutes />
              </Suspense>
            </Route>
            <Route path="/marketplace">
              <Suspense fallback={<PageLoader />}>
                <MarketplaceRoutes />
              </Suspense>
            </Route>
            <Route path="/">
              <Redirect to="/marketplaces" />
            </Route>
          </Switch>
        </ErrorBoundary>
      </ScrollToTop>
    </>
  );
});



const App = observer(() => {
  if(sessionStorageAvailable) {
    window.auth0 = useAuth0();
  }

  if(newWindowAuth0Login) {
    return (
      <>
        <PageLoader />
        <LoginModal />
      </>
    );
  }

  useEffect(() => {
    if(!rootStore.loaded) { return; }

    const backgroundElement = document.querySelector("#app-background");

    const backgroundImage = (rootStore.pageWidth < 800 && rootStore.appBackground.mobile) || rootStore.appBackground.desktop || "";

    const currentBackground = backgroundElement.style.backgroundImage || "";
    const currentBackgroundImageUrl = ((currentBackground || "").split("contentfabric.io")[1] || "").split("?")[0];
    const newBackgroundImageUrl = ((backgroundImage || "").split("contentfabric.io")[1] || "").split("?")[0];

    if(newBackgroundImageUrl !== currentBackgroundImageUrl) {
      if(backgroundImage) {
        backgroundElement.style.background = `no-repeat top center / cover url("${backgroundImage}")`;
      } else {
        backgroundElement.style.removeProperty("background");
      }
    }
  }, [rootStore.loaded, rootStore.appBackground]);

  const hasHeader = !rootStore.hideNavigation && (!rootStore.sidePanelMode || rootStore.navigationBreadcrumbs.length > 2);
  return (
    <div
      key={`app-${rootStore.loggedIn}`}
      className={[
        "app-container",
        rootStore.centerContent ? "app--centered" : "",
        rootStore.hideNavigation ? "navigation-hidden" : "",
        rootStore.sidePanelMode ? "side-panel" : "",
        hasHeader ? "" : "no-header",
        rootStore.activeModals > 0 ? "modal-active" : ""
      ]
        .filter(className => className)
        .join(" ")
      }
    >
      <Routes />
      <DebugFooter />
    </div>
  );
});

if(sessionStorageAvailable) {
  render(
    <Auth0Provider
      domain={EluvioConfiguration["auth0-domain"]}
      clientId={EluvioConfiguration["auth0-configuration-id"]}
      redirectUri={UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, "")}
      useRefreshTokens
      darkMode={rootStore.darkMode}
    >
      <React.StrictMode>
        <HashRouter>
          <Switch>

            { /* Handle various popup actions */ }
            <Route path="/flow/:flow/:parameters">
              <Flows />
            </Route>

            <Route path="/action/:action/:parameters">
              <Actions />
            </Route>

            { /* All other routes */ }
            <Route>
              <App/>
              <LoginModal />
            </Route>
          </Switch>
        </HashRouter>
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
