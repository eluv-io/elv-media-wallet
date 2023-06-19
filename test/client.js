import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {PageLoader} from "Components/common/Loaders";


const listingId = "b24e5837-2396-41f6-9104-b7a434ab006f";
const sku = "5P4nJK7Mhpzw94X92aNK64";

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

// Use locally running wallet app if running from local IP
let walletAppUrl;
if(window.location.hostname === "core.test.contentfabric.io") {
  walletAppUrl = network === "demo" ?
    "https://core.test.contentfabric.io/wallet-demo" :
    "https://core.test.contentfabric.io/wallet";
} else {
  const url = new URL(window.location.origin);
  url.port = "8090";

  walletAppUrl = url.toString();
}

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
        <button
          onClick={async () => {
            await walletClient.PurchaseItem({
              marketplaceParams,
              sku,
              successUrl: window.location.href,
              cancelUrl: window.location.href
            });
          }}
        >
          Purchase Item
        </button>
        <button
          onClick={async () => {
            await walletClient.PurchaseListing({
              marketplaceParams,
              listingId,
              successUrl: window.location.href,
              cancelUrl: window.location.href
            });
          }}
        >
          Purchase Listing
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
        client.appUrl = walletAppUrl;

        window.client = client;

        // Replace CanSign method to force popup flow for personal sign with custodial wallet user
        client.CanSign = () => client.loggedIn && client.UserInfo().walletName.toLowerCase() === "metamask";

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

  const params = new URLSearchParams(window.location.search);
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
        {
          params.has("confirmationId") ?
            <button
              onClick={async () => {
                if(params.get("confirmationId").startsWith("T-")) {
                  setResults(
                    await walletClient.ListingPurchaseStatus({listingId, confirmationId: params.get("confirmationId")})
                  );
                } else {
                  setResults(
                    await walletClient.PurchaseStatus({marketplaceParams, confirmationId: params.get("confirmationId")})
                  );
                }
              }}
            >
              Purchase Status
            </button> : null
        }
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
