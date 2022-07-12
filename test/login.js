import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {ElvWalletFrameClient} from "../client/src/index";

let network = "main";
let mode = "staging";
let marketplaceParams = {
  tenantSlug: "bcl",
  marketplaceSlug: "maskverse-marketplace"
};

// Use locally running wallet app if running from local IP
let walletAppUrl;
if(window.location.hostname === "core.test.contentfabric.io") {
  walletAppUrl = "https://core.test.contentfabric.io/wallet";
} else {
  const url = new URL(window.location.origin);
  url.port = "8090";

  walletAppUrl = url.toString();
}

const searchParams = new URLSearchParams(window.location.search);

const AuthSection = ({walletClient, frameClient, callbackUrl}) => {
  const [loggedIn, setLoggedIn] = useState(walletClient.loggedIn);

  const LogIn = async ({method}) => {
    await walletClient.LogIn({
      method,
      callbackUrl,
      marketplaceParams,
      clearLogin: true
    });

    if(method !== "redirect") {
      setLoggedIn(true);
    }
  };

  const LogOut = async () => {
    await walletClient.LogOut();

    setLoggedIn(false);
  };

  // When user requests login in the frame or signs out in the frame, handle it in the wallet client
  useEffect(() => {
    if(!frameClient) { return; }
    frameClient.AddEventListener(
      frameClient.EVENTS.LOG_IN_REQUESTED,
      () => LogIn({method: "redirect"})
    );

    frameClient.AddEventListener(
      frameClient.EVENTS.LOG_OUT,
      () => LogOut()
    );
  }, [frameClient]);

  // When the auth state of the wallet client changes, update the frame client
  useEffect(() => {
    if(!frameClient) { return; }

    if(loggedIn) {
      frameClient.SignIn({
        clientAuthToken: walletClient.ClientAuthToken()
      });
    } else {
      frameClient.SignOut();
    }
  }, [loggedIn, frameClient]);

  if(!loggedIn) {
    return (
      <div className="section">
        <h2>Login</h2>
        <div className="button-row">
          <button onClick={() => LogIn({method: "redirect"})}>
            Redirect
          </button>
          <button onClick={() => LogIn({method: "tab"})}>
            New Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>Logged in as { walletClient.UserInfo()?.email || walletClient.UserAddress() }</h2>
      <div className="button-row">
        <button onClick={() => LogOut()}>
          Log Out
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [loginMode, setLoginMode] = useState(searchParams.get("login-mode") || "frame");
  const [walletClient, setWalletClient] = useState(undefined);
  const [frameClient, setFrameClient] = useState(undefined);

  let callbackUrl = new URL(window.location.href);
  callbackUrl.searchParams.set("login-mode", loginMode);

  useEffect(() => {
    if(frameClient) {
      frameClient.Destroy();
    }

    setWalletClient(undefined);
    setFrameClient(undefined);

    if(loginMode !== "frame") {
      ElvWalletClient.Initialize({
        network,
        mode
      })
        .then(client => {
          if(walletAppUrl) {
            client.appUrl = walletAppUrl.toString();
          }

          window.walletClient = client;

          setWalletClient(client);
        });
    }

    if(loginMode !== "client") {
      ElvWalletFrameClient.InitializeFrame({
        walletAppUrl: walletAppUrl ? walletAppUrl.toString() : undefined,
        requestor: "Eluvio Login Test",
        target: "wallet-target",
        // If using wallet client, capture login requests from app
        captureLogin: loginMode !== "frame",
        ...(marketplaceParams || {})
      })
        .then(client => {
          window.frameClient = client;

          setFrameClient(client);
        });
    }
  }, [loginMode]);

  let description, use, clients;
  switch(loginMode) {
    case "frame":
      description = "Login is handled entirely by the embedded frame. When the user logs in in the wallet app, it will initialize a popup to the wallet app, the user will go through the login flow, and authorization information will be passed back to the embedded frame. This authorization info can not be intercepted or retrieved by the containing page.";
      use = "Use this method if you only want to embed the Eluvio Media Wallet app and do not want to use the Eluvio Wallet Client.";
      clients = <><code>frameClient</code> is available in the browser console</>;
      break;

    case "frame-and-client":
      description = "Login is handled using a custom UI in the containing page via the Eluvio Wallet Client. Logins triggered in the embedded wallet app are captured via the frame client event listener and used to initiate the login flow in the containing site. The login flow can be done via a redirect to or a popup to the wallet application. Upon completion of the login flow, the authorization information is returned to the wallet client (via URL parameter in the redirect flow, or via message in the popup flow), then the authorization info is passed to the embedded wallet app via the frame client.";
      use = "Use this method if you want to use the Eluvio Wallet Client and want to present a custom login form on your site.";
      clients = <><code>walletClient</code> and <code>frameClient</code> are available in the browser console</>;
      break;

    case "client":
      description = "Login is handled using a custom UI in the containing page via the Eluvio Wallet Client. The login flow can be done via a redirect to or a popup to the wallet application. Upon completion of the login flow, the authorization information is returned to the wallet client (via URL parameter in the redirect flow, or via message in the popup flow)";
      use = "Use this method if you only want to use the Eluvio Wallet Client.";
      clients = <><code>walletClient</code> is available in the browser console</>;
      break;
  }


  return (
    <div className="page-container">
      <h1>Wallet Client Login</h1>

      <div className="button-row">
        <select
          value={loginMode}
          onChange={event => {
            setLoginMode(event.target.value);

            const url = new URL(window.location.href);
            url.searchParams.set("login-mode", event.target.value);
            window.history.replaceState("", "", url.toString());
          }}
        >
          <option value="frame">Login Mode: Frame Only</option>
          <option value="frame-and-client">Login Mode: Client and Frame</option>
          <option value="client">Login Mode: Client Only</option>
        </select>
      </div>

      <div className="description">
        { description }
      </div>
      <div className="description">
        { use }
      </div>
      <div className="description">
        { clients }
      </div>

      {
        loginMode !== "frame" && walletClient ?
          <AuthSection walletClient={walletClient} frameClient={frameClient} callbackUrl={callbackUrl.toString()}/> :
          null
      }

      <div id="wallet-target" className="wallet-target" />
    </div>
  );
};

render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));
