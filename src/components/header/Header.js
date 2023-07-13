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
import {Debounce, SetImageUrlDimensions} from "../../utils/Utils";
import MenuButton from "Components/common/MenuButton";

import EluvioE from "Assets/images/ELUV.IO-E-Icon.png";
import EluvioLogo from "Assets/images/Eluvio_logo.svg";
import MenuIcon from "Assets/icons/menu";
import UserIcon from "Assets/icons/profile.svg";
import DiscoverIcon from "Assets/icons/discover.svg";
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
        {
          marketplaceId ? null :
            <div className="header__profile__label">
              {rootStore.l10n.header.media_wallet}
            </div>
        }
        <button className="action action-primary header__profile__sign-in-button" onClick={() => rootStore.ShowLogin()}>
          { rootStore.l10n.login.sign_in }
        </button>
        {
          marketplaceId && !(rootStore.hideGlobalNavigation || rootStore.hideGlobalNavigationInMarketplace)  ?
            <NavLink
              className="header__profile__link"
              title = "Discover Projects"
              to="/marketplaces"
            >
              <ImageIcon icon={DiscoverIcon} className="header__profile__link-icon" />
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

const StoreLink = observer(({marketplace}) => {
  const marketplaces = (marketplace.branding.additional_marketplaces || [])
    .map(({tenant_slug, marketplace_slug}) => rootStore.allMarketplaces.find(m => m.tenantSlug === tenant_slug && m.marketplaceSlug === marketplace_slug))
    .filter(m => m);

  if(marketplaces.length === 0) {
    return (
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
        { marketplace.branding.tabs?.store || rootStore.l10n.header.store }
      </NavLink>
    );
  }

  return (
    <MenuButton
      className="header__navigation-link header__navigation-link--menu"
      items={
        [marketplace, ...marketplaces].map(marketplace => ({
          to: UrlJoin("/marketplace", marketplace.marketplaceId, "store"),
          useNavLink: true,
          label: marketplace.branding.name
        }))
      }
    >
      { marketplace.branding.tabs?.stores || rootStore.l10n.header.stores }
    </MenuButton>
  );
});

const MarketplaceNavigation = observer(({marketplace, compact}) => {
  const branding = marketplace.branding || {};
  const tabs = branding.tabs || {};

  const fullMarketplace = marketplace ? rootStore.marketplaces[marketplace.marketplaceId] : null;
  const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;
  const secondaryDisabled = branding.disable_secondary_market;

  if(!compact && secondaryDisabled && !hasCollections && (rootStore.pageWidth < 600 || branding.hide_leaderboard)) {
    // Only store link would be shown on non-profile pages, hide it instead
    return <nav className="header__navigation header__navigation--marketplace" />;
  }

  return (
    <nav className="header__navigation header__navigation--marketplace">
      <StoreLink marketplace={marketplace} />
      {
        secondaryDisabled ? null :
          <>
            <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "listings")}>
              {tabs.listings || rootStore.l10n.header.listings}
            </NavLink>
            <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "activity")}>
              {rootStore.l10n.header.activity}
            </NavLink>
          </>
      }
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
  const logo = SetImageUrlDimensions({url: header_logo?.url, height: 150});
  const headerImage = SetImageUrlDimensions({url: header_image?.url, height: 150});
  const compact = rootStore.hideMarketplaceNavigation;
  const theme = marketplace?.branding?.color_scheme?.toLowerCase() || "light";

  return (
    <>
      <div className={`header-padding header-padding--marketplace ${compact ? "header-padding--compact" : ""}`} />
      <header className={`page-block page-block--header ${scrolled ? "header-container--scrolled" : ""} ${compact ? "header-container--compact" : ""} ${rootStore.appBackground ? "page-block--custom-background" : ""} header-container header-container--marketplace`}>
        <div className={`header-container__background header-container__background--${theme} : ""}`} />
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
                  headerImage ?
                    <div className="header__content__image-container">
                      <ImageIcon icon={headerImage} label={name || ""} className="header__content__image" />
                    </div> :
                    (hide_name || !name) ? null : <h1 className="header__content__header">{`${name}`}</h1>
                }
              </div>
          }
          <div className={`header__navigation-container ${compact ? "header__navigation-container--compact" : ""}`}>
            <MarketplaceNavigation marketplace={marketplace} compact={compact} />
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
                  <ImageIcon icon={EluvioE} className="header__content__logo header__content__logo--e" />
                  <ImageIcon icon={EluvioLogo} label={name || ""} className="header__content__logo header__content__logo--text"/>
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
let initialMarketplaceScroll = false;
const Header = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const marketplace = marketplaceId && rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);

  if(location.pathname.startsWith("/action")) {
    return null;
  }

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setScrolled(false);
    initialMarketplaceScroll = false;

    const ScrollFade = Debounce(() => {
      // When marketplace changes, reset header to full size until the page is actually scrolled down
      if(!initialMarketplaceScroll && window.scrollY > lastScrollPosition) {
        initialMarketplaceScroll = true;
      }

      if(!initialMarketplaceScroll) {
        lastScrollPosition = window.scrollY;
        return;
      }

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
