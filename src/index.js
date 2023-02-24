import "Assets/fonts/fonts.css";
import "Assets/stylesheets/app.scss";

import React, {lazy, Suspense, useEffect, useState} from "react";
import UrlJoin from "url-join";
import { render } from "react-dom";
import { observer} from "mobx-react";

import { rootStore } from "Stores/index.js";
import Header from "Components/header/Header";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));

if(searchParams.has("n")) {
  rootStore.ToggleNavigation(false);
}

import {
  useHistory,
  HashRouter,
  Switch,
  Route,
  Redirect, useRouteMatch
} from "react-router-dom";
import Login from "Components/login/index";
import ScrollToTop from "Components/common/ScrollToTop";
import { InitializeListener } from "Components/interface/Listener";
import {ErrorBoundary} from "Components/common/ErrorBoundary";
import {PageLoader} from "Components/common/Loaders";
import Modal from "Components/common/Modal";
import Flows from "Components/interface/Flows";
import Actions from "Components/interface/Actions";

const WalletRoutes = lazy(() => import("Components/wallet/index"));
const MarketplaceRoutes = lazy(() => import("Components/marketplace/index"));

const DebugFooter = observer(() => {
  if(!EluvioConfiguration["show-debug"]) { return null; }

  return (
    <>
      <div className="debug-footer">
        <div>{ EluvioConfiguration.version }</div>
        <div>{ EluvioConfiguration.network === "demo" ? "Demo Network" : "Production Network" }</div>
        <div>Deployed { new Date(EluvioConfiguration["deployed-at"] || Date.now()).toLocaleString("en-US", {year: "numeric", month: "long", weekday: "long", hour: "numeric", minute: "numeric", second: "numeric" }) }</div>
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

// Given a tenant/marketplace slug, redirect to the proper marketplace
const MarketplaceSlugRedirect = observer(() => {
  const match = useRouteMatch();

  if(!rootStore.loaded) { return <PageLoader />; }

  const marketplaceInfo = rootStore.walletClient.MarketplaceInfo({
    marketplaceParams: {
      tenantSlug: match.params.tenantSlug,
      marketplaceSlug: match.params.marketplaceSlug
    }
  });

  if(!marketplaceInfo) {
    return <Redirect to="/marketplaces" />;
  }

  return <Redirect to={UrlJoin("/marketplace", marketplaceInfo.marketplaceId, match.params.location || "store")} />;
});

const LoginModal = observer(() => {
  if(!rootStore.showLogin || rootStore.loggedIn) { return null; }

  return (
    <Modal
      className="login-modal"
      closeable={!rootStore.loginOnly && (!rootStore.requireLogin || rootStore.loggedIn)}
      Toggle={rootStore.requireLogin ? undefined : () => rootStore.HideLogin()}
      //noFade={rootStore.requireLogin}
    >
      <Login key="login-main" Close={rootStore.requireLogin ? undefined : () => rootStore.HideLogin()} />
    </Modal>
  );
});

const Routes = observer(() => {
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
        <ErrorBoundary className="page-container wallet-page">
          <Switch>
            <Route exact path="/marketplaces/redirect/:tenantSlug/:marketplaceSlug/:location?">
              <MarketplaceSlugRedirect />
            </Route>
            <Route path="/login">
              <Login />
            </Route>
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
            <Route path="/marketplaces">
              <Suspense fallback={<PageLoader />}>
                <WalletRoutes />
              </Suspense>
            </Route>
            <Route path="/marketplace">
              <Suspense fallback={<PageLoader />}>
                <MarketplaceRoutes />
              </Suspense>
            </Route>
            <Route path="/profile">
              <Redirect to="/wallet/profile" />
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
  const history = useHistory();
  const [hasBackgroundImage, setHasBackgroundImage] = useState(false);

  useEffect(() => InitializeListener(history), []);

  useEffect(() => {
    if(!rootStore.loaded) { return; }

    const backgroundElement = document.querySelector("#app-background");

    let backgroundImage = (rootStore.pageWidth < 800 && rootStore.appBackground.mobile) || rootStore.appBackground.desktop || "";

    if(rootStore.navigationInfo.navigationKey === "marketplace") {
      backgroundImage = (rootStore.pageWidth < 800 && rootStore.appBackground.marketplaceMobile) || rootStore.appBackground.marketplaceDesktop || backgroundImage;
    }

    const currentBackground = backgroundElement.style.backgroundImage || "";
    const currentBackgroundImageUrl = ((currentBackground || "").split("contentfabric.io")[1] || "").split("?")[0];
    const newBackgroundImageUrl = ((backgroundImage || "").split("contentfabric.io")[1] || "").split("?")[0];

    if(newBackgroundImageUrl !== currentBackgroundImageUrl) {
      if(backgroundImage) {
        backgroundElement.style.background = `no-repeat top center / cover url("${backgroundImage}")`;
        document.querySelector("#app").style.background = "transparent";
        rootStore.SetSessionStorage("current-background", backgroundImage);
      } else {
        backgroundElement.style.removeProperty("background");
        rootStore.RemoveSessionStorage("current-background");
      }
    }

    setHasBackgroundImage(!!backgroundImage);
  }, [rootStore.loaded, rootStore.appBackground, rootStore.pageWidth, rootStore.navigationInfo]);

  if(rootStore.loginOnly) {
    return <Redirect to="/login" />;
  }

  const hasHeader = !rootStore.hideNavigation && (!rootStore.sidePanelMode || rootStore.navigationBreadcrumbs.length > 2);
  return (
    <div
      key={`app-${rootStore.loggedIn}`}
      className={[
        "app-container",
        hasBackgroundImage ? "app-container--transparent" : "",
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

render(
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

        <Route path="/login">
          <div className="login-page-container">
            <Login />
          </div>
        </Route>

        { /* All other routes */ }
        <Route>
          <App/>
          <LoginModal />
        </Route>
      </Switch>
    </HashRouter>
  </React.StrictMode>,
  document.getElementById("app")
);
