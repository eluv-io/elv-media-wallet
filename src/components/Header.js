import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Link, NavLink, useLocation} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import Modal from "Components/common/Modal";
import {Copy, FormatPriceString} from "Components/common/UIComponents";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import EluvioLogo from "Assets/images/EluvioLogo.png";
import MenuIcon from "Assets/icons/menu";
import WalletIcon from "Assets/icons/wallet.svg";
import UserIcon from "Assets/icons/profile.svg";
import CopyIcon from "Assets/icons/copy.svg";

const WalletMenu = observer(({marketplaceId, Hide}) => {
  const userInfo = rootStore.walletClient.UserInfo();
  const menuRef = useRef();

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const onClickOutside = event => {
      if(!menuRef?.current || !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, [menuRef]);

  return (
    <div className="header__wallet-menu" ref={menuRef}>
      <h2 className="header__wallet-menu__header">Media Wallet</h2>
      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__message">My Eluvio Content Blockchain Address</div>
        <div className="header__wallet-menu__address-container">
          <div className="header__wallet-menu__address ellipsis">
            { rootStore.CurrentAddress() }
          </div>
          <button onClick={() => Copy(rootStore.CurrentAddress())} className="header__wallet-menu__address-copy">
            <ImageIcon alt="Copy Address" icon={CopyIcon} />
          </button>
        </div>
      </div>

      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__message">My Seller Balance</div>
        <div className="header__wallet-menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true, excludeAlternateCurrency: true}) }</div>
      </div>

      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__message">Signed in Via {userInfo.walletType === "Custodial" ? "Email" : userInfo.walletType}</div>
        { userInfo.email ? <div className="header__wallet-menu__email">{userInfo.email}</div> : null }
      </div>

      <div className="header__wallet-menu__actions">
        <Link
          to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/wallet/profile"}
          onClick={Hide}
          className="action"
        >
          Manage Media Wallet
        </Link>
        <button onClick={() => rootStore.SignOut()} className="action action-borderless action-transparent">
          Sign Out
        </button>
      </div>
    </div>
  );
});

const Profile = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const [showWalletMenu, setShowWalletMenu] = useState(false);

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

  return (
    <>
      <div className="header__profile">
        <NavLink
          isActive={(_, location) => rootStore.loggedIn && (location.pathname.includes("/users/me/") || location.pathname.includes(`/users/${rootStore.CurrentAddress()}`))}
          to={marketplaceId ? `/marketplace/${marketplaceId}/users/me/items` : "/wallet/users/me/items"}
          className="header__profile__link header__profile__user"
        >
          <ImageIcon alt="My Profile" icon={UserIcon} className="header__profile__user__icon" />
        </NavLink>
        <button
          onClick={() => setShowWalletMenu(!showWalletMenu)}
          className={`header__profile__link header__profile__balance ${showWalletMenu ? "active" : ""}`}
        >
          <ImageIcon alt="My Wallet" icon={WalletIcon} className="header__profile__balance__icon" />
        </button>
      </div>
      { showWalletMenu ? <WalletMenu marketplaceId={marketplaceId} Hide={() => setShowWalletMenu(false)} /> : null }
    </>
  );
});

const MobileNavigationMenu = observer(({marketplace, Close}) => {
  const userInfo = rootStore.walletClient.UserInfo();

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
      <h2 className="mobile-navigation__menu__header">Media Wallet</h2>
      {
        !rootStore.loggedIn ? null :
          <>
            <div className="mobile-navigation__menu__account-info">
              <div className="mobile-navigation__menu__section">
                <div className="mobile-navigation__menu__message">Signed in Via {userInfo.walletType === "Custodial" ? "Email" : userInfo.walletType}</div>
                { userInfo.email ? <div className="mobile-navigation__menu__email">{userInfo.email}</div> : null }
              </div>
              <div className="mobile-navigation__menu__section">
                <div className="mobile-navigation__menu__message">My Eluvio Content Blockchain Address</div>
                <div className="mobile-navigation__menu__address-container">
                  <div className="mobile-navigation__menu__address ellipsis">
                    { rootStore.CurrentAddress() }
                  </div>
                  <button onClick={() => Copy(rootStore.CurrentAddress())} className="mobile-navigation__menu__address-copy">
                    <ImageIcon alt="Copy Address" icon={CopyIcon} />
                  </button>
                </div>
              </div>

              <div className="mobile-navigation__menu__section">
                <div className="mobile-navigation__menu__message">My Seller Balance</div>
                <div className="mobile-navigation__menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true, excludeAlternateCurrency: true}) }</div>
              </div>
            </div>
            <div key="mobile-link-separator" className="mobile-navigation__separator" />
          </>
      }

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

const MobileNavigation = ({marketplace, className=""}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <div className={`mobile-navigation ${className}`}>
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
      <div className="page-block__content">
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
        rootStore.hideMarketplaceNavigation && (rootStore.hideGlobalNavigation || rootStore.hideGlobalNavigationInMarketplace && marketplace) ?
          <Profile /> :
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
  );
});

const SubHeader = observer(({marketplace}) => {
  if(!marketplace) {
    return (
      <div className={`page-block page-block--subheader ${rootStore.appBackground ? "page-block--custom-background" : ""} subheader-container`}>
        <div className="page-block__content subheader subheader--wallet">
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
      <div className={`page-block__content subheader subheader--marketplace ${hide_name ? "subheader--marketplace--no-header" : ""}`}>
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
        {
          rootStore.hideMarketplaceNavigation && (rootStore.hideGlobalNavigation || rootStore.hideGlobalNavigationInMarketplace && marketplace) ?
            <MobileNavigation marketplace={marketplace} className="mobile-navigation--profile" /> :
            null
        }
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
