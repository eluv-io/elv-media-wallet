import React, {useEffect, useState} from "react";
import {mediaPropertyStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import {
  Link,
  useRouteMatch
} from "react-router-dom";
import {ButtonWithLoader, CopyableField, FormatPriceString, RichText} from "Components/common/UIComponents";
import {OffersTable, UserTransferTable} from "Components/listings/TransferTables";
import {observer} from "mobx-react";
import WithdrawalModal from "Components/profile/WithdrawalModal";
import WalletConnect from "Components/crypto/WalletConnect";
import ImageIcon from "Components/common/ImageIcon";
import DepositModal from "Components/profile/DepositModal";
import {SearchParams} from "../../utils/Utils";

import MetamaskIcon from "Assets/icons/crypto/metamask fox.png";
import WithdrawalsIcon from "Assets/icons/crypto/USD icon.svg";
import OffersIcon from "Assets/icons/Offers table icon.svg";
import DownCaret from "Assets/icons/down-caret.svg";
import UpCaret from "Assets/icons/up-caret.svg";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

const ExpandableContent = ({textShow, textHide, initiallyOpen=false, children, className=""}) => {
  const [expanded, setExpanded] = useState(initiallyOpen);

  return (
    <>
      <button onClick={() => setExpanded(!expanded)} className={`profile-page__expand-button ${expanded ? "expanded" : "collapsed"} ${className}`}>
        { expanded ? textHide : textShow }
        <ImageIcon icon={expanded ? UpCaret : DownCaret} className="profile-page__expand-button__icon" />
      </button>
      { expanded ? children : null }
    </>
  );
};

const WithdrawalDetails = observer(({setShowWithdrawalModal}) => {
  return (
    <div className="profile-page__section profile-page__section-balance profile-page__section-box">
      <h2 className="profile-page__section-header">
        { rootStore.l10n.profile.balance.withdrawable }
      </h2>
      <div className="profile-page__balance">
        { FormatPriceString(rootStore.withdrawableWalletBalance, {includeCurrency: true }) }
      </div>
      <div className="profile-page__actions">
        <ButtonWithLoader
          disabled={rootStore.withdrawableWalletBalance < 1}
          onClick={() => setShowWithdrawalModal(true)}
          className="action profile-page__withdraw-button"
        >
          { rootStore.l10n.profile.withdraw_funds }
        </ButtonWithLoader>
      </div>
      <ExpandableContent textShow={rootStore.l10n.profile.view.withdrawals} textHide={rootStore.l10n.profile.hide.withdrawals}>
        <UserTransferTable
          icon={WithdrawalsIcon}
          header={rootStore.l10n.tables.withdrawals}
          type="withdrawal"
        />
      </ExpandableContent>
      {
        rootStore.userStripeId ?
          <>
            <div className="profile-page__actions">
              <button
                className="action-link"
                onClick={async () => await rootStore.StripeLogin()}
              >
                { rootStore.l10n.profile.view.stripe_dashboard }
              </button>
            </div>
            <div className="profile-page__message">
              { rootStore.l10n.profile.payout_terms_stripe }
            </div>
          </> : null
      }
      <RichText
        className="profile-page__message"
        richText={rootStore.l10n.profile.payout_terms}
      />
      <RichText
        className="profile-page__message"
        richText={rootStore.l10n.profile.payout_terms_contact}
      />
    </div>
  );
});

const BalanceDetails = observer(({basePath}) => {
  const [showDepositModal, setShowDepositModal] = useState(Object.keys(SearchParams()).includes("add-funds"));

  return (
    <>
      <div className="profile-page__section profile-page__section-balance profile-page__section-box">
        <h2 className="profile-page__section-header">
          { rootStore.l10n.profile.balance.total }
        </h2>
        <div className="profile-page__balance">
          { FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true}) }
        </div>

        <div className="profile-page__actions">
          <button onClick={() => setShowDepositModal(true)} className="action profile-page__deposit-button">
            { rootStore.l10n.profile.add_funds }
          </button>
        </div>

        <ExpandableContent textShow={rootStore.l10n.profile.view.deposits} textHide={rootStore.l10n.profile.hide.deposits}>
          <UserTransferTable
            icon={WithdrawalsIcon}
            header={rootStore.l10n.tables.deposits}
            type="deposit"
          />
        </ExpandableContent>

        <Link
          className="profile-page__transactions-link"
          to={UrlJoin(basePath, "users", "me", "activity")}
        >
          { rootStore.l10n.profile.view.transaction_history }
        </Link>
      </div>
      { showDepositModal ? <DepositModal Close={() => setShowDepositModal(false)} /> : null }
    </>
  );
});

const Profile = observer(() => {
  const match = useRouteMatch();

  const [statusInterval, setStatusInterval] = useState(undefined);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  const userInfo = rootStore.walletClient.UserInfo();
  const custodialWallet = userInfo.walletType === "Custodial";
  const marketplaceId = mediaPropertyStore.MediaProperty({...match.params})?.metadata?.associated_marketplaces?.[0]?.marketplace_id;
  const marketplace = rootStore.marketplaces[marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false || marketplace?.branding?.disable_secondary_market;

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

  let basePath = "/wallet";
  if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

  return (
    <div className="page-container profile-page">
      { showWithdrawalModal ? <WithdrawalModal Close={() => setShowWithdrawalModal(false)} /> : null }
      <div className="profile-page__section-container">
        <div className="profile-page__section profile-page__section-account">
          <h1 className="profile-page__header">{ rootStore.l10n.profile.media_wallet_details }</h1>
          <div className="profile-page__section-content">
            <h2 className="profile-page__address-header">
              { rootStore.l10n.profile.address }
            </h2>
            <div className="profile-page__address">
              <CopyableField className="profile-page__address-field" value={rootStore.CurrentAddress()} ellipsis={false}>
                { rootStore.CurrentAddress() }
              </CopyableField>
            </div>
            <div className="profile-page__message">
              { rootStore.l10n.profile.do_not_send_funds }
            </div>

            <div className="profile-page__account-info">
              <div className="profile-page__account-info__message">
                { custodialWallet ? rootStore.l10n.login.signed_in_as : `${rootStore.l10n.login.signed_in_via} MetaMask` }
              </div>
              <div className={`profile-page__account-info__account profile-page__account-info__account--${custodialWallet ? "custodial" : "external"}`}>
                {
                  custodialWallet ?
                    <>
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
                { rootStore.l10n.login.sign_out }
              </ButtonWithLoader>
            </div>
          </div>
        </div>
      </div>

      <ExpandableContent
        textShow={rootStore.l10n.profile.advanced_details}
        textHide={rootStore.l10n.profile.advanced_details}
        className="profile-page__advanced-toggle"
      >
        <div className="profile-page__section-container">
          <BalanceDetails basePath={basePath} />

          {
            secondaryDisabled ? null :
              <div className="profile-page__section profile-page__section-balance profile-page__section-box">
                <h2 className="profile-page__section-header">
                  {rootStore.l10n.profile.balance.locked}
                </h2>
                <div className="profile-page__balance">
                  {FormatPriceString(rootStore.lockedWalletBalance, {includeCurrency: true})}
                </div>
                <br/>
                <ExpandableContent textShow={rootStore.l10n.profile.view.outstanding_offers} textHide={rootStore.l10n.profile.hide.outstanding_offers}>
                  <OffersTable
                    buyerAddress={rootStore.CurrentAddress()}
                    icon={OffersIcon}
                    header={rootStore.l10n.tables.outstanding_offers}
                    statuses={["ACTIVE"]}
                    useWidth={600}
                    noActions
                    hideActionsColumn
                    showTotal
                  />
                </ExpandableContent>
                <Link
                  className="profile-page__transactions-link"
                  to={UrlJoin(basePath, "users", "me", "activity")}
                >
                  {rootStore.l10n.profile.view.all_offers}
                </Link>
              </div>
          }

          { balancePresent ? <WithdrawalDetails setShowWithdrawalModal={setShowWithdrawalModal} /> : null }
        </div>

        {
          rootStore.usdcDisabled || secondaryDisabled ?
            null :
            <div className="profile-page__section-container" style={{marginTop: 20}}>
              <div className="profile-page__section profile-page__section-wallet-connect">
                <h2 className="profile-page__section-header">
                  { rootStore.l10n.connected_accounts.connected_accounts }
                </h2>

                <WalletConnect type="phantom" showPaymentPreference />
                {
                  // <WalletConnect type="metamask" showPaymentPreference />
                }
              </div>
            </div>
        }
      </ExpandableContent>
    </div>
  );
});

export default Profile;
