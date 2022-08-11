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
import {SavedValue} from "../../utils/Utils";

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

let savedFilters = SavedValue(undefined, "");

const RangeFilter = observer(({label, valueLabel, value, onChange, precision=0}) => {
  const [min, setMin] = useState(value.min || "");
  const [max, setMax] = useState(value.max || "");

  let parsedMin = min === "" ? "" : parseFloat((isNaN(parseFloat(min)) ? 0 : parseFloat(min)).toFixed(precision));
  let parsedMax = max === "" ? "" : parseFloat((isNaN(parseFloat(max)) ? 0 : parseFloat(max)).toFixed(precision));

  useEffect(() => {
    if(typeof value.min !== "undefined") {
      setMin(value.min);
    }

    if(typeof value.max !== "undefined") {
      setMax(value.max);
    }
  }, [value]);

  const UpdateValues = ({min, max, preferMin}) => {
    if(min >= max && min !== "" && max !== "") {
      if(preferMin) {
        max = Math.floor(min + 1);
      } else {
        min = Math.max(0, Math.floor(max - 1));
      }
    }

    onChange({min, max});
  };

  const FormatInput = value =>
    precision === 0 ?
      value.replace(/[^\d]/g, "") :
      value.replace(/[^\d.]/g, "");

  return (
    <div className="filters__range-container">
      <label className="filters__range-container__label">{ label }</label>
      <div className="filters__range">
        <label className="filters__range__label">{ valueLabel }</label>
        <input
          value={min}
          onChange={event => setMin(FormatInput(event.target.value))}
          placeholder="Min"
          className="filters__range__input"
          onBlur={() => UpdateValues({min: parsedMin, max: parsedMax, preferMin: true})}
        />
        <div className="filters__range__separator">to</div>
        <input
          value={max}
          onChange={event => setMax(FormatInput(event.target.value))}
          placeholder="Max"
          className="filters__range__input"
          onBlur={() => UpdateValues({min: parsedMin, max: parsedMax})}
        />
      </div>
    </div>
  );
});

const FilterSelect = observer(({label, value, options, optionLabelPrefix="", onChange, placeholder}) => {
  return (
    <Select
      label={label}
      value={value}
      onChange={value => onChange(value)}
      containerClassName="filters__select-container"
      buttonClassName={`filters__select ${placeholder && (placeholder[0] || "").toString() === (value || "").toString() ? "filters__select-placeholder" : ""}`}
      options={options.map(options => [options[0], options[0] === "" ? options[1] : `${optionLabelPrefix}${options[1]}`])}
      placeholder={placeholder}
    />
  );
});

const FilterMultiSelect = ({label, values, options, optionLabelPrefix="", onChange, placeholder}) => {
  return (
    <div className="filters__multiselect-container">
      <FilterSelect
        label={label}
        options={options.filter(option => typeof values.find(value => typeof option === "object" ? option[0] === value : option === value) === "undefined")}
        onChange={value => onChange([...values, value])}
        placeholder={placeholder}
      />
      {
        !values || values.length === 0 ?
          null :
          <div className="filters__multiselect-container__values">
            {
              values.map((value, index) => {
                label = options.find(option => option === value || option[0] === value);
                label = typeof label === "object" ? label[1] : label;

                return (
                  <div className="filters__multiselect-container__value" key={`multiselect-option-${label}`}>
                    {`${optionLabelPrefix}${label}`}
                    <button onClick={() => onChange(values.filter((_, i) => i !== index))}>
                      <ImageIcon icon={ClearIcon}/>
                    </button>
                  </div>
                );
              })
            }
          </div>
      }
    </div>
  );
};

// Must separate out drop event attribute to separate control
const AttributeFilters = ({attributes, dropAttributes, selectedFilterValues, setSelectedFilterValues}) => {
  // Attribute name/value pairs are combined with delimiter - must convert to and from: { name, value } <=> name:|:value
  const SelectValueToAttributeFilter = value => ({ name: value.split(":|:")[0], value: value.split(":|:")[1] });
  const AttributeFilterToSelectValue = ({name, value}) => `${name}:|:${value}`;

  const attributeOptions = (attributes || [])
    .map(({name, values}) => values.map(value => [AttributeFilterToSelectValue({name, value}), `${name}: ${value}`]))
    .flat()
    .sort((a, b) => a[1] < b[1] ? -1 : 1);

  const dropAttributeOptions = (dropAttributes || [])
    .map(({name, values}) => values.map(value => [AttributeFilterToSelectValue({name, value}), `Drop: ${value}`]))
    .flat()
    .sort((a, b) => a[1] < b[1] ? -1 : 1);

  let selectedAttributeValues = [];
  let selectedDropValues = [];
  (selectedFilterValues.attributeFilters || []).forEach(filter => {
    if(["drop", "drop event"].includes(filter.name.toLowerCase())) {
      selectedDropValues.push(AttributeFilterToSelectValue(filter));
    } else {
      selectedAttributeValues.push(AttributeFilterToSelectValue(filter));
    }
  });

  return (
    <>
      {
        dropAttributeOptions.length > 0 ?
          <FilterMultiSelect
            label="Choose Drops"
            values={selectedDropValues}
            onChange={values => setSelectedFilterValues({...selectedFilterValues, attributeFilters: [...selectedAttributeValues, ...values].map(SelectValueToAttributeFilter)})}
            placeholder="Choose Drops"
            options={dropAttributeOptions}
          /> : null
      }

      {
        attributeOptions.length > 0 ?
          <FilterMultiSelect
            label="Choose Attributes"
            values={selectedAttributeValues}
            onChange={values => setSelectedFilterValues({...selectedFilterValues, attributeFilters: [...values, ...selectedDropValues].map(SelectValueToAttributeFilter)})}
            placeholder="Choose Attributes"
            options={attributeOptions}
          /> : null
      }
    </>
  );
};

const FilterMenu = ({mode, filterValues, editions, attributes, dropAttributes, setFilterValues, Hide, ResetFilters}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId || filterValues.marketplaceId];
  const collections = marketplace?.collections;

  const availableMarketplaces = rootStore.allMarketplaces
    .filter(marketplace => marketplace && marketplace.tenant_id && marketplace.branding && marketplace.branding.show && marketplace.branding.name);

  const [selectedFilterValues, setSelectedFilterValues] = useState(filterValues);

  const ref = useRef();

  useEffect(() => {
    const onClickOutside = event => {
      if(ref.current && !ref.current?.contains(event.target) && !document.querySelector(".filters__menu-button").contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside, true);

    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  useEffect(() => {
    setSelectedFilterValues(filterValues);
  }, [filterValues]);

  return (
    <div className="filters__menu" ref={ref}>

      {
        !marketplace && availableMarketplaces.length > 0 ?
          <FilterSelect
            label="Marketplaces"
            optionLabelPrefix="Marketplace: "
            value={selectedFilterValues.marketplaceId}
            options={[
              ["", "All Marketplaces"],
              ...(availableMarketplaces
                .map(marketplace => [marketplace.marketplaceId, marketplace.branding.name]))
            ]}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, marketplaceId: value})}
          /> : null
      }

      {
        collections && collections.length > 0 ?
          <FilterMultiSelect
            label="Choose Collections"
            optionLabelPrefix="Collection: "
            values={selectedFilterValues.collectionIndexes}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, collectionIndexes: value})}
            placeholder="Choose Collections"
            options={
              (collections.map((collection, index) =>
                [index, collection.collection_header]
              ))
            }
          /> : null
      }

      {
        mode === "listings" ?
          <AttributeFilters
            attributes={attributes}
            dropAttributes={dropAttributes}
            selectedFilterValues={selectedFilterValues}
            setSelectedFilterValues={setSelectedFilterValues}
          /> : null
      }

      {
        mode === "listings" && selectedFilterValues.filter && editions.length > 0 ?
          <FilterMultiSelect
            label="Choose Edition"
            optionLabelPrefix="Edition: "
            values={selectedFilterValues.editionFilters}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, editionFilters: value})}
            placeholder="Choose Editions"
            options={editions}
          /> : null
      }
      {
        mode === "owned" ? null :
          <FilterSelect
            label="Time"
            optionLabelPrefix="Time: "
            value={selectedFilterValues.lastNDays}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, lastNDays: value})}
            options={[["", "All Time"], ["7", "Last 7 Days"], ["30", "Last 30 Days"]]}
          />
      }
      {
        mode === "listings" ?
          <FilterSelect
            label="Currency"
            optionLabelPrefix="Currency: "
            value={selectedFilterValues.currency}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, currency: value})}
            options={[["", "Any Currency"], ["usdc", "USDC"]]}
          /> : null
      }
      {
        mode === "listings" ?
          <RangeFilter
            label="Price"
            valueLabel="USD"
            value={selectedFilterValues.priceRange}
            onChange={priceRange => setSelectedFilterValues({...selectedFilterValues, priceRange})}
            precision={2}
          /> : null
      }
      {
        mode === "listings" ?
          <RangeFilter
            label="Token ID"
            valueLabel="#"
            value={selectedFilterValues.tokenIdRange}
            onChange={tokenIdRange => setSelectedFilterValues({...selectedFilterValues, tokenIdRange})}
            precision={0}
          /> : null
      }
      <div className="filters__menu__actions">
        <button
          className="action action-primary filters__menu__apply-button"
          onClick={() => {
            setFilterValues(selectedFilterValues);
            Hide();
          }}
        >
          Apply Filters
        </button>
        <button className="action filters__menu__reset-button" onClick={() => ResetFilters()}>
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export const ListingFilters = observer(({mode="listings", initialFilters, UpdateFilters}) => {
  const match = useRouteMatch();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);

  const sortOptions = SortOptions(mode);
  const initialOption = sortOptions[0];

  const initialFilter = urlParams.get("filter");
  const initialEditionFilters = urlParams.get("edition") ? [ urlParams.get("edition") ] : [];

  const [savedOptionsLoaded, setSavedOptionsLoaded] = useState(false);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);
  const [editions, setEditions] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [dropAttributes, setDropAttributes] = useState([]);

  const [filterOptions, setFilterOptions] = useState(initialFilter ? [ initialFilter ] : []);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [renderIndex, setRenderIndex] = useState(0);

  const defaultFilters = {
    sort: initialOption.value,
    sortBy: initialOption.key,
    sortDesc: initialOption.desc,
    collectionIndexes: [],
    lastNDays: -1,
    filter: "",
    editionFilters: [],
    attributeFilters: [],
    marketplaceId: match.params.marketplaceId,
    capLimit: "",
    currency: "",
    priceRange: {
      min: "",
      max: ""
    },
    tokenIdRange: {
      min: "",
      max: ""
    },
    ...(initialFilters || {})
  };

  const [filterValues, setFilterValues] = useState({
    ...defaultFilters,
    filter: initialFilter || "",
    editionFilters: initialEditionFilters
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

    savedFilters.SetValue(
      {
        ...options,
        mode,
        sort: filterValues.sort
      },
      JSON.stringify({mode, marketplaceId: marketplace?.marketplaceId})
    );
  };

  useEffect(() => {
    rootStore.walletClient.ListingNames({marketplaceParams: filterValues.marketplaceId ? {marketplaceId: filterValues.marketplaceId} : undefined})
      .then(names => setFilterOptions(names.map(name => (name || "").trim()).sort()))
      .finally(() => setFilterOptionsLoaded(true));

    setAttributes([]);
    setDropAttributes([]);

    rootStore.walletClient.ListingAttributes({marketplaceParams: filterValues.marketplaceId ? {marketplaceId: filterValues.marketplaceId} : undefined})
      .then(attributes => {
        attributes = (attributes || [])
          .sort((a, b) => a.name < b.name ? -1 : 1);

        setAttributes(attributes.filter(attr => !["drop", "drop event"].includes(attr?.name?.toLowerCase())));
        setDropAttributes(attributes.filter(attr => ["drop", "drop event"].includes(attr?.name?.toLowerCase())));
      });
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
      const savedOptions = savedFilters.GetValue(JSON.stringify({mode, marketplaceId: marketplace?.marketplaceId}));

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
        editionFilters: savedOptions.editionFilters,
        attributeFilters: savedOptions.attributeFilters,
        collectionIndexes: savedOptions.collectionIndexes,
        capLimit: savedOptions.capLimit,
        lastNDays: savedOptions.lastNDays,
        marketplaceId: savedOptions.marketplaceId,
        priceRange: savedOptions.priceRange,
        tokenIdRange: savedOptions.tokenIdRange
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

  const filtersActive = JSON.stringify({...defaultFilters, sort: "", sortBy: "", sortDesc: ""}) !== JSON.stringify({...filterValues, sort: "", sortBy: "", sortDesc: ""});

  return (
    <div className="filters">
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
                onChange={value => setFilterValues({...filterValues, filter: value, editionFilters: []})}
              />
              {
                filterValues.filter ?
                  <button
                    onClick={() => setFilterValues({...filterValues, filter: "", editionFilters: []})}
                    className="autocomplete__clear-button"
                  >
                    <ImageIcon icon={ClearIcon} title="Clear" />
                  </button> : null
              }
            </div> :
            <AutoComplete
              className="filters__search"
              key={`autocomplete-${filterOptionsLoaded}-${savedOptionsLoaded}-${renderIndex}`}
              placeholder="Search"
              value={filterValues.filter}
              onChange={value => setFilterValues({...filterValues, filter: value, editionFilters: []})}
              onEnterPressed={async () => await Update(true)}
              options={filterOptions}
            />
        }
        <ButtonWithLoader onClick={async () => await Update(true)} className="filters__search-button">
          <ImageIcon icon={SearchIcon} label="Search" />
        </ButtonWithLoader>
      </div>
      <div className="filters__controls">
        <FilterSelect
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
            <button className={`filters__menu-button ${showFilterMenu || filtersActive ? "filters__menu-button--active" : ""}`} onClick={() => setShowFilterMenu(!showFilterMenu)}>
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
              dropAttributes={dropAttributes}
              setFilterValues={setFilterValues}
              Hide={() => setShowFilterMenu(false)}
              ResetFilters={ResetFilters}
            /> : null }
      </div>
    </div>
  );
});

export default ListingFilters;
