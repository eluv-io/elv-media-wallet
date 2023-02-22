import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Copy, MenuLink} from "Components/common/UIComponents";
import UrlJoin from "url-join";
import PreferencesMenu from "Components/header/PreferencesMenu";
import HoverMenu from "Components/common/HoverMenu";

import EmailIcon from "Assets/icons/email icon";
import MetamaskIcon from "Assets/icons/metamask fox";
import ProfileIcon from "Assets/icons/header/profile icon v2";
import CopyIcon from "Assets/icons/copy";
import ItemsIcon from "Assets/icons/header/items icon";
import CollectionsIcon from "Assets/icons/header/collections icon";
import ListingsIcon from "Assets/icons/header/listings icon";
import OffersIcon from "Assets/icons/Offers table icon.svg";
import ActivityIcon from "Assets/icons/header/Activity";
import NotificationsIcon from "Assets/icons/header/Notification Icon.svg";
import PreferencesIcon from "Assets/icons/header/Preferences icon";
import ProjectsIcon from "Assets/icons/header/New Projects_Marketplaces icon";

const ProfileMenu = observer(({marketplaceId, Hide}) => {
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const marketplace = marketplaceId && rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);
  const fullMarketplace = marketplaceId ? rootStore.marketplaces[marketplaceId] : null;
  const tabs = fullMarketplace?.branding?.tabs || {};
  const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;
  const userInfo = rootStore.walletClient.UserInfo();
  const secondaryDisabled = (marketplace || fullMarketplace)?.branding?.disable_secondary_market;

  const IsActive = (page="") => (_, location) => rootStore.loggedIn && (location.pathname.includes(`/users/me/${page}`) || location.pathname.includes(`/users/${rootStore.CurrentAddress()}/${page}`));

  useEffect(() => {
    window.__headerSubmenuActive = showPreferencesMenu;
  }, [showPreferencesMenu]);

  return (
    <HoverMenu className="header__menu header__profile-menu" Hide={Hide}>
      <div className="header__profile-menu__info">
        <div className="header__profile-menu__info__type">{ rootStore.l10n.login.signed_in_via } {userInfo.walletType === "Custodial" ? "Email" : userInfo.walletName}</div>
        <div className="header__profile-menu__info__account">
          {
            userInfo.walletType === "Custodial" ?
              <>
                <ImageIcon icon={EmailIcon} />
                <div className="header__profile-menu__info__email ellipsis">
                  { userInfo.email }
                </div>
              </> :
              <>
                <ImageIcon icon={MetamaskIcon} />
                <div className="header__profile-menu__info__address ellipsis">
                  { userInfo.address }
                </div>
                <button onClick={() => Copy(userInfo.address)} className="header__profile-menu__info__address-copy">
                  <ImageIcon alt="Copy Address" icon={CopyIcon} />
                </button>
              </>
          }
        </div>
      </div>
      <div className="header__profile-menu__links">
        <MenuLink
          icon={ProfileIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me") : "/wallet/users/me"}
          onClick={Hide}
        >
          { rootStore.l10n.navigation.profile }
        </MenuLink>

        <div className="header__profile-menu__separator" />

        <MenuLink
          icon={ItemsIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "items") : "/wallet/users/me/items"}
          onClick={Hide}
          isActive={IsActive("items")}
        >
          {tabs.my_items || rootStore.l10n.navigation.items }
        </MenuLink>
        {
          hasCollections ?
            <MenuLink
              icon={CollectionsIcon}
              className="header__profile-menu__link"
              to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "collections") : "/wallet/users/me/collections"}
              onClick={Hide}
              isActive={IsActive("collections")}
            >
              { rootStore.l10n.navigation.collections }
            </MenuLink> : null
        }
        {
          secondaryDisabled ? null :
            <>
              <MenuLink
                icon={ListingsIcon}
                className="header__profile-menu__link"
                to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "listings") : "/wallet/users/me/listings"}
                onClick={Hide}
                isActive={IsActive("listings")}
              >
                { rootStore.l10n.navigation.listings }
              </MenuLink>
              <MenuLink
                icon={OffersIcon}
                className="header__profile-menu__link"
                to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "offers") : "/wallet/users/me/offers"}
                onClick={Hide}
                isActive={IsActive("offers")}
              >
                { rootStore.l10n.navigation.offers }
              </MenuLink>
              <MenuLink
                icon={ActivityIcon}
                className="header__profile-menu__link"
                to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "activity") : "/wallet/users/me/activity"}
                onClick={Hide}
                isActive={IsActive("activity")}
              >
                { rootStore.l10n.navigation.activity }
              </MenuLink>
            </>
        }
        <MenuLink
          icon={NotificationsIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "notifications") : "/wallet/users/me/notifications"}
          onClick={Hide}
          isActive={IsActive("activity")}
        >
          { rootStore.l10n.navigation.notifications }
        </MenuLink>

        <MenuLink
          icon={PreferencesIcon}
          onClick={() => setShowPreferencesMenu(!showPreferencesMenu)}
          className={`header__profile-menu__link header__profile-menu__link-secondary ${showPreferencesMenu ? "active" : ""}`}
        >
          { rootStore.l10n.navigation.preferences }
        </MenuLink>
        {
          rootStore.hideGlobalNavigation || (marketplaceId && rootStore.hideGlobalNavigationInMarketplace)  ? null :
            <>
              <div className="header__profile-menu__separator"/>
              <MenuLink
                icon={ProjectsIcon}
                to="/marketplaces"
                className="header__profile-menu__link header__profile-menu__link-secondary"
              >
                { rootStore.l10n.header.discover_projects }
              </MenuLink>
            </>
        }
      </div>
      <button
        onClick={() => {
          rootStore.SignOut();
          Hide();
        }}
        className="header__profile-menu__log-out-button"
      >
        { rootStore.l10n.login.sign_out }
      </button>
      {
        showPreferencesMenu ?
          <PreferencesMenu
            marketplaceId={marketplaceId}
            Hide={() => setShowPreferencesMenu(false)}
          /> : null
      }
    </HoverMenu>
  );
});

export default ProfileMenu;
