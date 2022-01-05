import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import {useAuth0} from "@auth0/auth0-react";
import {
  Link,
  useRouteMatch
} from "react-router-dom";
import {ButtonWithLoader, CopyableField, FormatPriceString} from "Components/common/UIComponents";
import {PendingPaymentsTable} from "Components/listings/TransferTables";
import {observer} from "mobx-react";
import WithdrawalModal from "Components/profile/WithdrawalModal";

const Profile = observer(() => {
  const match = useRouteMatch();
  const [showWithdrawalModal, setShowWithdrawableModal] = useState(false);

  let auth0;
  if(!rootStore.embedded) {
    auth0 = useAuth0();
  }

  useEffect(() => {
    rootStore.SetNavigationBreadcrumbs([{name: "Wallet", path: "/wallet/collection" }, {name: "Profile", path: "/profile" }]);
    rootStore.GetWalletBalance();
  }, [match.url]);

  const balancePresent = typeof rootStore.totalWalletBalance !== "undefined";

  return (
    <div className="page-container profile-page">
      { showWithdrawalModal ? <WithdrawalModal Close={() => setShowWithdrawableModal(false)} /> : null }
      <div className="profile-page__section profile-page__section-account">
        <h2 className="profile-page__section-header">
          Wallet Address
        </h2>
        <div className="profile-page__address">
          <CopyableField className="profile-page__address-field" value={rootStore.userAddress} ellipsis={false}>
            { rootStore.userAddress }
          </CopyableField>
        </div>
      </div>

      <div className="profile-page__section profile-page__section-balance profile-page__section-box">
        <h2 className="profile-page__section-header">
          Total Wallet Balance
        </h2>
        <div className="profile-page__balance profile-page__balance-highlight">
          { FormatPriceString({USD: rootStore.totalWalletBalance}) } { balancePresent ? "USD" : "" }
        </div>
        <br />
        <h2 className="profile-page__section-header">
          Available Wallet Balance
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString({USD: rootStore.availableWalletBalance}) } { balancePresent ? "USD" : "" }
        </div>
      </div>


      <div className="profile-page__section profile-page__section-balance profile-page__section-box">
        <h2 className="profile-page__section-header">
          Pending Wallet Balance
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString({USD: rootStore.pendingWalletBalance}) } { balancePresent ? "USD" : "" }
        </div>

        <PendingPaymentsTable
          header="Pending Sales"
          className="profile-page__pending-transactions-table"
        />

        <Link
          className="profile-page__transactions-link"
          to={"/wallet/my-listings/transactions"}
        >
          See full transaction history
        </Link>
      </div>

      <div className="profile-page__section profile-page__section-balance profile-page__section-box">
        <h2 className="profile-page__section-header">
          Withdrawable Wallet Balance
        </h2>
        <div className="profile-page__balance profile-page__balance-highlight">
          { FormatPriceString({USD: rootStore.withdrawableWalletBalance}) } { balancePresent ? "USD" : "" }
        </div>
        {
          rootStore.withdrawableWalletBalance > 0 || true ?
            <div className="profile-page__actions">
              <button
                onClick={() => setShowWithdrawableModal(true)}
                className="action profile-page__withdraw-button"
              >
                Withdraw Funds
              </button>
            </div> : null
        }
        {
          rootStore.withdrawableWalletBalance > 0 || true ?
            <div className="profile-page__actions">
              <ButtonWithLoader
                onClick={async () => await rootStore.StripeOnboard()}
                className="action profile-page__onboard-button"
              >
                Set Up Withdrawal
              </ButtonWithLoader>
            </div> : null
        }
        {
          true ?
            <div className="profile-page__actions">
              <a className="action-link" target="_blank" href="https://connect.stripe.com/app/express#earnings">
                View Stripe Dashboard
              </a>
            </div> : null
        }
      </div>

      <div className="profile-page__section profile-page__actions">
        <div className="profile-page__actions">
          <button
            onClick={() => rootStore.SignOut(auth0)}
            className="action"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="profile-page__section profile-page__section-message">
        <div className="profile-page__message">
          Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT. Account holders acknowledge that, during this hold period, a seller will be unable to use or withdraw the amounts attributable to such sale(s).  The current hold period for spending the balance is 7 days, and withdrawing the balance is 30 days.
        </div>
        <div className="profile-page__message">
          For questions or concerns, please contact <a href={"mailto:payments@eluv.io"}>payments@eluv.io</a>
        </div>
      </div>
    </div>
  );
});

export default Profile;
