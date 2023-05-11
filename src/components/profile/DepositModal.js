import React, {useState} from "react";
import Modal from "Components/common/Modal";
import {observer} from "mobx-react";
import {ButtonWithLoader, RichText, Select} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {rootStore, checkoutStore} from "Stores";
import {ValidEmail} from "../../utils/Utils";
import {useRouteMatch} from "react-router-dom";

import USDIcon from "Assets/icons/crypto/USD icon.svg";

const DepositModal = observer(({Close}) => {
  const match = useRouteMatch();

  const [amount, setAmount] = useState("50.00");
  const [selectedProvider, setSelectedProvider] = useState(undefined);
  const [provider, setProvider] = useState("coinbase");

  const initialEmail = rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "";
  const [email, setEmail] = useState(initialEmail);

  const parsedAmount = isNaN(parseFloat(amount)) ? 0 : parseFloat(amount);
  const invalid = parsedAmount > 1000;

  let content;
  if(selectedProvider) {
    content = (
      <div className="deposit-form">
        <div className="deposit-form__header">
          { rootStore.l10n.deposits.add_funds }
        </div>
        <div className="deposit-form__content">
          <div className="deposit-form__message">
            { rootStore.l10n.deposits.supported_methods }
          </div>
          <div className="deposit-form__message">
            { rootStore.l10n.deposits.specify_amount }
          </div>
          <div className="deposit-form__inputs">
            {
              !ValidEmail(initialEmail) ?
                <input
                  type="email"
                  name="email"
                  placeholder={rootStore.l10n.withdrawal.fields.email}
                  className="deposit-form__input deposit-form__input--email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                /> : null
            }
            <div className="deposit-form__input-container">
              <ImageIcon icon={USDIcon} className="deposit-form__input__icon" />
              <input
                placeholder={rootStore.l10n.purchase.set_price}
                className={`deposit-form__input with-icon ${invalid ? "deposit-form__input-error" : ""}`}
                value={amount}
                onChange={event => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                onBlur={() => setAmount(parsedAmount.toFixed(2))}
              />
            </div>
            {
              invalid ?
                <div className="deposit-form__input__error">
                  { rootStore.l10n.deposits.max_deposit }
                </div> : null
            }
          </div>
          <RichText
            className="deposit-form__message deposit-form__message--terms"
            richText={rootStore.l10n.deposits.terms}
          />
          <div className="deposit-form__actions">
            <button className="action" onClick={() => setSelectedProvider(undefined)}>
              { rootStore.l10n.actions.cancel }
            </button>
            <ButtonWithLoader
              disabled={!ValidEmail(email)}
              onClick={async () => {
                await checkoutStore.BalanceCheckoutSubmit({
                  marketplaceId: match.params.marketplaceId,
                  amount: parsedAmount,
                  email,
                  provider: selectedProvider,
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
              }}
              className="action action-primary"
            >
              { rootStore.l10n.actions.continue }
            </ButtonWithLoader>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="deposit-form">
        <div className="deposit-form__header">
          { rootStore.l10n.deposits.add_funds }
        </div>
        <div className="deposit-form__content">
          <div className="deposit-form__message">
            { rootStore.l10n.deposits.select_provider }
          </div>
          <Select
            value={provider}
            onChange={value => setProvider(value)}
            containerClassName="deposit-form__select"
            options={[["coinbase", "Coinbase Commerce"], ["stripe", "Stripe"]]}
          />
          <div className="deposit-form__actions">
            <button className="action" onClick={() => Close()}>
              { rootStore.l10n.actions.cancel }
            </button>
            <button onClick={() => setSelectedProvider(provider)} className="action action-primary">
              { rootStore.l10n.actions.continue }
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
