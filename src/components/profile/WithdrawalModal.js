import React, {useState, useEffect} from "react";
import {cryptoStore, rootStore} from "Stores";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, FormatPriceString, LocalizeString, Select} from "Components/common/UIComponents";
import {roundToUp} from "round-to";

import SupportedCountries from "../../utils/SupportedCountries";
import {ValidEmail} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import {useRouteMatch} from "react-router-dom";

const priceOptions = {stringOnly: true};

// Step 3 - Confirmation
const WithdrawalConfirmation = observer(({payout, provider, Close}) => {
  return (
    <div className="withdrawal-confirmation">
      <h1 className="withdrawal-confirmation__header">
        { rootStore.l10n.withdrawal[`withdraw_via_${provider.toLowerCase()}`] }
      </h1>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          { LocalizeString(rootStore.l10n.withdrawal.successful_withdrawal, { amount: FormatPriceString(payout, priceOptions)}) }
        </div>
        <div className="withdrawal-confirmation__details">
          <div className="withdrawal-confirmation__detail">
            <label>{ rootStore.l10n.withdrawal.total_payout }</label>
            <div>{FormatPriceString(payout, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>{ rootStore.l10n.withdrawal.remaining_withdrawable_funds }</label>
            <div>{FormatPriceString(rootStore.withdrawableWalletBalance, priceOptions)}</div>
          </div>
        </div>
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Close()}>
            { rootStore.l10n.actions.close }
          </button>
        </div>
      </div>
    </div>
  );
});

// Step 2/3 - Amount selection
const Withdrawal = observer(({provider, userInfo, Continue, Cancel, Close}) => {
  const [amount, setAmount] = useState(parseFloat((rootStore.withdrawableWalletBalance || 0)).toFixed(2));
  const [errorMessage, setErrorMessage] = useState(undefined);
  const parsedAmount = isNaN(parseFloat(amount)) ? 0 : parseFloat(amount || 0);
  const payout = roundToUp(parsedAmount * 0.99, 2);

  const stripeInactive = provider === "Stripe" && rootStore.userStripeId && !rootStore.userStripeEnabled;

  return (
    <div className="withdrawal-confirmation">
      <h1 className="withdrawal-confirmation__header">
        { rootStore.l10n.withdrawal[`withdraw_via_${provider.toLowerCase()}`] }
      </h1>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__amount-selection">
          <div className="labelled-input">
            <label htmlFor="amount">{ rootStore.l10n.withdrawal.fields.amount }</label>
            <input
              name="amount"
              placeholder="Price"
              className={`withdrawal-confirmation__price-input ${parsedAmount > rootStore.withdrawableWalletBalance ? "withdrawal-confirmation__price-input-error" : ""}`}
              value={amount}
              onChange={event => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              onBlur={() => setAmount(parsedAmount.toFixed(2))}
            />
            <div className="withdrawal-confirmation__price-input-label">
              USD
            </div>
          </div>
          {
            parsedAmount > rootStore.withdrawableWalletBalance ?
              <div className="withdrawal-confirmation__input-error">
                { LocalizeString(rootStore.l10n.withdrawal.max_withdrawable, { max: FormatPriceString(rootStore.withdrawableWalletBalance, priceOptions)}) }
              </div> : null
          }
        </div>
        <div className="withdrawal-confirmation__details">
          <div className="withdrawal-confirmation__detail">
            <label>{ rootStore.l10n.withdrawal.available_funds }</label>
            <div>{FormatPriceString(rootStore.withdrawableWalletBalance, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>{ rootStore.l10n.withdrawal.withdrawn_funds }</label>
            <div>{FormatPriceString(parsedAmount, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail-separator"/>
          <div className="withdrawal-confirmation__detail withdrawal-confirmation__detail-faded">
            <label>{ rootStore.l10n.withdrawal.processing_fee }</label>
            <div>{FormatPriceString((parsedAmount - payout), priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>{ rootStore.l10n.withdrawal.total_payout }</label>
            <div>{FormatPriceString(payout, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>{ rootStore.l10n.withdrawal.remaining_funds }</label>
            <div>{FormatPriceString(rootStore.withdrawableWalletBalance - parsedAmount, priceOptions)}</div>
          </div>
        </div>
        {
          stripeInactive ?
            <div className="profile-page__withdrawal-setup-message">
              { rootStore.l10n.withdrawal.errors.stripe_not_set_up }
            </div> : null
        }
        {
          errorMessage ?
            <div className="withdrawal-confirmation__error">
              {errorMessage}
            </div> : null
        }
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => (Cancel || Close)()}>
            { rootStore.l10n.actions[Cancel ? "back" : "cancel"] }
          </button>
          <ButtonWithLoader
            className="action action-primary"
            disabled={parsedAmount <= 0 || parsedAmount > rootStore.withdrawableWalletBalance}
            onClick={async () => {
              setErrorMessage(undefined);

              try {
                await rootStore.WithdrawFunds({provider, userInfo, amount: parsedAmount});
                Continue(payout);
              } catch(error) {
                rootStore.Log(error, true);

                if(error?.uiMessage) {
                  setErrorMessage(error.uiMessage);
                } else {
                  setErrorMessage(rootStore.l10n.withdrawal.errors.general);
                }
              }
            }}
          >
            { rootStore.l10n.withdrawal.withdraw_funds }
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});


// Ebanx, Step 2
const EbanxUserInfo = ({userInfo, setUserInfo, Continue, Cancel}) => {
  let valid =
    ValidEmail(userInfo.email) &&
    userInfo.name &&
    userInfo.phone &&
    userInfo.cpf &&
    userInfo.pix_key &&
    userInfo.birthdate &&
    isFinite(new Date(userInfo.birthdate));

  return (
    <div className="withdrawal-confirmation">
      <h1 className="withdrawal-confirmation__header">{ rootStore.l10n.withdrawal.withdraw_via_ebanx }</h1>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__form">
          <div className="labelled-input">
            <label htmlFor="email">
              { rootStore.l10n.withdrawal.method }
            </label>
            <Select
              value={userInfo.method}
              onChange={event => setUserInfo({...userInfo, method: event.target.value})}
              disabled={true}
              containerClassName="withdrawal-confirmation__form__select"
              options={["PIX"]}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="email">
              { rootStore.l10n.withdrawal.fields.email }
            </label>
            <input
              name="email"
              type="email"
              value={userInfo.email}
              onChange={event => setUserInfo({...userInfo, email: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="name">
              { rootStore.l10n.withdrawal.fields.name }
            </label>
            <input
              name="name"
              type="text"
              value={userInfo.name}
              onChange={event => setUserInfo({...userInfo, name: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="phone">
              { rootStore.l10n.withdrawal.fields.phone }
            </label>
            <input
              name="phone"
              type="phone"
              value={userInfo.phone}
              onChange={event => setUserInfo({...userInfo, phone: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="birthdate">
              { rootStore.l10n.withdrawal.fields.birthdate }
            </label>
            <input
              name="birthdate"
              type="date"
              value={userInfo.birthdate}
              onChange={event => setUserInfo({...userInfo, birthdate: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="cpf">
              { rootStore.l10n.withdrawal.fields.cpf }
            </label>
            <input
              name="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={userInfo.cpf}
              onChange={event => setUserInfo({...userInfo, cpf: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="pix_key">
              { rootStore.l10n.withdrawal.fields.pix_key }
            </label>
            <input
              name="pix_key"
              type="text"
              placeholder={rootStore.l10n.withdrawal.fields.pix_key_placeholder}
              value={userInfo.pix_key}
              onChange={event => setUserInfo({...userInfo, pix_key: event.target.value})}
            />
          </div>
        </div>
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Cancel()}>
            { rootStore.l10n.actions.cancel }
          </button>
          <button disabled={!valid} onClick={() => Continue()} className="action action-primary profile-page__onboard-button">
            { rootStore.l10n.actions.continue }
          </button>
        </div>
      </div>
    </div>
  );
};

// Stripe, Step 2 if not set up
const StripeSetup = observer(({Cancel, Close}) => {
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [countryCode, setCountryCode] = useState("");

  useEffect(() => {
    rootStore.GetWalletBalance(true)
      .then(() => setBalanceLoaded(true));
  }, []);

  if(!balanceLoaded) {
    return (
      <div className="withdrawal-confirmation">
        <div className="withdrawal-confirmation__header">
          { rootStore.l10n.withdrawal.set_up_withdrawal_stripe }
        </div>
        <div className="withdrawal-confirmation__content">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="withdrawal-confirmation">
      <div className="withdrawal-confirmation__header">
        { rootStore.l10n.withdrawal.set_up_withdrawal_stripe }
      </div>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          { rootStore.l10n.withdrawal.select_country }
        </div>
        <Select
          value={countryCode}
          onChange={value => setCountryCode(value)}
          containerClassName="withdrawal-confirmation__country-select"
          options={[
            ["", rootStore.l10n.withdrawal.select_country],
            ...SupportedCountries.stripe
          ]}
        />
        {
          errorMessage ?
            <div className="withdrawal-confirmation__error">
              { errorMessage }
            </div> : null
        }
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Cancel()}>
            { rootStore.l10n.actions.cancel }
          </button>
          <ButtonWithLoader
            disabled={!countryCode}
            onClick={async () => {
              try {
                rootStore.StripeOnboard(countryCode);
                await new Promise(resolve => setTimeout(resolve, 3000));
                Close();
              } catch(error) {
                rootStore.Log(error, true);
                setErrorMessage(rootStore.l10n.withdrawal.errors.setup);
              }
            }}
            className="action action-primary profile-page__onboard-button"
          >
            { rootStore.l10n.withdrawal.set_up_withdrawal }
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

// Circle, Step 2 - Link account
const CircleSetup = observer(({Continue, Cancel}) => {
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    cryptoStore.LoadConnectedAccounts()
      .then(() => {
        setConnected(cryptoStore.CircleConnected());
        setAccountLoaded(true);
      });
  }, []);

  if(!accountLoaded) {
    return (
      <div className="withdrawal-confirmation">
        <div className="withdrawal-confirmation__header">
          { rootStore.l10n.withdrawal.set_up_withdrawal_circle }
        </div>
        <div className="withdrawal-confirmation__content">
          <Loader />
        </div>
      </div>
    );
  }

  if(!connected) {
    return (
      <div className="withdrawal-confirmation">
        <div className="withdrawal-confirmation__header">
          { rootStore.l10n.withdrawal.set_up_withdrawal_circle }
        </div>
        <div className="withdrawal-confirmation__content">
          <div className="withdrawal-confirmation__form">
            <div className="labelled-input">
              <label htmlFor="chain">
                { rootStore.l10n.withdrawal.fields.chain }
              </label>
              <Select
                value={chain}
                onChange={value => setChain(value)}
                containerClassName="withdrawal-confirmation__form__select"
                options={[
                  ["", rootStore.l10n.withdrawal.select_chain],
                  ...cryptoStore.CircleSupportedChains()
                ]}
              />
            </div>
            <div className="labelled-input">
              <label htmlFor="address">
                { rootStore.l10n.withdrawal.fields.address }
              </label>
              <input
                className="labelled-input__input--address"
                type="address"
                value={address}
                onChange={event => setAddress(event.target.value)}
              />
            </div>
          </div>
          {
            errorMessage ?
              <div className="withdrawal-confirmation__error">
                { errorMessage }
              </div> : null
          }
          <div className="withdrawal-confirmation__actions">
            <button className="action" onClick={() => Cancel()}>
              { rootStore.l10n.actions.cancel }
            </button>
            <ButtonWithLoader
              disabled={!chain || !address}
              onClick={async () => {
                try {
                  await cryptoStore.ConnectCircle({address, chain});
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  setConnected(true);
                } catch(error) {
                  rootStore.Log(error, true);
                  setErrorMessage(rootStore.l10n.withdrawal.errors.setup);
                }
              }}
              className="action action-primary profile-page__onboard-button"
            >
              { rootStore.l10n.withdrawal.connect_circle_usdc }
            </ButtonWithLoader>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="withdrawal-confirmation">
      <div className="withdrawal-confirmation__header">
        { rootStore.l10n.withdrawal.set_up_withdrawal_circle }
      </div>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          { rootStore.l10n.withdrawal.circle_usdc_withdrawal_message }
        </div>
        <div className="withdrawal-confirmation__account-details">
          <div className="withdrawal-confirmation__account-detail">
            <label>{ rootStore.l10n.withdrawal.circle_account.chain }</label>
            <div>{ cryptoStore.CircleChain() }</div>
          </div>
          <div className="withdrawal-confirmation__account-detail">
            <label>{ rootStore.l10n.withdrawal.circle_account.address }</label>
            <div className="withdrawal-confirmation__account-detail__address ellipsis">{ cryptoStore.CircleAddress() }</div>
          </div>
          <div className="withdrawal-confirmation__account-detail">
            <label>{ rootStore.l10n.withdrawal.circle_account.account_id }</label>
            <div className="withdrawal-confirmation__account-detail__address ellipsis">{ cryptoStore.CircleAccountId() }</div>
          </div>
        </div>
        <div className="withdrawal-confirmation__actions">
          <button
            disabled={!connected}
            onClick={() => setConnected(false)}
            className="action action-danger"
          >
            { rootStore.l10n.withdrawal.change_account }
          </button>
        </div>
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Cancel()}>
            { rootStore.l10n.actions.cancel }
          </button>
          <ButtonWithLoader
            disabled={!connected}
            onClick={Continue}
            className="action action-primary"
          >
            { rootStore.l10n.actions.continue }
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

// Step 1
const ProviderSelection = observer(({Continue, Cancel}) => {
  const [provider, setProvider] = useState("Stripe");

  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  let options = marketplace?.payment_options?.circle?.enabled
    ? [["Stripe", "Stripe"], ["EBANX", "EBANX (Brazil Only)"], ["Circle", "Circle USDC"]]
    : [["Stripe", "Stripe"], ["EBANX", "EBANX (Brazil Only)"]];

  return (
    <div className="withdrawal-confirmation">
      <div className="withdrawal-confirmation__header">
        { rootStore.l10n.withdrawal.withdraw_funds }
      </div>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          { rootStore.l10n.withdrawal.select_provider }
        </div>
        <Select
          value={provider}
          onChange={value => setProvider(value)}
          containerClassName="withdrawal-confirmation__country-select"
          options={options}
        />
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Cancel()}>
            { rootStore.l10n.actions.cancel }
          </button>
          <button onClick={() => Continue(provider)} className="action action-primary profile-page__onboard-button">
            { rootStore.l10n.actions.continue }
          </button>
        </div>
      </div>
    </div>
  );
});

const WithdrawalModal = observer(({Close}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const ebanxAvailable = marketplace?.payment_options?.ebanx?.enabled || false;

  const [provider, setProvider] = useState(undefined);
  const [payout, setPayout] = useState(undefined);
  const [userInfo, setUserInfo] = useState({
    method: "PIX",
    email: rootStore.AccountEmail(rootStore.CurrentAddress()) || rootStore.walletClient.UserInfo()?.email || "",
    name: "",
    phone: "",
    cpf: "",
    pix_key: "",
    birthdate: ""
  });
  const [userInfoConfirmed, setUserInfoConfirmed] = useState(false);

  let content;
  if(!provider) {
    content = <ProviderSelection Continue={provider => setProvider(provider)} Cancel={Close}/>;
  } else if(provider === "Circle" && !userInfoConfirmed) {
    content = <CircleSetup Cancel={() => setProvider(undefined)} Continue={() => setUserInfoConfirmed(true)} />;
  } else if(provider === "Stripe" && !rootStore.userStripeId) {
    content = <StripeSetup Cancel={() => ebanxAvailable ? setProvider(undefined) : Close()} Close={Close} />;
  } else if(provider === "EBANX" && !userInfoConfirmed) {
    content = <EbanxUserInfo userInfo={userInfo} setUserInfo={setUserInfo} Continue={() => setUserInfoConfirmed(true)} Cancel={() => setProvider(undefined)} />;
  } else if(!payout) {
    content = <Withdrawal userInfo={userInfo} provider={provider} Continue={payout => setPayout(payout)} Cancel={!ebanxAvailable ? undefined : () => provider === "EBANX" ? setUserInfoConfirmed(false) : setProvider(undefined)} Close={Close} />;
  } else {
    content = <WithdrawalConfirmation payout={payout} provider={provider} Close={Close} />;
  }

  return (
    <Modal className="withdrawal-modal" Toggle={Close} >
      { content }
    </Modal>
  );
});

export default WithdrawalModal;
