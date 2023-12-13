import {observer} from "mobx-react";
import {rootStore} from "Stores";
import React, {useState} from "react";
import PreferencesMenu from "Components/header/PreferencesMenu";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, CopyableField, FormatPriceString, MenuLink} from "Components/common/UIComponents";

import ProfileIcon from "Assets/icons/header/profile icon v2";
import ListingsIcon from "Assets/icons/header/listings icon";
import OffersIcon from "Assets/icons/Offers table icon.svg";
import ActivityIcon from "Assets/icons/header/Activity";
import ItemsIcon from "Assets/icons/header/items icon";
import StoreIcon from "Assets/icons/header/Store";
import CollectionsIcon from "Assets/icons/header/collections icon";
import LeaderboardIcon from "Assets/icons/header/Leaderboard";
import EmailIcon from "Assets/icons/email icon";
import MetamaskIcon from "Assets/icons/metamask fox";
import WalletIcon from "Assets/icons/header/wallet icon v2";
import PreferencesIcon from "Assets/icons/header/Preferences icon";
import DiscoverIcon from "Assets/icons/discover.svg";
import NotificationsIcon from "Assets/icons/header/Notification Icon.svg";

const MobileNavigationMenu = observer(({marketplace, Close}) => {
  const userInfo = rootStore.loggedIn ? rootStore.walletClient.UserInfo() : {};
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const fullMarketplace = marketplace && rootStore.marketplaces[marketplace.marketplaceId];
  const availableDisplayCurrencies = fullMarketplace?.display_currencies || [];
  const secondaryDisabled = (marketplace || fullMarketplace)?.branding?.disable_secondary_market;

  let links;
  if(!marketplace) {
    links = [
      { name: rootStore.l10n.header.profile, icon: ProfileIcon, to: "/wallet/users/me/items", authed: true },
      { separator: true, authed: true },
      { name: rootStore.l10n.header.listings, icon: ListingsIcon, to: "/wallet/listings" },
      { name: rootStore.l10n.header.activity, icon: ActivityIcon, to: "/wallet/activity" },
      { separator: true, authed: true },
      { name: rootStore.l10n.navigation.items, icon: ItemsIcon, to: UrlJoin("/wallet", "users", "me", "items"), authed: true },
      { name: rootStore.l10n.navigation.listings, icon: ListingsIcon, to: UrlJoin("/wallet", "users", "me", "listings"), authed: true },
      { name: rootStore.l10n.navigation.offers, icon: OffersIcon, to: UrlJoin("/wallet", "users", "me", "offers"), authed: true },
      { name: rootStore.l10n.navigation.activity, icon: ActivityIcon, to: UrlJoin("/wallet", "users", "me", "activity"), authed: true },
      { name: rootStore.l10n.navigation.notifications, icon: NotificationsIcon, to: UrlJoin("/wallet", "users", "me", "notifications"), authed: true }
    ];
  } else {
    const tabs = fullMarketplace?.branding?.tabs || {};
    const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;

    links = [
      { name: rootStore.l10n.header.profile, icon: ProfileIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items"), authed: true },
      { separator: true, authed: true },
      { name: tabs.store || marketplace?.branding?.name || rootStore.l10n.header.store, icon: StoreIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "store") },
      { name: rootStore.l10n.header.collections, icon: CollectionsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "collections"), hidden: !hasCollections },
      { name: tabs.listings || rootStore.l10n.header.listings, icon: ListingsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "listings"), hidden: secondaryDisabled },
      { name: rootStore.l10n.header.activity, icon: ActivityIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "activity"), hidden: secondaryDisabled },
      { name: rootStore.l10n.header.leaderboard, icon: LeaderboardIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard"), hidden: marketplace?.branding?.hide_leaderboard },
      { separator: true, authed: true },
      { name: rootStore.l10n.navigation.items, icon: ItemsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items"), authed: true },
      { name: rootStore.l10n.navigation.collections, icon: CollectionsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "collections"), authed: true, hidden: !hasCollections },
      { name: rootStore.l10n.navigation.listings, icon: ListingsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "listings"), authed: true, hidden: secondaryDisabled },
      { name: rootStore.l10n.navigation.offers, icon: OffersIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "offers"), authed: true, hidden: secondaryDisabled },
      { name: rootStore.l10n.navigation.activity, icon: ActivityIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "activity"), authed: true },
      { name: rootStore.l10n.navigation.notifications, icon: NotificationsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "notifications"), authed: true }
    ];
  }

  return (
    <div className="mobile-menu">
      {
        rootStore.loggedIn ?
          <div className="mobile-menu__account">
            <div className="mobile-menu__account__type">{rootStore.l10n.login.signed_in_via} {userInfo.walletType === "Custodial" ? "Email" : userInfo.walletName}</div>
            <div className="mobile-menu__account__account">
              {
                userInfo.walletType === "Custodial" ?
                  <>
                    <ImageIcon icon={EmailIcon} className="mobile-menu__account__icon" />
                    <div className="mobile-menu__account__email ellipsis">
                      { userInfo.email }
                    </div>
                  </> :
                  <>
                    <ImageIcon icon={MetamaskIcon} className="mobile-menu__account__icon" />
                    <CopyableField value={userInfo.address}>
                      { userInfo.address }
                    </CopyableField>
                  </>
              }
            </div>
          </div> :
          <div className="mobile-menu__header">
            {  marketplace ? marketplace?.branding?.name || rootStore.l10n.header.store : rootStore.l10n.profile.media_wallet }
          </div>
      }
      <div className="mobile-menu__content">
        {
          rootStore.loggedIn ?
            <>
              {
                userInfo.walletType === "Custodial" ?
                  <div className="mobile-menu__section">
                    <div className="mobile-menu__section-header">{ rootStore.l10n.profile.address }</div>
                    <div className="mobile-menu__address-container">
                      <CopyableField value={userInfo.address} className="mobile-menu__address">
                        { userInfo.address }
                      </CopyableField>
                    </div>
                    <div className="mobile-menu__message">
                      { rootStore.l10n.profile.do_not_send_funds }
                    </div>
                  </div> : null
              }

              <div className="mobile-menu__section">
                <div className="mobile-menu__section-header">{ rootStore.l10n.profile.balance.total }</div>
                <div className="mobile-menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true}) }</div>
              </div>

              <MenuLink
                icon={WalletIcon}
                to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "profile") : "/wallet/profile"}
                className="mobile-menu__link"
                onClick={Close}
              >
                { rootStore.l10n.profile.view.details }
              </MenuLink>
            </> : null
        }
        {
          links.map(({name, icon, to, authed, global, separator, hidden}, index) => {
            if(hidden || (authed && !rootStore.loggedIn)) { return null; }

            if(global && rootStore.hideGlobalNavigation) { return null; }

            if(separator) {
              return <div key={`mobile-link-separator-${index}`} className="mobile-menu__separator" />;
            }

            return (
              <MenuLink
                icon={icon || EmailIcon}
                to={to}
                className="mobile-menu__link"
                onClick={Close}
                key={`mobile-link-${name}`}
              >
                { name }
              </MenuLink>
            );
          })
        }
        <MenuLink
          icon={PreferencesIcon}
          onClick={() => setShowPreferencesMenu(!showPreferencesMenu)}
          className={`mobile-menu__link ${showPreferencesMenu ? "active" : ""}`}
        >
          { rootStore.l10n.navigation.preferences }
        </MenuLink>
        {
          rootStore.hideGlobalNavigation ? null :
            <>
              <div className="mobile-menu__separator" />
              <MenuLink
                icon={DiscoverIcon}
                to="/marketplaces"
                onClick={Close}
                className="mobile-menu__link"
              >
                { rootStore.l10n.header.discover_projects }
              </MenuLink>
            </>
        }
      </div>
      <ButtonWithLoader
        action={false}
        className="mobile-menu__sign-in-button"
        onClick={async () => {
          rootStore.loggedIn ?
            await rootStore.SignOut() :
            rootStore.ShowLogin();

          Close();
        }}
      >
        { rootStore.l10n.login[rootStore.loggedIn ? "sign_out" : "sign_in"] }
      </ButtonWithLoader>
      {
        showPreferencesMenu ?
          <PreferencesMenu
            availableDisplayCurrencies={availableDisplayCurrencies}
            marketplaceId={marketplace?.marketplaceId}
            Hide={() => setShowPreferencesMenu(false)}
          /> : null
      }
    </div>
  );
});

export default MobileNavigationMenu;
