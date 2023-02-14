import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {notificationStore, rootStore} from "Stores";
import {Link, NavLink, useLocation} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import Modal from "Components/common/Modal";
import MobileNavigationMenu from "Components/header/MobileNavigationMenu";

import WalletMenu from "Components/header/WalletMenu";
import ProfileMenu from "Components/header/ProfileMenu";
import {NotificationsMenu} from "Components/header/NotificationsMenu";
import {Debounce} from "../../utils/Utils";

import EluvioLogo from "Assets/icons/ELUVIO logo (updated nov 2).svg";
import MenuIcon from "Assets/icons/menu";
import UserIcon from "Assets/icons/profile.svg";
import ProjectsIcon from "Assets/icons/header/New Projects_Marketplaces icon.svg";
import WalletIcon from "Assets/icons/header/wallet icon v2.svg";
import NotificationsIcon from "Assets/icons/header/Notification Icon.svg";
import BackIcon from "Assets/icons/pagination arrow back.svg";

const ProfileNavigation = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  if(!rootStore.loaded || rootStore.authenticating) {
    return <div className="header__profile header__profile--placeholder" />;
  }

  if(!rootStore.loggedIn) {
    const isEluvioSite = ["elv-test.io", "eluv.io", "contentfabric.io", "192.168"].find(domain => window.location.href.includes(domain));

    if(rootStore.capturedLogin && !isEluvioSite) {
      return null;
    }

    return (
      <div className="header__profile">
        <button className="header__navigation-link header__profile__link header__profile__sign-in-button" onClick={() => rootStore.ShowLogin()}>
          { rootStore.l10n.login.sign_in }
        </button>
        {
          marketplaceId && !(rootStore.hideGlobalNavigation || rootStore.hideGlobalNavigationInMarketplace)  ?
            <NavLink
              className="header__profile__link"
              title = "Discover Projects"
              to="/marketplaces"
            >
              <ImageIcon icon={ProjectsIcon} className="header__profile__link-icon" />
            </NavLink> : null
        }
      </div>
    );
  }

  return (
    <>
      <div className="header__profile">
        <button
          className={`header__profile__link ${showNotificationsMenu || window.location.hash.endsWith("/notifications") ? "active" : ""}`}
          onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
        >
          <ImageIcon alt="Notifications" icon={NotificationsIcon} className="header__profile__user__icon" />
          { notificationStore.newNotifications ? <div className="header__profile__link__indicator" /> : null }
        </button>
        <button
          className={`header__profile__link ${showProfileMenu ? "active" : ""}`}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <ImageIcon alt="My Profile" icon={UserIcon} className="header__profile__user__icon" />
        </button>
        <button
          onClick={() => setShowWalletMenu(!showWalletMenu)}
          className={`header__profile__link ${showWalletMenu ? "active" : ""}`}
        >
          <ImageIcon alt="My Wallet" icon={WalletIcon} className="header__profile__balance__icon" />
        </button>
      </div>
      { showWalletMenu ? <WalletMenu marketplaceId={marketplaceId} Hide={() => setShowWalletMenu(false)} /> : null }
      { showProfileMenu ? <ProfileMenu marketplaceId={marketplaceId} Hide={() => setShowProfileMenu(false)} /> : null }
      { showNotificationsMenu ? <NotificationsMenu marketplaceId={marketplaceId} Hide={() => setShowNotificationsMenu(false)} /> : null }
    </>
  );
});

const MobileNavigation = observer(({marketplace, className=""}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  return (
    <>
      <div className={`mobile-navigation ${className}`}>
        {
          rootStore.loggedIn ?
            <button
              className={`header__profile__link mobile-navigation__notifications-button ${showNotificationsMenu || window.location.hash.endsWith("/notifications") ? "active" : ""}`}
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
            >
              <ImageIcon alt="Notifications" icon={NotificationsIcon} className="header__profile__user__icon"/>
              {notificationStore.newNotifications ? <div className="header__profile__link__indicator"/> : null}
            </button> : null
        }
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
      { showNotificationsMenu ? <NotificationsMenu marketplaceId={marketplace?.marketplaceId} Hide={() => setShowNotificationsMenu(false)} /> : null }
    </>
  );
});

const MarketplaceNavigation = observer(({marketplace}) => {
  const branding = marketplace.branding || {};
  const tabs = branding.tabs || {};

  const fullMarketplace = marketplace ? rootStore.marketplaces[marketplace.marketplaceId] : null;
  const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;

  return (
    <nav className="header__navigation header__navigation--marketplace">
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
        { tabs.store || rootStore.l10n.header.store }
      </NavLink>
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "listings")}>
        { tabs.listings || rootStore.l10n.header.listings }
      </NavLink>
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "activity")}>
        { rootStore.l10n.header.activity }
      </NavLink>
      {
        hasCollections ?
          <NavLink className="header__navigation-link no-mobile" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collections")}>
            { rootStore.l10n.header.collections }
          </NavLink> : null
      }
      {
        rootStore.pageWidth >= 600 && !branding.hide_leaderboard ?
          <NavLink className="header__navigation-link no-mobile" to={UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard")}>
            { rootStore.l10n.header.leaderboard }
          </NavLink> : null
      }
    </nav>
  );
});

const MarketplaceHeader = observer(({marketplace, scrolled}) => {
  const { name, header_logo, header_image, hide_name, preview } = marketplace.branding || {};
  const logo = header_logo?.url;
  const compact = rootStore.hideMarketplaceNavigation;
  const dark = ["dark", "custom"].includes(marketplace?.branding?.color_scheme?.toLowerCase());

  return (
    <>
      <div className={`header-padding header-padding--marketplace ${compact ? "header-padding--compact" : ""}`} />
      <header className={`page-block page-block--header ${scrolled ? "header-container--scrolled" : ""} ${compact ? "header-container--compact" : ""} ${rootStore.appBackground ? "page-block--custom-background" : ""} header-container header-container--marketplace`}>
        <div className={`header-container__background ${dark ? "header-container__background--dark" : ""}`} />
        <div className={`page-block__content header header--marketplace ${hide_name ? "header--marketplace--no-header" : ""}`}>
          { preview ? <div className="header__preview-indicator">PREVIEW</div> : null }
          {
            rootStore.hideMarketplaceNavigation ? null :
              <div className="header__content">
                {
                  logo ?
                    <Link className="header__content__logo-container" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
                      <ImageIcon icon={logo} label={name || ""} className="header__content__logo"/>
                    </Link> : null
                }
                {
                  header_image?.url ?
                    <div className="header__content__image-container">
                      <ImageIcon icon={header_image.url} label={name || ""} className="header__content__image" />
                    </div> :
                    (hide_name || !name) ? null : <h1 className="header__content__header">{`${name}`}</h1>
                }
              </div>
          }
          <div className={`header__navigation-container ${compact ? "header__navigation-container--compact" : ""}`}>
            <MarketplaceNavigation marketplace={marketplace} />
            <ProfileNavigation />
            <MobileNavigation marketplace={marketplace}/>
          </div>
        </div>
      </header>
    </>
  );
});

const GlobalHeader = observer(({scrolled}) => {
  const compact = rootStore.hideMarketplaceNavigation;

  return (
    <>
      <div className={`header-padding header-padding--global ${compact ? "header-padding--compact" : ""}`} />
      <header className={`page-block page-block--header ${rootStore.appBackground ? "page-block--custom-background" : ""} ${scrolled ? "header-container--scrolled" : ""} ${compact ? "header-container--compact" : ""} header-container header-container--global`}>
        <div className={`header-container__background ${rootStore.darkMode ? "header-container__background--dark" : ""}`} />
        <div className="page-block__content header header--global">
          {
            compact ? null :
              <div className="header__content">
                <Link className="header__content__logo-container header__content__logo-container--global" to={"/marketplaces"}>
                  <ImageIcon icon={EluvioLogo} label={name || ""} className="header__content__logo"/>
                </Link>
                {
                  rootStore.headerText ?
                    <div className="header__content">
                      <h1 className="header__content__header">{rootStore.headerText}</h1>
                    </div> : null
                }
              </div>
          }
          <div className="header__navigation-container header__navigation-container--compact">
            <nav className="header__navigation">
              <NavLink className="header__navigation-link" to="/marketplaces">
                { rootStore.l10n.header.discover_projects }
              </NavLink>
              <NavLink className="header__navigation-link" to="/wallet/listings">
                { rootStore.l10n.header.listings }
              </NavLink>
              <NavLink className="header__navigation-link" to="/wallet/activity">
                { rootStore.l10n.header.activity }
              </NavLink>
            </nav>
            <ProfileNavigation />
            <MobileNavigation />
          </div>
        </div>
      </header>
    </>
  );
});

let lastScrollPosition = window.scrollY;
const Header = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const marketplace = marketplaceId && rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setScrolled(false);

    const ScrollFade = Debounce(() => {
      const scrollPosition = Math.ceil(window.scrollY);

      const alreadyAtTop = Math.round(window.scrollY) <= 1 && Math.round(lastScrollPosition) <= 1;
      const notAtTop = scrollPosition > 0;
      const notScrollable = document.body.scrollHeight - window.innerHeight < 5;

      // Don't change state if scroll hasn't changed or if page is not scrollable (e.g. loading)
      if(alreadyAtTop || notScrollable) { return; }

      setScrolled(notAtTop);

      lastScrollPosition = window.scrollY;
    }, 50);

    document.addEventListener("scroll", ScrollFade);

    return () => document.removeEventListener("scroll", ScrollFade);
  }, [marketplaceId]);

  useEffect(() => {
    rootStore.GetWalletBalance();

    let interval = setInterval(() => rootStore.GetWalletBalance(), 120000);
    return () => clearInterval(interval);
  }, []);

  if(!rootStore.loaded || rootStore.hideNavigation) { return null; }

  if(rootStore.sidePanelMode) {
    if(rootStore.navigationBreadcrumbs.length <= 2) { return null; }

    return (
      <header className="header-container header--side-panel">
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
    marketplace ?
      <MarketplaceHeader marketplace={marketplace} scrolled={scrolled} key={`header-${marketplaceId}`} /> :
      <GlobalHeader scrolled={scrolled} />
  );
});

export default Header;
