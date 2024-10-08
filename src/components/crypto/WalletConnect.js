import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {cryptoStore, rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";

import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import HelpIcon from "Assets/icons/help-circle.svg";

const WalletConnect = observer(({type="phantom", showPaymentPreference, onConnect}) => {
  const wallet = cryptoStore.WalletFunctions(type);
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

  useEffect(() => {
    if(connected) {
      wallet.Balance();
    }
  }, [connected]);

  const UpdatePaymentPreference = async (event) => {
    const preference = event.target.checked || false;
    try {
      setErrorMessage(undefined);
      await wallet.Connect({setPreferred: true, preferLinkedWalletPayment: preference});

      setPaymentPreference(preference);
    } catch(error){
      rootStore.Log(error, true);
      setPaymentPreference(!preference);

      if(error.message === "Incorrect account") {
        setErrorMessage(
          LocalizeString(rootStore.l10n.connected_accounts.errors.incorrect_account, { walletName: wallet.name })
        );
        setErrorMessage(`Incorrect ${wallet.name} account active. Please switch to ${connectedAccount.link_acct}.`);
      } else {
        setErrorMessage(rootStore.l10n.connected_accounts.errors.general);
      }
    }
  };

  const connectButton =
    connected && connectedAccount ?
      <div className="wallet-connect__linked">
        <ImageIcon icon={wallet.logo} title={wallet.name} />
        { LocalizeString(rootStore.l10n.connected_accounts.wallet_connected, { walletName: wallet.name }) }
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

              onConnect && onConnect();
            } catch(error) {
              rootStore.Log(error, true);

              if(error.status === 409) {
                setErrorMessage(
                  LocalizeString(rootStore.l10n.connected_accounts.errors.already_connected, { walletName: wallet.name })
                );
              } else {
                setErrorMessage(rootStore.l10n.connected_accounts.errors.general);
              }
            }
          }}
        >
          <ImageIcon icon={wallet.logo} title={wallet.name} />
          { LocalizeString(rootStore.l10n.connected_accounts.connect_wallet, { walletName: wallet.name }) }
        </ButtonWithLoader> :
        <a target="_blank" rel="noopener noreferrer" href={wallet.link} className="action wallet-connect__link-button wallet-connect__download-link">
          <ImageIcon icon={wallet.logo} title={wallet.name} />
          { LocalizeString(rootStore.l10n.connected_accounts.get_wallet, { walletName: wallet.name }) }
        </a>;

  if(connectedAccount) {
    return (
      <div className="wallet-connect wallet-connect--connected">
        { connectButton }
        { incorrectAccount ? <div className="wallet-connect__warning">{LocalizeString(rootStore.l10n.connected_accounts.errors.incorrect_account, { walletName: wallet.name }) }</div> : null }
        <div className="wallet-connect__info" key={`wallet-connection-${connectedAccount.link_acct}`}>
          <div className="wallet-connect__connected-at">
            { LocalizeString(rootStore.l10n.connected_accounts.linked_at, { date: connectedAccount.connected_at }) }
          </div>
          <div className="wallet-connect__network-info">
            <div className="wallet-connect__network-name">
              <ImageIcon icon={wallet.currencyLogo} title={wallet.currencyName} />
              { wallet.networkName } { rootStore.l10n.connected_accounts.wallet_address }
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
                  { rootStore.l10n.connected_accounts.direct }
                </label>
                <button className="wallet-connect__payment-preference__help-button" onClick={() => setShowPaymentPreferenceInfo(!showPaymentPreferenceInfo)}>
                  <ImageIcon icon={HelpIcon} label="More Info"/>
                </button>
              </div> : null
          }
          {
            showPaymentPreferenceInfo ?
              <div className="wallet-connect__payment-preference-info">
                { rootStore.l10n.connected_accounts.direct_info }
              </div> : null
          }
          <ButtonWithLoader
            className="wallet-connect__unlink-button"
            onClick={async () => await Confirm({message: rootStore.l10n.connected_accounts.unlink_wallet_confirm, Confirm: async () => await wallet.Disconnect(connectedAccount.link_acct)})}
          >
            { rootStore.l10n.connected_accounts.unlink_wallet }
          </ButtonWithLoader>
        </div>
        { errorMessage ? <div className="wallet-connect__error-message">{ errorMessage }</div> : null }
      </div>
    );
  }

  return (
    <>
      <div className="wallet-connect">
        <h2 className="wallet-connect__header">{ LocalizeString(rootStore.l10n.connected_accounts.link_wallet_2, { networkName: wallet.networkName}) }</h2>
        <div className="wallet-connect__section">
          <div className="wallet-connect__info">
            <div className="wallet-connect__message">
              { LocalizeString(rootStore.l10n.connected_accounts.description, { usdcIcon: <ImageIcon key="usdc-icon" icon={USDCIcon} title="USDC" />, networkName: wallet.networkName }) }
            </div>
            { connectButton}
          </div>
        </div>
        <div className="wallet-connect__help-link">
          <a href="https://eluviolive.zendesk.com/hc/en-us/articles/5126073304081-How-do-I-link-my-Phantom-Wallet-" target="_blank" rel="noopener noreferrer">
            { rootStore.l10n.connected_accounts.how_to_link }
          </a>
        </div>
      </div>
      { errorMessage ? <div className="wallet-connect__error-message">{ errorMessage }</div> : null }
    </>
  );
});

export default WalletConnect;
