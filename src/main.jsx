import "./Styles.js";

import React, {Suspense, useEffect, useState} from "react";
import { createRoot } from "react-dom/client";
import { observer} from "mobx-react";
import {MantineProvider} from "@mantine/core";
import MantineTheme from "./MantineTheme";

import { rootStore } from "@/stores/index.js";
import {
  Switch,
  Route,
  Redirect,
  BrowserRouter,
  useHistory
} from "react-router-dom";
import Login from "@/components/login/index";
import ScrollToTop from "@/components/common/ScrollToTop";
import {ErrorBoundary} from "@/components/common/ErrorBoundary";
import {PageLoader} from "@/components/common/Loaders";
import Modal from "@/components/common/Modal";
import Flows from "@/components/interface/Flows";
import Actions from "@/components/interface/Actions";
import {SearchParams} from "./utils/Utils";
import {PropertyRoutes, BundledPropertyRoutes} from "@/components/properties";
import ImageIcon from "@/components/common/ImageIcon";
import {SplashScreen} from "@/components/properties/Common";

import XIcon from "@/assets/icons/x.svg";
import MediaPropertiesBrowser from "./components/properties/MediaPropertiesBrowser.jsx";

const searchParams = SearchParams();

// TODO: Remove
if(Object.keys(searchParams).includes("openid")) {
  sessionStorage.setItem("openid", "true");
}

const DebugFooter = observer(() => {
  if(!EluvioConfiguration["show-debug"]) { return null; }

  return (
    <>
      <div className="debug-footer">
        <div>{ EluvioConfiguration.version }</div>
        <div>{ EluvioConfiguration.network === "demo" ? "Demo Network" : "Production Network" }</div>
        <div>Deployed { new Date(EluvioConfiguration["deployed-at"] || Date.now()).toLocaleString(rootStore.preferredLocale, {year: "numeric", month: "long", weekday: "long", hour: "numeric", minute: "numeric", second: "numeric" }) }</div>
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
  const history = useHistory();

  if(!rootStore.showLogin || rootStore.loggedIn) { return null; }

  const closable = !rootStore.loginOnly && (!!rootStore.loginBackPath || !rootStore.requireLogin || rootStore.loggedIn);
  const Close = () => {
    if(!closable) { return; }

    if(rootStore.loginBackPath) {
      history.push(rootStore.loginBackPath);
    }

    rootStore.HideLogin();
  };

  return (
    <Modal
      className="login-modal"
      closable={closable}
      Toggle={Close}
    >
      <Login key="login-main" Close={Close} />
    </Modal>
  );
});

const AlertNotification = observer(() => {
  if(!rootStore.alertNotification) { return null; }

  return (
    <div className="alert-notification">
      <div className="alert-notification__message">
        { rootStore.alertNotification }
      </div>
      <button onClick={() => rootStore.SetAlertNotification("")} className="alert-notification__close">
        <ImageIcon icon={XIcon} />
      </button>
    </div>
  );
});

const Routes = observer(() => {
  if(rootStore.loginOnly) {
    return null;
  }

  if(!rootStore.loaded && (location.pathname !== "/" || rootStore.isCustomDomain)) {
    return null;
  }

  return (
    <>
      <ScrollToTop>
        <ErrorBoundary className="page-container wallet-page">
          <Switch>
            <Route path="/login">
              <Login />
            </Route>
            <Route exact path="/success">
              <RedirectHandler storageKey="successPath" />
            </Route>
            <Route exact path="/cancel">
              <RedirectHandler storageKey="cancelPath" />
            </Route>
            <Route path="/p">
              <Suspense fallback={<PageLoader />}>
                <PropertyRoutes basePath="/p" />
              </Suspense>
            </Route>
            <Route path="/m">
              <Suspense fallback={<PageLoader />}>
                <BundledPropertyRoutes />
              </Suspense>
            </Route>
            <Route path="*">
              <Suspense fallback={<PageLoader />}>
                <PropertyRoutes basePath="/" />
              </Suspense>
            </Route>
          </Switch>
        </ErrorBoundary>
      </ScrollToTop>
    </>
  );
});

const App = observer(() => {
  const [showSplash, setShowSplash] = useState(rootStore.showSplash);
  const [hidingSplash, setHidingSplash] = useState(false);

  useEffect(() => {
    const route = rootStore.routeChange;
    if(route) {
      rootStore.SetRouteChange(undefined);
    }
  }, [rootStore.routeChange]);

  useEffect(() => {
    if(rootStore.showSplash) {
      setHidingSplash(false);
      setShowSplash(true);
    } else {
      setHidingSplash(true);

      setTimeout(() => {
        setShowSplash(false);
        setHidingSplash(false);
      }, 750);
    }
  }, [rootStore.showSplash]);

  if(rootStore.routeChange) {
    return <Redirect to={rootStore.routeChange} />;
  }

  if(rootStore.loginOnly) {
    return <Redirect to="/login" />;
  }

  return (
    <div
      key={`app-${rootStore.loggedIn}`}
      className={[
        "app-container",
        rootStore.centerContent ? "app--centered" : "",
        rootStore.hideNavigation ? "navigation-hidden" : "",
        rootStore.sidePanelMode ? "side-panel" : "",
        rootStore.activeModals > 0 ? "modal-active" : ""
      ]
        .filter(className => className)
        .join(" ")
      }
    >
      <AlertNotification />
      <Routes />
      <DebugFooter />
      {
        !showSplash ? null :
          <SplashScreen hiding={hidingSplash} />
      }
    </div>
  );
});

// Convert hash routes to browser routes
if(window.location.hash?.startsWith("#/")) {
  // Redirect from hash route
  let path = window.location.hash.replace("#/", "/");

  if(Object.keys(searchParams).length > 0) {
    path += `?${new URLSearchParams(searchParams).toString()}`;
  }

  history.replaceState("", document.title, path);
}

if(searchParams["code"] && sessionStorage.getItem("openid-callback-url")) {
  const url = new URL(sessionStorage.getItem("openid-callback-url"));
  // Preserve parameters
  new URLSearchParams(window.location.search)
    .forEach((value, key) =>
      url.searchParams.set(key, value)
    );

  window.location.href = url.toString();
} else {
  const root = createRoot(document.getElementById("app"));
  root.render(
    <React.StrictMode>
      <MantineProvider theme={MantineTheme} defaultColorScheme="dark" withCssVariables>
        <BrowserRouter>
          <Switch>
            { /* Handle various popup actions */}
            <Route exact path="/flow/:flow/:parameters">
              <Flows/>
            </Route>

            { /* Handle various UI based popup/redirect flows - Generic view */}
            <Route exact path="/action/:action/:parameters">
              <Actions/>
            </Route>

            <Route path="/login">
              <div className="login-page-container">
                <Login/>
              </div>
            </Route>

            <Route path="/verification">
              <div className="login-page-container">
                <Login/>
              </div>
            </Route>

            <Route path="/register">
              <div className="login-page-container">
                <Login/>
              </div>
            </Route>

            <Route path="/oidc">
              <div className="login-page-container">
                <Login/>
              </div>
            </Route>

            <Route path="/" exact>
              <MediaPropertiesBrowser />
            </Route>

            { /* All other routes */}
            <Route>
              <App/>
              <LoginModal/>
            </Route>
          </Switch>
        </BrowserRouter>
      </MantineProvider>
    </React.StrictMode>
  );
}

sessionStorage.removeItem("openid-callback-url");
