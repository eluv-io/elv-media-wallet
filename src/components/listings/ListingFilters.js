import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore, transferStore} from "Stores";
import AutoComplete from "Components/common/AutoComplete";
import {ButtonWithLoader, DebouncedInput} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import FilterIcon from "Assets/icons/search.svg";
import XIcon from "Assets/icons/x.svg";
import ClearIcon from "Assets/icons/x";

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
const FilterDropdown = observer(({label, value, options, onChange, placeholder}) => {
  return (
    <div className="listing-filters__dropdown">
      <label className="listing-filters__label">{ label }</label>
      <div className="listing-filters__select-container">
        <select
          className={`listing-filters__select ${placeholder && (placeholder[0] || "").toString() === (value || "").toString() ? "listing-filters__select-placeholder" : ""}`}
          value={value}
          onChange={event => onChange(event.target.value)}
        >
          { placeholder ? <option value={placeholder[0]} key={`sort-option-${placeholder[0]}`}>{ placeholder[1] }</option> : null}
          { options.map(([value, label]) => (
            <option value={value} key={`sort-option-${value}`}>{ label }</option>
          ))}
        </select>
      </div>
    </div>
  );
});

const MarketplaceSelection = observer(({selected, setSelected}) => {
  const match = useRouteMatch();
  const availableMarketplaces = rootStore.allMarketplaces
    .filter(marketplace => marketplace && marketplace.tenant_id && marketplace.branding && marketplace.branding.show && marketplace.branding.name);
  const currentMarketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(availableMarketplaces.length === 0) {
    return;
  }

  const options = availableMarketplaces
    .filter(marketplace => !selected.includes(marketplace.tenant_id))
    .map(marketplace => [marketplace.tenant_id, marketplace.branding.name]);

  return (
    <div className="listing-filters__marketplace-selection">
      <FilterDropdown
        label="Marketplaces"
        options={options}
        placeholder={["", "Filter by Marketplace"]}
        onChange={tenantId => tenantId && setSelected([...selected, tenantId])}
      />
      <div className="listing-filters__marketplace-selection__selected">
        {
          selected.map(tenantId =>
            <button
              key={`selected-marketplace-${tenantId}`}
              onClick={() => setSelected(selected.filter(tid => tid !== tenantId))}
              className="listing-filters__marketplace-selection__selected__item"
            >
              {
                (availableMarketplaces.find(marketplace => marketplace.tenant_id === tenantId))?.branding?.name ||
                (currentMarketplace && currentMarketplace.tenant_id === tenantId && currentMarketplace.branding?.name) ||
                "Unknown Marketplace"
              }
              <ImageIcon
                icon={XIcon}
                title="Remove this filter"
              />
            </button>
          )
        }
      </div>
    </div>
  );
});

export const ListingFilters = observer(({mode="listings", UpdateFilters}) => {
  const match = useRouteMatch();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collections = marketplace && marketplace.collections;

  const sortOptions = SortOptions(mode);
  const initialOption = sortOptions[0];

  const initialFilter = urlParams.get("filter");

  const [savedOptionsLoaded, setSavedOptionsLoaded] = useState(false);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

  const [filterOptions, setFilterOptions] = useState(initialFilter ? [ initialFilter ] : []);
  const [sort, setSort] = useState(initialOption.value);
  const [sortBy, setSortBy] = useState(initialOption.key);
  const [sortDesc, setSortDesc] = useState(initialOption.desc);
  const [collectionIndex, setCollectionIndex] = useState(-1);
  const [lastNDays, setLastNDays] = useState(-1);
  const [filter, setFilter] = useState(initialFilter || "");
  const [tenantIds, setTenantIds] = useState((marketplace ? [marketplace.tenant_id] : []));
  const [currency, setCurrency] = useState("");

  const Update = async (force=false) => {
    const options = {
      sortBy,
      sortDesc,
      filter,
      collectionIndex,
      lastNDays,
      tenantIds,
      currency,
      marketplaceId: match.params.marketplaceId
    };

    UpdateFilters(options, force);
    savedOptions = {
      ...options,
      marketplaceId: marketplace?.marketplaceId,
      mode,
      sort
    };
  };

  useEffect(() => {
    let marketplaceId;
    if(marketplace && tenantIds && tenantIds.length === 1 && tenantIds[0] === marketplace.tenant_id) {
      marketplaceId = marketplace.marketplaceId;
    }

    transferStore.ListingNames({marketplaceId})
      .then(names => setFilterOptions(names.map(name => (name || "").trim()).sort()))
      .finally(() => setFilterOptionsLoaded(true));
  }, [tenantIds]);

  useEffect(() => {
    if(savedOptionsLoaded || !filterOptionsLoaded) { return; }

    try {
      if(savedOptions && (savedOptions.mode !== mode || savedOptions.marketplaceId !== marketplace?.marketplaceId)) {
        savedOptions = undefined;
      }

      if(!savedOptions) {
        return;
      }

      setSort(savedOptions.sort);
      setSortBy(savedOptions.sortBy);
      setSortDesc(savedOptions.sortDesc);
      setFilter(savedOptions.filter);
      setCollectionIndex(savedOptions.collectionIndex);
      setLastNDays(savedOptions.lastNDays);
      setTenantIds(savedOptions.tenantIds);

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
  }, [sortBy, sortDesc, collectionIndex, lastNDays, filter, tenantIds, currency, savedOptionsLoaded]);

  return (
    <div className="listing-filters">
      <FilterDropdown
        label="Sort By"
        value={sortOptions.find(option => option.value === sort).value}
        onChange={value => {
          const selectedSortOption = sortOptions.find(option => option.value === value);
          setSort(selectedSortOption.value);
          setSortBy(selectedSortOption.key);
          setSortDesc(selectedSortOption.desc);
        }}
        options={sortOptions.map(({key, value, label}) => [value || key, label])}
      />
      {
        collections && collections.length > 0 ?
          <FilterDropdown
            label="Collection"
            value={collectionIndex}
            onChange={value => setCollectionIndex(value)}
            placeholder={["-1", "Filter by Collection"]}
            options={
              (collections.map((collection, index) =>
                [index, collection.collection_header]
              ))
            }
          /> : null
      }
      {
        mode === "owned" ? null :
          <FilterDropdown
            label="Time"
            value={lastNDays}
            onChange={value => setLastNDays(value)}
            placeholder={["-1", "All Time"]}
            options={[["7", "Last 7 Days"], ["30", "Last 30 Days"]]}
          />
      }
      {
        mode === "listings" ?
          <FilterDropdown
            label="Currency"
            value={currency}
            onChange={value => setCurrency(value)}
            options={[["", "Any"], ["usdc", "USDC"]]}
          /> : null
      }
      <div className="listing-filters__autocomplete-container">
        <label className="listing-filters__label">Filter</label>
        {
          mode === "owned" ?
            // Owned NFTs do not need exact queries
            <div className="autocomplete">
              <DebouncedInput
                className="listing-filters__filter-input autocomplete__input"
                placeholder="Filter..."
                value={filter}
                onChange={value => setFilter(value)}
                onKeyDown={event => {
                  if(event.key === "Enter") {
                    Update(true);
                  }
                }}
              />
              {
                filter ?
                  <button
                    onClick={() => setFilter("")}
                    className="autocomplete__clear-button"
                  >
                    <ImageIcon icon={ClearIcon} title="Clear" />
                  </button> : null
              }
            </div> :
            <AutoComplete
              key={`autocomplete-${filterOptionsLoaded}-${savedOptionsLoaded}`}
              placeholder="Filter..."
              value={filter}
              onChange={value => setFilter(value)}
              onEnterPressed={async () => await Update(true)}
              options={filterOptions}
            />
        }
      </div>
      <MarketplaceSelection selected={tenantIds} setSelected={setTenantIds} />
      <div className="listing-filters__actions actions-container">
        <ButtonWithLoader
          className="action action-primary listing-filters__filter-button"
          onClick={async () => await Update(true)}
        >
          <ImageIcon icon={FilterIcon} title="Filter Results" className="action-icon" />
        </ButtonWithLoader>
      </div>
    </div>
  );
});

export default ListingFilters;
