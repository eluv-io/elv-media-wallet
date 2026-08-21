import HeaderMenuStyles from "@/assets/stylesheets/header-menus.module.scss";

import React from "react";
import {observer} from "mobx-react";
import {ButtonWithLoader, Linkish} from "@/components/common/UIComponents";
import {mediaPropertyStore, rootStore} from "@/stores";
import ImageIcon from "@/components/common/ImageIcon.jsx";
import UrlJoin from "url-join";
import HoverMenu from "@/components/common/HoverMenu";
import {MediaPropertyBasePath} from "@/utils/MediaPropertyUtils";

import ProfileIcon from "@/assets/icons/profile.svg";
import ItemsIcon from "@/assets/icons/items.svg";
import HomeIcon from "@/assets/icons/home.svg";
import EluvioIcon from "@/assets/icons/eluvio-icon.svg";
import MarketplaceIcon from "@/assets/icons/marketplace.svg";
import NotificationsIcon from "@/assets//icons/header/Notification Icon.svg";
import {RenderAction} from "@/components/properties/Common.jsx";

const S = (...classes) => classes.map(c => HeaderMenuStyles[c] || "").join(" ");

const ProfileMenu = observer(({Hide}) => {
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);
  const userInfo = rootStore.walletClient.UserInfo();
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false;

  const discoverDisabled = rootStore.isCustomDomain || mediaProperty?.metadata?.domain?.hide_home_button;

  let basePath = "/";
  if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

  const headerLinks = (mediaProperty.metadata?.header_links || [])
    .filter(link => mediaPropertyStore.ActionVisible({
      visibility: link.visibility,
      behavior: link.behavior,
      permissions: link.permissions
    }));

  return (
    <HoverMenu className={S("header-menu", "profile-menu")} Hide={Hide}>
      {
        !rootStore.loggedIn ? null :
          <div className={S("profile-menu__user")}>
            <div className={S("profile-menu__user-method")}>
              { rootStore.l10n.login.signed_in }
            </div>
            <div className={S("profile-menu__user-address")}>
              { userInfo.email || userInfo.address }
            </div>
          </div>
      }
      <div className={S("profile-menu__links")}>
        {
          headerLinks.map(link =>
            <RenderAction
              key={link.id}
              action={link}
              Component={params =>
                <Linkish
                  {...params}
                  style={
                    !CSS.supports("color", link.text_color) ? {} :
                      {"--text-color": link.text_color}
                  }
                  onClick={() => {
                    params?.onClick?.();
                    Hide();
                  }}
                  className={S("profile-menu__link", "profile-menu__link--header")}
                >
                  <ImageIcon icon={link.icon?.url || ""} label={link.text} className={S("profile-menu__link-icon")} />
                  {link.text}
                </Linkish>
              }
            />
          )
        }
        <Linkish
          to={MediaPropertyBasePath(rootStore.routeParams, {includePage: false})}
          onClick={Hide}
          className={S("profile-menu__link", "profile-menu__link--header")}
        >
          <ImageIcon icon={HomeIcon} label="Items"  className={S("profile-menu__link-icon")}/>
          {rootStore.l10n.navigation.home}
        </Linkish>
        <div className={S("profile-menu__separator")}/>
        {
          !rootStore.loggedIn ? null :
            <>
            <Linkish
              to={UrlJoin(basePath, "users", "me", "items")}
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={ItemsIcon} label="Items"  className={S("profile-menu__link-icon")}/>
              {rootStore.l10n.navigation.items}
            </Linkish>
            <Linkish
              to={UrlJoin(basePath, "users", "me", "details")}
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={ProfileIcon} label="Items"  className={S("profile-menu__link-icon")}/>
              {rootStore.l10n.navigation.profile}
            </Linkish>
            <Linkish
              to={UrlJoin(basePath, "users", "me", "notifications")}
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={NotificationsIcon} label="Notifications"  className={S("profile-menu__link-icon")}/>
              {rootStore.l10n.navigation.notifications}
            </Linkish>
          </>
        }

        {
          secondaryDisabled ? null :
            <Linkish
              to={UrlJoin(basePath, "listings")}
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={MarketplaceIcon} label="Marketplace"  className={S("profile-menu__link-icon")}/>
              {rootStore.l10n.navigation.marketplace}
            </Linkish>
        }
        {
          discoverDisabled ? null :
            <Linkish
              to="/"
              onClick={Hide}
              className={S("profile-menu__link")}
            >
              <ImageIcon icon={EluvioIcon} label="Discover"  className={S("profile-menu__link-icon")}/>
              {rootStore.l10n.navigation.discover}
            </Linkish>

        }
      </div>
      <div className={S("header-menu__actions")}>
        <ButtonWithLoader
          action={false}
          onClick={async () => {
            if(!rootStore.loggedIn) {
              rootStore.ShowLogin({});
            } else {
              await rootStore.SignOut({logOutOpenId: true});
            }

            Hide();
          }}
          className={S("header-menu__action")}
        >
          {
            !rootStore.loggedIn ?
              rootStore.l10n.login.sign_in :
              rootStore.l10n.login.sign_out
          }
        </ButtonWithLoader>
      </div>
    </HoverMenu>
  );
});

export default ProfileMenu;
