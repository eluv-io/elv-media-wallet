import React, {useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";
import {roundToUp} from "round-to";

export const WithdrawalSetupModal = observer(({Close}) => {
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [countryCode, setCountryCode] = useState("");

  const supportedCountries = [["AU","Australia"],["AT","Austria"],["BE","Belgium"],["BR","Brazil"],["BG","Bulgaria"],["CA","Canada"],["CY","Cyprus"],["CZ", "Czech Republic"],["DK","Denmark"],["EE","Estonia"],["FI","Finland"],["FR","France"],["DE","Germany"],["GR","Greece"],["HK","Hong Kong"],["HU","Hungary"],["IE","Ireland"],["IT","Italy"],["JP","Japan"],["LV","Latvia"],["LT","Lithuania"],["LU","Luxembourg"],["MY","Malaysia"],["MT","Malta"],["MX","Mexico"],["NL","Netherlands"],["NZ","New Zealand"],["NO","Norway"],["PL","Poland"],["PT","Portugal"],["RO","Romania"],["SG","Singapore"],["SK","Slovakia"],["SI","Slovenia"],["ES","Spain"],["SE","Sweden"],["CH","Switzerland"],["US","United States of America"],["AE","United Arab Emirates"],["GB","United Kingdom"]];

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
          <select
            value={countryCode}
            onChange={event => setCountryCode(event.target.value)}
            className="withdrawal-confirmation__country-select"
          >
            <option value="">Select a Country</option>

            { supportedCountries.map(([code, name]) =>
              <option value={code} key={`option-${code}`}>{ name }</option>
            )}
          </select>
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
  const [amount, setAmount] = useState(rootStore.withdrawableWalletBalance);
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
              {FormatPriceString({USD: payout})} successfully transferred to your account
            </div>
            <div className="withdrawal-confirmation__details">
              <div className="withdrawal-confirmation__detail">
                <label>Total Payout</label>
                <div>{FormatPriceString({USD: payout})}</div>
              </div>
              <div className="withdrawal-confirmation__detail">
                <label>Remaining Funds</label>
                <div>{FormatPriceString({USD: rootStore.withdrawableWalletBalance - parsedAmount})}</div>
              </div>
            </div>
            <div className="withdrawal-confirmation__actions">
              <button className="action action-primary" onClick={() => Close()}>
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
                        Maximum withdrawable balance is {FormatPriceString({USD: rootStore.withdrawableWalletBalance})}
                      </div> : null
                  }
                </div>
            }
          </div>
          <div className="withdrawal-confirmation__details">
            <div className="withdrawal-confirmation__detail">
              <label>Available Funds</label>
              <div>{FormatPriceString({USD: rootStore.withdrawableWalletBalance})}</div>
            </div>
            <div className="withdrawal-confirmation__detail">
              <label>Withdrawn Funds</label>
              <div>{FormatPriceString({USD: parsedAmount})}</div>
            </div>
            <div className="withdrawal-confirmation__detail-separator" />
            <div className="withdrawal-confirmation__detail withdrawal-confirmation__detail-faded">
              <label>Processing Fee</label>
              <div>{FormatPriceString({USD: (parsedAmount - payout)})}</div>
            </div>
            <div className="withdrawal-confirmation__detail">
              <label>Total Payout</label>
              <div>{FormatPriceString({USD: payout})}</div>
            </div>
            <div className="withdrawal-confirmation__detail">
              <label>Remaining Funds</label>
              <div>{FormatPriceString({USD: rootStore.withdrawableWalletBalance - parsedAmount})}</div>
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
