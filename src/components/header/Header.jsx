import HeaderStyles from "Assets/stylesheets/header.module.scss";
import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Linkish, RichText} from "Components/common/UIComponents";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Debounce, SetImageUrlDimensions} from "../../utils/Utils";
import UrlJoin from "url-join";
import ProfileMenu from "Components/header/ProfileMenu";

import EluvioE from "Assets/images/Eluvio-E-Icon-no-fill-color 2 3.svg";
import {NotificationsMenu} from "Components/header/NotificationsMenu";
import NotificationsIcon from "Assets/icons/header/Notification Icon";
import MenuIcon from "Assets/icons/menu";
import DiscoverIcon from "Assets/icons/discover";
import LeftArrowIcon from "Assets/icons/left-arrow.svg";
import XIcon from "Assets/icons/x";


const S = (...classes) => classes.map(c => HeaderStyles[c] || "").join(" ");

const NotificationBanner = observer(() => {
  const [notificationHash, setNotificationHash] = useState(undefined);
  const [active, setActive] = useState(false);

  const marketplace = rootStore.marketplaces[rootStore.routeParams.marketplaceId];
  const notification = marketplace?.branding?.notification || {};
  const savedHash = marketplace && rootStore.GetLocalStorage(`notification-dismissed-${marketplace.marketplaceId}`);

  useEffect(() => {
    if(!notification || !notification.active) { return; }

    crypto.subtle.digest("SHA-1", new TextEncoder("utf-8").encode(
      (notification.header || "") + (notification.text || "")
    ))
      .then(digest => {
        const hash = Array.from(new Uint8Array(digest))
          .map(v => v.toString(16).padStart(2, "0"))
          .join("");

        setNotificationHash(hash);
        setActive(hash !== savedHash);
      });
  }, [notification]);

  if(!active) {
    return null;
  }

  return (
    <div className={S("notification-banner")}>
      <h2>{ notification.header }</h2>
      <RichText richText={notification.text} className={S("notification-banner__text")} />
      <button
        onClick={() => {
          rootStore.SetLocalStorage(`notification-dismissed-${marketplace.marketplaceId}`, notificationHash);
          setActive(false);
        }}
        className={S("notification-banner__close-button")}
      >
        <ImageIcon icon={XIcon} title="Dismiss" className={S("notification-banner__close-icon")} />
      </button>
    </div>
  );
});

const Home = observer(({marketplaceId}) => {
  const marketplace = marketplaceId && rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === marketplaceId);

  if(marketplace) {
    const { name, header_logo, hide_name } = marketplace.branding || {};
    const logo = SetImageUrlDimensions({url: header_logo?.url, height: 500});

    return (
      <Linkish to={UrlJoin("/marketplace", marketplaceId, "store")} className={S("home")}>
        {
          logo ?
            <ImageIcon label="Eluvio" icon={logo} className={S("home__logo")} /> :
            !hide_name ?
              <h1 className={S("home__title")}>{ name }</h1> :
              null
        }
      </Linkish>
    );
  }

  return (
    <Linkish to="/" className={S("home")}>
      <ImageIcon label="Eluvio" icon={EluvioE} className={S("home__logo")} />
      <div className={S("home__text")}>
        <div className={S("home__title")}>
          { rootStore.l10n.header.title}
        </div>
        <div className={S("home__subtitle")}>
          { rootStore.l10n.header.subtitle}
        </div>
      </div>
    </Linkish>
  );
});

const Links = observer(({marketplaceId}) => {
  if(!rootStore.loggedIn) { return <div className={S("links")} />; }

  const basePath = marketplaceId ?
    UrlJoin("/marketplace", marketplaceId, "/users/me") :
    "/wallet/users/me";

  return (
    <nav className={S("links")}>
      <Linkish to={"/"} useNavLink exact className={S("link")}>
        { rootStore.l10n.header.discover }
      </Linkish>
      <Linkish to={UrlJoin(basePath, "items")} useNavLink className={S("link")}>
        { rootStore.l10n.header.my_items }
      </Linkish>
    </nav>
  );
});

const UserLinks = observer(() => {
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showUserProfileMenu, setShowUserProfileMenu] = useState(false);

  if(!rootStore.loggedIn) {
    return (
      <div className={S("user-links")}>
        <button onClick={() => rootStore.ShowLogin()} className={S("sign-in")}>
          { rootStore.l10n.login.sign_in }
        </button>
        {
          rootStore.routeParams.marketplaceId && !(rootStore.hideGlobalNavigation || rootStore.hideGlobalNavigationInMarketplace)  ?
            <Linkish
              className={S("button")}
              title="Discover Projects"
              to="/"
            >
              <ImageIcon icon={DiscoverIcon} />
            </Linkish> : null
        }
      </div>
    );
  } else {
    return (
      <div className={S("user-links")}>
        { !showUserProfileMenu ? null : <ProfileMenu Hide={() => setShowUserProfileMenu(false)} /> }
        { !showNotificationsMenu ? null : <NotificationsMenu Hide={() => setShowNotificationsMenu(false)} /> }

        <button className={S("button", showNotificationsMenu ? "button--active" : "")} onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}>
          <ImageIcon icon={NotificationsIcon} label="Show Notifications" className={S("button__icon")} />
          <ImageIcon icon={XIcon} label="Hide Notifications" className={S("button__icon-close")} />
        </button>
        <button className={S("button", showUserProfileMenu ? "button--active" : "")} onClick={() => setShowUserProfileMenu(!showUserProfileMenu)}>
          <ImageIcon icon={MenuIcon} label="Show Profile Menu" className={S("button__icon")} />
          <ImageIcon icon={XIcon} label="Hide Profile Menu" className={S("button__icon-close")} />
        </button>
      </div>
    );
  }
});

let lastPageHeight = document.querySelector("body").scrollHeight;
const Header = observer(() => {
  const [scrolled, setScrolled] = useState(false);
  const {marketplaceId} = rootStore.ParsedRouteParams();

  useEffect(() => {
    setScrolled(false);

    // Handle scroll change and whether the header should have a background
    const ScrollFade = Debounce(() => {
      const newPageHeight = document.querySelector("body").scrollHeight;
      const scrollPosition = window.scrollY;
      try {
        if(newPageHeight !== lastPageHeight) {
          // Page height changed - probably scrolled due to content change, ignore
          return;
        }

        setScrolled(scrollPosition > 0);
      } finally {
        lastPageHeight = newPageHeight;
      }
    }, 50);

    document.addEventListener("scroll", ScrollFade);

    return () => document.removeEventListener("scroll", ScrollFade);
  }, [marketplaceId]);

  return (
    <>
      <div className={S("header-placeholder")} />
      <header className={S("header", scrolled ? "header--scrolled" : "")}>
        <div className={S("header__background")} />
        {
          !rootStore.backPath ? null :
            <div className={S("back-link-container")}>
              <Linkish
                to={rootStore.ResolvedBackPath()}
                style={{paddingRight: "3px"}}
                className={S("button")}
              >
                <ImageIcon icon={LeftArrowIcon} label="Go Back"/>
              </Linkish>
            </div>
        }

        <Home marketplaceId={marketplaceId} />
        <Links marketplaceId={marketplaceId} />
        <UserLinks />
      </header>
      <NotificationBanner />
    </>
  );
});

export default Header;