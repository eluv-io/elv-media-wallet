import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
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
import UserIcon from "Assets/icons/user.svg";

const Profile = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];

  if((!rootStore.loginLoaded && !rootStore.loggedIn) || rootStore.authenticating) {
    return <div className="header__profile header__profile--placeholder" />;
  }

  if(!rootStore.loggedIn) {
    const isEluvioSite = ["elv-test.io", "eluv.io", "contentfabric.io", "192.168"].find(domain => window.location.href.includes(domain));

    if(rootStore.capturedLogin && !isEluvioSite) {
      return null;
    }

    return (
      <button className="header__profile header__log-in" onClick={() => rootStore.ShowLogin()}>
        Log In
      </button>
    );
  }

  const user = rootStore.walletClient.UserInfo() || {};

  return (
    <div title={rootStore.userProfiles.me?.userName || user.email || user.address} className="header__profile">
      <Link
        to={marketplaceId ? `/marketplace/${marketplaceId}/users/me/items` : "/wallet/users/me/items"}
        className="header__profile__user"
      >
        <ImageIcon icon={UserIcon} className="header__profile__user__icon" />
      </Link>
      <Link
        to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/wallet/profile"}
        className="header__profile__balance"
      >
        <ImageIcon icon={WalletIcon} className="header__profile__balance__icon" />
        <WalletHeader />
        <div className="header__profile__balance__amount">
          { FormatPriceString({USD: rootStore.totalWalletBalance}) }
          { rootStore.pendingWalletBalance ? <div className="header__profile__pending-indicator">*</div> : null}
        </div>
      </Link>
    </div>
  );
});

const MobileNavigationMenu = observer(({marketplace, Close}) => {
  let links;
  if(!marketplace) {
    links = [
      { name: "My Items", to: "/wallet/users/me/items", authed: true },
      { name: "My Listings", to: "/wallet/users/me/listings", authed: true },
      { name: "My Profile", to: "/wallet/profile", authed: true },
      { separator: true },
      { name: "Discover Marketplaces", to: "/marketplaces" },
      { name: "All Listings", to: "/wallet/listings" },
      { name: "Activity", to: "/wallet/activity" }
    ];
  } else {
    const fullMarketplace = rootStore.marketplaces[marketplace.marketplaceId];
    const tabs = fullMarketplace?.branding?.tabs || {};

    links = [
      {name: tabs.my_items || "My Items", to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items"), authed: true},
      {
        name: rootStore.loggedIn ? "My Collections" : "Collections",
        to: UrlJoin("/marketplace", marketplace.marketplaceId, "collections"),
        hidden: !fullMarketplace || !fullMarketplace.collections || fullMarketplace.collections.length === 0
      },
      {name: "My Listings", to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "listings"), authed: true},
      {name: tabs.store || marketplace?.branding?.name || "Store", to: UrlJoin("/marketplace", marketplace.marketplaceId, "store")},
      {name: tabs.listings || "Listings", to: UrlJoin("/marketplace", marketplace.marketplaceId, "listings")},
      {name: "Activity", to: UrlJoin("/marketplace", marketplace.marketplaceId, "activity")},
      {name: "Leaderboard", to: UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard"), hidden: marketplace?.branding?.hide_leaderboard},
      {separator: true, global: true},
      {name: "Discover Marketplaces", to: "/marketplaces", global: true},
      {name: "My Full Collection", to: "/wallet/users/me/items", authed: true, global: true},
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

      {
        !rootStore.loggedIn ?
          <button
            className="mobile-navigation__link"
            onClick={() => {
              Close();
              rootStore.ShowLogin();
            }}
          >
            Log In
          </button> :
          <button
            className="mobile-navigation__link"
            onClick={() => {
              Close();
              rootStore.SignOut();
            }}
          >
            Log Out
          </button>
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
  if(rootStore.hideGlobalNavigation || (rootStore.hideGlobalNavigationInMarketplace && marketplace)) { return null; }

  return (
    <div className="page-block page-block--global-header global-header-container">
      <div className="page-block__content page-block__content--unrestricted">
        <div className={`global-header ${marketplace ? "global-header--marketplace" : ""}`}>
          <Link to="/marketplaces" className="global-header__logo-container">
            <ImageIcon icon={EluvioLogo} title="Eluvio" className="global-header__logo" />
          </Link>
          <GlobalHeaderNavigation />
          <Profile />
          <MobileNavigation marketplace={marketplace} />
        </div>
      </div>
    </div>
  );
});

const SubHeaderNavigation = observer(({marketplace}) => {
  const fullMarketplace = marketplace ? rootStore.marketplaces[marketplace.marketplaceId] : null;
  const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;

  const tabs = marketplace?.branding?.tabs || {};
  return (
    <nav className="subheader__navigation--personal">
      {
        hasCollections ?
          <NavLink className="subheader__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collections")}>
            { rootStore.loggedIn ? "My Collections" : "Collections" }
          </NavLink> : null
      }
      {
        rootStore.loggedIn ?
          <NavLink
            className="subheader__navigation-link"
            to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items") : "/wallet/users/me/items"}
            isActive={() => window.location.hash?.includes("/users/me/")}
          >
            {tabs.my_items || "My Items"}
          </NavLink> : null
      }
    </nav>
  );
});

const MarketplaceNavigation = observer(({marketplace}) => {
  const branding = marketplace.branding || {};
  const tabs = branding.tabs || {};

  return (
    <>
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
        {
          rootStore.pageWidth >= 600 && !branding.hide_leaderboard ?
            <NavLink className="subheader__navigation-link no-mobile" to={UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard")}>
              Leaderboard
            </NavLink> : null
        }
      </nav>
    </>
  );
});

const SubHeader = observer(({marketplace}) => {
  if(!marketplace) {
    return (
      <div className={`page-block page-block--subheader ${rootStore.appBackground ? "page-block--custom-background" : ""} subheader-container`}>
        <div className="page-block__content page-block__content--unrestricted subheader subheader--wallet">
          <div className="subheader__navigation-container">
            <SubHeaderNavigation />
          </div>
        </div>
      </div>
    );
  }

  const { name, header_logo, header_image, hide_name, preview } = marketplace.branding || {};
  const logo = header_logo?.url;

  const hideGlobalNavigation = rootStore.hideGlobalNavigation || (rootStore.hideGlobalNavigationInMarketplace && marketplace);
  return (
    <div className={`page-block page-block--subheader ${rootStore.appBackground ? "page-block--custom-background" : ""} subheader-container subheader-container--marketplace`}>
      <div className={`page-block__content page-block__content--unrestricted subheader subheader--marketplace ${hide_name ? "subheader--marketplace--no-header" : ""}`}>
        { preview ? <div className="subheader__preview-indicator">PREVIEW</div> : null }
        {
          rootStore.hideMarketplaceNavigation ? null :
            <div className="subheader__header-container">
              {
                logo ?
                  <Link className="subheader__logo-container" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
                    <ImageIcon icon={logo} label={name || ""} className="subheader__logo"/>
                  </Link> : null
              }
              {
                header_image?.url ?
                  <div className="subheader__header__image-container">
                    <ImageIcon icon={header_image.url} label={name || ""} className="subheader__header__image" />
                  </div> :
                  (!hide_name ? <h1 className="subheader__header">{`${name}`}</h1> : null)
              }
              {
                hideGlobalNavigation ?
                  <Profile marketplace={marketplace}/> : null
              }
              {
                hideGlobalNavigation ?
                  <MobileNavigation marketplace={marketplace}/> : null
              }
            </div>
        }
        <div className="subheader__navigation-container">
          <MarketplaceNavigation marketplace={marketplace} />
          <SubHeaderNavigation marketplace={marketplace} />
        </div>
      </div>
    </div>
  );
});

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
          <ImageIcon icon={BackIcon} label="Back" />
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
