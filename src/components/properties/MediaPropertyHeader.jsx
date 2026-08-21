import HeaderStyles from "@/assets/stylesheets/media_properties/property-header.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, useHistory} from "react-router-dom";
import {rootStore, mediaPropertyStore} from "@/stores";
import ImageIcon from "@/components/common/ImageIcon";
import UrlJoin from "url-join";
import {useDebouncedValue} from "@mantine/hooks";
import {Autocomplete, Checkbox, Combobox, Drawer, Group, Switch as MantineSwitch, Select, TextInput, useCombobox} from "@mantine/core";
import {MediaPropertyBasePath} from "@/utils/MediaPropertyUtils";
import {Linkish} from "@/components/common/UIComponents";
import {DatePickerInput} from "@mantine/dates";
import {Button, DefaultProfileImage, RenderAction} from "@/components/properties/Common";
import ProfileMenu from "@/components/header/ProfileMenu";
import {Debounce, SetImageUrlDimensions} from "@/utils/Utils";
import {LogInAuth0, LogInOpenId} from "@/components/login";

import SearchIcon from "@/assets/icons/search.svg";
import LeftArrowIcon from "@/assets/icons/left-arrow.svg";
import XIcon from "@/assets/icons/x.svg";
import MenuIcon from "@/assets/icons/menu.svg";
import SelectIcon from "@/assets/icons/select.svg";
import LanguageIcon from "@/assets/icons/header/language.svg";
import AISparkleIcon from "@/assets/icons/ai-sparkle1.svg";

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
          searchable
          clearable
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
          <h2 className={S("filter__input-label")}>{title || "Date Range"}</h2>
          <Group grow>
            <DatePickerInput
              clearable
              value={mediaPropertyStore.searchOptions.startDate}
              placeholder="Start Date"
              onChange={date => {
                mediaPropertyStore.SetSearchOption({
                  field: "startDate",
                  value: date
                });
              }}
              classNames={inputClassnames}
            />
            <DatePickerInput
              clearable
              value={mediaPropertyStore.searchOptions.endDate}
              placeholder="End Date"
              defaultDate={mediaPropertyStore.searchOptions.startDate}
              onChange={date => {
                mediaPropertyStore.SetSearchOption({
                  ...rootStore.routeParams,
                  field: "endDate",
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
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get("q") || "");
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

  const filtersActive = Object.keys(mediaPropertyStore.searchOptions.attributes).length > 0 ||
    mediaPropertyStore.searchOptions.tags?.length > 0;

  return (
    <>
      <Linkish
        to={
          window.location.pathname.endsWith("/search") ? null :
            UrlJoin(MediaPropertyBasePath(rootStore.routeParams), "search")
        }
        className={S("search__filter", filtersActive ? "search__filter--active" : "")}
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

const AIAdvancedSearch = observer(() => {
  const [show, setShow] = useState(false);
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);
  const basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: false});
  const parameters = mediaProperty?.metadata?.search?.ai_options?.advanced_search_options || [];

  useEffect(() => {
    mediaPropertyStore.LoadAISearchOptions(rootStore.routeParams);
  }, []);

  if(
    !mediaProperty ||
    !mediaProperty.metadata?.search?.ai_options?.enable_ai_search ||
    parameters.length === 0
  ) { return null; }

  const searchPath = UrlJoin(basePath, "search");

  const filtersActive = Object.keys(mediaPropertyStore.searchOptions.tracks).length > 0;

  return (
    <>
      <Linkish
        to={
          window.location.pathname.endsWith("/search") ? null :
            UrlJoin(MediaPropertyBasePath(rootStore.routeParams), "search")
        }
        className={S("search__filter", filtersActive ? "search__filter--active" : "")}
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
              <Select
                searchable
                clearable
                key={`advanced-option-${index}`}
                label={spec.title}
                value={mediaPropertyStore.searchOptions.tracks?.[spec.track] || ""}
                data={[
                  { label: "All", value: ""},
                  ...(mediaPropertyStore.aiSearchTrackOptions[spec.track] || [])
                ]}
                onChange={value =>
                  mediaPropertyStore.SetSearchOption({
                    field: "tracks",
                    value: {
                      ...(mediaPropertyStore.searchOptions.tracks || {}),
                      [spec.track]: value
                    }
                  })}
                classNames={inputClassnames}
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
  const [debouncedQuery] = useDebouncedValue(query, 250);
  const searchRef = useRef();
  const history = useHistory();
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  const aiSearchEnabled =
    mediaProperty?.metadata?.search?.ai_options?.enable_ai_search &&
    mediaProperty?.metadata?.search?.ai_options?.index_id;

  const UpdateQueryParams = (query, force) => {
    if(!force && !window.location.pathname.endsWith("/search")) {
      return;
    }

    // No results or ambiguous match - Go to search page
    const params = new URLSearchParams();
    params.set("q", query);

    if(mediaPropertyStore.searchMode === "clip") {
      params.set("m", "clip");
    }

    mediaPropertyStore.SetSearchOption({field: "query", value: query});
    history.push(UrlJoin(basePath, "search", "?" + params.toString()));
  };

  useEffect(() => {
    const text = new URLSearchParams(window.location.search).get("q");

    if(text) {
      setQuery(text);
    }
  }, [rootStore.route]);

  useEffect(() => {
    setQuery(mediaPropertyStore.searchOptions.query);
    UpdateQueryParams(mediaPropertyStore.searchOptions.query);
  }, [mediaPropertyStore.searchOptions.query]);

  useEffect(() => {
    if(debouncedQuery.length === 0) {
      setSearchResults([]);
      setQueryOptions([]);
    } else {
      mediaPropertyStore.SearchMedia({...rootStore.routeParams, query: debouncedQuery})
        .then(({results}) => {
          setSearchResults(results);
          setQueryOptions(
            results
              .map(result => result.title)
              .filter((title, index, array) => array.indexOf(title) === index)
          );
        });
    }
  }, [debouncedQuery]);

  const basePath = MediaPropertyBasePath(rootStore.routeParams);
  const Select = (text, force) => {
    if(mediaPropertyStore.searchOptions.query !== query) {
      mediaPropertyStore.ClearSearchOptions();
    }

    const matchingResults = searchResults.filter(result => result.title?.toLowerCase() === text?.toLowerCase());

    if(mediaPropertyStore.searchMode === "default" && matchingResults.length === 1 && matchingResults[0].mediaItem?.type === "media") {
      const {id, category} = matchingResults[0];
      const type = category === "collection" ? "c" : category === "list" ? "l" : "m";

      history.push(UrlJoin(basePath, type, id));
    } else {
      UpdateQueryParams(text, force);
    }

    searchRef?.current.blur();
  };

  let autocompleteOptions = queryOptions;
  if(mediaPropertyStore.searchMode === "clip") {
    autocompleteOptions = (mediaPropertyStore.previousSearchQueries?.clip || [])
      .filter(option => option.toLowerCase().includes(query?.toLowerCase()));

    if(autocompleteOptions.length === 1 && autocompleteOptions[0]?.toLowerCase() === query?.toLowerCase()) {
      autocompleteOptions = [];
    }
  }

  return (
    <div className={S("search-container")}>
      <Autocomplete
        onClick={() => {
          if(mediaPropertyStore.searchMode === "default" && !location.pathname.includes("/search")) {
            mediaPropertyStore.ClearSearchOptions();
            history.push(UrlJoin(basePath, "search", query ? `?q=${query}` : ""));
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
              Select(query, true);
            }
          }, 250);
        }}
        placeholder={
          mediaPropertyStore.searchMode === "clip" ?
            mediaPropertyStore.rootStore.l10n.media_properties.header.ai_search :
            queryOptions[0]?.title || mediaPropertyStore.rootStore.l10n.media_properties.header.search
        }
        data={autocompleteOptions}
        limit={50}
        onOptionSubmit={text => Select(text, true)}
        role="search"
        leftSectionWidth={rootStore.pageWidth > 800 ? 100 : 30}
        leftSection={
          !aiSearchEnabled ? null :
            <button
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                mediaPropertyStore.ToggleAISearchMode(
                  mediaPropertyStore.searchMode === "default" ? "clip" : "default"
                );

                Select(query);
              }}
              className={S("search__ai-toggle", mediaPropertyStore.searchMode === "clip" ? "search__ai-toggle--active" : "")}
            >
              <ImageIcon icon={AISparkleIcon} />
              <MantineSwitch
                size="xs"
                checked={mediaPropertyStore.searchMode === "clip"}
                classNames={{
                  root: S("search__ai-switch"),
                  track: S("search__ai-switch-track"),
                }}
              />
            </button>
        }
        rightSection={
          <button className={S("search__submit")} onClick={() => Select(query, true)} aria-label="Submit">
            <ImageIcon alt="search" icon={SearchIcon} />
          </button>
        }
        rightSectionWidth={rootStore.pageWidth > 800 ? 75 : 50}
        classNames={{
          root: S("search", aiSearchEnabled ? "search--ai" : "search--standard"),
          input: S("search__input"),
          dropdown: S("search__dropdown"),
          options: S("search__options"),
          option: S("search__option")
        }}
      />
      {
        mediaPropertyStore.searchMode === "clip" ?
          <AIAdvancedSearch query={query} setQuery={setQuery} /> :
          <AdvancedSearch query={query} setQuery={setQuery} />
      }
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
      label: new Intl.DisplayNames([key], {type: "language"}).of(key).capitalize()
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

const HeaderButtons = observer(({basePath, searchDisabled, showSearchBar, setShowSearchBar}) => {
  const [showUserProfileMenu, setShowUserProfileMenu] = useState(false);

  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(mediaProperty?.metadata?.login?.settings?.disable_login) {
    return null;
  }

  const customButtons = rootStore.headerButtons
    .filter(({mobileOnly}) => !mobileOnly || rootStore.pageWidth < 850)
    .map(({title, onClick, active, icon}) =>
      <button
        key={`custom-button-${title}`}
        className={S("button", "button--custom", active ? "button--active" : "")}
        onClick={onClick}
      >
        <ImageIcon icon={icon} label={title} className={S("button__icon")}/>
        <ImageIcon icon={XIcon} label="Hide Notifications" className={S("button__icon-close")}/>
      </button>
    );

  if(!rootStore.loggedIn) {
    if(rootStore.authenticating) {
      return null;
    }

    return (
      <>
        {!showUserProfileMenu ? null : <ProfileMenu Hide={() => setShowUserProfileMenu(false)}/>}
        {customButtons}
        {
          searchDisabled || showSearchBar || rootStore.currentPath?.endsWith("/search") ? null :
            <Linkish to={UrlJoin(basePath, "search")} onClick={() => setShowSearchBar?.(true)} className={S("button")}>
              <ImageIcon icon={SearchIcon} label="Search" className={S("button__icon")}/>
            </Linkish>
        }
        <LanguageMenu/>
        <button className={S("button", showUserProfileMenu ? "button--active" : "")} onClick={() => setShowUserProfileMenu(!showUserProfileMenu)}>
          <ImageIcon icon={MenuIcon} label="Show Settings Menu" className={S("button__icon")}/>
          <ImageIcon icon={XIcon} label="Hide Profile Menu" className={S("button__icon-close")}/>
        </button>
        <Button
          onClick={async () => {
            const useOpenId = !!(mediaProperty?.metadata?.login?.settings?.use_openid && mediaProperty?.metadata?.login?.settings?.openid_endpoint);
            const useAuth0 = !!(mediaProperty?.metadata?.login?.settings?.use_auth0 && mediaProperty?.metadata?.login?.settings?.auth0_domain);

            if(useOpenId) {
              await LogInOpenId();
            } else if(useAuth0) {
              await LogInAuth0();
            } else {
              rootStore.ShowLogin();
            }
          }}
          className={S("sign-in")}
        >
          {rootStore.l10n.login.sign_in}
        </Button>
      </>
    );
  } else {
    return (
      <>
        {!showUserProfileMenu ? null : <ProfileMenu Hide={() => setShowUserProfileMenu(false)}/>}
        {customButtons}
        <LanguageMenu/>
        <button className={S("button", showUserProfileMenu ? "button--active" : "")} onClick={() => setShowUserProfileMenu(!showUserProfileMenu)}>
          <ImageIcon
            icon={
              DefaultProfileImage({
                address: rootStore.userInfo.address,
                email: rootStore.userInfo.email,
                name: rootStore.userInfo.name
              })
            }
            label="Show Profile Menu"
            className={S("button__profile-icon")}
          />
          <ImageIcon icon={XIcon} label="Hide Profile Menu" className={S("button__icon-close")} />
        </button>
      </>
    );
  }
});

const PropertySelector = observer(({logo, basePath, mobile = false}) => {
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

const MediaPropertyMobileHeader = observer(({logo, basePath, discoverDisabled, scrolled, searchDisabled}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);

  if(showSearchBar) {
    return (
      <div
        autoFocus
        key="header-search"
        className={
          S(
            "header-mobile",
            "header-mobile--search",
            scrolled ? "header-mobile--scrolled" : "",
            rootStore.routeParams.mediaItemSlugOrId ? "header-mobile--media" : ""
          )
        }
      >
        <div className={S("header__background")}/>
        <SearchBar autoFocus/>
        <button className={S("button")} onClick={() => setShowSearchBar(false)}>
          <ImageIcon icon={XIcon} label="Cancel Search" className={S("button__icon")}/>
        </button>
      </div>
    );
  }

  return (
    <div
      key="header"
      className={
        S(
          "header-mobile",
          scrolled ? "header-mobile--scrolled" : "",
          rootStore.routeParams.mediaItemSlugOrId ? "header-mobile--media" : ""
        )
      }
    >
      <div className={S("header__background")}/>
      <div className={S("header-mobile__controls", "header-mobile__left-controls")}>
        {
          !rootStore.backPath || discoverDisabled ?
            <PropertySelector logo={logo} basePath={basePath} mobile/> :
            <Linkish style={{paddingRight: "2px"}} className={S("button")} to={rootStore.backPath}>
              <ImageIcon icon={LeftArrowIcon} label="Go Back" className={S("button__icon")}/>
            </Linkish>
        }
      </div>
      <div className={S("buttons")}>
        {
          searchDisabled ? null :
            <button className={S("button")} onClick={() => setShowSearchBar(true)}>
              <ImageIcon icon={SearchIcon} label="Search" className={S("button__icon")}/>
            </button>
        }
        <HeaderButtons
          basePath={basePath}
          searchDisabled
        />
      </div>
    </div>
  );
});

const HeaderLinks = observer(({mediaProperty}) => {
  const headerLinks = (mediaProperty.metadata?.header_links || [])
    .filter(link => mediaPropertyStore.ActionVisible({
      visibility: link.visibility,
      behavior: link.behavior,
      permissions: link.permissions
    }));

  return (
    <div className={S("header-links")}>
      {
        headerLinks.map(link =>
          <RenderAction
            key={link.id}
            action={link}
            Component={params =>
              <Linkish
                {...params}
                style={
                  !CSS.supports("color", link.text_color) ? {} :
                    {"--text-color": link.text_color}
                }
                onClick={() => {
                  params?.onClick?.();
                  Hide();
                }}
                className={S("header-links__link")}
              >
                <ImageIcon className={S("header-links__link-icon")} icon={link.icon?.url || ""} label={link.text} />
                {link.text}
              </Linkish>
            }
          />
        )
      }
    </div>
  );
});

let lastPageHeight = document.body.scrollHeight;
const MediaPropertyHeader = observer(() => {
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
  }, []);

  useEffect(() => {
    setShowSearchBar(rootStore.currentPath.endsWith("/search"));
  }, [rootStore.currentPath]);

  if(!mediaProperty) { return null; }

  const discoverDisabled = rootStore.isCustomDomain || mediaProperty?.metadata?.domain?.hide_home_button;
  const searchDisabled = (
    mediaProperty.metadata.search?.disabled ||
    (!rootStore.loggedIn && mediaProperty.metadata?.search?.hide_if_unauthenticated)
  );

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
        scrolled={scrolled}
        discoverDisabled={discoverDisabled}
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
    <div
      className={
        S(
          "header",
          scrolled ? "header--scrolled" : "",
          rootStore.routeParams.mediaItemSlugOrId ? "header--media" : ""
        )
      }
    >
      <div className={S("header__background")} />
      <div className={S("nav")}>
        {
          !backPath || discoverDisabled ? null :
            <Linkish style={{paddingRight: "2px"}} className={S("button")} to={rootStore.backPath}>
              <ImageIcon icon={LeftArrowIcon} label="Go Back" className={S("button__icon")} />
            </Linkish>
        }
        <PropertySelector logo={logo} basePath={basePath} />
      </div>
      {
        searchDisabled || !showSearchBar ?
          <HeaderLinks mediaProperty={mediaProperty} /> :
          <SearchBar autoFocus />
      }
      <div className={S("buttons")}>
        <HeaderButtons
          basePath={basePath}
          showSearchBar={showSearchBar}
          setShowSearchBar={setShowSearchBar}
          searchDisabled={searchDisabled}
        />
      </div>
    </div>
  );
});

export default MediaPropertyHeader;
