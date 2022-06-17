import React, {useState, useEffect} from "react";
import {Loader} from "Components/common/Loaders";
import {rootStore, cryptoStore} from "Stores";
import {observer} from "mobx-react";

import EluvioLogo from "Assets/images/EluvioLogo.png";
import ImageIcon from "Components/common/ImageIcon";

const Sign = async (params, Respond, SetMessage) => {
  const wallet = cryptoStore.WalletFunctions(params.provider);

  try {
    if(params.action === "connect") {
      SetMessage(<h1>Connecting wallet...</h1>, true);
      await wallet.Connect(params.params);
      const balance = await cryptoStore.PhantomBalance();

      Respond({response: {address: wallet.Address(), balance}});
    } else if(params.action === "message") {
      SetMessage(<h1>Awaiting message signature...</h1>, true);

      if(Array.isArray(params.message)) {
        SetMessage(
          <>
            <h1>Awaiting message signatures...</h1>
            <h2>This operation requires multiple signatures.</h2>
            <h2>Please check your browser extension and accept all pending signature requests.</h2>
          </>,
          true
        );
      }

      Respond({response: {address: wallet.Address(), response: await wallet.Sign(params.message)}});
    } else if(params.action === "purchase") {
      SetMessage(<h1>Awaiting purchase transaction...</h1>, true);

      Respond({response: {address: wallet.Address(), response: await wallet.Purchase(params.purchaseSpec)}});
    }
  } catch(error) {
    rootStore.Log(error, true);

    let message = "Transaction failed";
    if(error.message === "Incorrect account") {
      message = `Incorrect account selected - expected ${wallet.ConnectedAccounts()[0]?.link_acct}`;
    } else if(params.action === "connect" && error.status === 409) {
      message = "This Solana account is already connected to a different Eluvio wallet";
    }

    SetMessage(
      <>
        <h1>{ message }</h1>
        <button onClick={() => Sign(params, Respond, SetMessage)} className="action">
          Try Again
        </button>
      </>,
      false
    );
  }
};

const SignaturePopup = observer(({parameters, Respond}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Sign(
      parameters,
      Respond,
      (message, loading) => {
        setMessage(message);
        setLoading(loading);
      }
    );
  }, []);

  return (
    <div className="page-container signature-popup">
      <div className="signature-popup__logo-container">
        <ImageIcon icon={EluvioLogo} className="signature-popup__logo" />
      </div>
      { message }
      { loading ? <Loader /> : null }
    </div>
  );
});


export default SignaturePopup;
