import React, {useState, useEffect} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, FormatPriceString, Select} from "Components/common/UIComponents";
import {roundToUp} from "round-to";

import SupportedCountries from "../../utils/SupportedCountries";
import {ValidEmail} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import {useRouteMatch} from "react-router-dom";

const priceOptions = {excludeAlternateCurrency: true, stringOnly: true};

// Step 3 - Confirmation
const WithdrawalConfirmation = observer(({payout, provider, Close}) => {
  return (
    <div className="withdrawal-confirmation">
      <h1 className="withdrawal-confirmation__header">Withdraw Funds via {provider}</h1>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          {FormatPriceString(payout, priceOptions)} successfully transferred to your account
        </div>
        <div className="withdrawal-confirmation__details">
          <div className="withdrawal-confirmation__detail">
            <label>Total Payout</label>
            <div>{FormatPriceString(payout, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>Remaining Withdrawable Funds</label>
            <div>{FormatPriceString(rootStore.withdrawableWalletBalance, priceOptions)}</div>
          </div>
        </div>
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Close()}>
            OK
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
      <h1 className="withdrawal-confirmation__header">Withdraw Funds via {provider}</h1>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__amount-selection">
          <div className="labelled-input">
            <label htmlFor="amount">Amount</label>
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
                Maximum withdrawable balance is {FormatPriceString(rootStore.withdrawableWalletBalance, priceOptions)}
              </div> : null
          }
        </div>
        <div className="withdrawal-confirmation__details">
          <div className="withdrawal-confirmation__detail">
            <label>Available Funds</label>
            <div>{FormatPriceString(rootStore.withdrawableWalletBalance, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>Withdrawn Funds</label>
            <div>{FormatPriceString(parsedAmount, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail-separator"/>
          <div className="withdrawal-confirmation__detail withdrawal-confirmation__detail-faded">
            <label>Processing Fee</label>
            <div>{FormatPriceString((parsedAmount - payout), priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>Total Payout</label>
            <div>{FormatPriceString(payout, priceOptions)}</div>
          </div>
          <div className="withdrawal-confirmation__detail">
            <label>Remaining Funds</label>
            <div>{FormatPriceString(rootStore.withdrawableWalletBalance - parsedAmount, priceOptions)}</div>
          </div>
        </div>
        {
          stripeInactive ?
            <div className="profile-page__withdrawal-setup-message">
              Your Stripe account has been created, but is not ready to accept payments. Please finish setting up your account.
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
            { Cancel ? "Back" : "Cancel" }
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
                  setErrorMessage("Unable to withdraw funds. Please try again later.");
                }
              }
            }}
          >
            Withdraw Funds
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
      <h1 className="withdrawal-confirmation__header">Withdraw Funds via EBANX</h1>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__form">
          <div className="labelled-input">
            <label htmlFor="email">
              Method
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
              Email
            </label>
            <input
              type="email"
              value={userInfo.email}
              onChange={event => setUserInfo({...userInfo, email: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="email">
              Name
            </label>
            <input
              type="text"
              value={userInfo.name}
              onChange={event => setUserInfo({...userInfo, name: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="email">
              Phone
            </label>
            <input
              type="phone"
              value={userInfo.phone}
              onChange={event => setUserInfo({...userInfo, phone: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="email">
              Birthdate
            </label>
            <input
              type="date"
              value={userInfo.birthdate}
              onChange={event => setUserInfo({...userInfo, birthdate: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="email">
              CPF
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={userInfo.cpf}
              onChange={event => setUserInfo({...userInfo, cpf: event.target.value})}
            />
          </div>
          <div className="labelled-input">
            <label htmlFor="email">
              PIX Key
            </label>
            <input
              type="text"
              placeholder="Email, CPF, CNPJ, or Phone Number"
              value={userInfo.pix_key}
              onChange={event => setUserInfo({...userInfo, pix_key: event.target.value})}
            />
          </div>
        </div>
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Cancel()}>
            Cancel
          </button>
          <button disabled={!valid} onClick={() => Continue()} className="action action-primary profile-page__onboard-button">
            Continue
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
          Set up withdrawal with Stripe Connect
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
        Set up withdrawal with Stripe Connect
      </div>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          Please select your country to continue
        </div>
        <Select
          value={countryCode}
          onChange={value => setCountryCode(value)}
          containerClassName="withdrawal-confirmation__country-select"
          options={[
            ["", "Select a Country"],
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
            Cancel
          </button>
          <ButtonWithLoader
            disabled={!countryCode}
            onClick={async () => {
              try {
                rootStore.StripeOnboard(countryCode);
                await new Promise(resolve => setTimeout(resolve, 3000));
                Close();
              } catch(error) {
                setErrorMessage("Unable to set up withdrawal. Please try again later.");
              }
            }}
            className="action action-primary profile-page__onboard-button"
          >
            Set Up Withdrawal
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

// Step 1
const ProviderSelection = observer(({Continue, Cancel}) => {
  const [provider, setProvider] = useState("Stripe");

  return (
    <div className="withdrawal-confirmation">
      <div className="withdrawal-confirmation__header">
        Withdraw Funds
      </div>
      <div className="withdrawal-confirmation__content">
        <div className="withdrawal-confirmation__message">
          Please select a provider
        </div>
        <Select
          value={provider}
          onChange={value => setProvider(value)}
          containerClassName="withdrawal-confirmation__country-select"
          options={[["Stripe", "Stripe"], ["EBANX", "EBANX (Brazil Only)"]]}
        />
        <div className="withdrawal-confirmation__actions">
          <button className="action" onClick={() => Cancel()}>
            Cancel
          </button>
          <button onClick={() => Continue(provider)} className="action action-primary profile-page__onboard-button">
            Continue
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

  const [provider, setProvider] = useState(ebanxAvailable ? undefined : "Stripe");
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
    content = <ProviderSelection Continue={provider => setProvider(provider)} Cancel={Close} />;
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
