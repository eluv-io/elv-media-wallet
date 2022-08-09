import React from "react";
import {NavLink, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {Copy} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import CopyIcon from "Assets/icons/copy";
import {observer} from "mobx-react";

const UserProfileContainer = observer(({children}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || {};

  const userAddress = match.params.userAddress;
  const user = {
    username: "asdqwe",
    addr: rootStore.client.utils.nullAddress
  };

  return (
    <div className="user">
      <div className="user__profile">
        <div className="user__profile__image-container">
          <img className="user__profile__image" />
        </div>
        <div className="user__profile__details">
          <div className="user__profile__name">
            { `@${user.username}`}
          </div>
          <div className="user__profile__address-container">
            <div className="user__profile__address">
              { user.addr }
            </div>
            <button onClick={() => Copy(user.addr)} className="user__profile__address-copy">
              <ImageIcon icon={CopyIcon} alt="copy" />
            </button>
          </div>
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
        <NavLink to="activity" className="subheader__navigation-link user__nav__link">
          Activity
        </NavLink>
      </div>
      <div className="user__content">
        {children}
      </div>
    </div>
  );
});

export default UserProfileContainer;
