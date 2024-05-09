import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, Copy, MenuLink} from "Components/common/UIComponents";
import UrlJoin from "url-join";
import PreferencesMenu from "Components/header/PreferencesMenu";
import HoverMenu from "Components/common/HoverMenu";

import EmailIcon from "Assets/icons/email icon";
import MetamaskIcon from "Assets/icons/metamask fox";
import ProfileIcon from "Assets/icons/header/profile icon v2";
import CopyIcon from "Assets/icons/copy";
import ItemsIcon from "Assets/icons/header/items icon";
import DiscoverIcon from "Assets/icons/discover.svg";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

const ProfileMenu = observer(({Hide}) => {
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const marketplaceId = rootStore.routeParams.marketplaceId;
  const fullMarketplace = marketplaceId ? rootStore.marketplaces[marketplaceId] : null;
  const tabs = fullMarketplace?.branding?.tabs || {};
  const userInfo = rootStore.walletClient.UserInfo();

  const IsActive = (page="") => (_, location) => rootStore.loggedIn && (location.pathname.includes(`/users/me/${page}`) || location.pathname.includes(`/users/${rootStore.CurrentAddress()}/${page}`));

  useEffect(() => {
    window.__headerSubmenuActive = showPreferencesMenu;
  }, [showPreferencesMenu]);

  let basePath = "/wallet";
  if(marketplaceId) {
    basePath = UrlJoin("/marketplace", marketplaceId);
  } else if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

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
          icon={ItemsIcon}
          className="header__profile-menu__link"
          to={UrlJoin(basePath, "users", "me", "items")}
          onClick={Hide}
          isActive={IsActive("items")}
        >
          {tabs.my_items || rootStore.l10n.navigation.items }
        </MenuLink>


        <MenuLink
          icon={ProfileIcon}
          className="header__profile-menu__link"
          to={UrlJoin(basePath, "users", "me", "details")}
          onClick={Hide}
        >
          { rootStore.l10n.navigation.profile }
        </MenuLink>

        {
          rootStore.hideGlobalNavigation || (marketplaceId && rootStore.hideGlobalNavigationInMarketplace)  ? null :
            <>
              <div className="header__profile-menu__separator"/>
              <MenuLink
                icon={DiscoverIcon}
                to="/"
                exact
                onClick={Hide}
                className="header__profile-menu__link header__profile-menu__link-secondary"
              >
                { rootStore.l10n.header.discover }
              </MenuLink>
            </>
        }
      </div>
      <ButtonWithLoader
        action={false}
        onClick={async () => {
          await rootStore.SignOut();
          Hide();
        }}
        className="header__profile-menu__log-out-button"
      >
        { rootStore.l10n.login.sign_out }
      </ButtonWithLoader>
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
