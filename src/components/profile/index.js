import React, {useEffect, useState} from "react";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {
  Link,
  useRouteMatch
} from "react-router-dom";
import {ButtonWithLoader, CopyableField, FormatPriceString} from "Components/common/UIComponents";
import {OffersTable, UserTransferTable} from "Components/listings/TransferTables";
import {observer} from "mobx-react";
import WithdrawalModal from "Components/profile/WithdrawalModal";
import WalletConnect from "Components/crypto/WalletConnect";
import ImageIcon from "Components/common/ImageIcon";

import EmailIcon from "Assets/icons/email icon.svg";
import MetamaskIcon from "Assets/icons/crypto/metamask fox.png";
import WithdrawalsIcon from "Assets/icons/crypto/USD icon.svg";
import OffersIcon from "Assets/icons/Offers table icon.svg";

const WithdrawalDetails = observer(({setShowWithdrawalModal}) => {
  return (
    <div className="profile-page__section profile-page__section-balance profile-page__section-box">
      <h2 className="profile-page__section-header">
        Withdrawable Seller Balance
      </h2>
      <div className="profile-page__balance">
        { FormatPriceString(rootStore.withdrawableWalletBalance, {excludeAlternateCurrency: true, includeCurrency: true }) }
      </div>
      <div className="profile-page__actions">
        <ButtonWithLoader
          disabled={rootStore.withdrawableWalletBalance < 1}
          onClick={() => setShowWithdrawalModal(true)}
          className="action profile-page__withdraw-button"
        >
          Withdraw Funds
        </ButtonWithLoader>
      </div>
      <UserTransferTable
        icon={WithdrawalsIcon}
        header="Withdrawals"
        type="withdrawal"
      />
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
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  const userInfo = rootStore.walletClient.UserInfo();
  const custodialWallet = userInfo.walletType === "Custodial";

  useEffect(() => {
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
    <div className="page-container profile-page">
      { showWithdrawalModal ? <WithdrawalModal Close={() => setShowWithdrawalModal(false)} /> : null }
      <div className="profile-page__section profile-page__section-account">
        <h1 className="profile-page__header">Media Wallet</h1>
        <h2 className="profile-page__address-header">
          Eluvio Content Blockchain Address
        </h2>
        <div className="profile-page__address">
          <CopyableField className="profile-page__address-field" value={rootStore.CurrentAddress()} ellipsis={false}>
            { rootStore.CurrentAddress() }
          </CopyableField>
        </div>
        <div className="profile-page__message">
          Do not send funds to this address.<br />This is an Eluvio Content Blockchain address and is not a payment address.
        </div>

        <div className="profile-page__account-info">
          <div className="profile-page__account-info__message">
            { custodialWallet ? "Signed In As" : "Signed In Via Metamask" }
          </div>
          <div className={`profile-page__account-info__account profile-page__account-info__account--${custodialWallet ? "custodial" : "external"}`}>
            {
              custodialWallet ?
                <>
                  <ImageIcon className="profile-page__account-info__icon" icon={EmailIcon}/>
                  <div className="profile-page__account-info__email">
                    { userInfo.email }
                  </div>
                </> :
                <ImageIcon className="profile-page__account-info__icon profile-page__account-info__icon--external" alt="Metamask" label="Metamask" icon={MetamaskIcon}/>
            }
          </div>
        </div>

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
          Total Seller Balance
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString(rootStore.totalWalletBalance, {excludeAlternateCurrency: true, includeCurrency: true}) }
        </div>
        <Link
          className="profile-page__transactions-link"
          to={
            match.params.marketplaceId ?
              UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "activity") :
              "/wallet/users/me/activity"
          }
        >
          View Full Transaction History
        </Link>
      </div>

      <div className="profile-page__section profile-page__section-balance profile-page__section-box">
        <h2 className="profile-page__section-header">
          Locked Seller Balance
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString(rootStore.lockedWalletBalance, {excludeAlternateCurrency: true, includeCurrency: true }) }
        </div>
        <br />
        <OffersTable
          buyerAddress={rootStore.CurrentAddress()}
          icon={OffersIcon}
          header="Outstanding Offers"
          statuses={["ACTIVE"]}
          useWidth={600}
          noActions
          hideActionsColumn
        />
        <Link
          className="profile-page__transactions-link"
          to={
            match.params.marketplaceId ?
              UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "offers") :
              "/wallet/users/me/offers"
          }
        >
          View All Offers
        </Link>
      </div>

      { balancePresent ? <WithdrawalDetails setShowWithdrawalModal={setShowWithdrawalModal} /> : null }

      {
        rootStore.usdcDisabled ?
          null :
          <div className="profile-page__section profile-page__section-wallet-connect">
            <h2 className="profile-page__section-header">
              Connected Accounts
            </h2>

            <WalletConnect type="phantom" showPaymentPreference />
            {
              // <WalletConnect type="metamask" showPaymentPreference />
            }
          </div>
      }
    </div>
  );
});

export default Profile;
