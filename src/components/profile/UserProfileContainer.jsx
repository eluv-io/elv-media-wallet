import UserProfileStyles from "@/assets/stylesheets/user.module.scss";

import React, {useEffect, useState} from "react";
import {NavLink, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "@/stores";
import {CopyButton} from "@/components/common/UIComponents";
import ImageIcon from "@/components/common/ImageIcon";
import {observer} from "mobx-react";
import {PageLoader} from "@/components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {LoginGate} from "@/components/common/LoginGate";

import UserIcon from "@/assets/icons/user.svg";
import ProfileBackground from "@/assets/images/BG-Profile.jpg";
import PreferencesMenu from "@/components/header/PreferencesMenu";
import {DefaultProfileImage} from "@/components/properties/Common.jsx";

const S = (...classes) => classes.map(c => UserProfileStyles[c] || "").join(" ");

const UserProfileContainer = observer(({includeUserProfile, children}) => {
  const match = useRouteMatch();
  includeUserProfile = typeof includeUserProfile === "function" ? includeUserProfile(match) : includeUserProfile;

  const marketplaceId = mediaPropertyStore.MediaProperty({...match.params})?.metadata?.associated_marketplaces?.[0]?.marketplace_id;
  const marketplace = rootStore.marketplaces[marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false || marketplace?.branding?.disable_secondary_market;
  const availableDisplayCurrencies = marketplace?.display_currencies || [];

  const [userProfile, setUserProfile] = useState(rootStore.userProfiles[match.params.userId]);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const currentUser = Utils.EqualAddress(userProfile?.userAddress, rootStore.CurrentAddress());

  useEffect(() => {
    rootStore.UserProfile({userId: match.params.userId})
      .then(async profile => {
        if(!profile) { return; }

        setUserProfile(profile);
      });
  }, [match.params.userId]);

  let backgroundImage;
  if(rootStore.routeParams.mediaPropertySlugOrId) {
    const property = rootStore.mediaPropertyStore.MediaProperty({
      ...rootStore.routeParams
    });

    if(property) {
      backgroundImage = rootStore.pageWidth <= 800 ?
        property?.metadata?.styling?.profile?.background_image_mobile?.url :
        property?.metadata?.styling?.profile?.background_image?.url;
    }
  }

  if(match.params.userId === "me" && !rootStore.loggedIn) {
    return <LoginGate />;
  }

  if(!includeUserProfile) {
    return children;
  }

  if(!userProfile) {
    return <PageLoader />;
  }

  return (
    <>
      {
        showPreferencesMenu ?
          <PreferencesMenu
            availableDisplayCurrencies={availableDisplayCurrencies}
            Hide={() => setShowPreferencesMenu(false)}
          /> : null
      }
      <div className={S("profile-container", rootStore.routeParams.mediaPropertySlugOrId ? "profile-container--property" : "")}>
        {
          !backgroundImage ? null :
            <>
              <img src={backgroundImage} alt="Background" className={S("profile-container__background", backgroundImage !== ProfileBackground ? "profile-container__background--custom" : "")} />
              <div className={S("profile-container__gradient")} />
            </>
        }
        <div className={S("profile")}>
          <div className={S("profile__image-container")}>
            <ImageIcon
              label="Profile Image"
              icon={
                DefaultProfileImage({
                  address: rootStore.userInfo.address,
                  email: rootStore.userInfo.email,
                  name: rootStore.userInfo.name
                })
              }
              alternateIcon={UserIcon}
              className={S("profile__image")}
            />
          </div>
          <div className={S("profile__details")}>
            {
              !currentUser || !rootStore.userInfo.email ? null :
                <div className={S("profile__name-container")}>
                  <div className={S("profile__name")}>
                    { rootStore.userInfo.email }
                  </div>
                </div>
            }
            <div className={S("profile__address-container")}>
              <div className={S("profile__address")}>
                { rootStore.CurrentAddress() }
              </div>
              <CopyButton
                value={rootStore.CurrentAddress()}
                className={S("profile__address-copy")}
              />
            </div>
          </div>
        </div>
        <nav className={S("nav")}>
          {
            currentUser ? null :
              <NavLink to="items" className={S("nav__link")}>
                {rootStore.l10n.header.items}
              </NavLink>
          }
          {
            !currentUser ? null :
              <NavLink to="details" className={S("nav__link")}>
                { rootStore.l10n.header.details }
              </NavLink>
          }
          {
            !currentUser ? null :
              <NavLink to="notifications" className={S("nav__link")}>
                { rootStore.l10n.header.notifications }
              </NavLink>
          }
          {
            (!marketplace?.collections || marketplace?.collections.length === 0) ? null :
              <NavLink to="collections" className={S("nav__link")}>
                { rootStore.l10n.header.collections }
              </NavLink>
          }

          {
            !currentUser || secondaryDisabled ? null :
              <NavLink to="listings" className={S("nav__link")}>
                { rootStore.l10n.header.listings }
              </NavLink>
          }
          {
            !currentUser || secondaryDisabled ? null :
              <NavLink to="activity" className={S("nav__link")}>
                { rootStore.l10n.header.marketplace }
              </NavLink>
          }
          {
            !currentUser || rootStore.domainSettings?.settings?.features?.gifting === false ? null :
              <NavLink to="gifts" className={S("nav__link")}>
                { rootStore.l10n.header.gifts }
              </NavLink>
          }
        </nav>
      </div>
      <div className={S("profile__content")}>
        { children }
      </div>
    </>
  );
});

export default UserProfileContainer;
