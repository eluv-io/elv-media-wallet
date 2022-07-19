import React, {useState, useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import AutoComplete from "Components/common/AutoComplete";
import {ButtonWithLoader, DebouncedInput, Select} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import SearchIcon from "Assets/icons/search.svg";
import FilterIcon from "Assets/icons/filter icon.svg";
import ClearIcon from "Assets/icons/x.svg";

const sortOptionsOwned = [
  { key: "default", value: "default", label: "Default", desc: true},
  { key: "meta/display_name", value: "display_name_asc", label: "Name (A-Z)", desc: false},
  { key: "meta/display_name", value: "display_name_desc", label: "Name (Z-A)", desc: true}
];

const sortOptionsListings = [
  { key: "created", value: "created", label: "Recently Listed", desc: true},
  { key: "info/token_id", value: "token_id", label: "Token ID", desc: false},
  { key: "info/ordinal", value: "ord", label: "Ordinal", desc: false},
  { key: "price", value: "price_asc", label: "Price (Low to High)", desc: false},
  { key: "price", value: "price_desc", label: "Price (High to Low)", desc: true},
  { key: "/nft/display_name", value: "display_name_asc", label: "Name (A-Z)", desc: false},
  { key: "/nft/display_name", value: "display_name_desc", label: "Name (Z-A)", desc: true}
];

const sortOptionsActivity = [
  { key: "created", value: "created", label: "Recently Listed", desc: true},
  { key: "price", value: "price_asc", label: "Price (Low to High)", desc: false},
  { key: "price", value: "price_desc", label: "Price (High to Low)", desc: true},
  { key: "name", value: "display_name_asc", label: "Name (A-Z)", desc: false},
  { key: "name", value: "display_name_desc", label: "Name (Z-A)", desc: true}
];

const SortOptions = mode => {
  switch(mode) {
    case "owned":
      return sortOptionsOwned;

    case "listings":
      return sortOptionsListings;

    default:
      return sortOptionsActivity;
  }
};

let savedOptions;
const FilterDropdown = observer(({label, value, options, optionLabelPrefix, onChange, placeholder}) => {
  return (
    <Select
      label={label}
      value={value}
      onChange={value => onChange(value)}
      containerClassName="filters__select-container"
      buttonClassName={`filters__select ${placeholder && (placeholder[0] || "").toString() === (value || "").toString() ? "filters__select-placeholder" : ""}`}
      options={
        [
          placeholder ? [placeholder[0], placeholder[1]] : undefined,
          ...options.map(options => [options[0], `${optionLabelPrefix}${options[1]}`])
        ].filter(option => option)
      }
    />
  );
});

const AttributeFilters = ({attributes, filterValues, setFilterValues}) => {
  if(!attributes || attributes.length === 0) { return null; }

  const availableAttributes = attributes
    .filter(({name}) => !filterValues.attributeFilters.find(attrFilter => attrFilter.name === name))
    .map(({name}) => [name, name]);

  let selected = (filterValues.attributeFilters || []).map(({name, value}, index) =>
    <div className="filters__menu__attribute-group" key={`trait-selection-${index}`}>
      <FilterDropdown
        label="Attribute"
        optionLabelPrefix="Attribute: "
        value={name}
        onChange={newAttributeName => {
          let newFilters = { ...filterValues };

          if(newAttributeName) {
            const firstValue = attributes.find(attr => attr.name === newAttributeName)?.values[0] || "";
            newFilters.attributeFilters[index] = { name: newAttributeName, value: firstValue };
          } else {
            newFilters.attributeFilters = newFilters.attributeFilters.filter((_, otherIndex) => otherIndex !== index);
          }

          setFilterValues(newFilters);
        }}
        placeholder={["", "Any Attributes"]}
        options={[[name, name], ...availableAttributes]}
      />
      {
        name ?
          <FilterDropdown
            label={name}
            optionLabelPrefix={`${name}: `}
            value={value}
            onChange={newAttributeValue => {
              let newFilters = { ...filterValues };
              newFilters.attributeFilters[index] = { name, value: newAttributeValue };
              setFilterValues(newFilters);
            }}
            options={(attributes.find(attr => attr.name === name)?.values || []).map(v => [v, v])}
          /> : null
      }
    </div>
  );

  return (
    <>
      { selected }
      {
        availableAttributes.length > 0 ?
          <div className="filters__menu__attribute-group">
            <FilterDropdown
              label="Attribute"
              optionLabelPrefix="Attribute: "
              value=""
              onChange={newAttributeName => {
                const firstValue = attributes.find(attr => attr.name === newAttributeName)?.values[0] || "";

                setFilterValues({
                  ...filterValues,
                  attributeFilters: [...filterValues.attributeFilters, {name: newAttributeName, value: firstValue}]
                });
              }}
              placeholder={["", "Any Attributes"]}
              options={availableAttributes}
            />
          </div> : null
      }
    </>
  );
};

const FilterMenu = ({mode, filterValues, editions, attributes, setFilterValues, Hide, ResetFilters}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId || filterValues.marketplaceId];
  const collections = marketplace?.collections;

  const availableMarketplaces = rootStore.allMarketplaces
    .filter(marketplace => marketplace && marketplace.tenant_id && marketplace.branding && marketplace.branding.show && marketplace.branding.name);

  const ref = useRef();
  useEffect(() => {
    const onClickOutside = event => {
      if(!ref.current || !ref.current.contains(event.target) && event.target.localName !== "li") {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className="filters__menu" ref={ref}>
      {
        mode === "listings" && filterValues.filter && editions.length > 0 ?
          <FilterDropdown
            label="Edition"
            optionLabelPrefix="Edition: "
            value={filterValues.editionFilter}
            onChange={value => setFilterValues({...filterValues, editionFilter: value})}
            placeholder={["", "All Editions"]}
            options={editions}
          /> : null
      }

      {
        !marketplace && availableMarketplaces.length > 0 ?
          <FilterDropdown
            label="Marketplaces"
            optionLabelPrefix="Marketplace: "
            value={filterValues.marketplaceId}
            options={
              availableMarketplaces
                .map(marketplace => [marketplace.marketplaceId, marketplace.branding.name])
            }
            placeholder={["", "All Marketplaces"]}
            onChange={value => setFilterValues({...filterValues, marketplaceId: value})}
          /> : null
      }

      {
        mode === "owned" ? null :
          <FilterDropdown
            label="Time"
            optionLabelPrefix="Time: "
            value={filterValues.lastNDays}
            onChange={value => setFilterValues({...filterValues, lastNDays: value})}
            placeholder={["-1", "All Time"]}
            options={[["7", "Last 7 Days"], ["30", "Last 30 Days"]]}
          />
      }

      {
        collections && collections.length > 0 ?
          <FilterDropdown
            label="Collection"
            optionLabelPrefix="Collection: "
            value={filterValues.collectionIndex}
            onChange={value => setFilterValues({...filterValues, collectionIndex: value})}
            placeholder={["-1", "All Collections"]}
            options={
              (collections.map((collection, index) =>
                [index, collection.collection_header]
              ))
            }
          /> : null
      }
      {
        mode === "listings" ?
          <FilterDropdown
            label="Currency"
            optionLabelPrefix="Currency: "
            value={filterValues.currency}
            onChange={value => setFilterValues({...filterValues, currency: value})}
            placeholder={["", "All Currencies"]}
            options={[["usdc", "USDC"]]}
          /> : null
      }
      {
        mode === "listings" ?
          <AttributeFilters attributes={attributes} filterValues={filterValues} setFilterValues={setFilterValues} /> :
          null
      }
      <button className="action filters__menu__reset-button" onClick={() => ResetFilters()}>
        Reset Filters
      </button>
    </div>
  );
};

export const ListingFilters = observer(({mode="listings", UpdateFilters}) => {
  const match = useRouteMatch();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);

  const sortOptions = SortOptions(mode);
  const initialOption = sortOptions[0];

  const initialFilter = urlParams.get("filter");
  const initialEditionFilter = urlParams.get("edition");

  const [savedOptionsLoaded, setSavedOptionsLoaded] = useState(false);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);
  const [editions, setEditions] = useState([]);
  const [attributes, setAttributes] = useState([]);

  const [filterOptions, setFilterOptions] = useState(initialFilter ? [ initialFilter ] : []);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [renderIndex, setRenderIndex] = useState(0);

  const defaultFilters = {
    sort: initialOption.value,
    sortBy: initialOption.key,
    sortDesc: initialOption.desc,
    collectionIndex: -1,
    lastNDays: -1,
    filter: "",
    editionFilter: "",
    attributeFilters: [],
    marketplaceId: match.params.marketplaceId,
    currency: ""
  };

  const [filterValues, setFilterValues] = useState({
    ...defaultFilters,
    filter: initialFilter || "",
    editionFilter: initialEditionFilter || ""
  });

  const marketplace = rootStore.marketplaces[match.params.marketplaceId || filterValues.marketplaceId];

  const ResetFilters = () => {
    setFilterValues(defaultFilters);
    setRenderIndex(renderIndex + 1);
  };

  const Update = async (force=false) => {
    const options = {
      ...filterValues,
      marketplaceParams: filterValues.marketplaceId ? { marketplaceId: filterValues.marketplaceId } : undefined
    };

    await UpdateFilters(options, force);

    savedOptions = {
      ...options,
      mode,
      sort: filterValues.sort
    };
  };

  useEffect(() => {
    rootStore.walletClient.ListingNames({marketplaceParams: filterValues.marketplaceId ? {marketplaceId: filterValues.marketplaceId} : undefined})
      .then(names => setFilterOptions(names.map(name => (name || "").trim()).sort()))
      .finally(() => setFilterOptionsLoaded(true));

    setAttributes([]);
    rootStore.walletClient.ListingAttributes({marketplaceParams: filterValues.marketplaceId ? {marketplaceId: filterValues.marketplaceId} : undefined})
      .then(attributes => setAttributes(attributes));
  }, [filterValues.marketplaceId]);

  useEffect(() => {
    if(!filterValues.filter) {
      setEditions([]);
      return;
    }

    rootStore.walletClient.ListingEditionNames({displayName: filterValues.filter})
      .then(editions =>
        setEditions(
          editions
            .map(edition => (edition || "").trim())
            .sort()
            .map(edition => [edition, edition])
        )
      );
  }, [filterValues.filter]);

  useEffect(() => {
    if(savedOptionsLoaded || !filterOptionsLoaded) { return; }

    try {
      if(savedOptions && (savedOptions.mode !== mode || savedOptions.marketplaceId !== marketplace?.marketplaceId)) {
        savedOptions = undefined;
      }

      if(!savedOptions) {
        return;
      }

      if(initialFilter) {
        return;
      }

      setFilterValues({
        ...filterValues,
        sort: savedOptions.sort,
        sortBy: savedOptions.sortBy,
        sortDesc: savedOptions.sortDesc,
        filter: savedOptions.filter,
        editionFilter: savedOptions.editionFilter,
        attributeFilters: savedOptions.attributeFilters,
        collectionIndex: savedOptions.collectionIndex,
        lastNDays: savedOptions.lastNDays,
        marketplaceId: savedOptions.marketplaceId
      });
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Error loading saved sort options", error);
    } finally {
      setSavedOptionsLoaded(true);
    }
  }, [filterOptionsLoaded]);

  useEffect(() => {
    // Don't start updating until all saved values are loaded
    if(!savedOptionsLoaded) { return; }

    Update();
  }, [filterValues, savedOptionsLoaded]);

  // Owned items view with no available collections has no extra filters available
  const collections = marketplace?.collections;
  const extraFiltersAvailable = mode !== "owned" || (collections && collections.length > 0);

  return (
    <div className="filters">
      <div className="filters__controls">
        <FilterDropdown
          className="filters__select filters__select--sort"
          label="Sort By"
          optionLabelPrefix="Sort: "
          value={sortOptions.find(option => option.value === filterValues.sort).value}
          onChange={value => {
            const selectedSortOption = sortOptions.find(option => option.value === value);
            setFilterValues({
              ...filterValues,
              sort: selectedSortOption.value,
              sortBy: selectedSortOption.key,
              sortDesc: selectedSortOption.desc
            });
          }}
          options={sortOptions.map(({key, value, label}) => [value || key, label])}
        />
        {
          extraFiltersAvailable ?
            <button className={`filters__menu-button ${showFilterMenu ? "filters__menu-button--active" : ""}`} onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <ImageIcon icon={FilterIcon} title="Show Additional Filter Parameters"/>
            </button> : null
        }
        {
          showFilterMenu ?
            <FilterMenu
              mode={mode}
              filterValues={filterValues}
              editions={editions}
              attributes={attributes}
              setFilterValues={setFilterValues}
              Hide={() => setShowFilterMenu(false)}
              ResetFilters={ResetFilters}
            /> : null }
      </div>
      <div className="filters__search-container">
        {
          mode === "owned" ?
            // Owned NFTs do not need exact queries
            <div className="autocomplete filters__search">
              <DebouncedInput
                key={`autocomplete-${filterOptionsLoaded}-${savedOptionsLoaded}-${renderIndex}`}
                className="listing-filters__filter-input autocomplete__input"
                placeholder="Filter..."
                value={filterValues.filter}
                onChange={value => setFilterValues({...filterValues, filter: value, editionFilter: ""})}
              />
              {
                filterValues.filter ?
                  <button
                    onClick={() => setFilterValues({...filterValues, filter: "", editionFilter: ""})}
                    className="autocomplete__clear-button"
                  >
                    <ImageIcon icon={ClearIcon} title="Clear" />
                  </button> : null
              }
            </div> :
            <AutoComplete
              className="filters__search"
              key={`autocomplete-${filterOptionsLoaded}-${savedOptionsLoaded}-${renderIndex}`}
              placeholder="Search here"
              value={filterValues.filter}
              onChange={value => setFilterValues({...filterValues, filter: value, editionFilter: ""})}
              onEnterPressed={async () => await Update(true)}
              options={filterOptions}
            />
        }
        <ButtonWithLoader onClick={async () => await Update(true)} className="filters__search-button">
          <ImageIcon icon={SearchIcon} label="Search" />
        </ButtonWithLoader>
      </div>
    </div>
  );
});

export default ListingFilters;
