import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {cryptoStore, rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";
import Modal from "Components/common/Modal";

import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import HelpIcon from "Assets/icons/help-circle.svg";

const WalletConnect = observer(({showPaymentPreference}) => {
  const wallet = cryptoStore.WalletFunctions("phantom");
  const connectedAccount = wallet.ConnectedAccounts()[0];
  const incorrectAccount = connectedAccount && wallet.Address() && connectedAccount.link_acct !== wallet.Address();

  const [connected, setConnected] = useState(wallet.Connected());
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [paymentPreference, setPaymentPreference] = useState(connectedAccount?.preferred || false);
  const [showPaymentPreferenceInfo, setShowPaymentPreferenceInfo] = useState(false);

  useEffect(() => {
    setConnected(wallet.Connected());
    setPaymentPreference(connectedAccount?.preferred || false);
  }, [cryptoStore.metamaskAddress, cryptoStore.metamaskChainId, cryptoStore.phantomAddress, Object.keys(cryptoStore.connectedAccounts.sol)]);

  const UpdatePaymentPreference = async (event) => {
    const preference = event.target.checked || false;
    try {
      setErrorMessage(undefined);
      await cryptoStore.ConnectPhantom({setPreferred: true, preferLinkedWalletPayment: event.target.checked});

      setPaymentPreference(preference);
    } catch(error){
      rootStore.Log(error, true);
      setPaymentPreference(!preference);

      if(error.message === "Incorrect account") {
        setErrorMessage(`Incorrect Phantom account active. Please switch to ${connectedAccount.link_acct}.`);
      } else {
        setErrorMessage("Something went wrong when connecting your wallet. Please try again.");
      }
    }
  };

  const connectButton =
    connected && connectedAccount ?
      <div className="wallet-connect__linked">
        <ImageIcon icon={wallet.logo} title="Phantom" /> Phantom Connected
      </div> :
      wallet.Available() ?
        <ButtonWithLoader
          disabled={incorrectAccount}
          className="wallet-connect__link-button"
          onClick={async () => {
            try {
              setErrorMessage(undefined);
              await wallet.Connect();
              setConnected(true);
            } catch(error) {
              rootStore.Log(error, true);

              if(error.status === 409) {
                setErrorMessage("This Solana account is already connected to a different Eluvio wallet");
              } else {
                setErrorMessage("Something went wrong when connecting your wallet. Please try again.");
              }
            }
          }}
        >
          <ImageIcon icon={wallet.logo} title="Phantom" /> Connect Phantom
        </ButtonWithLoader> :
        <a target="_blank" rel="noopener" href={wallet.link} className="action wallet-connect__link-button wallet-connect__download-link">
          <ImageIcon icon={wallet.logo} title={wallet.name} />
          Get { wallet.name }
        </a>;

  if(connectedAccount) {
    return (
      <div className="wallet-connect wallet-connect--connected">
        { connectButton }
        { incorrectAccount ? <div className="wallet-connect__warning">Please select the account below in your Phantom extension to connect</div> : null }
        <div className="wallet-connect__info" key={`wallet-connection-${connectedAccount.link_acct}`}>
          <div className="wallet-connect__connected-at">
            Linked { connectedAccount.connected_at }
          </div>
          <div className="wallet-connect__network-info">
            <div className="wallet-connect__network-name">
              <ImageIcon icon={wallet.currencyLogo} title={wallet.currencyName} />
              { wallet.networkName } Wallet Address
            </div>
            <div className="wallet-connect__network-address ellipsis" title={connectedAccount.link_acct}>
              { connectedAccount.link_acct }
            </div>
          </div>
          {
            showPaymentPreference ?
              <div className="wallet-connect__payment-preference">
                <input
                  name="payment-preference"
                  type="checkbox"
                  checked={paymentPreference}
                  onChange={UpdatePaymentPreference}
                  className="wallet-connect__payment-preference__checkbox"
                />
                <label htmlFor="payment-preference" className="wallet-connect__payment-preference__label">
                  Accept only direct payment to this linked wallet for my listings
                </label>
                <button className="wallet-connect__payment-preference__help-button" onClick={() => setShowPaymentPreferenceInfo(!showPaymentPreferenceInfo)}>
                  <ImageIcon icon={HelpIcon} label="More Info"/>
                </button>
              </div> : null
          }
          {
            showPaymentPreferenceInfo ?
              <div className="wallet-connect__payment-preference-info">
                Checking this option will limit your listings to purchase with USDC via linked wallet only. Payment will settle directly to your linked wallet address. If unchecked, your listings may also be purchased via credit card, coinbase, or wallet balance, and the proceeds will be credited to your Eluvio wallet balance, which is redeemable via Stripe.
              </div> : null
          }
          <ButtonWithLoader
            className="wallet-connect__unlink-button"
            onClick={async () => await Confirm({message: "Are you sure you want to disconnect this account?", Confirm: async () => await wallet.Disconnect(connectedAccount.link_acct)})}
          >
            Unlink Wallet
          </ButtonWithLoader>
        </div>
        { errorMessage ? <div className="wallet-connect__error-message">{ errorMessage }</div> : null }
      </div>
    );
  }

  return (
    <>
      <div className="wallet-connect">
        <h2 className="wallet-connect__header">Link Payment Wallet</h2>
        <div className="wallet-connect__section">
          <div className="wallet-connect__info">
            <div className="wallet-connect__message">
              To buy and sell NFTs using <ImageIcon icon={USDCIcon} title="USDC" /> USDC with direct payment, link your Eluvio Media Wallet to your payment wallet.
            </div>
            { connectButton}
          </div>
        </div>
        <div className="wallet-connect__help-link">
          <a href="https://eluviolive.zendesk.com/hc/en-us/articles/5126073304081-How-do-I-link-my-Phantom-Wallet-" target="_blank" rel="noopener">
            How do I link my Phantom Wallet?
          </a>
        </div>
      </div>
      { errorMessage ? <div className="wallet-connect__error-message">{ errorMessage }</div> : null }
    </>
  );
});

export const WalletHeader = observer(() => {
  const [showMenu, setShowMenu] = useState(false);

  const wallet = cryptoStore.WalletFunctions("phantom");

  return (
    <>
      <button
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="header__profile__balance header__profile__usdc"
        title="Connect Phantom"
      >
        <ImageIcon
          icon={wallet.logo}
          label="Not Connected"
          className={`header__profile__connected-icon ${cryptoStore.usdcConnected ? "header__profile__connected-icon--connected" : "header__profile__connected-icon--disconnected"}`}
        />

        {
          cryptoStore.usdcConnected ?
            <div className="header__profile__balance__amount header__profile__usdc__balance">
              { (cryptoStore.phantomUSDCBalance || 0).toFixed(2) } USDC
            </div> : null
        }
      </button>

      {
        showMenu ? <Modal Toggle={() => setShowMenu(false)} className="wallet-connect-modal"><WalletConnect showPaymentPreference /></Modal> : null
      }
    </>
  );
});

export default WalletConnect;
