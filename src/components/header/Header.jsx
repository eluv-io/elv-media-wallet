import HeaderStyles from "Assets/stylesheets/header.module.scss";
import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Linkish} from "Components/common/UIComponents";
import {mediaPropertyStore, rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Debounce} from "../../utils/Utils";
import {useDebouncedValue} from "@mantine/hooks";
import {Autocomplete} from "@mantine/core";

import EluvioE from "Assets/images/eluvio-e.svg";
import LeftArrowIcon from "Assets/icons/left-arrow.svg";
import XIcon from "Assets/icons/x.svg";
import SearchIcon from "Assets/icons/search.svg";


const S = (...classes) => classes.map(c => HeaderStyles[c] || "").join(" ");


const Home = observer(() => {
  return (
    <>
      <div className={S("home")}>
        <Linkish
          href={location.pathname === "/" ? "https://eluv.io" : undefined}
          rel="noreferrer"
          target="_blank"
          to="/"
          className={S("home__logo-container")}
        >
          <ImageIcon label="Eluvio" icon={EluvioE} className={S("home__logo")} />
        </Linkish>
        <Linkish to="/">
          <div className={S("home__text")}>
            <div className={S("home__title")}>
              Media Wallet
            </div>
          </div>
        </Linkish>
      </div>
    </>
  );
});

const SearchBar = observer(() => {
  const [filter, setFilter] = useState(rootStore.discoverFilter);
  const [debouncedFilter] = useDebouncedValue(filter, 300);
  const [mediaProperties, setMediaProperties] = useState(undefined);

  useEffect(() => {
    mediaPropertyStore.LoadMediaProperties()
      .then(({properties}) => setMediaProperties(properties));

    return () => rootStore.SetDiscoverFilter("");
  }, []);

  useEffect(() => {
    rootStore.SetDiscoverFilter(debouncedFilter);
  }, [debouncedFilter]);

  return (
    <Autocomplete
      data={
        mediaProperties
          ?.map(property => property.title || property.name)
          ?.filter((value, index, array) => array.indexOf(value) === index)
      }
      value={filter}
      onChange={value => setFilter(value)}
      onOptionSubmit={value => {
        // No debounce if option is selected directly
        setFilter(value);
        rootStore.SetDiscoverFilter(value);
      }}
      placeholder={mediaPropertyStore.rootStore.l10n.media_properties.header.search}
      role="search"
      rightSection={
        rootStore.pageWidth < 800 ? null :
          <div className={S("search__submit")}>
            <ImageIcon alt="search" icon={SearchIcon} />
          </div>
      }
      rightSectionWidth={rootStore.pageWidth > 800 ? 75 : 50}
      classNames={{
        root: S("search"),
        input: S("search__input"),
        dropdown: S("search__dropdown"),
        option: S("search__option")
      }}
    />
  );
});

const MobileHeader = observer(({scrolled}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);

  if(showSearchBar) {
    return (
      <div key="header-search" className={S("header-mobile", "header-mobile--search", scrolled ? "header-mobile--scrolled" : "")}>
        <SearchBar autoFocus />
        <button className={S("button")} onClick={() => setShowSearchBar(false)}>
          <ImageIcon icon={XIcon} label="Cancel Search" className={S("button__icon")} />
        </button>
      </div>
    );
  }

  return (
    <div key="header" className={S("header-mobile")}>
      <Home />
      <div className={S("header-mobile__controls", "header-mobile__left-controls", scrolled ? "header-mobile--scrolled" : "")}>
        {
          !rootStore.backPath || location.pathname === rootStore.backPath ? null :
            <Linkish style={{paddingRight: "2px"}} className={S("button")} to={rootStore.backPath}>
              <ImageIcon icon={LeftArrowIcon} label="Go Back" className={S("button__icon")} />
            </Linkish>
        }
        <button className={S("button")} onClick={() => setShowSearchBar(true)}>
          <ImageIcon icon={SearchIcon} label="Search" className={S("button__icon")}/>
        </button>
      </div>
    </div>
  );
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

  if(rootStore.pageWidth < 800) {
    return <MobileHeader scrolled={scrolled} />;
  }

  const backPath = rootStore.backPath || (rootStore.routeParams.marketplaceId && "/");

  return (
    <>
      <div className={S("header-placeholder")} />
      <header className={S("header", scrolled ? "header--scrolled" : "")}>
        <div className={S("header__background")}/>
        {
          !backPath || location.pathname === backPath ? null :
            <div className={S("back-link-container")}>
              <Linkish
                to={rootStore.backPath || "/"}
                style={{paddingRight: "3px"}}
                className={S("button")}
              >
                <ImageIcon icon={LeftArrowIcon} label="Go Back"/>
              </Linkish>
            </div>
        }

        <Home marketplaceId={marketplaceId}/>
        {
          rootStore.routeParams.marketplaceId ? null :
            <SearchBar/>
        }
      </header>
    </>
  );
});

export default Header;
