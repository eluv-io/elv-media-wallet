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
import {rootStore} from "Stores";
import AutoComplete from "Components/common/AutoComplete";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {ButtonWithLoader} from "Components/common/UIComponents";

const sortOptions = [
  { key: "created", value: "created", label: "Recently Listed", desc: false},
  { key: "ord", value: "ord", label: "Ordinal", desc: false},
  { key: "price", value: "price_asc", label: "Price (Low to High)", desc: false},
  { key: "price", value: "price_desc", label: "Price (High to Low)", desc: true}
];

const FilterDropdown = observer(({label, value, options, onChange}) => {
  return (
    <div className="listing-filters__dropdown">
      <label className="listing-filters__label">{ label }</label>
      <div className="listing-filters__select-container">
        <select
          className="listing-filters__select"
          value={value}
          onChange={event => onChange(event.target.value)}
        >
          { options.map(([value, label]) => (
            <option value={value} key={`sort-option-${value}`}>{ label }</option>
          ))}
        </select>
      </div>
    </div>
  );
});

export const ListingFilters = observer(({RetrieveListings}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collections = marketplace && marketplace.collections;

  const [sort, setSort] = useState("created");
  const [sortBy, setSortBy] = useState("created");
  const [sortDesc, setSortDesc] = useState(false);
  const [collectionIndex, setCollectionIndex] = useState(-1);
  const [filter, setFilter] = useState("");
  const [filterContractAddr, setFilterContractAddr] = useState("");

  useEffect(() => {
    RetrieveListings({
      sortBy,
      sortDesc,
      contractAddress: filterContractAddr,
      collectionIndex,
      marketplace
    });
  }, []);

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
            options={[
              [-1, "Select a Collection"],
              ...(collections.map((collection, index) =>
                [index, collection.collection_header]
              ))
            ]}
          /> : null
      }
      {
        marketplace ?
          <div className="listing-filters__autocomplete-container">
            <label className="listing-filters__label">Filter</label>
            <AutoComplete
              placeholder="Filter..."
              value={filter}
              onChange={value => {
                setFilter(value);

                const matchingItem = marketplace.items.find(item => item.name === value);

                setFilterContractAddr(Utils.SafeTraverse(matchingItem, "nft_template", "nft", "address"));
              }}
              options={marketplace.items.map(item => item.name || "").sort()}
            />
          </div> : null
      }
      <div className="listing-filters__actions actions-container">
        <ButtonWithLoader
          className="action action-primary"
          onClick={async () => {
            await RetrieveListings({
              sortBy,
              sortDesc,
              contractAddress: filterContractAddr,
              collectionIndex,
              marketplace
            });
          }}
        >
          Filter Results
        </ButtonWithLoader>
        <button className="action action-secondary">
          Clear Filters
        </button>
      </div>
    </div>
  );
});

export default ListingFilters;
