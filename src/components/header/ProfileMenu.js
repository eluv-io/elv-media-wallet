import HeaderMenuStyles from "Assets/stylesheets/header-menus.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, Linkish} from "Components/common/UIComponents";
import UrlJoin from "url-join";
import PreferencesMenu from "Components/header/PreferencesMenu";
import HoverMenu from "Components/common/HoverMenu";

import ProfileIcon from "Assets/icons/header/profile icon v2";
import ItemsIcon from "Assets/icons/header/items icon";
import DiscoverIcon from "Assets/icons/discover.svg";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";


const S = (...classes) => classes.map(c => HeaderMenuStyles[c] || "").join(" ");

const ProfileMenu = observer(({Hide}) => {
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const marketplaceId = rootStore.routeParams.marketplaceId;
  const fullMarketplace = marketplaceId ? rootStore.marketplaces[marketplaceId] : null;
  const tabs = fullMarketplace?.branding?.tabs || {};
  const userInfo = rootStore.walletClient.UserInfo();

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
    <HoverMenu className={S("header-menu", "profile-menu")} Hide={Hide}>
      <div className={S("profile-menu__user")}>
        <div className={S("profile-menu__user-method")}>
          { rootStore.l10n.login.signed_in }
        </div>
        <div className={S("profile-menu__user-address")}>
          { userInfo.email || userInfo.address }
        </div>
      </div>
      <div className={S("profile-menu__links")}>
        <Linkish
          to={UrlJoin(basePath, "users", "me", "items")}
          onClick={Hide}
          className={S("profile-menu__link")}
        >
          <ImageIcon icon={ItemsIcon} label="Items" />
          {tabs.my_items || rootStore.l10n.navigation.items }
        </Linkish>
        <Linkish
          to={UrlJoin(basePath, "users", "me", "details")}
          onClick={Hide}
          className={S("profile-menu__link")}
        >
          <ImageIcon icon={ProfileIcon} label="Items" />
          { rootStore.l10n.navigation.profile }
        </Linkish>

        {
          rootStore.domainProperty ||
          rootStore.hideGlobalNavigation ||
          (marketplaceId && rootStore.hideGlobalNavigationInMarketplace) ? null :
            <>
              <div className={S("profile-menu__separator")} />
              <Linkish
                to="/"
                onClick={Hide}
                className={S("profile-menu__link")}
              >
                <ImageIcon icon={DiscoverIcon} label="Items"/>
                { rootStore.l10n.header.discover }
              </Linkish>
            </>
        }
      </div>
      <div className={S("header-menu__actions")}>
        <ButtonWithLoader
          action={false}
          onClick={async () => {
            await rootStore.SignOut();
            Hide();
          }}
          className={S("header-menu__action")}
        >
          { rootStore.l10n.login.sign_out }
        </ButtonWithLoader>
      </div>
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
