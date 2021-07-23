import "../../src/static/stylesheets/reset.scss";
import "./test.scss";

import React, { useState } from "react";
import {render} from "react-dom";

import { InitializeFrame, InitializePopup } from "../index";

window.client = undefined;

const appUrl = window.location.hostname === "localhost" ? "http://localhost:8090" : "https://core.test.contentfabric.io/elv-media-wallet";

const targetId = "wallet-target";

const SetResults = results => {
  document.getElementById("client-results").innerHTML = results ? JSON.stringify(results, null, 2) : "";
  window.scrollTo({
    top: document.getElementById("client-results").getBoundingClientRect().top + window.pageYOffset - 80,
    behavior: "smooth"
  });
};

const App = () => {
  const [client, setClient] = useState(undefined);

  const Destroy = () => {
    if(client) { client.Destroy(); }
    SetResults();

    setClient(undefined);
  };

  return (
    <div className="page-container">
      <h1>Test Wallet Client</h1>
      <div className="button-row">
        <button
          onClick={async () => {
            Destroy();

            setClient(window.client = await InitializePopup({walletAppUrl: appUrl}))
          }}
        >
          Popup
        </button>

        <button
          onClick={async () => {
            Destroy();

            setClient(window.client = await InitializeFrame({walletAppUrl: appUrl, targetId}))
          }}
        >
          Frame
        </button>
        <button onClick={() => Destroy()}>Close</button>
      </div>

      {
        !client ? null :
          <>
            <div className="button-row">
              <p>Navigation</p>
              <button onClick={() => client.Navigate({page: "discover"})}>Discover</button>
              <button onClick={() => client.Navigate({page: "wallet"})}>Wallet</button>
              <button onClick={() => client.Navigate({page: "collections"})}>Collections</button>
              <button
                onClick={async () => {
                  const items = await client.Items();

                  if(!items || items.length === 0) { return; }

                  client.Navigate({page: "item", params: { tokenId: items[0].details.TokenIdStr }});
                }}
              >
                First Item
              </button>
              <button onClick={() => client.Navigate({page: "tickets"})}>Tickets</button>
              <button onClick={() => client.Navigate({page: "tokens"})}>Tokens</button>
              <button onClick={() => client.Navigate({page: "profile"})}>Profile</button>
            </div>
            <div className="button-row">
              <p>Items</p>
              <button onClick={async () => SetResults(await client.Items())}>
                Items
              </button>
              <button
                onClick={async () => {
                  const items = await client.Items();

                  if(!items || items.length === 0) { return; }

                  SetResults(await client.Item({tokenId: items[0].details.TokenIdStr}));
                }}
              >
                First Item
              </button>
            </div>
          </>
      }

      <div id="wallet-target" className="wallet-target">
      </div>

      <pre className="client-results" id="client-results">
      </pre>
    </div>
  );
};

render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));
