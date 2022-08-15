import React, {useEffect, useState} from "react";
import {NavLink, Redirect, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {ButtonWithLoader, Copy, DebouncedInput} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import CopyIcon from "Assets/icons/copy";
import {observer} from "mobx-react";
import {PageLoader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Modal from "Components/common/Modal";

import UserIcon from "Assets/icons/user.svg";
import EditIcon from "Assets/icons/edit listing icon.svg";

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

const UserProfileContainer = observer(({children}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || {};

  const [userProfile, setUserProfile] = useState(undefined);
  const [userStats, setUserStats] = useState(undefined);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameUpdated, setUsernameUpdated] = useState(false);

  const currentUser = Utils.EqualAddress(userProfile?.userAddress, rootStore.CurrentAddress());

  useEffect(() => {
    setUsernameUpdated(false);
    setUserProfile(undefined);
    setUserStats(undefined);

    rootStore.UserProfile({userId: match.params.userId})
      .then(async profile => {
        setUserProfile(profile);

        setUserStats(
          await rootStore.walletClient.Leaderboard({
            userAddress: profile.userAddress,
            marketplaceParams: match.params.marketplaceId ? { marketplaceId: match.params.marketplaceId } : undefined
          })
        );
      });
  }, [match.params.userId]);

  if(!userProfile) {
    return <PageLoader />;
  }

  // Username changed and route depends on username
  if(usernameUpdated && rootStore.userProfiles[match.params.userId].newUserName && match.params.userId !== "me" && !match.params.userId.startsWith("0x")) {
    return <Redirect to={match.url.replace(`/users/${match.params.userId}`, `/users/${userProfile.newUserName}`)} />;
  }

  return (
    <>
      <div className="page-block page-block--user-profile">
        <div className="page-block__content user">
          {
            showUsernameModal ?
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
              /> : null
          }
          <div className="user__profile">
            <div className="user__profile__image-container">
              <ImageIcon
                icon={rootStore.ProfileImageUrl(userProfile.imageUrl, 800) || UserIcon}
                alternateIcon={UserIcon}
                className="user__profile__image"
              />
            </div>
            <div className="user__profile__details">
              <div className="user__profile__name">
                {
                  userProfile.userName ?
                    <div className="user__profile__name__text ellipsis">
                      {`@${userProfile.userName}`}
                    </div> :
                    currentUser ?
                      <div className="user__profile__name__text ellipsis">
                        Set Your Username
                      </div> : null
                }
                {
                  currentUser ?
                    <button onClick={() => setShowUsernameModal(!showUsernameModal)} className="action user__profile__name__edit-button">
                      <ImageIcon
                        icon={EditIcon}
                        title="Set Username"
                      />
                    </button> : null
                }
              </div>
              <div className="user__profile__address-container">
                <div className="user__profile__address">
                  <div className="ellipsis">
                    { userProfile.userAddress }
                  </div>
                </div>
                <button onClick={() => Copy(userProfile.userAddress)} className="user__profile__address-copy">
                  <ImageIcon icon={CopyIcon} alt="copy" />
                </button>
              </div>
              {
                currentUser && !userProfile.imageUrl ?
                  <div className="user__profile__message">
                    You can set your profile image from any of your owned NFTs!
                  </div> : null
              }
            </div>
          </div>
          <div className="user__badges">
            {
              userStats ?
                <>
                  <div className="user__badge">
                    <div className="user__badge__label">Leaderboard</div>
                    <div className="user__badge__value">#{ userStats.rank ? userStats.rank.toLocaleString() : "" }</div>
                  </div>
                  <div className="user__badges__separator" />
                  <div className="user__badge">
                    <div className="user__badge__label">Collectibles</div>
                    <div className="user__badge__value">{ (userStats.count || 0).toLocaleString() }</div>
                  </div>
                </> : null
            }
          </div>
        </div>
      </div>
      <div className="page-block page-block--user-profile-nav user__content">
        <div className="page-block__content">
          <div className="subheader__navigation user__nav">
            <NavLink to="items" className="subheader__navigation-link user__nav__link">
              Items
            </NavLink>
            {
              marketplace.collections && marketplace.collections.length > 0 ?
                <NavLink to="collections" className="subheader__navigation-link user__nav__link">
                  Collections
                </NavLink> : null
            }
            <NavLink to="listings" className="subheader__navigation-link user__nav__link">
              Listings
            </NavLink>
            {
              currentUser ?
                <NavLink to="activity" className="subheader__navigation-link user__nav__link">
                  Activity
                </NavLink> : null
            }
          </div>
        </div>
      </div>
      { children }
    </>
  );
});

export default UserProfileContainer;
