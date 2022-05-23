import React, {useState, useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore, transferStore} from "Stores";
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

const FilterMenu = ({mode, filterValues, setFilterValues, Hide}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collections = marketplace && (!filterValues.tenantId || filterValues.tenantId === marketplace.tenant_id) && marketplace.collections;

  const availableMarketplaces = rootStore.allMarketplaces
    .filter(marketplace => marketplace && marketplace.tenant_id && marketplace.branding && marketplace.branding.show && marketplace.branding.name);

  const ref = useRef();
  useEffect(() => {
    const onClickOutside = event => {
      if(!ref.current || !ref.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className="filters__menu" ref={ref}>
      {
        mode === "owned" ? null :
          <FilterDropdown
            label="Time"
            optionLabelPrefix="Time: "
            value={filterValues.lastNDays}
            onChange={value => setFilterValues({...filterValues, lastNDays: value})}
            options={[["-1", "All Time"], ["7", "Last 7 Days"], ["30", "Last 30 Days"]]}
          />
      }
      {
        !marketplace && availableMarketplaces.length > 0 ?
          <FilterDropdown
            label="Marketplaces"
            optionLabelPrefix="Marketplace: "
            value={filterValues.tenantId}
            options={
              availableMarketplaces
                .map(marketplace => [marketplace.tenant_id, marketplace.branding.name])
            }
            placeholder={["", "All Marketplaces"]}
            onChange={value => setFilterValues({...filterValues, tenantId: value})}
          /> : null
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
            options={[["", "Any"], ["usdc", "USDC"]]}
          /> : null
      }
    </div>
  );
};

export const ListingFilters = observer(({mode="listings", UpdateFilters}) => {
  const match = useRouteMatch();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const sortOptions = SortOptions(mode);
  const initialOption = sortOptions[0];

  const initialFilter = urlParams.get("filter");

  const [savedOptionsLoaded, setSavedOptionsLoaded] = useState(false);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

  const [filterOptions, setFilterOptions] = useState(initialFilter ? [ initialFilter ] : []);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [filterValues, setFilterValues] = useState({
    sort: initialOption.value,
    sortBy: initialOption.key,
    sortDesc: initialOption.desc,
    collectionIndex: -1,
    lastNDays: -1,
    filter: initialFilter || "",
    tenantId: marketplace ? marketplace.tenant_id : "",
    currency: ""
  });

  const Update = async (force=false) => {
    const options = {
      ...filterValues,
      tenantIds: [filterValues.tenantId],
      marketplaceId: match.params.marketplaceId
    };

    await UpdateFilters(options, force);

    savedOptions = {
      ...options,
      marketplaceId: marketplace?.marketplaceId,
      mode,
      sort: filterValues.sort
    };
  };

  useEffect(() => {
    let marketplaceId;
    if(marketplace && filterValues.tenantId === marketplace.tenant_id) {
      marketplaceId = marketplace.marketplaceId;
    }

    transferStore.ListingNames({marketplaceId})
      .then(names => setFilterOptions(names.map(name => (name || "").trim()).sort()))
      .finally(() => setFilterOptionsLoaded(true));
  }, [filterValues.tenantId]);

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
        collectionIndex: savedOptions.collectionIndex,
        lastNDays: savedOptions.lastNDays,
        tenantId: savedOptions.tenantId
      });
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Error loading saved sort options", error);
    } finally {
      setSavedOptionsLoaded(true);
    }
  }, [filterOptionsLoaded]);

  useEffect(() => {
    // Ensure all marketplaces are loaded so they are available in filters
    rootStore.LoadAvailableMarketplaces({});
  }, []);

  useEffect(() => {
    // Don't start updating until all saved values are loaded
    if(!savedOptionsLoaded) { return; }

    Update();
  }, [filterValues, savedOptionsLoaded]);

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
        <button className="filters__menu-button" onClick={() => setShowFilterMenu(!showFilterMenu)}>
          <ImageIcon icon={FilterIcon} title="Show Additional Filter Parameters" />
        </button>
        {
          showFilterMenu ?
            <FilterMenu
              mode={mode}
              filterValues={filterValues}
              setFilterValues={setFilterValues}
              Hide={() => setShowFilterMenu(false)}
            /> : null }
      </div>
      <div className="filters__search-container">
        {
          mode === "owned" ?
            // Owned NFTs do not need exact queries
            <div className="autocomplete filters__search">
              <DebouncedInput
                className="listing-filters__filter-input autocomplete__input"
                placeholder="Filter..."
                value={filterValues.filter}
                onChange={value => setFilterValues({...filterValues, filter: value})}
              />
              {
                filterValues.filter ?
                  <button
                    onClick={() => setFilterValues({...filterValues, filter: ""})}
                    className="autocomplete__clear-button"
                  >
                    <ImageIcon icon={ClearIcon} title="Clear" />
                  </button> : null
              }
            </div> :
            <AutoComplete
              className="filters__search"
              key={`autocomplete-${filterOptionsLoaded}-${savedOptionsLoaded}`}
              placeholder="Search here"
              value={filterValues.filter}
              onChange={value => setFilterValues({...filterValues, filter: value})}
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
