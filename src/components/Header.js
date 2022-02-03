import React, {useEffect, useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink, useLocation} from "react-router-dom";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import EluvioIcon from "Assets/images/ELUV.IO-E-Icon.png";
import UrlJoin from "url-join";

const MarketplaceIcon = observer(() => {
  const location = useLocation();

  const [iconLoaded, setIconLoaded] = useState(false);

  // Ensure icon is preloaded to avoid weird visuals when loading
  useEffect(() => {
    let image = new Image();

    new Promise(resolve => {
      image.addEventListener("load", resolve);
      image.addEventListener("error", resolve);
    })
      .then(setIconLoaded(true));

    image.src = EluvioIcon;
  }, []);

  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const marketplace = rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);

  if(marketplaceId) {
    return (
      <NavLink to={UrlJoin("/marketplace", marketplaceId, "store")} className="header__marketplace-selection">
        {
          marketplace && marketplace.round_logo ?
            <ImageIcon icon={marketplace.round_logo.url} title="Discover Marketplaces"/> : null
        }
        {
          marketplace ?
            <h2>{ marketplace.name }</h2> : null
        }
      </NavLink>
    );
  }

  if(!iconLoaded) {
    return null;
  }

  return (
    <NavLink to="/marketplaces" className="header__marketplace-selection" activeClassName="header__marketplace-selection-active">
      <ImageIcon icon={EluvioIcon} title="Discover Marketplaces" key={`header-icon-${marketplaceId}`} />
      <h2>Discover Marketplaces</h2>
    </NavLink>
  );
});

const HeaderLinks = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];

  const marketplace = marketplaceId ?
    rootStore.marketplaces[rootStore.marketplaceId] : null;

  if(marketplaceId) {
    return (
      <nav className="header-navigation">
        <div className="header-navigation__left">
          <NavLink className="header-navigation__link" to={`/marketplace/${marketplaceId}/store`}>
            {(((marketplace || {}).storefront || {}).tabs || {}).store || "Store"}
          </NavLink>
          <NavLink className="header-navigation__link" to={`/marketplace/${marketplaceId}/listings`}>
            Listings
          </NavLink>
          <NavLink className="header-navigation__link" to={`/marketplace/${marketplaceId}/activity`}>
            Activity
          </NavLink>
        </div>
        <div className="header-navigation__right">
          <NavLink className="header-navigation__link" to={`/marketplace/${marketplaceId}/collections`}>
            {(((marketplace || {}).storefront || {}).tabs || {}).collection || "My Items"}
          </NavLink>
          <NavLink className="header-navigation__link" to={`/marketplace/${marketplaceId}/my-listings`}>
            My Listings
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="header-navigation">
      <div className="header-navigation__left">
        <NavLink className="header-navigation__link" to="/wallet/listings">
          All Listings
        </NavLink>
        <NavLink className="header-navigation__link" to="/wallet/activity">
          Activity
        </NavLink>
      </div>
      <div className="header-navigation__right">
        <NavLink className="header-navigation__link" to="/wallet/collection">
          My Collection
        </NavLink>
        <NavLink className="header-navigation__link" to="/wallet/my-listings">
          My Listings
        </NavLink>
      </div>
    </nav>
  );
});

const Profile = observer(() => {
  return (
    <Link to="/profile" className="header__profile">
      <div className="header__profile__info ellipsis">
        <div className="header__profile__name">
          { rootStore.userProfile.name }
        </div>
        {
          typeof rootStore.totalWalletBalance !== "undefined" ?
            <div
              className="header__profile__balance"
              title={`Total balance: ${FormatPriceString({USD: rootStore.totalWalletBalance})}\nAvailable balance: ${FormatPriceString({USD: rootStore.availableWalletBalance}) }\nPending balance: ${FormatPriceString({USD: rootStore.pendingWalletBalance}) }`}
            >
              { FormatPriceString({USD: rootStore.totalWalletBalance}) }
              { rootStore.pendingWalletBalance ? <div className="header__profile__pending-indicator">*</div> : null}
            </div> : null
        }
      </div>
      <ProfileImage className="header__profile__image" />
    </Link>
  );
});

const Header = observer(() => {
  useEffect(() => {
    rootStore.GetWalletBalance();

    let interval = setInterval(() => rootStore.GetWalletBalance(), 120000);
    return () => clearInterval(interval);
  }, []);

  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  if(rootStore.sidePanelMode) {
    if(rootStore.navigationBreadcrumbs.length <= 2) { return null; }

    return (
      <header className="header">
        <div className="header__content">
          <div className="header__breadcrumbs">
            <NavLink
              className="header__breadcrumbs__back-button"
              to={rootStore.navigationBreadcrumbs[rootStore.navigationBreadcrumbs.length - 2].path}
            >
              <ImageIcon icon={BackIcon} title="Back" />
            </NavLink>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="header" key="header">
      <div className="header__content">
        <MarketplaceIcon />
        <HeaderLinks />
        <Profile />
      </div>
    </header>
  );
});

export default Header;
