import "../../src/static/stylesheets/reset.scss";
import "../test.scss";
import "../../src/static/stylesheets/loaders.scss";

import React, { useEffect, useState } from "react";
import { render } from "react-dom";
import { ElvWalletClient } from "@eluvio/elv-client-js/src/walletClient";
import { PageLoader } from "Components/common/Loaders";

import { EluvioLive } from "./EluvioLive.js";
import { MarketplaceLoader } from "./MarketplaceLoader.js";
import { CrossChainOracle } from "./CrossChainOracle.js";

// eluvio EvWalletClient mode -- "staging" or "production"
const mode = "staging";

// eluvio backend network configuration -- "main" or "demo"
const network = new URLSearchParams(window.location.search).get("network-name") || "demo";

// marketplace configuration -- returns { tenantSlug:, marketplaceSlug: }
const marketplaceParams = MarketplaceLoader.parseMarketplaceParams();

// wallet app configuration
const walletAppUrl = network === "demo" ?
  "https://core.test.contentfabric.io/wallet-demo" :
  "https://core.test.contentfabric.io/wallet";


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
      <br />
    </>
  );
};

const App = () => {
  const [walletClient, setWalletClient] = useState(undefined);
  const [inputs, setInputs] = useState(undefined);
  const [results, setResults] = useState(undefined);
  const [embed, setEmbed] = useState(undefined);

  const clearAndShow = (results) => { setInputs(""); setEmbed(""); setResults(results); };
  const stringify = (o) => { if(typeof o === "string") { return o; } else return JSON.stringify(o, null, 2); };
  const getInput = (name) => { return document.getElementsByName(name)?.item(0)?.value || ""; };

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

    let ownedOrError = await new EluvioLive(walletClient).NftBalanceOf(inputs)
      .then(balance => {
        return (typeof balance === "number") ? { isOwned: balance > 0, balance: balance } : { err: balance };
      })
      .catch(err => { return { error: err.toString()}; });

    if (ownedOrError?.error) {
      setResults(ownedOrError);
    } else {
      let nftStats = await walletClient.NFTContractStats({contractAddress: inputs.addr})
        .catch(err => { return err; });
      setResults({ ownership: ownedOrError, nftStats: nftStats });
    }
  };

  const Playout = async () => {
    let playoutToken = getInput("playoutToken");
    let playoutVersionHash = getInput("playoutVersionHash");
    setInputs({playoutVersionHash: playoutVersionHash, playoutToken: playoutToken});
    setResults("");

    if(playoutVersionHash.startsWith("hq__")) {
      let embedUrl = `https://embed.v3.contentfabric.io//?net=${network}&p&ct=h&vid=${playoutVersionHash}&ath=${playoutToken}`;
      setEmbed(EmbedCode(embedUrl));
    } else {
      setResults("invalid version hash (expecting 'hq__...')");
    }
  };

  const EmbedCode = (embedUrl) => {
    let embedCode = `<iframe width=854 height=480
        scrolling="no" marginheight="0" marginwidth="0"
        frameborder="0" type="text/html"
        allow="encrypted-media"
        src="${embedUrl}" />`;
    return (
      <div className="embed-code-container">
        <div className="preformat-header">Embed Code</div>
        <pre className="embed-code">{ embedCode }</pre>
        <div className="preformat-header">Embed URL</div>
        <pre className="embed-code">{ embedUrl }</pre>
        <div className="preformat-header">Embedded Content (invisible if invalid)</div>
        <div className="embed"
          ref={element => {
            if(!element) { return; }
            element.innerHTML = embedCode;

            window.scrollTo({
              top: element.parentElement.getBoundingClientRect().top + (window.pageYOffset || element.parentElement.scrollTop),
              behavior: "smooth"
            });
          }}
        />
      </div>
    );
  };

  const ChangeNetwork = async (event) => {
    const url = new URL(window.location.href);
    url.search = "network-name=" + event.target.value;
    window.history.replaceState("", "", url.toString());
    window.location = url;
  };

  const LoadMarketplaces = async () => {
    await new MarketplaceLoader(walletClient, marketplaceParams).loadMarketplaces();
  };

  const ChangeMarketplace = async (event) => {
    await new MarketplaceLoader(walletClient, marketplaceParams).setMarketplace(event);
  };

  const CrossChainAuth = async (type) => {
    const provider = await new CrossChainOracle(walletClient);
    setInputs(provider.GetXcInputMessage(type));
    setEmbed("");
    let res = await provider.Run(type);
    setResults({token: res, item: provider.item});
  };

  // TODO: this is getting called too much: twice on start, and after method calls
  setTimeout(LoadMarketplaces, 1);

  return (
    <div className="page-container">
      <h1>DApp Wallet Examples</h1>

      <div className="button-row">
        <select value={network} onChange={ChangeNetwork}>
          <option value="main">Selected Network: main</option>
          <option value="demo">Selected Network: demo</option>
        </select>
      </div>

      <AuthSection walletClient={walletClient} />

      {
        walletClient.loggedIn ?
          <>
            <div className="button-row">
              <label htmlFor="signMsg">Message to Sign:</label>
              <input type="text" size="50" id="signMsg" name="signMsg" />
              <button onClick={Sign}>Sign</button>
            </div>
            <br/>
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
            <br/>
            <div className="button-row">
              <label className="hidden-placeholder"></label>
              <input type="text" size="50" className="hidden-placeholder" />
              <button onClick={async () => await CrossChainAuth()}>Cross-chain Oracle Query - flow:mainnet</button>
            </div>
            <div className="button-row">
              <label className="hidden-placeholder"></label>
              <input type="text" size="50" className="hidden-placeholder" />
              <button onClick={async () => await CrossChainAuth("eth")}>Cross-chain Oracle Query - eip155/erc20</button>
            </div>
            <br/>
            <div className="button-row">
              <label htmlFor="playoutToken">Embed gated content (access token):</label>
              <input type="text" size="50" id="playoutToken" name="playoutToken" />
              <button className="hidden-placeholder"></button>
            </div>
            <div className="button-row">
              <label htmlFor="playoutVersionHash">Embed gated content (version hash):</label>
              <input type="text" size="50" id="playoutVersionHash" name="playoutVersionHash" />
              <button onClick={Playout}>Embed</button>
            </div>
            <br />
            <h2>User Methods</h2>
            <div className="button-row">
              <button onClick={async () => clearAndShow(await walletClient.UserInfo())}>UserInfo</button>
              <button onClick={async () => clearAndShow(await walletClient.AvailableMarketplaces())}>AvailableMarketPlaces</button>
            </div>
            <div className="button-row">
              <button onClick={async () => clearAndShow(await walletClient.UserItemInfo())}>UserItemInfo</button>
              <button onClick={async () => clearAndShow(await walletClient.UserItems({sortBy: "default"}))}>UserItems</button>
            </div>
            <div className="button-row">
              <button onClick={async () => clearAndShow(await walletClient.client.CreateFabricToken())}>CreateFabricToken</button>
            </div>
            <br/>
            <h2>Marketplace Methods</h2>
            <div className="button-row">
              <select id="marketplaceSelector" onChange={ChangeMarketplace}/>
            </div>
            <div className="button-row">
              <button onClick={async () => clearAndShow(await walletClient.Listings({marketplaceParams}))}>Listings</button>
              <button onClick={async () => clearAndShow(await walletClient.MarketplaceStock({marketplaceParams}))}>Stock</button>
            </div>
          </> : null
      }

      {
        inputs ?
          <div>
            <div className="preformat-header">Input</div>
            <pre>{stringify(inputs)}</pre>
          </div> : null
      }

      {
        results ?
          <div>
            <div className="preformat-header">Output</div>
            <pre>{stringify(results)}</pre>
          </div> : null
      }

      {
        embed ? <>{embed}</> : null
      }
    </div>
  );
};

render(<React.StrictMode><App /></React.StrictMode>, document.getElementById("app"));