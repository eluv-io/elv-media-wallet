import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink, useLocation} from "react-router-dom";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import Modal from "Components/common/Modal";
import {WalletHeader} from "Components/crypto/WalletConnect";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import EluvioLogo from "Assets/images/EluvioLogo.png";
import MenuIcon from "Assets/icons/menu";
import WalletIcon from "Assets/icons/wallet balance button icon.svg";

const Profile = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];

  if(!rootStore.loginLoaded && !rootStore.loggedIn) {
    return <div className="header__profile header__profile--placeholder" />;
  }

  if(!rootStore.loggedIn) {
    return (
      <button className="header__profile header__log-in" onClick={() => rootStore.ShowLogin()}>
        Log In
      </button>
    );
  }

  return (
    <Link to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/profile"} className="header__profile">
      <div className="header__profile__info ellipsis">
        <div className="header__profile__name">
          { rootStore.userProfile.name }
        </div>
        {
          typeof rootStore.totalWalletBalance !== "undefined" ?
            <div className="header__profile__balances">
              <WalletHeader />
              <div
                className="header__profile__balance header__profile__balance--wallet"
                title={`Total balance: ${FormatPriceString({USD: rootStore.totalWalletBalance})}\nAvailable balance: ${FormatPriceString({USD: rootStore.availableWalletBalance}) }\nPending balance: ${FormatPriceString({USD: rootStore.pendingWalletBalance}) }`}
              >
                <ImageIcon icon={WalletIcon} label="Wallet Balance" />
                <div className="header__profile__balance__amount">
                  { FormatPriceString({USD: rootStore.totalWalletBalance}) }
                  { rootStore.pendingWalletBalance ? <div className="header__profile__pending-indicator">*</div> : null}
                </div>
              </div>
            </div> : null
        }
      </div>
    </Link>
  );
});

const MobileNavigationMenu = observer(({marketplace, Close}) => {
  let links;
  if(!marketplace) {
    links = [
      { name: "Discover Marketplaces", to: "/marketplaces" },
      { name: "All Listings", to: "/wallet/listings" },
      { name: "Activity", to: "/wallet/activity" },
      { separator: true },
      { name: "My Items", to: "/wallet/collection", authed: true },
      { name: "My Listings", to: "/wallet/my-listings", authed: true },
      { name: "My Profile", to: "/profile", authed: true }
    ];
  } else {
    const fullMarketplace = rootStore.marketplaces[marketplace.marketplaceId];
    const tabs = fullMarketplace.branding?.tabs || {};

    links = [
      {name: tabs.store || marketplace?.branding?.name || "Store", to: UrlJoin("/marketplace", marketplace.marketplaceId, "store")},
      {name: tabs.listings || "Listings", to: UrlJoin("/marketplace", marketplace.marketplaceId, "listings")},
      {name: "Activity", to: UrlJoin("/marketplace", marketplace.marketplaceId, "activity")},
      {name: tabs.my_items || "My Items", to: UrlJoin("/marketplace", marketplace.marketplaceId, "collection"), authed: true},
      {
        name: "My Collections",
        to: UrlJoin("/marketplace", marketplace.marketplaceId, "collections"),
        authed: true,
        hidden: !fullMarketplace || !fullMarketplace.collections || fullMarketplace.collections.length === 0
      },
      {name: "My Listings", to: UrlJoin("/marketplace", marketplace.marketplaceId, "my-listings"), authed: true},
      {separator: true, global: true},
      {name: "Discover Marketplaces", to: "/marketplaces", global: true},
      {name: "My Full Collection", to: "/wallet/collection", authed: true, global: true},
      {name: "My Profile", to: UrlJoin("/marketplace", marketplace.marketplaceId, "profile"), authed: true}
    ];
  }

  return (
    <div className="mobile-navigation__menu">
      {
        links.map(({name, to, authed, global, separator, hidden}) => {
          if(hidden || (authed && !rootStore.loggedIn)) { return null; }

          if(global && rootStore.hideGlobalNavigation) { return null; }

          if(separator) {
            return <div key="mobile-link-separator" className="mobile-navigation__separator" />;
          }

          return (
            <NavLink to={to} className="mobile-navigation__link" onClick={Close} key={`mobile-link-${name}`}>
              <span>{ name }</span>
            </NavLink>
          );
        })
      }
    </div>
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

const GlobalHeader = observer(({marketplace}) => {
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
});

const SubHeaderNavigation = observer(({marketplace}) => {
  const fullMarketplace = marketplace ? rootStore.marketplaces[marketplace.marketplaceId] : null;
  const tabs = fullMarketplace?.branding?.tabs || {};

  return (
    <nav className="subheader__navigation subheader__navigation--personal">
      {
        rootStore.hideGlobalNavigation ?
          <Profile /> : null
      }

      {
        !rootStore.loggedIn ? null :
          <div className="subheader__navigation--personal__links">
            {
              fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0 ?
                <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collections")}>
                  My Collections
                </NavLink> : null
            }
            <NavLink className="subheader__navigation-link" to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "collection") : "/wallet/collection"}>
              { tabs.my_items || "My Items" }
            </NavLink>
            <NavLink className="subheader__navigation-link" to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "my-listings") : "/wallet/my-listings"}>
              My Listings
            </NavLink>
          </div>
      }
    </nav>
  );
});

const MarketplaceNavigation = observer(({marketplace}) => {
  const branding = marketplace.branding || {};
  const tabs = branding.tabs || {};

  return (
    <div className="subheader__marketplace">
      { branding.hide_name ? null : <h1 className="subheader__header">{`${branding.name}`}</h1> }
      <nav className="subheader__navigation subheader__navigation--marketplace">
        <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
          { tabs.store || "Store" }
        </NavLink>
        <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "listings")}>
          { tabs.listings || "Listings" }
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
});

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

  const logo = (header_logo || round_logo)?.url;
  return (
    <div className="subheader-container subheader-container--marketplace">
      <div className="subheader subheader--marketplace">
        {
          logo ?
            <Link className="subheader__logo-container" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
              <ImageIcon icon={logo} label={name || ""} className="subheader__logo"/>
            </Link> : null
        }
        <MarketplaceNavigation marketplace={marketplace} />
        <SubHeaderNavigation marketplace={marketplace} />
      </div>
    </div>
  );
};

const Header = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const marketplace = marketplaceId && rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);

  useEffect(() => {
    rootStore.GetWalletBalance();

    let interval = setInterval(() => rootStore.GetWalletBalance(), 120000);
    return () => clearInterval(interval);
  }, []);

  if(!rootStore.loaded || rootStore.hideNavigation) { return null; }

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

export default Header;
