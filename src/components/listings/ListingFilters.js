import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore, transferStore} from "Stores";
import AutoComplete from "Components/common/AutoComplete";
import {ButtonWithLoader} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import FilterIcon from "Assets/icons/search.svg";
import XIcon from "Assets/icons/x.svg";

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
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(marketplace) {
    return;
  }

  const availableMarketplaces = rootStore.allMarketplaces
    .filter(marketplace => marketplace.tenant_id && marketplace.branding && marketplace.branding.show && marketplace.branding.name);

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
              { (availableMarketplaces.find(marketplace => marketplace.tenant_id === tenantId) || {}).branding.name || "Unknown Marketplace" }
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

  const initialFilter = urlParams.get("filter");

  const [filterOptions, setFilterOptions] = useState(initialFilter ? [ initialFilter ] : []);

  const [sort, setSort] = useState("created");
  const [sortBy, setSortBy] = useState("created");
  const [sortDesc, setSortDesc] = useState(true);
  const [collectionIndex, setCollectionIndex] = useState(-1);
  const [lastNDays, setLastNDays] = useState(-1);
  const [filter, setFilter] = useState(initialFilter || "");
  const [tenantIds, setTenantIds] = useState([]);

  const Update = async () => {
    UpdateFilters({
      sortBy,
      sortDesc,
      filter,
      collectionIndex,
      lastNDays,
      tenantIds,
      marketplaceId: match.params.marketplaceId
    });
  };

  // Initial load + load item names
  useEffect(() => {
    Update();

    if(marketplace) {
      setFilterOptions(marketplace.items.map(item => (item.nftTemplateMetadata || {}).display_name || "").sort());
    } else {
      transferStore.ListingNames()
        .then(names => setFilterOptions(names.sort()));

      rootStore.LoadAvailableMarketplaces({});
    }
  }, []);


  const sortOptions = mode === "listings" ? sortOptionsListings : sortOptionsActivity;

  return (
    <>
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
        <FilterDropdown
          label="Time"
          value={lastNDays}
          onChange={value => setLastNDays(value)}
          placeholder={["-1", "All Time"]}
          options={[["7", "Last 7 Days"], ["30", "Last 30 Days"]]}
        />
        <div className="listing-filters__autocomplete-container">
          <label className="listing-filters__label">Filter</label>
          <AutoComplete
            placeholder="Filter..."
            value={filter}
            onChange={value => setFilter(value)}
            onEnterPressed={async () => await Update()}
            options={filterOptions}
          />
        </div>
        <MarketplaceSelection selected={tenantIds} setSelected={setTenantIds} />
        <div className="listing-filters__actions actions-container">
          <ButtonWithLoader
            className="action action-primary listing-filters__filter-button"
            onClick={async () => await Update()}
          >
            <ImageIcon icon={FilterIcon} title="Filter Results" className="action-icon" />
          </ButtonWithLoader>
        </div>
      </div>
    </>
  );
});

export default ListingFilters;
