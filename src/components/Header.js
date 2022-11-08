import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {checkoutStore, rootStore} from "Stores";
import {Link, NavLink, useLocation} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import Modal from "Components/common/Modal";
import {Copy, FormatPriceString, MenuLink, Select} from "Components/common/UIComponents";
import CountryCodesList from "country-codes-list";

import EluvioLogo from "Assets/icons/ELUVIO logo (updated nov 2).svg";
import MenuIcon from "Assets/icons/menu";
import UserIcon from "Assets/icons/profile.svg";
import CopyIcon from "Assets/icons/copy.svg";
import EmailIcon from "Assets/icons/email icon.svg";
import MetamaskIcon from "Assets/icons/metamask fox.png";


import ActivityIcon from "Assets/icons/header/Activity Icon.svg";
import ItemsIcon from "Assets/icons/header/items icon.svg";
import ListingsIcon from "Assets/icons/header/listings icon.svg";
import ProjectsIcon from "Assets/icons/header/New Projects_Marketplaces icon.svg";
import PreferencesIcon from "Assets/icons/header/Preferences icon.svg";
import WalletIcon from "Assets/icons/header/wallet icon v2.svg";
import ProfileIcon from "Assets/icons/header/profile icon v2.svg";
import CollectionsIcon from "Assets/icons/header/Collections Icon 2.svg";
import LeaderboardIcon from "Assets/icons/header/leaderboard Icon.svg";


const currencyMap = CountryCodesList.customList("currencyCode", "{currencyNameEn}");

const WalletMenu = observer(({marketplaceId, Hide}) => {
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
        <div className="header__wallet-menu__section-header">My Eluvio Content Blockchain Address</div>
        <div className="header__wallet-menu__address-container">
          <div className="header__wallet-menu__address ellipsis">
            { rootStore.CurrentAddress() }
          </div>
          <button onClick={() => Copy(rootStore.CurrentAddress())} className="header__wallet-menu__address-copy">
            <ImageIcon alt="Copy Address" icon={CopyIcon} />
          </button>
        </div>
        <div className="header__wallet-menu__message">
          Do not send funds to this address. This is an Eluvio Content Blockchain address and is not a payment address.
        </div>
      </div>

      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__section-header">My Seller Balance</div>
        <div className="header__wallet-menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true, excludeAlternateCurrency: true}) }</div>
      </div>

      <Link
        to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/wallet/profile"}
        onClick={Hide}
        className="header__wallet-menu__link"
      >
        View Details
      </Link>
    </div>
  );
});

const PreferencesMenu = observer(({marketplaceId, availableDisplayCurrencies, Hide}) => {
  return (
    <Modal className="header__preferences-menu-modal" Toggle={Hide}>
      <div className="header__preferences-menu">
        <div className="header__preferences-menu__label">
          Set Marketplace Display Currency
        </div>
        <div className="header__preferences-menu__hint">
          This is a conversion computed from USD
        </div>
        <Select
          value={checkoutStore.currency}
          onChange={currency => {
            checkoutStore.SetCurrency({currency});
            rootStore.SetLocalStorage(`preferred-currency-${marketplaceId}`, currency);
          }}
          activeValuePrefix="Display Currency: "
          containerClassName="header__preferences-menu__currency-select"
          options={[
            ["USD", "United States dollar"],
            ...(availableDisplayCurrencies || []).map(code => [code, currencyMap[code]])
          ]}
        />
      </div>
    </Modal>
  );
});

const ProfileMenu = observer(({marketplaceId, Hide}) => {
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const fullMarketplace = marketplaceId ? rootStore.marketplaces[marketplaceId] : null;
  const tabs = fullMarketplace?.branding?.tabs || {};
  const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;
  const userInfo = rootStore.walletClient.UserInfo();

  const availableDisplayCurrencies = fullMarketplace?.display_currencies || [];

  const menuRef = useRef();

  const IsActive = (page="") => (_, location) => rootStore.loggedIn && (location.pathname.includes(`/users/me/${page}`) || location.pathname.includes(`/users/${rootStore.CurrentAddress()}/${page}`));

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const onClickOutside = event => {
      if(window._showPreferencesMenu) { return; }

      if(!menuRef?.current || !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, [menuRef]);

  useEffect(() => {
    window._showPreferencesMenu = showPreferencesMenu;
  }, [showPreferencesMenu]);

  return (
    <div className="header__profile-menu" ref={menuRef}>
      <div className="header__profile-menu__info">
        <div className="header__profile-menu__info__type">Signed in Via {userInfo.walletType === "Custodial" ? "Email" : userInfo.walletName}</div>
        <div className="header__profile-menu__info__account">
          {
            userInfo.walletType === "Custodial" ?
            <>
              <ImageIcon icon={EmailIcon} />
              <div className="header__profile-menu__info__email ellipsis">
                { userInfo.email }
              </div>
            </> :
            <>
              <ImageIcon icon={MetamaskIcon} />
              <div className="header__profile-menu__info__address ellipsis">
                { userInfo.address }
              </div>
              <button onClick={() => Copy(userInfo.address)} className="header__profile-menu__info__address-copy">
                <ImageIcon alt="Copy Address" icon={CopyIcon} />
              </button>
            </>
          }
        </div>
      </div>
      <div className="header__profile-menu__links">
        <MenuLink
          icon={ProfileIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me") : "/wallet/users/me"}
          onClick={Hide}
        >
          My Profile
        </MenuLink>

        <div className="header__profile-menu__separator" />

        <MenuLink
          icon={ItemsIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "items") : "/wallet/users/me/items"}
          onClick={Hide}
          isActive={IsActive("items")}
        >
          {tabs.my_items || "My Items"}
        </MenuLink>
        {
          hasCollections ?
            <MenuLink
              icon={CollectionsIcon}
              className="header__profile-menu__link"
              to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "collections") : "/wallet/users/me/collections"}
              onClick={Hide}
              isActive={IsActive("collections")}
            >
              My Collections
            </MenuLink> : null
        }
        <MenuLink
          icon={ListingsIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "listings") : "/wallet/users/me/listings"}
          onClick={Hide}
          isActive={IsActive("listings")}
        >
          My Listings
        </MenuLink>
        <MenuLink
          icon={ActivityIcon}
          className="header__profile-menu__link"
          to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "activity") : "/wallet/users/me/activity"}
          onClick={Hide}
          isActive={IsActive("activity")}
        >
          My Activity
        </MenuLink>

        {
          availableDisplayCurrencies.length > 0 ?
            <MenuLink
              icon={PreferencesIcon}
              onClick={() => setShowPreferencesMenu(!showPreferencesMenu)}
              className={`header__profile-menu__link header__profile-menu__link-secondary ${showPreferencesMenu ? "active" : ""}`}
            >
              Preferences
            </MenuLink> : null
        }
        {
          rootStore.hideGlobalNavigation || (marketplaceId && rootStore.hideGlobalNavigationInMarketplace)  ? null :
            <>
              <div className="header__profile-menu__separator"/>
              <MenuLink
                icon={ProjectsIcon}
                to="/marketplaces"
                className="header__profile-menu__link header__profile-menu__link-secondary"
              >
                Discover Projects
              </MenuLink>
            </>
        }
      </div>
      <button
        onClick={() => {
          rootStore.SignOut();
          Hide();
        }}
        className="header__profile-menu__log-out-button"
      >
        Sign Out
      </button>
      {
        showPreferencesMenu ?
          <PreferencesMenu
            marketplaceId={marketplaceId}
            availableDisplayCurrencies={availableDisplayCurrencies}
            Hide={() => setShowPreferencesMenu(false)}
          /> : null
      }
    </div>
  );
});

const ProfileNavigation = observer(() => {
  const location = useLocation();
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
        Sign In
      </button>
    );
  }

  return (
    <>
      <div className="header__profile">
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
    </>
  );
});

const MobileNavigationMenu = observer(({marketplace, Close}) => {
  const userInfo = rootStore.loggedIn ? rootStore.walletClient.UserInfo() : {};
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);

  const fullMarketplace = marketplace && rootStore.marketplaces[marketplace.marketplaceId];
  const availableDisplayCurrencies = fullMarketplace?.display_currencies || [];

  let links;
  if(!marketplace) {
    links = [
      { name: "Profile", icon: ProfileIcon, to: "/wallet/users/me/items", authed: true },
      { separator: true, authed: true },
      { name: "Listings", icon: ListingsIcon, to: "/wallet/listings" },
      { name: "Activity", icon: ActivityIcon, to: "/wallet/activity" },
      { separator: true, authed: true },
      { name: "My Items", icon: ItemsIcon, to: UrlJoin("/wallet", "users", "me", "items"), authed: true },
      { name: "My Listings", icon: ListingsIcon, to: UrlJoin("/wallet", "users", "me", "listings"), authed: true },
      { name: "My Activity", icon: ActivityIcon, to: UrlJoin("/wallet", "users", "me", "activity"), authed: true },
    ];
  } else {
    const tabs = fullMarketplace?.branding?.tabs || {};
    const hasCollections = !fullMarketplace || !fullMarketplace.collections || fullMarketplace.collections.length === 0;

    links = [
      { name: "Profile", icon: ProfileIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items"), authed: true },
      { separator: true, authed: true },
      { name: tabs.store || marketplace?.branding?.name || "Store", icon: EmailIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "store") },
      { name: "Collections", icon: CollectionsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "collections"), hidden: !hasCollections },
      { name: tabs.listings || "Listings", icon: ListingsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "listings") },
      { name: "Activity", icon: ActivityIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "activity") },
      { name: "Leaderboard", icon: LeaderboardIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard"), hidden: marketplace?.branding?.hide_leaderboard },
      { separator: true, authed: true },
      { name: "My Items", icon: ItemsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "items"), authed: true },
      { name: "My Collections", icon: CollectionsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "collections"), authed: true, hidden: !hasCollections },
      { name: "My Listings", icon: ListingsIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "listings"), authed: true },
      { name: "My Activity", icon: ActivityIcon, to: UrlJoin("/marketplace", marketplace.marketplaceId, "users", "me", "activity"), authed: true },
    ];
  }

  return (
    <div className="mobile-menu">
      {
        rootStore.loggedIn ?
          <div className="mobile-menu__account">
            <div className="mobile-menu__account__type">Signed in Via {userInfo.walletType === "Custodial" ? "Email" : userInfo.walletName}</div>
            <div className="mobile-menu__account__account">
              {
                userInfo.walletType === "Custodial" ?
                  <>
                    <ImageIcon icon={EmailIcon} className="mobile-menu__account__icon" />
                    <div className="mobile-menu__account__email ellipsis">
                      { userInfo.email }
                    </div>
                  </> :
                  <>
                    <ImageIcon icon={MetamaskIcon} className="mobile-menu__account__icon" />
                    <div className="mobile-menu__account__address ellipsis">
                      { userInfo.address }
                    </div>
                    <button onClick={() => Copy(userInfo.address)} className="mobile-menu__account__address-copy">
                      <ImageIcon alt="Copy Address" icon={CopyIcon} />
                    </button>
                  </>
              }
            </div>
          </div> :
          <div className="mobile-menu__header">
            Media Wallet
          </div>
      }
      <div className="mobile-menu__content">
        {
          rootStore.loggedIn ?
            <>
              {
                userInfo.walletType === "Custodial" ?
                  <div className="mobile-menu__section">
                    <div className="mobile-menu__section-header">My Eluvio Content Blockchain Address</div>
                    <div className="mobile-menu__address-container">
                      <div className="mobile-menu__address ellipsis">
                        {rootStore.CurrentAddress()}
                      </div>
                      <button onClick={() => Copy(rootStore.CurrentAddress())} className="mobile-menu__address-copy">
                        <ImageIcon alt="Copy Address" icon={CopyIcon}/>
                      </button>
                    </div>
                    <div className="mobile-menu__message">
                      Do not send funds to this address. This is an Eluvio Content Blockchain address and is not a payment
                      address.
                    </div>
                  </div> : null
              }

              <div className="mobile-menu__section">
                <div className="mobile-menu__section-header">Seller Balance</div>
                <div className="mobile-menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true, excludeAlternateCurrency: true}) }</div>
              </div>

              <MenuLink
                icon={WalletIcon}
                to={marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, "profile") : "/wallet/profile"}
                className="mobile-menu__link"
                onClick={Close}
              >
                View Details
              </MenuLink>
            </> : null
        }
        {
          links.map(({name, icon, to, authed, global, separator, hidden}) => {
            if(hidden || (authed && !rootStore.loggedIn)) { return null; }

            if(global && rootStore.hideGlobalNavigation) { return null; }

            if(separator) {
              return <div key="mobile-link-separator" className="mobile-menu__separator" />;
            }

            return (
              <MenuLink
                icon={icon || EmailIcon}
                to={to}
                className="mobile-menu__link"
                onClick={Close}
                key={`mobile-link-${name}`}
              >
                { name }
              </MenuLink>
            );
          })
        }
        {
          availableDisplayCurrencies.length > 0 ?
            <MenuLink
              icon={PreferencesIcon}
              onClick={() => setShowPreferencesMenu(!showPreferencesMenu)}
              className={`mobile-menu__link ${showPreferencesMenu ? "active" : ""}`}
            >
              Preferences
            </MenuLink> : null
        }
        {
          rootStore.hideGlobalNavigation ? null :
            <>
              <div className="mobile-menu__separator" />
              <MenuLink
                icon={ProjectsIcon}
                to="/marketplaces"
                onClick={Close}
                className="mobile-menu__link"
              >
                Discover Projects
              </MenuLink>
            </>
        }
      </div>
      <button
        className="mobile-menu__sign-in-button"
        onClick={() => {
          rootStore.loggedIn ?
            rootStore.SignOut() :
            rootStore.ShowLogin();

          Close();
        }}
      >
        { rootStore.loggedIn ? "Sign Out" : "Sign In"}
      </button>
      { showPreferencesMenu ? <PreferencesMenu marketplaceId={marketplace?.marketplaceId} Hide={() => setShowPreferencesMenu(false)} /> : null }
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

const MarketplaceNavigation = observer(({marketplace}) => {
  const branding = marketplace.branding || {};
  const tabs = branding.tabs || {};

  const fullMarketplace = marketplace ? rootStore.marketplaces[marketplace.marketplaceId] : null;
  const hasCollections = fullMarketplace && fullMarketplace.collections && fullMarketplace.collections.length > 0;

  return (
    <nav className="header__navigation header__navigation--marketplace">
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "store")}>
        { tabs.store || "Store" }
      </NavLink>
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "listings")}>
        { tabs.listings || "Listings" }
      </NavLink>
      <NavLink className="header__navigation-link" to={UrlJoin("/marketplace", marketplace.marketplaceId, "activity")}>
        Activity
      </NavLink>
      {
        hasCollections ?
          <NavLink className="header__navigation-link no-mobile" to={UrlJoin("/marketplace", marketplace.marketplaceId, "collections")}>
            Collections
          </NavLink> : null
      }
      {
        rootStore.pageWidth >= 600 && !branding.hide_leaderboard ?
          <NavLink className="header__navigation-link no-mobile" to={UrlJoin("/marketplace", marketplace.marketplaceId, "leaderboard")}>
            Leaderboard
          </NavLink> : null
      }
    </nav>
  );
});

const MarketplaceHeader = observer(({marketplace}) => {
  const { name, header_logo, header_image, hide_name, preview } = marketplace.branding || {};
  const logo = header_logo?.url;

  return (
    <header className={`page-block page-block--header ${rootStore.appBackground ? "page-block--custom-background" : ""} header-container header-container--marketplace`}>
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
                  (!hide_name ? <h1 className="header__content__header">{`${name}`}</h1> : null)
              }
            </div>
        }
        <div className={`header__navigation-container ${rootStore.hideMarketplaceNavigation ? "header__navigation-container--compact" : ""}`}>
          <MarketplaceNavigation marketplace={marketplace} />
          <ProfileNavigation />
          <MobileNavigation marketplace={marketplace}/>
        </div>
      </div>
    </header>
  );
});

const GlobalHeader = observer(() => {
  return (
    <header className={`page-block page-block--header ${rootStore.appBackground ? "page-block--custom-background" : ""} header header--global`}>
      <div className="page-block__content header header--wallet">
        {
          rootStore.hideMarketplaceNavigation ? null :
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
              Discover Projects
            </NavLink>
            <NavLink className="header__navigation-link" to="/wallet/listings">
              Listings
            </NavLink>
            <NavLink className="header__navigation-link" to="/wallet/activity">
              Activity
            </NavLink>
          </nav>
          <ProfileNavigation />
          <MobileNavigation />
        </div>
      </div>
    </header>
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
      <MarketplaceHeader marketplace={marketplace} key={`header-${marketplaceId}`} /> :
      <GlobalHeader />
  );
});

export default Header;
