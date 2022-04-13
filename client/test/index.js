import "../../src/static/stylesheets/reset.scss";
import "./test.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";

import {ElvWalletClient} from "../src/index";

window.client = undefined;

const appUrl = window.location.hostname === "core.test.contentfabric.io" ? "https://core.test.contentfabric.io/wallet" : "https://192.168.0.17:8090";

const targetId = "wallet-target";

const SetResults = results => {
  document.getElementById("client-results").innerHTML = results ? JSON.stringify(results, null, 2) : "";
  window.scrollTo({
    top: document.getElementById("client-results").getBoundingClientRect().top + window.pageYOffset - 80,
    behavior: "smooth"
  });
};

const EventListener = event => {
  let currentEvents = document.getElementById("client-events").innerHTML;

  if(!currentEvents) {
    currentEvents = "Events:";
  }

  document.getElementById("client-events").innerHTML =
    currentEvents + "\n\n" + JSON.stringify(event, null, 2);
};

const App = () => {
  const [client, setClient] = useState(undefined);
  const [listeners, setEventListeners] = useState({
    [ElvWalletClient.EVENTS.LOG_IN]: undefined,
    [ElvWalletClient.EVENTS.LOG_OUT]: undefined,
    [ElvWalletClient.EVENTS.CLOSE]: undefined,
    [ElvWalletClient.EVENTS.ALL]: undefined,
  });

  useEffect(() => {
    Destroy();

    document.getElementById("client-events").innerHTML = "";

    ElvWalletClient.InitializeFrame({
      requestor: "Wallet Client Test App",
      walletAppUrl: appUrl,
      target: targetId
    })
      .then(client => {
        window.client = client;
        setClient(client);

        client.AddEventListener(client.EVENTS.CLOSE, Destroy);
      });
  }, []);


  const ToggleEventListener = event => {
    if(listeners[event]) {
      client.RemoveEventListener(event, EventListener);
    } else {
      client.AddEventListener(event, EventListener);
    }

    setEventListeners({
      ...listeners,
      [event]: listeners[event] ? undefined : EventListener
    });
  };

  useEffect(() => {
    if(!client) { return; }

    ToggleEventListener(ElvWalletClient.EVENTS.ALL);
  }, [client]);

  const Destroy = () => {
    if(client) { client.Destroy(); }

    SetResults();

    setEventListeners({
      [ElvWalletClient.EVENTS.LOG_IN]: undefined,
      [ElvWalletClient.EVENTS.LOG_OUT]: undefined,
      [ElvWalletClient.EVENTS.CLOSE]: undefined,
      [ElvWalletClient.EVENTS.ALL]: undefined,
    });

    setClient(undefined);
  };

  return (
    <div className="page-container">
      <h1>Test Wallet Client</h1>
      <div className="button-row">
        <button
          onClick={async () => {
            Destroy();

            document.getElementById("client-events").innerHTML = "";

            const client = await ElvWalletClient.InitializePopup({
              requestor: "Wallet Client Test App",
              walletAppUrl: appUrl
            });

            window.client = client;
            setClient(client);

            client.AddEventListener(client.EVENTS.CLOSE, Destroy);
          }}
        >
          Popup
        </button>

        <button
          onClick={async () => {
            Destroy();

            document.getElementById("client-events").innerHTML = "";

            const client = await ElvWalletClient.InitializeFrame({
              requestor: "Wallet Client Test App",
              walletAppUrl: appUrl,
              target: targetId
            });

            window.client = client;
            setClient(client);

            client.AddEventListener(client.EVENTS.CLOSE, Destroy);
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
              <button onClick={() => client.Navigate({page: "wallet"})}>Wallet</button>
              <button
                onClick={async () => {
                  const items = await client.Items();

                  if(!items || items.length === 0) { return; }

                  client.Navigate({page: "item", params: { contractAddress: items[0].details.ContractAddr, tokenId: items[0].details.TokenIdStr }});
                }}
              >
                First Item
              </button>
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

                  SetResults(await client.Item({contractAddress: items[0].details.ContractAddr, tokenId: items[0].details.TokenIdStr}));
                }}
              >
                First Item
              </button>
            </div>
            <div className="button-row">
              <p>Events</p>
              <button
                className={listeners[ElvWalletClient.EVENTS.LOG_IN] ? "active" : ""}
                onClick={() => ToggleEventListener(ElvWalletClient.EVENTS.LOG_IN)}
              >
                Log In
              </button>
              <button
                className={listeners[ElvWalletClient.EVENTS.LOG_OUT] ? "active" : ""}
                onClick={() => ToggleEventListener(ElvWalletClient.EVENTS.LOG_OUT)}
              >
                Log Out
              </button>
              <button
                className={listeners[ElvWalletClient.EVENTS.CLOSE] ? "active" : ""}
                onClick={() => ToggleEventListener(ElvWalletClient.EVENTS.CLOSE)}
              >
                Close
              </button>
              <button
                className={listeners[ElvWalletClient.EVENTS.ALL] ? "active" : ""}
                onClick={() => ToggleEventListener(ElvWalletClient.EVENTS.ALL)}
              >
                All
              </button>
            </div>
          </>
      }

      <div id="wallet-target" className="wallet-target">
      </div>

      <pre className="client-results" id="client-results">
      </pre>

      <pre className="client-events" id="client-events">
      </pre>
    </div>
  );
};

render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));
