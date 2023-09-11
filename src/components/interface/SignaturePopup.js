import React, {useState, useEffect} from "react";
import {Loader} from "Components/common/Loaders";
import {rootStore, cryptoStore} from "Stores";
import {observer} from "mobx-react";

import EluvioLogo from "Assets/images/EluvioLogo.png";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader} from "Components/common/UIComponents";

const Sign = async (params, Respond, SetMessage) => {
  try {
    if(params.action === "personal-sign") {
      SetMessage(
        <>
          <h1>Signature Request</h1>

          <div className="labelled-field">
            <label>Account</label>
            <div>{ rootStore.walletClient.UserInfo()?.name }</div>
          </div>

          <div className="labelled-field">
            <label>Requesting Origin</label>
            <div>{ rootStore.authOrigin }</div>
          </div>

          <div className="labelled-field">
            <label>Message</label>
            <div>{ params.message }</div>
          </div>

          <div className="actions">
            <ButtonWithLoader
              onClick={async () => {
                const signature = await rootStore.walletClient.PersonalSign({message: params.message});

                Respond({response: signature});
              }}
              className="action action-primary"
            >
              Sign
            </ButtonWithLoader>
            <button onClick={() => window.close()} className="action">Cancel</button>
          </div>
        </>
      );

      return;
    }

    const wallet = cryptoStore.WalletFunctions(params.provider);
    const address = await wallet.RequestAddress();

    console.log("HERE");
    if(params.action === "connect") {
      SetMessage(<h1>Connecting wallet...</h1>, true);
      await wallet.Connect(params.params);
      const balance = await cryptoStore.PhantomBalance();

      Respond({response: {address: address, balance}});
    } else if(params.action === "message") {
      console.log(params);
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

      Respond({response: {address: address, response: await wallet.Sign(params.message, undefined, params.method)}});
    } else if(params.action === "purchase") {
      SetMessage(<h1>Awaiting purchase transaction...</h1>, true);

      Respond({response: {address: address, response: await wallet.Purchase(params.purchaseSpec)}});
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
  console.log("SIG POPUP");

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
      <div className="signature-popup__content">
        <div className="signature-popup__logo-container">
          <ImageIcon icon={EluvioLogo} className="signature-popup__logo" />
        </div>
        { message }
        { loading ? <Loader className="signature-popup__loader" /> : null }
      </div>
    </div>
  );
});


export default SignaturePopup;
