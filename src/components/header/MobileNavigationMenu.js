import {observer} from "mobx-react";
import {rootStore} from "Stores";
import React from "react";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, CopyableField, MenuLink} from "Components/common/UIComponents";

import ProfileIcon from "Assets/icons/header/profile icon v2";
import ListingsIcon from "Assets/icons/header/listings icon";
import ActivityIcon from "Assets/icons/header/Activity";
import ItemsIcon from "Assets/icons/header/items icon";
import StoreIcon from "Assets/icons/header/Store";
import CollectionsIcon from "Assets/icons/header/collections icon";
import LeaderboardIcon from "Assets/icons/header/Leaderboard";
import EmailIcon from "Assets/icons/email icon";
import MetamaskIcon from "Assets/icons/metamask fox";
import DiscoverIcon from "Assets/icons/discover.svg";
import NotificationsIcon from "Assets/icons/header/Notification Icon.svg";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import Modal from "Components/common/Modal";

const MobileNavigationMenu = observer(({Close}) => {
  const userInfo = rootStore.loggedIn ? rootStore.walletClient.UserInfo() : {};

  const marketplace = rootStore.marketplaces[rootStore.routeParams.marketplaceId];
  const secondaryDisabled = marketplace?.branding?.disable_secondary_market;

  let basePath = "/wallet";
  if(rootStore.routeParams.marketplaceId) {
    basePath = UrlJoin("/marketplace", rootStore.routeParams.marketplaceId);
  } else if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

  let links;
  if(!marketplace) {
    links = [
      { name: rootStore.l10n.navigation.items, icon: ItemsIcon, to: UrlJoin(basePath, "users", "me", "items"), authed: true },
      /*
      ...(
        rootStore.routeParams.mediaPropertySlugOrId ? [] :
          [
            { separator: true, authed: true },
            { name: rootStore.l10n.header.listings, icon: ListingsIcon, to: "/wallet/listings" },
            { name: rootStore.l10n.header.activity, icon: ActivityIcon, to: "/wallet/activity" },
            { separator: true, authed: true },
          ]
      ),

       */
      { name: rootStore.l10n.header.profile, icon: ProfileIcon, to: UrlJoin(basePath, "/users/me/details"), authed: true },
    ];
  } else {
    const tabs = marketplace?.branding?.tabs || {};
    const hasCollections = marketplace?.collections && marketplace.collections.length > 0;

    links = [
      { name: rootStore.l10n.navigation.items, icon: ItemsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items"), authed: true },
      { separator: true, authed: true },
      { name: tabs.store || marketplace?.branding?.name || rootStore.l10n.header.store, icon: StoreIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "store") },
      { name: rootStore.l10n.header.collections, icon: CollectionsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "collections"), hidden: !hasCollections },
      { name: tabs.listings || rootStore.l10n.header.listings, icon: ListingsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "listings"), hidden: secondaryDisabled },
      { name: rootStore.l10n.header.activity, icon: ActivityIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "activity"), hidden: secondaryDisabled },
      { name: rootStore.l10n.header.leaderboard, icon: LeaderboardIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard"), hidden: marketplace?.branding?.hide_leaderboard },
      { separator: true, authed: true },
      { name: rootStore.l10n.header.profile, icon: ProfileIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "details"), authed: true },
      { name: rootStore.l10n.navigation.notifications, icon: NotificationsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "notifications"), authed: true },
    ];
  }

  return (
    <Modal className="mobile-navigation__modal" Toggle={() => Close()}>
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
          {
            rootStore.hideGlobalNavigation ? null :
              <>
                <div className="mobile-menu__separator" />
                <MenuLink
                  icon={DiscoverIcon}
                  to="/"
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
      </div>
    </Modal>
  );
});

export default MobileNavigationMenu;
