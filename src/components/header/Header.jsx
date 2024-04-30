import HeaderStyles from "Assets/stylesheets/header.module.scss";
import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Linkish} from "Components/common/UIComponents";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Debounce, SetImageUrlDimensions} from "../../utils/Utils";
import UrlJoin from "url-join";

import EluvioE from "Assets/images/Eluvio-E-Icon-no-fill-color 2 3.svg";
import {MobileNavigation, ProfileNavigation} from "Components/header/Header2";


const S = (...classes) => classes.map(c => HeaderStyles[c] || "").join(" ");

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
  if(!rootStore.loggedIn) { return null; }

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

let lastPageHeight = document.querySelector("body").scrollHeight;
const Header = observer(() => {
  const [scrolled, setScrolled] = useState(false);
  const {marketplaceId} = rootStore.ParsedRouteParams();

  useEffect(() => {
    setScrolled(false);

    // Handle scroll change and whether the header should be expanded or contracted
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
        <Home marketplaceId={marketplaceId} />
        <Links marketplaceId={marketplaceId} />
        <div className={S("icons")}>
          <ProfileNavigation />
          <MobileNavigation />
        </div>
      </header>
    </>
  );
});

export default Header;
