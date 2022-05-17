import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {cryptoStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";
import Modal from "Components/common/Modal";

import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";

const WalletConnect = observer(() => {
  const wallet = cryptoStore.WalletFunctions("phantom");
  const [connected, setConnected] = useState(wallet.Connected());
  const [errorMessage, setErrorMessage] = useState(undefined);

  useEffect(() => {
    setConnected(wallet.Connected());
  }, [cryptoStore.metamaskAddress, cryptoStore.metamaskChainId, cryptoStore.phantomAddress, Object.keys(cryptoStore.connectedAccounts.sol)]);

  const connectedAccounts = wallet.ConnectedAccounts();
  const incorrectAccount = connectedAccounts.length > 0 && wallet.Address() && !connectedAccounts.find(account => account.link_acct === wallet.Address());

  const connectButton =
    connected && connectedAccounts.length > 0 ?
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

  if(connectedAccounts.length > 0) {
    return (
      <div className="wallet-connect wallet-connect--connected">
        { connectButton }
        { incorrectAccount ? <div className="wallet-connect__warning">Please select the account below in your Phantom extension to connect</div> : null }
        {
          connectedAccounts.map(connection =>
            <div className="wallet-connect__info" key={`wallet-connection-${connection.link_acct}`}>
              <div className="wallet-connect__connected-at">
                Linked { connection.connected_at }
              </div>
              <div className="wallet-connect__network-info">
                <div className="wallet-connect__network-name">
                  <ImageIcon icon={wallet.currencyLogo} title={wallet.currencyName} />
                  { wallet.networkName } Wallet Address
                </div>
                <div className="wallet-connect__network-address ellipsis" title={connection.link_acct}>
                  { connection.link_acct }
                </div>
              </div>
              <ButtonWithLoader
                className="wallet-connect__unlink-button"
                onClick={async () => await Confirm({message: "Are you sure you want to disconnect this account?", Confirm: async () => await wallet.Disconnect(connection.link_acct)})}
              >
                Unlink Wallet
              </ButtonWithLoader>
            </div>
          )
        }
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
              To buy and sell NFTs using <ImageIcon icon={USDCIcon} title="USDC" /> USDC, link your Eluvio Media Wallet to your payment wallet.
            </div>
            { connectButton}
          </div>
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
          event.stopPropagation();
          event.preventDefault();
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
        showMenu ? <Modal Toggle={() => setShowMenu(false)} className="wallet-connect-modal"><WalletConnect /></Modal> : null
      }
    </>
  );
});

export default WalletConnect;
