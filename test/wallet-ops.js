import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {PageLoader} from "Components/common/Loaders";

import {EluvioLive} from "./EluvioLive.js";
import {MarketplaceLoader} from "./MarketplaceLoader.js";

const mode = "staging";
const searchParams = new URLSearchParams(window.location.search);

// eluvio backend network configuration -- "main" or "demo"
const network = searchParams.get("network-name") || "demo";

// marketplace configuration
const tSlug = searchParams.get("tenant-name") ||
  (network == "main" ? "bcl" : "bcl-live");
const mSlug = searchParams.get("marketplace-name") ||
  (network == "main" ? "maskverse-marketplace" : "masked-singer-marketplace");

let marketplaceParams = {
  tenantSlug: tSlug,
  marketplaceSlug: mSlug,
  toString: function() { return this.tenantSlug + "/" + this.marketplaceSlug; },
};

window.console.log("marketplaceParams", marketplaceParams);

// wallet app configuration
let walletAppUrl = network === "demo" ?
  "https://core.test.contentfabric.io/wallet-demo" :
  "https://core.test.contentfabric.io/wallet";


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

  const CheckNft = async () => {
    const inputs = { addr: getInput("nftAddressToVerify"), ownerAddr: getInput("nftOwnerToVerify")};
    setInputs(inputs);

    let balance = await new EluvioLive(walletClient).NftBalanceOf(inputs)
      .catch(err => { return { error: err.toString()}; });

    let ownedOrError = (typeof balance === "number") ? { isOwned: balance > 0, balance: balance } : { err: balance };
    setResults(ownedOrError);
  };

  const CheckNftStats = async () => {
    let nft = getInput("nftForStats");
    setInputs({ contactAddress: nft});
    let res = await walletClient.NFTContractStats({contractAddress: nft})
      .catch(err => { return err; });
    setResults(res);
  };

  const Playout = async () => {
    let playoutId = getInput("playoutId");
    setInputs({playoutId: playoutId});
    // TODO: take NFT and hq__ hash, get access token, generate embed url
    let res = "TODO";
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
        <label htmlFor="nftOwnerToVerify">Verify NFT ownership (owner address):</label>
        <input type="text" size="50" id="nftOwnerToVerify" name="nftOwnerToVerify" />
        <button className="hidden-placeholder"></button>
      </div>
      <div className="button-row">
        <label htmlFor="nftAddressToVerify">Verify NFT ownership (contract address):</label>
        <input type="text" size="50" id="nftAddressToVerify" name="nftAddressToVerify" />
        <button onClick={CheckNft}>Verify NFT</button>
      </div>
      <div className="button-row">
        <label htmlFor="nftForStats">NFT Contract Statistics:</label>
        <input type="text" size="50" id="nftForStats" name="nftForStats" />
        <button onClick={CheckNftStats}>Get statistics</button>
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

  const loadMarketplaces = async () => {
    await new MarketplaceLoader(walletClient, marketplaceParams).loadMarketplaces();
  };

  const setMarketplace = async (event) => {
    await new MarketplaceLoader(walletClient, marketplaceParams).setMarketplace(event);
  };

  const changeNetwork = async (event) => {
    setNetwork(event.target.value);

    const url = new URL(window.location.href);
    url.searchParams.set("network-name", event.target.value);
    window.history.replaceState("", "", url.toString());
    window.location = url;

  };

  window.console.log("******* setTimeout");
  // XXX this is getting called too much: twice on start, and after method calls
  setTimeout(loadMarketplaces, 1);

  return (
    <div className="page-container">
      <h1>DApp Wallet Operation Examples</h1>

      <div className="button-row">
        <select value={network} onChange={changeNetwork}>
          <option value="main">Selected Network: main</option>
          <option value="demo">Selected Network: demo</option>
        </select>
      </div>

      <AuthSection walletClient={walletClient} setResults={setResults} setInputs={setInputs}/>

      <h2>User Methods</h2>
      <div className="button-row">
        <button onClick={async () => clearAndSetResults(await walletClient.UserInfo())}>UserInfo</button>
        <button onClick={async () => clearAndSetResults(await walletClient.AvailableMarketplaces())}>AvailableMarketPlaces</button>
      </div>
      <div className="button-row">
        <button onClick={async () => clearAndSetResults(await walletClient.UserItems())}>UserItems</button>
        <button onClick={async () => clearAndSetResults(await walletClient.UserItemInfo())}>UserItemInfo</button>
      </div>
      <div className="button-row">
        <button onClick={async () => clearAndSetResults(await walletClient.client.CreateSignedToken({grantType: "read", duration: 60*60*1000}))}>CreateSignedToken</button>
      </div>

      <br/>
      <h2>Marketplace Methods</h2>
      <div className="button-row">
        <select id="marketplaceSelector" onChange={setMarketplace}>
          <option id="defaultMarketplaceOption"></option>
        </select>
      </div>
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