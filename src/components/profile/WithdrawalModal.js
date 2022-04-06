import React, {useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";
import {roundToUp} from "round-to";

const supportedCountries = [["AR","Argentina"],["AU","Australia"],["AT","Austria"],["BE","Belgium"],["BO","Bolivia"],["BG","Bulgaria"],["CA","Canada"],["CL","Chile"],["CO","Colombia"],["CR","Costa Rica"],["HR","Croatia"],["CY","Cyprus"],["CZ","Czech Republic"],["DK","Denmark"],["DO","Dominican Republic"],["EG","Egypt"],["EE","Estonia"],["FI","Finland"],["FR","France"],["GM","Gambia"],["DE","Germany"],["GR","Greece"],["HK","Hong Kong"],["HU","Hungary"],["IS","Iceland"],["IN","India"],["ID","Indonesia"],["IE","Ireland"],["IL","Israel"],["IT","Italy"],["KE","Kenya"],["LV","Latvia"],["LI","Liechtenstein"],["LT","Lithuania"],["LU","Luxembourg"],["MT","Malta"],["MX","Mexico"],["NL","Netherlands"],["NZ","New Zealand"],["NO","Norway"],["PE","Peru"],["PH","Phillipines"],["PL","Poland"],["PT","Portugal"],["RO","Romania"],["SA","Saudi Arabia"],["RS","Serbia"],["SG","Singapore"],["SK","Slovakia"],["SI","Slovenia"],["ZA","South Africa"],["KR","South Korea"],["ES","Spain"],["SE","Sweden"],["CH","Switzerland"],["TH","Thailand"],["TT","Trinidad & Tobago"],["TR","Turkey"],["AE","United Arab Emirates"],["GB","United Kingdom"],["US","United States of America"]];

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
              {FormatPriceString({USD: payout})} successfully transferred to your account
            </div>
            <div className="withdrawal-confirmation__details">
              <div className="withdrawal-confirmation__detail">
                <label>Total Payout</label>
                <div>{FormatPriceString({USD: payout})}</div>
              </div>
              <div className="withdrawal-confirmation__detail">
                <label>Remaining Withdrawable Funds</label>
                <div>{FormatPriceString({USD: rootStore.withdrawableWalletBalance})}</div>
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
