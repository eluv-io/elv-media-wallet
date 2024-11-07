import HeaderMenuStyles from "Assets/stylesheets/header-menus.module.scss";

import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, Linkish} from "Components/common/UIComponents";
import UrlJoin from "url-join";
import HoverMenu from "Components/common/HoverMenu";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

import ProfileIcon from "Assets/icons/profile.svg";
import ItemsIcon from "Assets/icons/items";
import HomeIcon from "Assets/icons/home.svg";
import MarketplaceIcon from "Assets/icons/marketplace.svg";


const S = (...classes) => classes.map(c => HeaderMenuStyles[c] || "").join(" ");

const ProfileMenu = observer(({Hide}) => {
  const userInfo = rootStore.walletClient.UserInfo();
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false ||
    fullMarketplace?.branding?.disable_secondary_market;

  const discoverDisabled = rootStore.isCustomDomain;

  let basePath = "/";
  if(rootStore.routeParams.mediaPropertySlugOrId) {
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
          { rootStore.l10n.navigation.items }
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
          secondaryDisabled && discoverDisabled ? null :
            <div className={S("profile-menu__separator")} />
        }

        {
          secondaryDisabled ? null :
            <Linkish
              to={UrlJoin(basePath, "listings")}
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={MarketplaceIcon} label="Marketplace"/>
              { rootStore.l10n.navigation.marketplace }
            </Linkish>
        }
        {
          discoverDisabled ? null :
            <Linkish
              to="/"
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={HomeIcon} label="Discover"/>
              { rootStore.l10n.navigation.discover }
            </Linkish>

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
    </HoverMenu>
  );
});

export default ProfileMenu;
