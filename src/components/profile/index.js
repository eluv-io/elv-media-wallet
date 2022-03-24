import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import {useAuth0} from "@auth0/auth0-react";
import {
  Link, Redirect,
  useRouteMatch
} from "react-router-dom";
import {ButtonWithLoader, CopyableField, FormatPriceString} from "Components/common/UIComponents";
import {PendingPaymentsTable, UserTransferTable} from "Components/listings/TransferTables";
import {observer} from "mobx-react";
import {WithdrawalModal, WithdrawalSetupModal} from "Components/profile/WithdrawalModal";
import UrlJoin from "url-join";

const WithdrawalDetails = observer(({setShowWithdrawalModal, setShowWithdrawalSetup}) => {
  return (
    <div className="profile-page__section profile-page__section-balance profile-page__section-box">
      <h2 className="profile-page__section-header">
        Withdrawable Wallet Balance
      </h2>
      <div className="profile-page__balance profile-page__balance-highlight">
        { FormatPriceString({USD: rootStore.withdrawableWalletBalance}) } USD
      </div>
      {
        !rootStore.userStripeId ?
          <div className="profile-page__withdrawal-setup-message">
            Set up a Stripe Connect account to withdraw your funds
          </div> : null
      }
      {
        rootStore.userStripeId && !rootStore.userStripeEnabled ?
          <div className="profile-page__withdrawal-setup-message">
            Your Stripe account has been created, but is not ready to accept payments. Please finish setting up your account.
          </div> : null
      }
      {
        rootStore.userStripeId && rootStore.userStripeEnabled ?
          <div className="profile-page__actions">
            <ButtonWithLoader
              disabled={!rootStore.userStripeEnabled || !rootStore.withdrawableWalletBalance || rootStore.withdrawableWalletBalance <= 0}
              onClick={() => setShowWithdrawalModal(true)}
              className="action profile-page__withdraw-button"
            >
              Withdraw Funds
            </ButtonWithLoader>
          </div> :
          <div className="profile-page__actions">
            <ButtonWithLoader
              onClick={async () => await setShowWithdrawalSetup(true)}
              className="action profile-page__onboard-button"
            >
              Set Up Withdrawal
            </ButtonWithLoader>
          </div>
      }
      {
        rootStore.userStripeEnabled ?
          <UserTransferTable
            header="Withdrawals"
            type="withdrawal"
          /> : null
      }
      {
        rootStore.userStripeId ?
          <>
            <div className="profile-page__actions">
              <button
                className="action-link"
                onClick={async () => await rootStore.StripeLogin()}
              >
                View Stripe Dashboard
              </button>
            </div>
            <div className="profile-page__message">
              Payout is managed by Stripe. See the dashboard for processing status.
            </div>
          </> : null
      }
    </div>
  );
});

const Profile = observer(() => {
  const match = useRouteMatch();

  if(!rootStore.loggedIn) {
    return <Redirect to={match.params.marketplaceId ? UrlJoin("/marketplace", match.params.marketplaceId, "store") : "/marketplaces" } />;
  }

  const [statusInterval, setStatusInterval] = useState(undefined);
  const [showWithdrawalSetup, setShowWithdrawalSetup] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  let auth0;
  if(!rootStore.embedded) {
    auth0 = useAuth0();
  }

  useEffect(() => {
    rootStore.SetNavigationBreadcrumbs([{name: "Wallet", path: "/wallet/collection" }, {name: "Profile", path: "/profile" }]);
    rootStore.GetWalletBalance(true);
  }, [match.url]);

  useEffect(() => {
    if(!rootStore.userStripeId || rootStore.userStripeEnabled) {
      clearInterval(statusInterval);
      return;
    }

    if(statusInterval) {
      return;
    }

    // Stripe account is created, but payments are not enabled. Occasionally check to see if this has changed.
    setStatusInterval(
      setInterval(() => {
        rootStore.GetWalletBalance(true);
      }, 30000)
    );
  }, [statusInterval, rootStore.userStripeId, rootStore.userStripeEnabled]);

  const balancePresent = typeof rootStore.totalWalletBalance !== "undefined";

  return (
    <div className="page-container profile-page content">
      { showWithdrawalSetup ? <WithdrawalSetupModal Close={() => setShowWithdrawalSetup(false)} /> : null }
      { showWithdrawalModal ? <WithdrawalModal Close={() => setShowWithdrawalModal(false)} /> : null }
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
          View Full Transaction History
        </Link>
      </div>

      { balancePresent ?
        <WithdrawalDetails
          setShowWithdrawalModal={setShowWithdrawalModal}
          setShowWithdrawalSetup={async () => {
            if(rootStore.userStripeId) {
              await rootStore.StripeOnboard();
            } else {
              setShowWithdrawalSetup(true);
            }
          }}
        /> : null
      }

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
