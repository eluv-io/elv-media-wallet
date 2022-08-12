import React, {useEffect, useState} from "react";
import {Link, NavLink, Redirect, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {ButtonWithLoader, Copy, DebouncedInput} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import CopyIcon from "Assets/icons/copy";
import {observer} from "mobx-react";
import {PageLoader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Modal from "Components/common/Modal";
import UrlJoin from "url-join";

import EditIcon from "Assets/icons/edit listing icon.svg";
import {LoginGate} from "Components/common/LoginGate";

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
  const userProfile = rootStore.userProfiles[match.params.userId];
  const currentUser = Utils.EqualAddress(userProfile?.userAddress, rootStore.CurrentAddress());

  const [userNotFound, setUserNotFound] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameUpdated, setUsernameUpdated] = useState(false);

  useEffect(() => {
    setUsernameUpdated(false);
    rootStore.UserProfile({
      userAddress: match.params.userId.startsWith("0x") ? match.params.userId : undefined,
      userName: match.params.userId.startsWith("0x") ? undefined : match.params.userId
    })
      .then(profile => {
        if(!profile) {
          setUserNotFound(true);
        }
      })
      .catch(() => setUserNotFound(true));
  }, [match.params.userId]);


  if(userNotFound) {
    if(match.params.userId === "me") {
      return <LoginGate />;
    }

    return (
      <div className="details-page details-page-message">
        <div className="details-page__message-container">
          <h2 className="details-page__message">
            User not found
          </h2>
          <div className="actions-container">
            <Link className="button action" to={match.params.marketplaceId ? UrlJoin("/marketplace", match.params.marketplaceId, "listings") : "/wallet/listings"}>
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if(!userProfile) {
    return <PageLoader />;
  }

  // Username changed and route depends on username
  if(usernameUpdated && userProfile.newUserName && match.params.userId !== "me" && !match.params.userId.startsWith("0x")) {
    return <Redirect to={match.url.replace(`/users/${match.params.userId}`, `/users/${userProfile.newUserName}`)} />;
  }

  return (
    <>
      <div className="user">
        {
          showUsernameModal ?
            <UsernameModal
              UpdateUsername={async (userName) => {
                await rootStore.UpdateUserProfile({
                  newUserName: userName
                });

                setShowUsernameModal(false);
                setUsernameUpdated(true);
              }}
              Close={() => setShowUsernameModal(false)}
            /> : null
        }
        <div className="user__profile">
          <div className="user__profile__image-container">
            {
              userProfile.imageUrl ?
                <ImageIcon icon={rootStore.ProfileImageUrl(userProfile.imageUrl, 800)} alternateIcon="<svg></svg>" className="user__profile__image" /> :
                <div className="user__profile__image user__profile__image--placeholder" />
            }
          </div>
          <div className="user__profile__details">
            <div className="user__profile__name">
              {
                userProfile.userName ?
                  <div className="user__profile__name__text">
                    {`@${userProfile.userName}`}
                  </div> :
                  currentUser ?
                    <div className="user__profile__name__text">
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
          <div className="user__badge">
            <div className="user__badge__label">Leaderboard Rank</div>
            <div className="user__badge__value">33</div>
          </div>
          <div className="user__badge">
            <div className="user__badge__label">Number of Collectibles</div>
            <div className="user__badge__value">1,293</div>
          </div>
        </div>
        <div className="subheader__navigation user__nav">
          {
            marketplace.collections && marketplace.collections.length > 0 ?
              <NavLink to="collections" className="subheader__navigation-link user__nav__link">
                Collections
              </NavLink> : null
          }
          <NavLink to="items" className="subheader__navigation-link user__nav__link">
            Items
          </NavLink>
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
        <div className="user__content">
          {children}
        </div>
      </div>
    </>
  );
});

export default UserProfileContainer;
