import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {PageLoader} from "Components/common/Loaders";


let network = "demo";
let mode = "staging";
let marketplaceParams = {
  tenantSlug: "bcl-live", //"wwe",
  marketplaceSlug: "masked-singer-marketplace" //"a30fb02b-290a-457f-bf70-76111e4e0027"
};

const AuthSection = ({walletClient}) => {
  const [loggedIn, setLoggedIn] = useState(walletClient.loggedIn);

  const LogIn = async ({method}) => {
    await walletClient.LogIn({
      method,
      callbackUrl: window.location.href,
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
          <button onClick={() => LogIn({method: "popup"})}>
            Popup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>Logged In as { walletClient.UserInfo()?.email || walletClient.UserAddress() }</h2>
      <div className="button-row">
        <button onClick={() => LogOut()}>
          Log Out
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [walletClient, setWalletClient] = useState(undefined);
  const [results, setResults] = useState(undefined);

  useEffect(() => {
    ElvWalletClient.Initialize({
      network,
      mode,
      //marketplaceParams
    })
      .then(client => {
        if(window.location.hostname.startsWith("192")) {
          let appUrl = new URL(window.location.origin);
          appUrl.port = "8090";
          client.appUrl = appUrl.toString();
        }

        window.client = client;

        setWalletClient(client);
      });
  }, []);

  if(!walletClient) {
    return (
      <div className="app">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Test Marketplace Client</h1>

      <AuthSection walletClient={walletClient} />

      <h2>Methods</h2>
      <div className="button-row">
        <button onClick={async () => setResults(await walletClient.Listings())}>
          Listings
        </button>
        <button onClick={async () => setResults(await walletClient.MarketplaceStock({marketplaceParams}))}>
          Stock
        </button>
      </div>

      {
        results ?
          <pre>
            {JSON.stringify(results, null, 2)}
          </pre> : null
      }
    </div>
  );
};

render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));
