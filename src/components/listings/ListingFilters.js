/*
CREATE TABLE IF NOT EXISTS listings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ord bigint NOT NULL,
    contract text NOT NULL,
    token text NOT NULL,
    tenant text,
    seller text NOT NULL,
    price float NOT NULL,
    fee float,
    nft jsonb,
    created timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    UNIQUE (contract, token)
);
 */

import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore, transferStore} from "Stores";
import AutoComplete from "Components/common/AutoComplete";
import {ButtonWithLoader} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import FilterIcon from "Assets/icons/search.svg";

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

export const ListingFilters = observer(({mode="listings", UpdateFilters}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collections = marketplace && marketplace.collections;

  const [filterOptions, setFilterOptions] = useState([]);

  const [sort, setSort] = useState("created");
  const [sortBy, setSortBy] = useState("created");
  const [sortDesc, setSortDesc] = useState(true);
  const [collectionIndex, setCollectionIndex] = useState(-1);
  const [lastNDays, setLastNDays] = useState(-1);
  const [filter, setFilter] = useState("");

  const Update = async () => {
    UpdateFilters({
      sortBy,
      sortDesc,
      filter,
      collectionIndex,
      lastNDays,
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
