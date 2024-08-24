import UserProfileStyles from "Assets/stylesheets/user.module.scss";

import React, {useEffect, useState} from "react";
import {NavLink, Redirect, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {ButtonWithLoader, CopyButton, DebouncedInput} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {observer} from "mobx-react";
import {PageLoader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Modal from "Components/common/Modal";
import {LoginGate} from "Components/common/LoginGate";

import UserIcon from "Assets/icons/user.svg";
import EditIcon from "Assets/icons/edit listing icon.svg";
import ProfileBackground from "Assets/images/BG-Profile.jpg";
import PreferencesMenu from "Components/header/PreferencesMenu";

const S = (...classes) => classes.map(c => UserProfileStyles[c] || "").join(" ");

const UsernameModal = observer(({UpdateUsername, Close}) => {
  const userProfile = rootStore.userProfiles[rootStore.CurrentAddress()];

  if(!userProfile) {
    return null;
  }

  const [userName, setUsername] = useState(userProfile.userName || "");
  const [validating, setValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setErrorMessage("");

    if(!userName || userName === userProfile.userName) {
      setValidating(false);

      return;
    }

    setValidating(true);
    rootStore.ValidateUserName(userName)
      .then(errorMessage => {
        if(errorMessage) {
          setErrorMessage(errorMessage);
        }

        setValidating(false);
      });
  }, [userName]);

  return (
    <Modal className="username-modal-container" Toggle={Close}>
      <div className="username-modal">
        <div className="username-modal__header">
          Set Your Username
        </div>
        <div className="username-modal__content">
          <div className="username-modal__inputs">
            <DebouncedInput
              value={userName}
              timeout={500}
              onImmediateChange={() => setValidating(true)}
              onChange={value => setUsername(value)}
              className="username-modal__input"
            />
          </div>
          <div className="username-modal__error-message">
            { errorMessage }
          </div>
          <div className="username-modal__actions">
            <button className="action" onClick={Close}>
              Cancel
            </button>
            <ButtonWithLoader
              isLoading={validating}
              disabled={!userName || errorMessage || validating}
              onClick={() => UpdateUsername(userName)}
              className="action action-primary"
            >
              Update Username
            </ButtonWithLoader>
          </div>
        </div>
      </div>
    </Modal>
  );
});

const UserProfileContainer = observer(({includeUserProfile, children}) => {
  const match = useRouteMatch();
  includeUserProfile = typeof includeUserProfile === "function" ? includeUserProfile(match) : includeUserProfile;

  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === match.params.marketplaceId);
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false || marketplace?.branding?.disable_secondary_market;
  const availableDisplayCurrencies = marketplace?.display_currencies || [];

  const [userProfile, setUserProfile] = useState(rootStore.userProfiles[match.params.userId]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameUpdated, setUsernameUpdated] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const currentUser = Utils.EqualAddress(userProfile?.userAddress, rootStore.CurrentAddress());

  useEffect(() => {
    setUsernameUpdated(false);

    rootStore.UserProfile({userId: match.params.userId})
      .then(async profile => {
        if(!profile) { return; }

        setUserProfile(profile);
      });
  }, [match.params.userId]);

  let backgroundImage = ProfileBackground;
  if(rootStore.routeParams.mediaPropertySlugOrId) {
    const page = rootStore.mediaPropertyStore.MediaPropertyPage({
      ...rootStore.routeParams
    });

    if(page) {
      backgroundImage =
        (rootStore.pageWidth <= 800 && page.layout?.background_image_mobile?.url) ||
        page.layout?.background_image?.url ||
        backgroundImage;
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

  // Username changed and route depends on username
  if(usernameUpdated && rootStore.userProfiles[match.params.userId].newUserName && match.params.userId !== "me" && !match.params.userId.startsWith("0x")) {
    return <Redirect to={match.url.replace(`/users/${match.params.userId}`, `/users/${userProfile.newUserName}`)} />;
  }

  return (
    <>
      {
        !showUsernameModal ? null :
          <UsernameModal
            UpdateUsername={async (userName) => {
              setUserProfile(
                await rootStore.UpdateUserProfile({
                  newUserName: userName
                })
              );

              setShowUsernameModal(false);
              setUsernameUpdated(true);
            }}
            Close={() => setShowUsernameModal(false)}
          />
      }
      {
        showPreferencesMenu ?
          <PreferencesMenu
            availableDisplayCurrencies={availableDisplayCurrencies}
            Hide={() => setShowPreferencesMenu(false)}
          /> : null
      }
      <div className={S("profile-container", rootStore.routeParams.mediaPropertySlugOrId ? "profile-container--property" : "")}>
        <img src={backgroundImage} alt="Background" className={S("profile-container__background", backgroundImage !== ProfileBackground ? "profile-container__background--custom" : "")} />
        <div className={S("profile-container__gradient")} />
        <div className={S("profile")}>
          <div className={S("profile__image-container")}>
            <ImageIcon
              label="Profile Image"
              icon={rootStore.ProfileImageUrl(userProfile.imageUrl, 800) || UserIcon}
              alternateIcon={UserIcon}
              className={S("profile__image")}
            />
          </div>
          <div className={S("profile__details")}>
            <div className={S("profile__name-container")}>
              {
                userProfile.userName ?
                  <div className={S("profile__name")}>
                    {`@${userProfile.userName}`}
                  </div> :
                  currentUser ?
                    <div className={S("profile__username-hint")}>
                      { rootStore.l10n.profile.set_username }
                    </div> : null
              }
              {
                currentUser ?
                  <button onClick={() => setShowUsernameModal(!showUsernameModal)} className={S("profile__edit")}>
                    <ImageIcon
                      icon={EditIcon}
                      title="Set Username"
                    />
                  </button> : null
              }
            </div>
            <div className={S("profile__address-container")}>
              <div className={S("profile__address")}>
                { userProfile.userAddress }
              </div>
              <CopyButton
                value={userProfile.userAddress}
                className={S("profile__address-copy")}
              />
            </div>
            {
              currentUser && !userProfile.imageUrl ?
                <div className={S("profile__image-hint")}>
                  { rootStore.l10n.profile.set_profile_image }
                </div> : null
            }
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
