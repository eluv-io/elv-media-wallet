import React, {useState, useEffect} from "react";
import {Loader} from "Components/common/Loaders";
import {rootStore, cryptoStore} from "Stores";
import {observer} from "mobx-react";

const Sign = async (SetMessage) => {
  try {
    const params = new URLSearchParams(window.location.search);

    const wallet = cryptoStore.WalletFunctions(params.get("provider"));

    let response;
    if(params.has("connect")) {
      await wallet.Connect();
      SetMessage(<h1>Connecting wallet...</h1>, true);
      response = wallet.Address();
    } else if(params.has("message")) {
      SetMessage(<h1>Awaiting message signature...</h1>, true);
      response = await wallet.Sign(atob(params.get("message")));
    } else if(params.has("purchase")) {
      SetMessage(<h1>Awaiting purchase transaction...</h1>, true);
      response = await wallet.Purchase(JSON.parse(atob(params.get("purchase"))));
    }

    if(response) {
      const balance = await cryptoStore.PhantomBalance();

      window.opener.postMessage({
        type: "ElvMediaWalletSignRequest",
        requestId: params.get("request"),
        address: wallet.Address(),
        response,
        balance
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      window.close();
    } else {
      window.close();
    }
  } catch(error) {
    SetMessage(
      <>
        <h1>Transaction Failed</h1>
        <button onClick={() => Sign(SetMessage)} className="action">
          Try Again
        </button>
      </>,
      false
    );
  }
};

const SignaturePopup = observer(() => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(rootStore.loggedIn) {
      Sign(
        (message, loading) => {
          setMessage(message);
          setLoading(loading);
        }
      );
    }
  }, [rootStore.loggedIn]);

  return (
    <div className="page-container signature-popup">
      { message }
      { loading ? <Loader /> : null }
    </div>
  );
});


export default SignaturePopup;
