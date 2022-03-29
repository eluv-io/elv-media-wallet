import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {cryptoStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";
import Modal from "Components/common/Modal";

import WalletUnlinkedIcon from "Assets/icons/unlinked wallet icon.svg";
import WalletLinkedIcon from "Assets/icons/linked wallet icon.svg";
import USDCIcon from "Assets/icons/USDC coin icon.svg";


const WalletConnect = observer(() => {
  const wallet = cryptoStore.WalletFunctions("phantom");
  const [connected, setConnected] = useState(wallet.Connected());

  useEffect(() => {
    setConnected(wallet.Connected());
  }, [Object.keys(cryptoStore.connectedAccounts.sol)]);

  if(connected) {
    const connection = wallet.Connection();
    return (
      <div className="wallet-connect wallet-connect--connected">
        <div className="wallet-connect__info">
          <div className="wallet-connect__linked">
            <ImageIcon icon={wallet.logo} title="Phantom" /> Phantom Linked
          </div>
          <div className="wallet-connect__connected-at">
            Linked { connection.connected_at }
          </div>
          <div className="wallet-connect__network-info">
            <div className="wallet-connect__network-name">
              <ImageIcon icon={wallet.currencyLogo} title={wallet.currencyName} />
              { wallet.networkName } Wallet Address
            </div>
            <div className="wallet-connect__network-address ellipsis" title={wallet.Address()}>
              { wallet.Address() }
            </div>
          </div>
          <ButtonWithLoader
            className="wallet-connect__unlink-button"
            onClick={async () => await Confirm({message: "Are you sure you want to disconnect this account?", Confirm: async () => await wallet.Disconnect()})}
          >
            Unlink Wallet
          </ButtonWithLoader>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <h2 className="wallet-connect__header">Link Payment Wallet</h2>
      <div className="wallet-connect__section">
        <div className="wallet-connect__info">
          <div className="wallet-connect__message">
            To buy and sell NFTs using <ImageIcon icon={USDCIcon} title="USDC" /> USDC, link your Eluvio Media Wallet to your payment wallet.
          </div>
          {
            wallet.Available() ?
              <ButtonWithLoader
                className="wallet-connect__link-button"
                onClick={async () => {
                  await wallet.Connect();
                  setConnected(true);
                }}
              >
                <ImageIcon icon={wallet.logo} title="Phantom" /> Link Phantom
              </ButtonWithLoader> :
              <a target="_blank" rel="noopener" href={wallet.link} className="wallet-connect__link-button wallet-connect__download-link">
                <ImageIcon icon={wallet.logo} title={wallet.name} />
                Get { wallet.name }
              </a>
          }
        </div>
      </div>
    </div>
  );
});

export const WalletConnectButton = observer(() => {
  const connected = cryptoStore.WalletFunctions("phantom").Connected();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <button
        onClick={event => {
          event.stopPropagation();
          event.preventDefault();
          setShowMenu(!showMenu);
        }}
        className="header__profile__connected-button"
        title="Connect Phantom"
      >
        <ImageIcon
          icon={connected ? WalletLinkedIcon : WalletUnlinkedIcon}
          label="Not Connected"
        />
      </button>


      {
        showMenu ? <Modal Toggle={() => setShowMenu(false)} className="wallet-connect-modal"><WalletConnect /></Modal> : null
      }
    </>
  );
});

export default WalletConnect;
