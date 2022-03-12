import React, {useEffect, useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink, useLocation} from "react-router-dom";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import Modal from "Components/common/Modal";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import EluvioLogo from "Assets/images/EluvioLogo.png";
import PlaceholderLogo from "Assets/icons/listing.svg";
import MenuIcon from "Assets/icons/menu";

const Profile = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];

  return (
    <Link to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/profile"} className="header__profile">
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

const MobileNavigationMenu = observer(({marketplace, Close}) => {
  if(!marketplace) {
    return (
      <nav className="mobile-navigation__menu">
        <NavLink className="mobile-navigation__link" to="/marketplaces" onClick={Close}>
          <span>Discover Marketplaces</span>
        </NavLink>
        <NavLink className="mobile-navigation__link" to="/wallet/listings" onClick={Close}>
          <span>All Listings</span>
        </NavLink>
        <NavLink className="mobile-navigation__link" to="/wallet/activity" onClick={Close}>
          <span>Activity</span>
        </NavLink>
        <div className="mobile-navigation__separator" />
        <NavLink className="mobile-navigation__link" to="/wallet/collection" onClick={Close}>
          <span>My Items</span>
        </NavLink>
        <NavLink className="mobile-navigation__link" to="/wallet/my-listings" onClick={Close}>
          <span>My Listings</span>
        </NavLink>
        <NavLink className="mobile-navigation__link" to="/profile" onClick={Close}>
          <span>My Profile</span>
        </NavLink>
      </nav>
    );
  }

  const fullMarketplace = rootStore.marketplaces[marketplace.marketplaceId];
  const { name } = (marketplace.branding || {});
  return (
    <nav className="mobile-navigation__menu">
      <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")} onClick={Close}>
        <span>{ name || "" } Store</span>
      </NavLink>
      <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "listings")} onClick={Close}>
        <span>Listings</span>
      </NavLink>
      <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "activity")} onClick={Close}>
        <span>Activity</span>
      </NavLink>
      <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collection")} onClick={Close}>
        <span>My Items</span>
      </NavLink>
      {
        fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0 ?
          <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collections")} onClick={Close}>
            My Collections
          </NavLink> : null
      }
      <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "my-listings")} onClick={Close}>
        <span>My Listings</span>
      </NavLink>
      <div className="mobile-navigation__separator" />
      <NavLink className="mobile-navigation__link" to="/marketplaces" onClick={Close}>
        <span>Discover Marketplaces</span>
      </NavLink>
      <NavLink className="mobile-navigation__link" to="/wallet/collection" onClick={Close}>
        <span>My Full Collection</span>
      </NavLink>
      <NavLink className="mobile-navigation__link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "profile")} onClick={Close}>
        <span>My Profile</span>
      </NavLink>
    </nav>
  );
});

const MobileNavigation = ({marketplace}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <div className="mobile-navigation">
        <button onClick={() => setShowMenu(!showMenu)} className="mobile-navigation__menu-button">
          <ImageIcon
            icon={MenuIcon}
            title={showMenu ? "Hide Navigation" : "Show Navigation"}
          />
        </button>
      </div>
      {
        showMenu ?
          <Modal className="mobile-navigation__modal" Toggle={() => setShowMenu(false)}>
            <MobileNavigationMenu marketplace={marketplace} Close={() => setShowMenu(false)} />
          </Modal> : null
      }
    </>
  );
};

const GlobalHeaderNavigation = () => {
  return (
    <nav className="global-header__navigation global-header__navigation--global">
      <NavLink className="global-header__navigation-link" to="/marketplaces">
        Discover Marketplaces
      </NavLink>
      <NavLink className="global-header__navigation-link" to="/wallet/listings">
        All Listings
      </NavLink>
      <NavLink className="global-header__navigation-link" to="/wallet/activity">
        All Activity
      </NavLink>
    </nav>
  );
};

const GlobalHeader = ({marketplace}) => {
  if(rootStore.hideGlobalNavigation) { return null; }

  return (
    <div className="global-header-container">
      <div className={`global-header ${marketplace ? "global-header--marketplace" : ""}`}>
        <Link to="/marketplaces" className="global-header__logo-container">
          <ImageIcon icon={EluvioLogo} title="Eluvio" className="global-header__logo" />
        </Link>
        <GlobalHeaderNavigation />
        <Profile />
        <MobileNavigation marketplace={marketplace} />
      </div>
    </div>
  );
};

const SubHeaderNavigation = observer(({marketplace}) => {
  const fullMarketplace = marketplace ? rootStore.marketplaces[marketplace.marketplaceId] : null;
  return (
    <nav className="subheader__navigation subheader__navigation--personal">
      {
        rootStore.hideGlobalNavigation ?
          <Profile /> : null
      }

      <div className="subheader__navigation--personal__links">
        {
          fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0 ?
            <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collections")}>
              My Collections
            </NavLink> : null
        }
        <NavLink className="subheader__navigation-link" to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "collection") : "/wallet/collection"}>
          My Items
        </NavLink>
        <NavLink className="subheader__navigation-link" to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "my-listings") : "/wallet/my-listings"}>
          My Listings
        </NavLink>
      </div>
    </nav>
  );
});

const MarketplaceNavigation = ({marketplace}) => {
  const branding = marketplace.branding || {};

  return (
    <div className="subheader__marketplace">
      { branding.hide_name ? null : <h1 className="subheader__header">{`${branding.name} Store`}</h1> }
      <nav className="subheader__navigation subheader__navigation--marketplace">
        <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
          Store
        </NavLink>
        <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "listings")}>
          Listings
        </NavLink>
        <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "activity")}>
          Activity
        </NavLink>
      </nav>
      {
        rootStore.hideGlobalNavigation ?
          <MobileNavigation marketplace={marketplace} /> : null
      }
    </div>
  );
};

const SubHeader = ({marketplace}) => {
  if(!marketplace) {
    return (
      <div className="subheader-container">
        <div className="subheader">
          <SubHeaderNavigation />
        </div>
      </div>
    );
  }

  const { name, round_logo, header_logo } = marketplace.branding || {};

  return (
    <div className="subheader-container subheader-container--marketplace">
      <div className="subheader subheader--marketplace">
        <Link className="subheader__logo-container" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
          <ImageIcon icon={header_logo || round_logo ? (header_logo || round_logo).url : PlaceholderLogo} title={name || ""} className="subheader__logo" />
        </Link>
        <MarketplaceNavigation marketplace={marketplace} />
        <SubHeaderNavigation marketplace={marketplace} />
      </div>
    </div>
  );
};

const NewHeader = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const marketplace = marketplaceId && rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);

  useEffect(() => {
    rootStore.GetWalletBalance();

    let interval = setInterval(() => rootStore.GetWalletBalance(), 120000);
    return () => clearInterval(interval);
  }, []);

  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  if(rootStore.sidePanelMode) {
    if(rootStore.navigationBreadcrumbs.length <= 2) { return null; }

    return (
      <header className="header header--side-panel">
        <NavLink
          className="header--side-panel__back-button"
          to={rootStore.navigationBreadcrumbs[rootStore.navigationBreadcrumbs.length - 2].path}
        >
          <ImageIcon icon={BackIcon} title="Back" />
        </NavLink>
      </header>
    );
  }

  return (
    <header className="header">
      <GlobalHeader marketplace={marketplace} />
      <SubHeader marketplace={marketplace} />
    </header>
  );
});

export default NewHeader;
