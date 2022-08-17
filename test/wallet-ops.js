import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {PageLoader} from "Components/common/Loaders";

import {EluvioLive} from "./EluvioLive.js";

const mode = "staging";
const searchParams = new URLSearchParams(window.location.search);

// eluvio backend network configuration -- "main" or "demo"
// TODO: allow user to select these (via their tenantId) from within the UI
const network = searchParams.get("network-name") || "demo";
let marketplaceParams = network == "main" ? {
  tenantSlug: "bcl",
  marketplaceSlug: "maskverse-marketplace"
} : {
  tenantSlug: "bcl-live",
  marketplaceSlug: "masked-singer-marketplace"
};
window.console.log("marketplaceParams", marketplaceParams);

// wallet app configuration -- Use locally running wallet app if running from local IP, otherwise, public
let walletAppUrl;
if(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  const url = new URL(window.location.origin);
  url.port = "8090";
  walletAppUrl = url.toString();
} else {
  walletAppUrl = network === "demo" ?
    "https://core.test.contentfabric.io/wallet-demo" :
    "https://core.test.contentfabric.io/wallet";
}
window.console.log("isDemo?", network == "demo", "isMain?", network == "main", "walletAppUrl", walletAppUrl);


const AuthSection = ({walletClient, setResults, setInputs}) => {
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

  function getInput(name) {
    return document.getElementsByName(name)?.item(0)?.value || "";
  }

  const Sign = async () => {
    let msgToSign = getInput("signMsg");
    setInputs({ messageToSign: msgToSign});
    let res = await walletClient.PersonalSign({message: msgToSign})
      .catch(err => { return err; });
    setResults(res);
  };

  const Verify = async () => {
    let toVerify = getInput("verifyMsg");
    setInputs({messageToVerify: toVerify});
    // TODO: find verify function
    let res = await walletClient.PersonalSign({message: toVerify})
      .catch(err => { return err; });
    setResults(res);
  };

  const CheckNft = async () => {
    let contract = getInput("nftAddressToVerify");
    let owner = getInput("nftOwnerToVerify");
    const inputs = { addr: contract, ownerAddr: owner};

    setInputs(inputs);
    let balance = await new EluvioLive(walletClient).NftBalanceOf(inputs)
      .catch(err => { return { error: err.toString()}; });
    window.console.log("balance", balance);
    setResults(balance);
  };

  const CheckNftContract = async () => {
    let nft = getInput("nftForStats");
    setInputs({ contactAddress: nft});
    let res = await walletClient.NFTContractStats({contractAddress: nft})
      .catch(err => { return err; });
    setResults(res);
  };

  const Playout = async () => {
    let playoutId = getInput("nftToVerify");
    setInputs({playoutId: playoutId});
    // TODO: take NFT and hq__ hash, get access token, generate embed url
    let res = await walletClient.PersonalSign({message: playoutId})
      .catch(err => { return err; });
    setResults(res);
  };

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
      <br /><br />
      <div className="button-row">
        <label htmlFor="signMsg">Message to Sign:</label>
        <input type="text" size="50" id="signMsg" name="signMsg" />
        <button onClick={Sign}>Sign</button>
      </div>
      <div className="button-row">
        <label htmlFor="verifyMsg">Signed message to verify:</label>
        <input type="text" size="50" id="verifyMsg" name="verifyMsg" />
        <button onClick={Verify}>Verify</button>
      </div>
      <div className="button-row">
        <label htmlFor="nftOwnerToVerify">Verify NFT ownership<br/>(owner address):</label>
        <input type="text" size="50" id="nftOwnerToVerify" name="nftOwnerToVerify" />
        <button style={{ "visibility": "hidden" }}></button>
      </div>
      <div className="button-row">
        <label htmlFor="nftAddressToVerify">Verify NFT ownership<br/>(contract address):</label>
        <input type="text" size="50" id="nftAddressToVerify" name="nftAddressToVerify" />
        <button onClick={CheckNft}>Check NFT</button>
      </div>
      <div className="button-row">
        <label htmlFor="nftForStats">NFT Contract Statistics:</label>
        <input type="text" size="50" id="nftForStats" name="nftForStats" />
        <button onClick={CheckNftContract}>Get statistics</button>
      </div>
      <div className="button-row">
        <label htmlFor="playoutId">Play token-gated content:</label>
        <input type="text" size="50" id="playoutId" name="playoutId" />
        <button onClick={Playout}>Playout</button>
      </div>
      <br /><br />
    </>
  );
};

const App = () => {
  const [network, setNetwork] = useState(searchParams.get("network-name") || "demo");
  const [walletClient, setWalletClient] = useState(undefined);
  const [results, setResults] = useState(undefined);
  const [inputs, setInputs] = useState(undefined);
  const clearAndSetResults = async (res) => {
    setInputs("");
    setResults(res);
  };

  useEffect(() => {
    ElvWalletClient.Initialize({
      network,
      mode,
      //marketplaceParams
    })
      .then(client => {
        client.walletAppUrl = walletAppUrl;

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

  return (
    <div className="page-container">
      <h1>DApp Wallet Operation Examples</h1>

      <div className="button-row">
        <select
          value={network}
          onChange={event => {
            setNetwork(event.target.value);

            const url = new URL(window.location.href);
            url.searchParams.set("network-name", event.target.value);
            window.history.replaceState("", "", url.toString());
            window.location = url;
          }}
        >
          <option value="main">Selected Network: main</option>
          <option value="demo">Selected Network: demo</option>
        </select>
      </div>

      <AuthSection walletClient={walletClient} setResults={setResults} setInputs={setInputs}/>

      <h2>Methods (no Marketplace required)</h2>
      <div className="button-row">
        <button onClick={async () => clearAndSetResults(await walletClient.UserInfo())}>UserInfo</button>
        <button onClick={async () => clearAndSetResults(await walletClient.UserItems())}>UserItems</button>
      </div>
      <div className="button-row">
        <button onClick={async () => clearAndSetResults(await walletClient.AvailableMarketplaces())}>AvailableMarketPlaces</button>
        <button onClick={async () => clearAndSetResults(await walletClient.UserItemInfo())}>UserItemInfo</button>
      </div>

      <h2>Methods (require Marketplace)</h2>
      <div className="button-row">
        <button onClick={async () => clearAndSetResults(await walletClient.Listings())}>Listings</button>
        <button onClick={async () => clearAndSetResults(await walletClient.MarketplaceStock({marketplaceParams}))}>Stock</button>
      </div>

      {
        inputs ?
          <div><div className="preformat-header">input:</div>
            <pre>{JSON.stringify(inputs, null, 2)}</pre>
          </div> : null
      }

      {
        results ?
          <div><div className="preformat-header">output:</div>
            <pre>{JSON.stringify(results, null, 2)}</pre>
          </div> : null
      }
    </div>
  );
};

render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));