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
import Utils from "@eluvio/elv-client-js/src/Utils";
import {ButtonWithLoader} from "Components/common/UIComponents";
import {v4 as UUID} from "uuid";
import ImageIcon from "Components/common/ImageIcon";
import FilterIcon from "Assets/icons/search.svg";

const sortOptions = [
  { key: "created", value: "created", label: "Recently Listed", desc: false},
  { key: "ord", value: "ord", label: "Ordinal", desc: false},
  { key: "price", value: "price_asc", label: "Price (Low to High)", desc: false},
  { key: "price", value: "price_desc", label: "Price (High to Low)", desc: true},
  { key: "/nft/display_name", value: "display_name_asc", label: "Name (A-Z)", desc: false},
  { key: "/nft/display_name", value: "display_name_desc", label: "Name (Z-A)", desc: true}
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

export const ListingFilters = observer(({Loading, UpdateListings}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const collections = marketplace && marketplace.collections;

  const [loading, setLoading] = useState(false);
  const [loadKey, setLoadKey] = useState(undefined);
  const [results, setResults] = useState([]);
  const [moreResults, setMoreResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [sort, setSort] = useState("created");
  const [sortBy, setSortBy] = useState("created");
  const [sortDesc, setSortDesc] = useState(false);
  const [collectionIndex, setCollectionIndex] = useState(-1);
  const [filter, setFilter] = useState("");
  const [filterContractAddr, setFilterContractAddr] = useState("");

  const perPage = 8;
  let scrollTimeout;

  const Load = async ({page=1, currentResults=[]}) => {
    setCurrentPage(page);
    setMoreResults(false);

    try {
      setLoading(true);

      if(Loading) { Loading(true); }

      const {listings, paging} = await transferStore.FilteredTransferListings({
        sortBy,
        sortDesc,
        contractAddress: filterContractAddr,
        collectionIndex,
        marketplace,
        start: (page - 1) * perPage,
        limit: perPage
      });

      const allListings = [...currentResults, ...listings];

      setResults(allListings);
      setMoreResults(paging.more);

      if(UpdateListings) { UpdateListings(allListings); }
    } finally {
      setLoading(false);

      if(Loading) { Loading(false); }
    }
  };

  // Update key when scrolled to the bottom of the page
  useEffect(() => {
    const InfiniteScroll = () => {
      if(Math.abs((window.innerHeight + window.scrollY) - document.body.offsetHeight) < 10) {
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
          setLoadKey(UUID());
        }, 300);
      }
    };

    window.addEventListener("scroll", InfiniteScroll);

    return () => window.removeEventListener("scroll", InfiniteScroll);
  }, []);

  // Initial page load
  useEffect(() => {
    Load({page: 1});
  }, []);

  // Load triggered by scroll detection updating a key
  useEffect(() => {
    if(!loadKey || loading || !moreResults) { return; }

    Load({page: currentPage + 1, currentResults: results});
  }, [loadKey]);

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
          className="action action-primary listing-filters__filter-button"
          onClick={async () => await Load({page: 1})}
        >
          <ImageIcon icon={FilterIcon} title="Filter Results" className="action-icon" />
        </ButtonWithLoader>
      </div>
    </div>
  );
});

export default ListingFilters;
