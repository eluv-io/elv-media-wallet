// UNUSED

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";

import ImageIcon from "Components/common/ImageIcon";
import {rootStore, cryptoStore} from "Stores";
import {Loader} from "Components/common/Loaders";
import Modal from "Components/common/Modal";


import MetamaskLogo from "Assets/icons/crypto/metamask fox.png";
import PhantomLogo from "Assets/icons/crypto/phantom.png";

import USDIcon from "Assets/icons/crypto/USD blue.svg";
import ConversionIcon from "Assets/icons/crypto/Conversion button.png";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";

const ETH_CONVERSION = 0.000382078968081;

const CryptoDepositModal = observer(({type="metamask", Close}) => {
  const [confirmation, setConfirmation] = useState(undefined);
  const [amountCrypto, setAmountCrypto] = useState(0);
  const [amountUSD, setAmountUSD] = useState(0);

  const wallet = cryptoStore.WalletFunctions(type);

  const SetAmount = ({crypto, usd}={}) => {
    let amount = Math.max(0, parseFloat(crypto || usd || 0));
    if(typeof crypto !== "undefined") {
      if(![amount.toString(), amount.toString().replace("0.", ".")].includes(crypto)) {
        setAmountCrypto(crypto);
      } else {
        setAmountCrypto(amount);
        setAmountUSD((amount / ETH_CONVERSION).toFixed(2));
      }
    } else if(typeof usd !== "undefined") {
      if(![amount.toString(), amount.toString().replace("0.", ".")].includes(usd)) {
        setAmountUSD(usd);
      } else {
        setAmountUSD(amount);
        setAmountCrypto(parseFloat((amount * ETH_CONVERSION).toFixed(8)));
      }
    } else {
      setAmountUSD(isNaN(parseFloat(amountUSD)) ? "0" : parseFloat(amountUSD).toFixed(2));
      setAmountCrypto(isNaN(parseFloat(amountCrypto)) ? "0" : parseFloat(parseFloat(amountCrypto).toFixed(8)));
    }
  };

  let content;
  if(confirmation) {
    content = (
      <div className="crypto-deposit">
        <h1 className="crypto-deposit__header">
          <ImageIcon icon={wallet.logo} title={wallet.name} />
          Success!
        </h1>
        <div className="crypto-deposit__deposit-message">
          Transaction pending: { amountCrypto } { wallet.currencyName} will be deposited to your Eluvio wallet address.
        </div>
        <div className="crypto-deposit__summary">
          <label className="crypto-deposit__summary__label">Pending Deposit Estimate</label>
          <div className="crypto-deposit__summary__price">
            { FormatPriceString(amountUSD) } USD
          </div>
          <a href="https://google.com" rel="noopener noreferrer" target="_blank" className="crypto-deposit__summary__link">
            View this transaction on etherscan
          </a>
        </div>
        <div className="actions crypto-deposit__actions">
          <button onClick={Close} className="action">
            Done
          </button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="crypto-deposit">
        <h1 className="crypto-deposit__header">
          <ImageIcon icon={wallet.logo} title={wallet.name} />
          Add Funds using { wallet.name }
        </h1>
        <div className="crypto-deposit__form">
          <div className="crypto-deposit__inputs">
            <div className="crypto-deposit__labelled-input">
              <label>Amount to be Deposited</label>
              <div className="crypto-deposit__input-container">
                <input value={amountCrypto} onChange={event => SetAmount({crypto: event.target.value})} onBlur={SetAmount} />
                <ImageIcon icon={wallet.currencyLogo} title={wallet.currencyName} />
              </div>
            </div>
            <ImageIcon className="crypto-deposit__exchange-icon" icon={ConversionIcon} title="Conversion" />
            <div className="crypto-deposit__labelled-input">
              <label>Result of the Deposit</label>
              <div className="crypto-deposit__input-container">
                <input value={amountUSD} onChange={event => SetAmount({usd: event.target.value})} onBlur={SetAmount} />
                <ImageIcon icon={USDIcon} title="USD" />
              </div>
            </div>
          </div>
          <div className="crypto-deposit__note">
            Note: This is an estimate of the exchanged value. The precise deposit value will depend on the exchange rate when the transaction occurs.
          </div>
        </div>
        <div className="actions crypto-deposit__actions">
          <button onClick={Close} className="action">
            Cancel
          </button>
          <ButtonWithLoader
            disabled={isNaN(parseFloat(amountCrypto)) || parseFloat(amountCrypto) <= 0}
            onClick={async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              setConfirmation("asd");
            }}
            className="action action-primary"
          >
            Commit Deposit
          </ButtonWithLoader>
        </div>
      </div>
    );
  }

  return (
    <Modal Toggle={() => Close()} className="crypto-deposit-modal">
      { content }
    </Modal>
  );
});

const WalletLink = observer(({type="metamask"}) => {
  const wallet = cryptoStore.WalletFunctions(type);

  const [connecting, setConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [connected, setConnected] = useState(wallet.Connected());

  useEffect(() => {
    setConnected(wallet.Connected());
  }, [cryptoStore.metamaskChainId, cryptoStore.metamaskAddress, cryptoStore.phantomAddress]);

  let content;
  if(!wallet.Available()) {
    content = (
      <a target="_blank" rel="noopener noreferrer" href={wallet.link} className="profile-crypto__link profile-crypto__link-missing">
        <ImageIcon icon={wallet.logo} title={wallet.name} />
        Get { wallet.name }
      </a>
    );
  } else if(!connected) {
    content = (
      <button
        className="profile-crypto__link profile-crypto__link-connect"
        onClick={async () => {
          try {
            setConnecting(true);
            await wallet.Connect();

            setConnected(await wallet.Connected());
          } catch(error) {
            rootStore.Log("Failed to connect", true);
            rootStore.Log(error, true);
          } finally {
            setConnecting(false);
          }
        }}
      >
        { connecting ? <Loader className="profile-crypto__link__loader" /> : <ImageIcon icon={wallet.logo} title={wallet.name} /> }
        Link { wallet.name }
      </button>
    );
  } else {
    const connection = wallet.Connection();
    content = (
      <>
        <button
          className="profile-crypto__link profile-crypto__link-connected"
          onClick={() => setShowModal(true)}
        >

          <div className="profile-crypto__link__left">
            <ImageIcon icon={wallet.logo} title={wallet.name}/>
            Connected
          </div>
          <div className="profile-crypto__link__right">
            + Add Funds
          </div>
        </button>
        {
          connection ?
            <div className="profile-crypto__link__message">
              Connected { connection.connected_at }
            </div> : null
        }
        <div className="profile-crypto__link__network-info">
          <div className="profile-crypto__link__network-name">
            <ImageIcon icon={wallet.currencyLogo} title={wallet.currencyName} />
            { wallet.networkName }
          </div>
          <div className="profile-crypto__link__network-address ellipsis">
            { wallet.Address() }
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      { showModal ? <CryptoDepositModal type={type} Close={() => setShowModal(false)} /> : null }
      <div className="profile-crypto__link-container">
        { content }
      </div>
    </>
  );
});

export const CryptoProfile = observer(() => {
  const [showConnections, setShowConnections] = useState(false);
  const [showDepositHistory, setShowDepositHistory] = useState(false);

  return (
    <div className="profile-page__section-crypto profile-crypto">
      <button className="profile-crypto__connect" onClick={() => setShowConnections(!showConnections)}>
        Connect wallet to top up
        <ImageIcon icon={MetamaskLogo} title="Metamask" />
        <ImageIcon icon={PhantomLogo} title="Phantom" />
      </button>

      { showConnections ?
        <div className="profile-crypto__links">
          <WalletLink type="metamask"/>
          <WalletLink type="phantom"/>
        </div> : null
      }

      <button className="profile-crypto__deposit-link" onClick={() => setShowDepositHistory(!showDepositHistory)}>
        { showDepositHistory ? "Hide" : "View"} Deposit History
      </button>
    </div>
  );
});
