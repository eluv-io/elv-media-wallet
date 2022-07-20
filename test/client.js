import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {PageLoader} from "Components/common/Loaders";


/*
let network = "main";
let mode = "staging";
let marketplaceParams = {
  tenantSlug: "bcl",
  marketplaceSlug: "maskverse-marketplace"
};
 */

let network = "demo";
let mode = "staging";
let marketplaceParams = {
  tenantSlug: "bcl-live",
  marketplaceSlug: "masked-singer-marketplace"
};

const AuthSection = ({walletClient, setResults}) => {
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
          <button onClick={() => LogIn({method: "popup"})}>
            Popup
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="section">
        <h2>Logged In as { walletClient.UserInfo()?.email || walletClient.UserAddress() }</h2>
        <div className="button-row">
          <button onClick={() => LogOut()}>
            Log Out
          </button>
        </div>
      </div>
      <div className="button-row">
        <button onClick={async () => setResults(`Signed message 'Test': ${await walletClient.PersonalSign({message: "test"})}`)}>
          Personal Sign
        </button>
      </div>
    </>
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
        if(window.location.hostname.startsWith("192") || window.location.hostname.startsWith("elv-test")) {
          let appUrl = new URL(window.location.origin);
          appUrl.port = "8090";
          client.appUrl = appUrl.toString();
        }

        window.client = client;

        // Replace CanSign method to force popup flow for personal sign with custodial wallet user
        walletClient.CanSign = () => walletClient.loggedIn && walletClient.UserInfo().walletName.toLowerCase() === "metamask";

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

      <AuthSection walletClient={walletClient} setResults={setResults} />

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
