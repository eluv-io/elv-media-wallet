import HeaderStyles from "Assets/stylesheets/media_properties/property-header.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, useHistory} from "react-router-dom";
import {rootStore, mediaPropertyStore, notificationStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import UrlJoin from "url-join";
import {useDebouncedValue} from "@mantine/hooks";
import {Autocomplete, Checkbox, Combobox, Drawer, Group, Select, TextInput, useCombobox} from "@mantine/core";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import {Linkish} from "Components/common/UIComponents";
import {DatePickerInput} from "@mantine/dates";
import {Button} from "Components/properties/Common";
import ProfileMenu from "Components/header/ProfileMenu";
import {NotificationsMenu} from "Components/header/NotificationsMenu";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {LogInAuth0} from "Components/login";

import HomeIcon from "Assets/icons/home.svg";
import SearchIcon from "Assets/icons/search.svg";
import LeftArrowIcon from "Assets/icons/left-arrow.svg";
import XIcon from "Assets/icons/x.svg";
import MenuIcon from "Assets/icons/menu.svg";
import NotificationsIcon from "Assets/icons/header/Notification Icon.svg";
import SelectIcon from "Assets/icons/select";
import LanguageIcon from "Assets/icons/header/language";


const S = (...classes) => classes.map(c => HeaderStyles[c] || "").join(" ");

const inputClassnames = {
  label: S("filter__input-label"),
  input: S("filter__input")
};

const AdvancedSearchField = observer(({
  index,
  propertyAttributes,
  type,
  title,
  attribute,
  tags,
  tag_display
}) => {
  switch(type) {
    case "attribute":
      return (
        <Select
          key={`advanced-option-${index}`}
          label={title}
          value={mediaPropertyStore.searchOptions.attributes[attribute] || ""}
          data={[
            { label: "All", value: ""},
            ...propertyAttributes[attribute].tags
          ]}
          onChange={value =>
            mediaPropertyStore.SetSearchOption({
              field: "attributes",
              value: {
                ...mediaPropertyStore.searchOptions.attributes,
                [attribute]: value
              }
            })}
          classNames={inputClassnames}
        />
      );
    case "tags":
      if(tag_display === "select") {
        return (
          <Select
            key={`advanced-option-${index}`}
            label={title}
            value={mediaPropertyStore.searchOptions.tagSelect[index.toString()] || ""}
            data={[
              { label: "All", value: ""},
              ...tags
            ]}
            onChange={value =>
              mediaPropertyStore.SetSearchOption({
                field: "tagSelect",
                value: {
                  ...mediaPropertyStore.searchOptions.tagSelect,
                  [index.toString()]: value
                }
              })}
            classNames={inputClassnames}
          />
        );
      } else {
        return (
          <div className={S("filter__field")}>
            <h2 className={S("filter__input-label")}>{title}</h2>
            <div className={S("filter__checkboxes")}>
              {
                tags.map(tag =>
                  <Checkbox
                    key={`tag-${index}-${tag}`}
                    label={tag}
                    checked={mediaPropertyStore.searchOptions.tags.includes(tag)}
                    onChange={event => {
                      mediaPropertyStore.SetSearchOption({
                        ...rootStore.routeParams,
                        field: "tags",
                        value: event.target.checked ?
                          [...mediaPropertyStore.searchOptions.tags, tag] :
                          mediaPropertyStore.searchOptions.tags.filter(otherTag => otherTag !== tag)
                      });
                    }}
                    classNames={{
                      label: S("filter__checkbox-label"),
                      input: S("filter__checkbox")
                    }}
                  />
                )
              }
            </div>
          </div>
        );
      }
    case "media_type":
      return (
        <Select
          key={`advanced-option-${index}`}
          label={title}
          value={mediaPropertyStore.searchOptions.mediaType || ""}
          data={[
            { label: "All", value: ""},
            "Video",
            "Gallery",
            "Image",
            "Ebook"
          ]}
          onChange={value =>
            mediaPropertyStore.SetSearchOption({
              field: "mediaType",
              value
            })}
          classNames={inputClassnames}
        />
      );
    case "date":
      return (
        <div className={S("filter_field")}>
          <h2 className={S("filter__input-label")}>Date Range</h2>
          <Group grow>
            <DatePickerInput
              clearable
              value={mediaPropertyStore.searchOptions.startTime}
              placeholder="Start Date"
              onChange={date => {
                mediaPropertyStore.SetSearchOption({
                  field: "startTime",
                  value: date
                });
              }}
              classNames={inputClassnames}
            />
            <DatePickerInput
              clearable
              value={mediaPropertyStore.searchOptions.endTime}
              placeholder="End Date"
              defaultDate={mediaPropertyStore.searchOptions.startTime}
              onChange={date => {
                mediaPropertyStore.SetSearchOption({
                  ...rootStore.routeParams,
                  field: "endTime",
                  value: date
                });
              }}
              classNames={inputClassnames}
            />
          </Group>
        </div>
      );
  }
});

const QueryInput = observer(() => {
  const [query, setQuery] = useState(new URLSearchParams(location.search).get("q") || "");
  const [debouncedQuery] = useDebouncedValue(query, 1000);

  useEffect(() => {
    mediaPropertyStore.SetSearchOption({
      ...rootStore.routeParams,
      field: "query",
      value: debouncedQuery
    });
  }, [debouncedQuery]);

  return (
    <TextInput
      label="Search"
      placeholder="Search"
      value={query}
      onChange={event => setQuery(event.target.value)}
      classNames={inputClassnames}
    />
  );
});

const AdvancedSearch = observer(() => {
  const [show, setShow] = useState(false);
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);
  const basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: false});

  if(!mediaProperty || !mediaProperty.metadata?.search?.enable_advanced_search) { return null; }

  const parameters = mediaProperty.metadata.search.advanced_search_options;
  const propertyAttributes = mediaPropertyStore.GetMediaPropertyAttributes(rootStore.routeParams);

  const searchPath = UrlJoin(basePath, "search");

  return (
    <>
      <Linkish
        to={UrlJoin(MediaPropertyBasePath(rootStore.routeParams), "search")}
        className={S("search__filter")}
        onClick={() => setShow(true)}
      >
        Filter
      </Linkish>
      <Drawer
        position="right"
        opened={show}
        onClose={() => setShow(false)}
        title="Filter by"
        classNames={{
          content: S("filter"),
          header: [S("filter__header"), "_title"].join(" "),
          title: S("filter__title"),
          body: S("filter__content")
        }}
      >
        <div className={S("filter__fields")}>
          <QueryInput />
          {
            parameters.map((spec, index) =>
              <AdvancedSearchField
                key={`field-${index}`}
                propertyAttributes={propertyAttributes}
                index={index}
                {...spec}
              />
            )
          }
        </div>
        <Group wrap="noWrap" grow className={S("filter__actions")}>
          <Button
            to={location.pathname === searchPath ? undefined : searchPath}
            className={S("filter__action", "filter__action--primary")}
            onClick={() => setShow(false)}
          >
            Done
          </Button>
          <Button
            variant="outline"
            onClick={() => mediaPropertyStore.ClearSearchOptions()}
            defaultStyles
            className={S("filter__action")}
          >
            Clear Filters
          </Button>
        </Group>
      </Drawer>
    </>
  );
});

const SearchBar = observer(({autoFocus}) => {
  const [queryOptions, setQueryOptions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState(new URLSearchParams(location.search).get("q") || "");
  const [lastSelectedAt, setLastSelectedAt] = useState(undefined);
  const [debouncedQuery] = useDebouncedValue(query, 250);
  const searchRef = useRef();
  const history = useHistory();

  useEffect(() => {
    setQuery(mediaPropertyStore.searchOptions.query);
  }, [mediaPropertyStore.searchOptions.query]);

  useEffect(() => {
    if(debouncedQuery.length === 0) {
      setSearchResults([]);
      setQueryOptions([]);
    } else {
      mediaPropertyStore.SearchMedia({...rootStore.routeParams, query: debouncedQuery})
        .then(results => {
          setSearchResults(results);
          setQueryOptions(
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

  const basePath = MediaPropertyBasePath(rootStore.routeParams);
  const Select = (selectedTitle) => {
    mediaPropertyStore.ClearSearchOptions();
    setLastSelectedAt(Date.now());
    const matchingResults = searchResults.filter(result => result.title?.toLowerCase() === selectedTitle?.toLowerCase());

    if(matchingResults.length === 1) {
      const {id, category} = matchingResults[0];
      const type = category === "collection" ? "c" : category === "list" ? "l" : "m";

      history.push(UrlJoin(basePath, type, id));
    } else {
      // No results or ambiguous match - Go to search page
      const params = new URLSearchParams();
      params.set("q", query);
      mediaPropertyStore.SetSearchOption({field: "query", value: query});
      history.push(UrlJoin(basePath, "search", "?" + params.toString()));
    }

    searchRef?.current.blur();
  };

  return (
    <div className={S("search-container")}>
      {
        rootStore.pageWidth > 800 ? null :
          <ImageIcon icon={SearchIcon} className={S("search-container__icon")} />
      }
      <Autocomplete
        onClick={() => {
          if(!location.pathname.includes("/search")) {
            mediaPropertyStore.ClearSearchOptions();
            history.push(UrlJoin(basePath, "search"));
          }
        }}
        ref={searchRef}
        autoFocus={autoFocus}
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
        placeholder={queryOptions[0]?.title || mediaPropertyStore.rootStore.l10n.media_properties.header.search}
        data={queryOptions}
        limit={50}
        onOptionSubmit={Select}
        role="search"
        rightSection={
          rootStore.pageWidth < 800 ? null :
            <button className={S("search__submit")} onClick={() => Select(query)} aria-label="Submit">
              <ImageIcon alt="search" icon={SearchIcon} />
            </button>
        }
        rightSectionWidth={rootStore.pageWidth > 800 ? 75 : 50}
        classNames={{
          root: S("search"),
          input: S("search__input"),
          dropdown: S("search__dropdown"),
          options: S("search__options"),
          option: S("search__option")
        }}
      />
      <AdvancedSearch query={query} setQuery={setQuery} />
    </div>
  );
});

const LanguageMenu = observer(() => {
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);
  const combobox = useCombobox();
  const availableLocalizations = [
    mediaProperty.metadata.language || "",
    ...(mediaProperty.metadata.localizations || [])
  ]
    .filter(l => l)
    .map(key => ({
      value: key,
      label: new Intl.DisplayNames([rootStore.language], {type: "language"}).of(key).capitalize()
    }));

  if(availableLocalizations.length <= 1) {
    return null;
  }

  return (
    <Combobox
      store={combobox}
      value={rootStore.language}
      width={200}
      offset={23}
      position="bottom-end"
      onOptionSubmit={value => mediaPropertyStore.SetPropertyLanguage({
        mediaPropertyId: rootStore.currentPropertyId,
        localizationKey: value,
        reload: true
      })}
      classNames={{
        root: S("language-menu"),
        dropdown: S("language-menu__dropdown"),
        option: S("language-menu__option")
      }}
    >
      <Combobox.Target>
        <button
          className={S("button", combobox.dropdownOpened ? "button--active" : "")}
          onClick={() => {
            combobox.toggleDropdown();
            combobox.focusTarget();
          }}
        >
          <ImageIcon icon={LanguageIcon} label="Select Language" className={S("button__icon")}/>
          <ImageIcon icon={XIcon} label="Hide Language Options" className={S("button__icon-close")}/>
        </button>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {
            availableLocalizations.map(({label, value}) =>
              <Combobox.Option selected={rootStore.language === value} key={value} value={value}>
                {label}
              </Combobox.Option>
            )
          }
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
});

const HeaderLinks = observer(() => {
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showUserProfileMenu, setShowUserProfileMenu] = useState(false);

  const discoverDisabled = rootStore.isCustomDomain;
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(mediaProperty?.metadata?.login?.settings?.disable_login) {
    return null;
  }

  if(!rootStore.loggedIn) {
    if(rootStore.authenticating) { return null; }

    return (
      <>
        {
          discoverDisabled ? null :
            <Linkish to="/" className={S("button")}>
              <ImageIcon icon={HomeIcon} label="Home" className={S("button__icon")}/>
            </Linkish>
        }
        <LanguageMenu />
        <Button
          onClick={() => {
            const useAuth0 = !!(mediaProperty?.metadata?.login?.settings?.use_auth0 && mediaProperty?.metadata?.login?.settings?.auth0_domain);
            if(useAuth0) {
              LogInAuth0();
            } else {
              rootStore.ShowLogin();
            }
          }}
          className={S("sign-in")}
        >
          { rootStore.l10n.login.sign_in }
        </Button>
      </>
    );
  } else {
    return (
      <>
        { !showNotificationsMenu ? null : <NotificationsMenu Hide={() => setShowNotificationsMenu(false)} /> }
        { !showUserProfileMenu ? null : <ProfileMenu Hide={() => setShowUserProfileMenu(false)} /> }
        {
          discoverDisabled ? null :
            <Linkish to="/" className={S("button")}>
              <ImageIcon icon={HomeIcon} label="Home" className={S("button__icon")}/>
            </Linkish>
        }
        <LanguageMenu />
        <button
          className={S("button", showNotificationsMenu ? "button--active" : notificationStore.newNotifications ? "button--notification" : "")}
          onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
        >
          <ImageIcon icon={NotificationsIcon} label="Show Notifications" className={S("button__icon")} />
          <ImageIcon icon={XIcon} label="Hide Notifications" className={S("button__icon-close")} />
        </button>
        <button className={S("button", showUserProfileMenu ? "button--active" : "")} onClick={() => setShowUserProfileMenu(!showUserProfileMenu)}>
          <ImageIcon icon={MenuIcon} label="Show Profile Menu" className={S("button__icon")} />
          <ImageIcon icon={XIcon} label="Hide Profile Menu" className={S("button__icon-close")} />
        </button>
      </>
    );
  }
});

const PropertySelector = observer(({logo, basePath, mobile=false}) => {
  const history = useHistory();
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  let parentProperty = mediaProperty;
  if(rootStore.routeParams.parentMediaPropertySlugOrId) {
    parentProperty = mediaPropertyStore.MediaProperty({
      mediaPropertySlugOrId: rootStore.routeParams.parentMediaPropertySlugOrId
    });
  }

  const combobox = useCombobox();

  if(!mediaProperty || !parentProperty) { return null; }

  let showPropertySelector = parentProperty?.metadata?.show_property_selection;
  let options = (parentProperty.metadata.property_selection || [])
    .filter(option => (
      option.property_id === parentProperty.mediaPropertyId ||
      !option.permission_item_ids ||
      option.permission_item_ids.length === 0 ||
      option.permission_item_ids.find(permissionItemId =>
        mediaPropertyStore.permissionItems[permissionItemId]?.authorized
      )
    ));

  const selectedOption = options.find(option => option.property_id === mediaProperty.mediaPropertyId);

  if(!showPropertySelector || options.length <= 1 || !selectedOption) {
    return (
      <Link
        to={basePath}
        className={S("logo-container")}
      >
        <ImageIcon icon={logo} className={S("logo")} />
        {
          !mediaPropertyStore.previewAll && mediaPropertyStore.previewPropertyId !== mediaProperty.mediaPropertyId ? null :
            <div className={S("preview-indicator")}>
              PREVIEW
            </div>
        }
      </Link>
    );
  }

  const Option = ({option, selected=false}) => (
    <>
      <img
        src={option?.icon?.url}
        className={S("property-selector__option-icon")}
      />
      {
        selected && mobile ? null :
          option?.logo ?
            <img
              src={option.logo.url}
              className={S("property-selector__option-logo")}
            /> :
            <div className={S("property-selector__option-title")}>
              { option.title }
            </div>
      }
    </>
  );

  return (
    <Combobox
      store={combobox}
      width={250}
      position="bottom-start"
      onOptionSubmit={propertyId => {
        const hash = mediaPropertyStore.mediaPropertyHashes[propertyId];
        const slug = Object.keys(mediaPropertyStore.mediaPropertyHashes).find(key =>
          key &&
          !key.startsWith("iq__") &&
          mediaPropertyStore.mediaPropertyHashes[key] === hash
        );

        let path;
        if(propertyId === parentProperty.mediaPropertyId) {
          path = MediaPropertyBasePath({mediaPropertySlugOrId: slug || propertyId});
        } else {
          path = MediaPropertyBasePath({
            parentMediaPropertySlugOrId: parentProperty.mediaPropertySlug || parentProperty.mediaPropertyId,
            mediaPropertySlugOrId: slug || propertyId
          });
        }

        history.push(path);
        combobox.closeDropdown();
      }}
      offset={mobile ? 7 : 0}
      className={S("property-selector", mobile ? "property-selector--mobile" : "")}
      classNames={{
        dropdown: S("property-selector__dropdown", mobile ? "property-selector__dropdown--mobile" : ""),
        option: S("property-selector__option", mobile ? "property-selector__option--mobile" : ""),
      }}
    >
      <Combobox.Target>
        <button
          onClick={() => combobox.toggleDropdown()}
          aria-label={selectedOption.title}
          className={S("property-selector__select", combobox.dropdownOpened ? "property-selector__select--active" : "", mobile ? "property-selector__select--mobile" : "")}
        >
          <Option option={selectedOption} selected />
          <div className={S("property-selector__select-icon-container")}>
            <ImageIcon icon={SelectIcon} className={S("property-selector__select-icon")} />
          </div>
        </button>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {
            options
              .filter(option => option.property_id !== mediaProperty.mediaPropertyId)
              .map((option, index) =>
                <Combobox.Option
                  title={option.title}
                  value={option.property_id}
                  key={option.property_id}
                  autoFocus={index === 0}
                >
                  <Option option={option} />
                </Combobox.Option>
              )
          }
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
});

const MediaPropertyMobileHeader = observer(({logo, basePath, searchDisabled}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);

  if(showSearchBar) {
    return (
      <div key="header-search" className={S("header-mobile", "header-mobile--search", rootStore.routeParams.mediaItemSlugOrId ? "header-mobile--media" : "")}>
        <SearchBar autoFocus />
        <button className={S("button")} onClick={() => setShowSearchBar(false)}>
          <ImageIcon icon={XIcon} label="Cancel Search" className={S("button__icon")} />
        </button>
      </div>
    );
  }

  return (
    <div key="header" className={S("header-mobile", rootStore.routeParams.mediaItemSlugOrId ? "header-mobile--media" : "")}>
      <div className={S("header-mobile__controls", "header-mobile__left-controls")}>
        {
          !rootStore.backPath ? null :
            <Linkish style={{paddingRight: "2px"}} className={S("button")} to={rootStore.backPath}>
              <ImageIcon icon={LeftArrowIcon} label="Go Back" className={S("button__icon")} />
            </Linkish>
        }
        <PropertySelector logo={logo} basePath={basePath} mobile />
        {
          searchDisabled ? null :
            <button className={S("button")} onClick={() => setShowSearchBar(true)}>
              <ImageIcon icon={SearchIcon} label="Search" className={S("button__icon")}/>
            </button>
        }
      </div>
      <div className={S("links")}>
        <HeaderLinks />
      </div>
    </div>
  );
});

const MediaPropertyHeader = observer(() => {
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(!mediaProperty) { return null; }

  const searchDisabled = mediaProperty.metadata.search?.disabled ||
    (!rootStore.loggedIn && mediaProperty.metadata?.search?.hide_if_unauthenticated);

  const logo = SetImageUrlDimensions({url: mediaProperty?.metadata.header_logo?.url, width: 300});
  let basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: false});

  if((basePath === location.pathname || UrlJoin(basePath, "/main") === location.pathname) && rootStore.routeParams.parentMediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath({
      mediaPropertySlugOrId: rootStore.routeParams.parentMediaPropertySlugOrId,
      pageSlugOrId: rootStore.routeParams.parentPageSlugOrId
    });
  }

  if(rootStore.pageWidth < 800) {
    return (
      <MediaPropertyMobileHeader
        logo={logo}
        basePath={basePath}
        searchDisabled={searchDisabled}
      />
    );
  }

  let backPath = rootStore.backPath;
  if(backPath === "/" && !mediaProperty?.metadata?.domain?.features?.discover) {
    backPath = undefined;
  }

  return (
    <div className={S("header", rootStore.routeParams.mediaItemSlugOrId ? "header--media" : "")}>
      <div className={S("nav")}>
        {
          !backPath ? null :
            <Linkish style={{paddingRight: "2px"}} className={S("button")} to={rootStore.backPath}>
              <ImageIcon icon={LeftArrowIcon} label="Go Back" className={S("button__icon")} />
            </Linkish>
        }
        <PropertySelector logo={logo} basePath={basePath} />
      </div>
      {
        searchDisabled ?
          <div className={S("search-container--placeholder")} /> :
          <SearchBar/>
      }
      <div className={S("links")}>
        <HeaderLinks />
      </div>
    </div>
  );
});

export default MediaPropertyHeader;
