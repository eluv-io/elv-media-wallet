import "../src/static/stylesheets/reset.scss";
import "./test.scss";
import "../src/static/stylesheets/loaders.scss";

import React, {useEffect, useState} from "react";
import {render} from "react-dom";
import {ElvWalletClient} from "@eluvio/elv-client-js/src/walletClient";
import {PageLoader} from "Components/common/Loaders";


let mode = "staging";

const searchParams = new URLSearchParams(window.location.search);

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

  let msgText = "hello eluvio";
  let verifyText = "0xffffffffffffffffffffffffffffffffffffffff";
  let nft = "0xffffffffffffffffffffffffffffffffffffffff";
  let playout = "0xffffffffffffffffffffffffffffffffffffffff";

  let contact_address = "0xfe5857eab6b4034a2eac1012b081594acd3cd920"; // TODO: add selector or input

  const Sign = async () => {
    setInputs({ messageToSign:  msgText});
    let res = await walletClient.PersonalSign({message: msgText})
      .catch(err => { return err; });
    setResults(res);
  };

  const Verify = async () => {
    setInputs({messageToVerify: verifyText});
    // TODO: find verify function
    let res = await walletClient.PersonalSign({message: verifyText})
      .catch(err => { return err; });
    setResults(res);
  };

  const CheckNft = async () => {
    setInputs({ contactAddress: contact_address, tokenId: nft});
    let res = await walletClient.NFT({contractAddress: contact_address, tokenId: nft})
      .catch(err => { return err; });
    setResults(res);
  };

  const CheckNftContract = async () => {
    setInputs({ contactAddress: nft});
    let res = await walletClient.NFTContractStats({contractAddress: nft})
      .catch(err => { return err; });
    setResults(res);
  };

  const Playout = async () => {
    setInputs({playoutId: playout});
    // TODO: take NFT and hq__ hash, get access token, generate embed url
    let res = await walletClient.PersonalSign({message: msgText})
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
        <label htmlFor="msg">Message to Sign:&nbsp;</label>
        <input type="text" id="msg" name="msg" onChange={event => { msgText = event.target.value; }} />
        &nbsp;<button onClick={Sign}>Personal Sign</button>
      </div>
      <div className="button-row">
        <label htmlFor="verMsg">Signed message to verify:&nbsp;</label>
        <input type="text" id="verMsg" name="verMsg" onChange={event => { verifyText = event.target.value; }} />
        &nbsp;<button onClick={Verify}>Verify</button>
      </div>
      <div className="button-row">
        <label htmlFor="nft">Verify NFT ownership:&nbsp;</label>
        <input type="text" id="nft" name="nft" onChange={event => { nft = event.target.value; }} />
        &nbsp;<button onClick={CheckNft}>Check NFT</button>
      </div>
      <div className="button-row">
        <label htmlFor="nft">NFT Contract Stats:&nbsp;</label>
        <input type="text" id="nft" name="nft" onChange={event => { nft = event.target.value; }} />
        &nbsp;<button onClick={CheckNftContract}>Check NFT contract</button>
      </div>
      <div className="button-row">
        <label htmlFor="playout">Playout token-gated content:&nbsp;</label>
        <input type="text" id="playout" name="playout" onChange={event => { playout = event.target.value; }} />
        &nbsp;<button onClick={Playout}>Playout</button>
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

  // TODO: allow user to select these (their tenantId)
  let marketplaceParams = network == "main" ? {
    tenantSlug: "bcl",
    marketplaceSlug: "masked-singer-marketplace"
  } : {
    tenantSlug: "bcl-live",
    marketplaceSlug: "masked-singer-marketplace"
  };
  console.log("marketplaceParams", marketplaceParams);

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
  console.log("isDemo?", network == "demo", "isMain?", network == "main", "walletAppUrl", walletAppUrl);


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
      <h1>DApp Wallet Operations Tests</h1>

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
        <button onClick={async () => setResults(await walletClient.UserInfo())}>UserInfo</button>
        <button onClick={async () => setResults(await walletClient.UserItems())}>UserItems</button>
      </div>
      <div className="button-row">
        <button onClick={async () => setResults(await walletClient.AvailableMarketplaces())}>AvailableMarketPlaces</button>
        <button onClick={async () => setResults(await walletClient.UserItemInfo())}>UserItemInfo</button>
      </div>

      <h2>Methods (require Marketplace)</h2>
      <div className="button-row">
        <button onClick={async () => setResults(await walletClient.Listings())}>Listings</button>
        <button onClick={async () => setResults(await walletClient.MarketplaceStock({marketplaceParams}))}>Stock</button>
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
