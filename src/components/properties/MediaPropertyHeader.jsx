import HeaderStyles from "Assets/stylesheets/media_properties/property-header.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, useHistory} from "react-router-dom";
import {rootStore, mediaPropertyStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import {useDebouncedValue} from "@mantine/hooks";
import {Autocomplete} from "@mantine/core";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

import SearchIcon from "Assets/icons/search.svg";
import {ProfileNavigation} from "Components/header/Header";

const S = (...classes) => classes.map(c => HeaderStyles[c] || "").join(" ");

const SearchBar = observer(() => {
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState(new URLSearchParams(location.search).get("q") || "");
  const [lastSelectedAt, setLastSelectedAt] = useState(undefined);
  const [debouncedQuery] = useDebouncedValue(query, 250);
  const searchRef = useRef();
  const history = useHistory();

  useEffect(() => {
    if(debouncedQuery.length === 0) {
      setSearchResults([]);
      setSearchOptions([]);
    } else {
      mediaPropertyStore.SearchMedia({...rootStore.routeParams, query: debouncedQuery})
        .then(results => {
          setSearchResults(results);
          setSearchOptions(
            results
              .map(result => result.title)
              .filter((title, index, array) => array.indexOf(title) === index)
          );
        });
    }
  }, [debouncedQuery]);

  useEffect(() => {
    // Clear search on page change unless page change was result of search
    if(Date.now() - lastSelectedAt > 1000) {
      setQuery("");
    }
  }, [rootStore.routeParams]);

  const Select = (selectedTitle) => {
    setLastSelectedAt(Date.now());
    const matchingResults = searchResults.filter(result => result.title?.toLowerCase() === selectedTitle?.toLowerCase());

    const basePath = MediaPropertyBasePath(rootStore.routeParams);
    if(matchingResults.length === 1) {
      const {id, category} = matchingResults[0];
      const type = category === "collection" ? "c" : category === "list" ? "l" : "m";

      history.push(UrlJoin(basePath, type, id));
    } else {
      // No results or ambiguous match - Go to search page
      const params = new URLSearchParams();
      params.set("q", query);
      history.push(UrlJoin(basePath, "search", "?" + params.toString()));
    }

    searchRef?.current.blur();
  };

  return (
    <Autocomplete
      ref={searchRef}
      value={query}
      onChange={setQuery}
      onKeyDown={event => {
        if(event.key !== "Enter") { return; }

        // Enter key pressed - will fire if a dropdown item is selected, so need to wait and see if the path changed
        const originalPath = location.pathname;
        setTimeout(() => {
          if(location.pathname === originalPath) {
            Select(query);
          }
        }, 250);
      }}
      placeholder={searchOptions[0]?.title || mediaPropertyStore.rootStore.l10n.media_properties.header.search}
      data={searchOptions}
      limit={50}
      onOptionSubmit={Select}
      role="search"
      rightSection={
        <button className={S("search__submit")} onClick={() => Select(query)} aria-label="Submit">
          <ImageIcon alt="search" icon={SearchIcon} />
        </button>
      }
      rightSectionWidth={75}
      classNames={{
        root: S("search"),
        input: S("search__input"),
        dropdown: S("search__dropdown"),
        option: S("search__option")
      }}
    />
  );
});

const HeaderLinks = observer(() => {
  if(!rootStore.loggedIn) {
    return (
      <button onClick={() => rootStore.ShowLogin()} className={S("sign-in")}>
        { rootStore.l10n.login.sign_in }
      </button>
    );
  } else {
    return <ProfileNavigation />;
  }
});

const MediaPropertyHeader = observer(() => {
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(!mediaProperty) { return null; }

  let basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: false});

  if((basePath === location.pathname || UrlJoin(basePath, "/main") === location.pathname) && rootStore.routeParams.parentMediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath({
      mediaPropertySlugOrId: rootStore.routeParams.parentMediaPropertySlugOrId,
      pageSlugOrId: rootStore.routeParams.parentPageSlugOrId
    });
  }

  return (
    <div className={S("header", rootStore.routeParams.mediaItemSlugOrId ? "header--media" : "")}>
      <Link
        to={basePath}
        className={S("logo-container")}
      >
        <ImageIcon icon={mediaProperty?.metadata.header_logo?.url} className={S("logo")} />
      </Link>
      <div className={S("search-container")}>
        <SearchBar />
      </div>
      <div className={S("links")}>
        <HeaderLinks />
      </div>
    </div>
  );
});

export default MediaPropertyHeader;
