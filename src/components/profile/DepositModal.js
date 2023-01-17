import React, {useState} from "react";
import Modal from "Components/common/Modal";
import {observer} from "mobx-react";
import {ButtonWithLoader, Select} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {checkoutStore} from "Stores";
import {ValidEmail} from "../../utils/Utils";
import {useRouteMatch} from "react-router-dom";

import USDIcon from "Assets/icons/crypto/USD icon.svg";

const DepositModal = observer(({Close}) => {
  const match = useRouteMatch();

  const [amount, setAmount] = useState("50.00");
  const [selectedProvider, setSelectedProvider] = useState(undefined);
  const [provider, setProvider] = useState("Coinbase Commerce");

  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [email, setEmail] = useState(initialEmail);

  const parsedAmount = isNaN(parseFloat(amount)) ? 0 : parseFloat(amount);
  const invalid = parsedAmount > 1000;

  let content;
  if(selectedProvider) {
    content = (
      <div className="deposit-form">
        <div className="deposit-form__header">
          Add Funds
        </div>
        <div className="deposit-form__content">
          <div className="deposit-form__message">
            This is a secure payment method using Coinbase Commerce. Only ETH, BTC, BCH, USDC, and DAI via the Ethereum mainnet are supported.
          </div>
          <div className="deposit-form__message">
            Please specify the amount you wish to deposit.
          </div>
          <div className="deposit-form__inputs">
            {
              !ValidEmail(initialEmail) ?
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="deposit-form__input deposit-form__input--email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                /> : null
            }
            <div className="deposit-form__input-container">
              <ImageIcon icon={USDIcon} className="deposit-form__input__icon" />
              <input
                placeholder="Set Price"
                className={`deposit-form__input with-icon ${invalid ? "deposit-form__input-error" : ""}`}
                value={amount}
                onChange={event => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                onBlur={() => setAmount(parsedAmount.toFixed(2))}
              />
            </div>
            {
              invalid ?
                <div className="deposit-form__input__error">
                  Maximum deposit is $1000.
                </div> : null
            }
          </div>
          <div className="deposit-form__message deposit-form__message--terms">
            Processing time varies depending on the network, and can take several minutes to complete. Standard network fees apply. Deposits are limited to $1000 per transaction and $10,000 per day, and are subject to the <a href="https://live.eluv.io/terms" target="_blank">Eluvio Terms and Conditions</a>. By clicking "Continue" you acknowledge that you have read and understood all of these terms and conditions.
          </div>
          <div className="deposit-form__actions">
            <button className="action" onClick={() => setSelectedProvider(undefined)}>
              Cancel
            </button>
            <ButtonWithLoader
              disabled={!ValidEmail(email)}
              onClick={async () => {
                await checkoutStore.BalanceCheckoutSubmit({
                  marketplaceId: match.params.marketplaceId,
                  amount: parsedAmount,
                  email,
                  provider: selectedProvider
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
              }}
              className="action action-primary"
            >
              Continue
            </ButtonWithLoader>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="deposit-form">
        <div className="deposit-form__header">
          Add Funds
        </div>
        <div className="deposit-form__content">
          <div className="deposit-form__message">
            Please select a provider
          </div>
          <Select
            value={provider}
            onChange={value => setProvider(value)}
            containerClassName="deposit-form__select"
            options={["Coinbase Commerce"]}
          />
          <div className="deposit-form__actions">
            <button className="action" onClick={() => Close()}>
              Cancel
            </button>
            <button onClick={() => setSelectedProvider(provider)} className="action action-primary">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal Toggle={Close} className="deposit-modal">
      { content }
    </Modal>
  );
});

export default DepositModal;
