import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {
  Link,
  useRouteMatch
} from "react-router-dom";
import {ButtonWithLoader, CopyableField, FormatPriceString} from "Components/common/UIComponents";
import {UserTransferTable} from "Components/listings/TransferTables";
import {observer} from "mobx-react";
import {WithdrawalModal, WithdrawalSetupModal} from "Components/profile/WithdrawalModal";
import WalletConnect from "Components/crypto/WalletConnect";

import MetamaskIcon from "Assets/icons/crypto/metamask fox.png";
import ImageIcon from "Components/common/ImageIcon";

import WithdrawalsIcon from "Assets/icons/crypto/USD icon.svg";

const WithdrawalDetails = observer(({setShowWithdrawalModal, setShowWithdrawalSetup}) => {
  return (
    <div className="profile-page__section profile-page__section-balance profile-page__section-box">
      <h2 className="profile-page__section-header">
        Withdrawable Wallet Balance
      </h2>
      <div className="profile-page__balance">
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
            icon={WithdrawalsIcon}
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

      <div className="profile-page__message">
        Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT. Account holders acknowledge that, during this hold period, a seller will be unable to withdraw the amounts attributable to such sale(s). The current hold period for withdrawing the balance is 15 days.
      </div>
      <div className="profile-page__message">
        For questions or concerns, please contact <a href={"mailto:payments@eluv.io"}>payments@eluv.io</a>
      </div>
    </div>
  );
});

const Profile = observer(() => {
  const match = useRouteMatch();

  const [statusInterval, setStatusInterval] = useState(undefined);
  const [showWithdrawalSetup, setShowWithdrawalSetup] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  useEffect(() => {
    rootStore.SetNavigationBreadcrumbs([{name: "Wallet", path: "/wallet/my-items" }, {name: "Profile", path: "/profile" }]);
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

  let walletMessage, walletIcon;
  switch(rootStore.AuthInfo()?.walletName?.toLowerCase()) {
    case "metamask":
      walletIcon = MetamaskIcon;
      walletMessage = "Signed in with Metamask";
      break;
  }

  return (
    <div className="page-container profile-page">
      { showWithdrawalSetup ? <WithdrawalSetupModal Close={() => setShowWithdrawalSetup(false)} /> : null }
      { showWithdrawalModal ? <WithdrawalModal Close={() => setShowWithdrawalModal(false)} /> : null }
      <div className="profile-page__section profile-page__section-account">
        <h2 className="profile-page__section-header">
          Wallet Address
        </h2>
        <div className="profile-page__address">
          <CopyableField className="profile-page__address-field" value={rootStore.CurrentAddress()} ellipsis={false}>
            { rootStore.CurrentAddress() }
          </CopyableField>
        </div>
        <div className="profile-page__message">
          This is an Eluvio blockchain address
        </div>

        {
          walletMessage ?
            <div className="profile-page__wallet-message">
              <ImageIcon icon={walletIcon} />
              { walletMessage }
            </div> : null
        }

        <div className="profile-page__actions profile-page__sign-out">
          <ButtonWithLoader
            onClick={async () => {
              rootStore.SignOut();
              await new Promise(resolve => setTimeout(resolve, 1000));
            }}
            className="action profile-page__sign-out-button"
          >
            Sign Out
          </ButtonWithLoader>
        </div>
      </div>

      <div className="profile-page__section profile-page__section-balance profile-page__section-box">
        <h2 className="profile-page__section-header">
          Total Wallet Balance
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString({USD: rootStore.totalWalletBalance}) } { balancePresent ? "USD" : "" }
        </div>
        <br />
        <h2 className="profile-page__section-header">
          Available Wallet Balance
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString({USD: rootStore.availableWalletBalance}) } { balancePresent ? "USD" : "" }
        </div>

        <Link
          className="profile-page__transactions-link"
          to={
            match.params.marketplaceId ?
              UrlJoin("/marketplace", match.params.marketplaceId, "my-listings", "transactions") :
              "/wallet/my-listings/transactions"
          }
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

      <div className="profile-page__section profile-page__section-wallet-connect">
        <h2 className="profile-page__section-header">
          Connected Accounts
        </h2>

        <WalletConnect showPaymentPreference />
      </div>
    </div>
  );
});

export default Profile;
