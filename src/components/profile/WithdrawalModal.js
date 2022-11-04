import React, {useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, FormatPriceString, Select} from "Components/common/UIComponents";
import {roundToUp} from "round-to";

import SupportedCountries from "../../utils/SupportedCountries";

export const WithdrawalSetupModal = observer(({Close}) => {
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [countryCode, setCountryCode] = useState("");

  return (
    <Modal Toggle={Close} className="withdrawal-modal">
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
            <button className="action" onClick={() => Close()}>
              Cancel
            </button>
            <ButtonWithLoader
              disabled={!countryCode}
              onClick={async () => {
                try {
                  await rootStore.StripeOnboard(countryCode);
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
    </Modal>
  );
});

export const WithdrawalModal = observer(({Close}) => {
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState(parseFloat((rootStore.withdrawableWalletBalance || 0)).toFixed(2));
  const [errorMessage, setErrorMessage] = useState(undefined);
  const parsedAmount = isNaN(parseFloat(amount)) ? 0 : parseFloat(amount || 0);
  const payout = roundToUp(parsedAmount * 0.99, 2);

  if(done) {
    return (
      <Modal Toggle={Close} className="withdrawal-modal">
        <div className="withdrawal-confirmation">
          <h1 className="withdrawal-confirmation__header">Withdraw Funds</h1>
          <div className="withdrawal-confirmation__content">
            <div className="withdrawal-confirmation__message">
              {FormatPriceString(payout)} successfully transferred to your account
            </div>
            <div className="withdrawal-confirmation__details">
              <div className="withdrawal-confirmation__detail">
                <label>Total Payout</label>
                <div>{FormatPriceString(payout)}</div>
              </div>
              <div className="withdrawal-confirmation__detail">
                <label>Remaining Withdrawable Funds</label>
                <div>{FormatPriceString(rootStore.withdrawableWalletBalance)}</div>
              </div>
            </div>
            <div className="withdrawal-confirmation__actions">
              <button className="action" onClick={() => Close()}>
                OK
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal Toggle={Close} className="withdrawal-modal">
      <div className="withdrawal-confirmation">
        <h1 className="withdrawal-confirmation__header">Withdraw Funds</h1>
        <div className="withdrawal-confirmation__content">
          <div className="withdrawal-confirmation__amount-selection">
            {
              confirming ? null :
                <div className="withdrawal-confirmation__inputs">
                  <input
                    placeholder="Price"
                    className={`withdrawal-confirmation__price-input ${parsedAmount > rootStore.withdrawableWalletBalance ? "withdrawal-confirmation__price-input-error" : ""}`}
                    value={amount}
                    onChange={event => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                    onBlur={() => setAmount(parsedAmount.toFixed(2))}
                  />
                  <div className="withdrawal-confirmation__price-input-label">
                    USD
                  </div>
                  {
                    parsedAmount > rootStore.withdrawableWalletBalance ?
                      <div className="withdrawal-confirmation__input-error">
                        Maximum withdrawable balance is {FormatPriceString(rootStore.withdrawableWalletBalance)}
                      </div> : null
                  }
                </div>
            }
          </div>
          <div className="withdrawal-confirmation__details">
            <div className="withdrawal-confirmation__detail">
              <label>Available Funds</label>
              <div>{FormatPriceString(rootStore.withdrawableWalletBalance)}</div>
            </div>
            <div className="withdrawal-confirmation__detail">
              <label>Withdrawn Funds</label>
              <div>{FormatPriceString(parsedAmount)}</div>
            </div>
            <div className="withdrawal-confirmation__detail-separator" />
            <div className="withdrawal-confirmation__detail withdrawal-confirmation__detail-faded">
              <label>Processing Fee</label>
              <div>{FormatPriceString((parsedAmount - payout))}</div>
            </div>
            <div className="withdrawal-confirmation__detail">
              <label>Total Payout</label>
              <div>{FormatPriceString(payout)}</div>
            </div>
            <div className="withdrawal-confirmation__detail">
              <label>Remaining Funds</label>
              <div>{FormatPriceString(rootStore.withdrawableWalletBalance - parsedAmount)}</div>
            </div>
          </div>
          {
            errorMessage ?
              <div className="withdrawal-confirmation__error">
                { errorMessage }
              </div> : null
          }
          <div className="withdrawal-confirmation__actions">
            <button className="action" onClick={() => confirming ? setConfirming(false) : Close()}>
              { confirming ? "Back" : "Cancel" }
            </button>
            <ButtonWithLoader
              className="action action-primary"
              disabled={parsedAmount <= 0 || parsedAmount > rootStore.withdrawableWalletBalance}
              onClick={async () => {
                setErrorMessage(undefined);

                if(!confirming) {
                  setConfirming(true);
                  return;
                }

                try {
                  await rootStore.WithdrawFunds(parsedAmount);
                  setDone(true);
                } catch(error) {
                  setErrorMessage("Unable to withdraw funds. Please try again later.");
                }
              }}
            >
              { confirming ? "Withdraw Funds" : "Continue" }
            </ButtonWithLoader>
          </div>
        </div>
      </div>
    </Modal>
  );
});
