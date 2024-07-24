import React, {useState, useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {useLocation, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import AutoComplete from "Components/common/AutoComplete";
import {ButtonWithLoader, Select} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import FilterIcon from "Assets/icons/filter icon.svg";
import ClearIcon from "Assets/icons/x.svg";
import {SavedValue} from "../../utils/Utils";
import {Button} from "Components/properties/Common";

const SortOptions = mode => {
  const sortLabels = rootStore.l10n.filters.sort;
  const sortOptionsOwned = [
    { key: "default", value: "newest", label: sortLabels.minted_desc, desc: true},
    { key: "default", value: "oldest", label: sortLabels.minted, desc: false},
    { key: "meta/display_name", value: "display_name_asc", label: sortLabels.name, desc: false},
    { key: "meta/display_name", value: "display_name_desc", label: sortLabels.name_desc, desc: true}
  ];

  const sortOptionsListings = [
    { key: "created", value: "created", label: sortLabels.listed, desc: true},
    { key: "info/token_id", value: "token_id", label: sortLabels.token_id, desc: false},
    { key: "info/ordinal", value: "ord", label: sortLabels.ordinal, desc: false},
    { key: "price", value: "price_asc", label: sortLabels.price, desc: false},
    { key: "price", value: "price_desc", label: sortLabels.price_desc, desc: true},
    { key: "/nft/display_name", value: "display_name_asc", label: sortLabels.name, desc: false},
    { key: "/nft/display_name", value: "display_name_desc", label: sortLabels.name_desc, desc: true}
  ];

  const sortOptionsActivity = [
    { key: "created", value: "created", label: sortLabels.listed, desc: true},
    { key: "price", value: "price_asc", label: sortLabels.price, desc: false},
    { key: "price", value: "price_desc", label: sortLabels.price_desc, desc: true},
    { key: "name", value: "display_name_asc", label: sortLabels.name, desc: false},
    { key: "name", value: "display_name_desc", label: sortLabels.name_desc, desc: true}
  ];

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
          placeholder={rootStore.l10n.filters.filters.min}
          className="filters__range__input"
          onBlur={() => UpdateValues({min: parsedMin, max: parsedMax, preferMin: true})}
        />
        <div className="filters__range__separator">{rootStore.l10n.filters.filters.to}</div>
        <input
          value={max}
          onChange={event => setMax(FormatInput(event.target.value))}
          placeholder={rootStore.l10n.filters.filters.max}
          className="filters__range__input"
          onBlur={() => UpdateValues({min: parsedMin, max: parsedMax})}
        />
      </div>
    </div>
  );
});

const DateToISO = (millis) => {
  try {
    return millis ? new Date(millis).toISOString() : "";
  } catch(error) {
    return "";
  }
};

const DateToMillis = (iso) => {
  try {
    return iso ? new Date(iso).getTime() : undefined;
  } catch(error) {
    return undefined;
  }
};

const DateRange = observer(({label, value, onChange}) => {
  const day = 24 * 60 * 60 * 1000;
  const [startTime, setStartTime] = useState(DateToISO(value.startTime));
  const [endTime, setEndTime] = useState(DateToISO(value.endTime));

  useEffect(() => {
    setStartTime(DateToISO(value.startTime));
    setEndTime(DateToISO(value.endTime));
  }, [value]);

  const UpdateValues = ({startTime, endTime, preferStart}) => {
    startTime = DateToMillis(startTime);
    endTime = DateToMillis(endTime);

    if(startTime >= endTime && startTime && endTime) {
      if(preferStart) {
        endTime = startTime + day;
        setEndTime(DateToISO(endTime));
      } else {
        startTime = endTime - day;
        setStartTime(DateToISO(startTime));
      }
    }

    onChange({startTime, endTime});
  };

  return (
    <div className="filters__range-container">
      <label className="filters__range-container__label">{ label }</label>
      <div className="filters__range filters__range--no-label">
        <input
          type="date"
          value={startTime.split("T")[0] || ""}
          onChange={event => setStartTime(DateToISO(event.target.value))}
          placeholder={rootStore.l10n.filters.filters.start_date}
          className="filters__range__input"
          onBlur={() => UpdateValues({startTime, endTime, preferStart: true})}
        />
        <div className="filters__range__separator">{rootStore.l10n.filters.filters.to}</div>
        <input
          type="date"
          value={endTime.split("T")[0] || ""}
          onChange={event => setEndTime(DateToISO(event.target.value))}
          placeholder={rootStore.l10n.filters.filters.end_date}
          className="filters__range__input"
          onBlur={() => UpdateValues({startTime, endTime})}
        />
      </div>
    </div>
  );
});

const FilterSelect = observer(({label, value, options, optionLabelPrefix="", onChange, placeholder, className=""}) => {


  return (
    <Select
      label={label}
      value={value}
      onChange={value => onChange(value)}
      containerClassName={`filters__select-container ${className}`}
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
const AttributeFilters = ({attributes, dropAttributes, rarityAttributes, selectedFilterValues, setSelectedFilterValues}) => {
  // Attribute name/value pairs are combined with delimiter - must convert to and from: { name, value } <=> name:|:value
  const SelectValueToAttributeFilter = value => ({ name: value.split(":|:")[0], value: value.split(":|:")[1] });
  const AttributeFilterToSelectValue = ({name, value}) => `${name}:|:${value}`;

  const attributeOptions = (attributes || [])
    .map(({name, values}) => values.map(value => [AttributeFilterToSelectValue({name, value}), `${name}: ${value}`]))
    .flat()
    .sort((a, b) => a[1] < b[1] ? -1 : 1);

  const dropAttributeOptions = (dropAttributes || [])
    .map(({name, values}) => values.map(value => [AttributeFilterToSelectValue({name, value}), `${rootStore.l10n.filters.filters.drop}: ${value}`]))
    .flat()
    .sort((a, b) => a[1] < b[1] ? -1 : 1);

  const rarityAttributeOptions = (rarityAttributes || [])
    .map(({name, values}) => values.map(value => [AttributeFilterToSelectValue({name, value}), `${rootStore.l10n.filters.filters.rarity}: ${value}`]))
    .flat()
    .sort((a, b) => a[1] < b[1] ? -1 : 1);

  let selectedAttributeValues = [];
  let selectedDropValues = [];
  let selectedRarityValues = [];
  (selectedFilterValues.attributeFilters || []).forEach(filter => {
    if(["rarity"].includes(filter.name.toLowerCase())) {
      selectedRarityValues.push(AttributeFilterToSelectValue(filter));
    } else if(["drop", "drop event"].includes(filter.name.toLowerCase())) {
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
            label={rootStore.l10n.filters.filters.choose_drops}
            values={selectedDropValues}
            onChange={values => setSelectedFilterValues({...selectedFilterValues, attributeFilters: [...selectedAttributeValues, ...selectedRarityValues, ...values].map(SelectValueToAttributeFilter)})}
            placeholder={rootStore.l10n.filters.filters.choose_drops}
            options={dropAttributeOptions}
          /> : null
      }

      {
        rarityAttributeOptions.length > 0 ?
          <FilterMultiSelect
            label={rootStore.l10n.filters.filters.choose_rarity}
            values={selectedRarityValues}
            onChange={values => setSelectedFilterValues({...selectedFilterValues, attributeFilters: [...selectedAttributeValues, ...selectedDropValues, ...values].map(SelectValueToAttributeFilter)})}
            placeholder={rootStore.l10n.filters.filters.choose_rarity}
            options={rarityAttributeOptions}
          /> : null
      }

      {
        attributeOptions.length > 0 ?
          <FilterMultiSelect
            label={rootStore.l10n.filters.filters.choose_attributes}
            values={selectedAttributeValues}
            onChange={values => setSelectedFilterValues({...selectedFilterValues, attributeFilters: [...values, ...selectedDropValues, ...selectedRarityValues].map(SelectValueToAttributeFilter)})}
            placeholder={rootStore.l10n.filters.filters.choose_attributes}
            options={attributeOptions}
          /> : null
      }
    </>
  );
};

const FilterMenu = ({mode, filterValues, editions, attributes, dropAttributes, rarityAttributes, setFilterValues, Hide, ResetFilters}) => {
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
            label={rootStore.l10n.filters.filters.marketplaces}
            optionLabelPrefix={`${rootStore.l10n.filters.filters.marketplace}: `}
            value={selectedFilterValues.marketplaceId}
            options={[
              ["", rootStore.l10n.filters.filters.all_marketplaces],
              ...(availableMarketplaces
                .map(marketplace => [marketplace.marketplaceId, marketplace.branding.name]))
            ]}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, marketplaceId: value})}
          /> : null
      }

      {
        collections && collections.length > 0 ?
          <FilterMultiSelect
            label={rootStore.l10n.filters.filters.choose_collections}
            optionLabelPrefix={`${rootStore.l10n.filters.filters.collection}: `}
            values={selectedFilterValues.collectionIndexes}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, collectionIndexes: value})}
            placeholder={rootStore.l10n.filters.filters.choose_collections}
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
            rarityAttributes={rarityAttributes}
            selectedFilterValues={selectedFilterValues}
            setSelectedFilterValues={setSelectedFilterValues}
          /> : null
      }

      {
        mode === "listings" && selectedFilterValues.filter && editions.length > 0 ?
          <FilterMultiSelect
            label={rootStore.l10n.filters.filters.choose_editions}
            optionLabelPrefix={`${rootStore.l10n.filters.filters.edition}: `}
            values={selectedFilterValues.editionFilters}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, editionFilters: value})}
            placeholder={rootStore.l10n.filters.filters.choose_editions}
            options={editions}
          /> : null
      }
      {
        mode === "listings" ?
          <FilterSelect
            label={rootStore.l10n.filters.filters.currency}
            optionLabelPrefix={`${rootStore.l10n.filters.filters.currency}: `}
            value={selectedFilterValues.currency}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, currency: value})}
            options={[["", rootStore.l10n.filters.filters.any_currency], ["usdc", "USDC"]]}
          /> : null
      }
      {
        mode === "owned" ? null :
          <FilterSelect
            label={rootStore.l10n.filters.filters.time}
            optionLabelPrefix={`${rootStore.l10n.filters.filters.time}: `}
            value={selectedFilterValues.lastNDays}
            onChange={value => setSelectedFilterValues({...selectedFilterValues, lastNDays: value, startTime: undefined, endTime: undefined})}
            options={[
              ["", rootStore.l10n.filters.filters.all_time],
              ["1", rootStore.l10n.filters.filters.last_24_hours],
              ["7", rootStore.l10n.filters.filters.last_7_days],
              ["30", rootStore.l10n.filters.filters.last_30_days],
              ["custom", rootStore.l10n.filters.filters.custom]
            ]}
          />
      }
      {
        selectedFilterValues.lastNDays === "custom" ?
          <DateRange
            label={rootStore.l10n.filters.filters.date}
            optionLabelPrefix={`${rootStore.l10n.filters.filters.date}: `}
            value={{startTime: selectedFilterValues.startTime, endTime: selectedFilterValues.endTime}}
            onChange={({startTime, endTime}) => setSelectedFilterValues({...selectedFilterValues, startTime, endTime})}
          /> : null
      }
      {
        mode === "listings" ?
          <RangeFilter
            label={rootStore.l10n.filters.filters.price}
            valueLabel="USD"
            value={selectedFilterValues.priceRange}
            onChange={priceRange => setSelectedFilterValues({...selectedFilterValues, priceRange})}
            precision={2}
          /> : null
      }
      {
        mode === "listings" ?
          <RangeFilter
            label={rootStore.l10n.filters.filters.token_id}
            valueLabel="#"
            value={selectedFilterValues.tokenIdRange}
            onChange={tokenIdRange => setSelectedFilterValues({...selectedFilterValues, tokenIdRange})}
            precision={0}
          /> : null
      }
      <div className="filters__menu__actions">
        <Button
          className="filters__menu__action"
          onClick={() => {
            setFilterValues(selectedFilterValues);
            Hide();
          }}
        >
          { rootStore.l10n.filters.filters.apply }
        </Button>
        <Button variant="secondary" className="filters__menu__action" onClick={() => ResetFilters()}>
          { rootStore.l10n.filters.filters.reset }
        </Button>
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
  const [rarityAttributes, setRarityAttributes] = useState([]);

  const [filterOptions, setFilterOptions] = useState(initialFilter ? [ initialFilter ] : []);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [renderIndex, setRenderIndex] = useState(0);

  const defaultFilters = {
    sort: initialOption.value,
    sortBy: initialOption.key,
    sortDesc: initialOption.desc,
    collectionIndexes: [],
    startTime: undefined,
    endTime: undefined,
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
    const marketplaceParams = filterValues.marketplaceId ? {marketplaceId: filterValues.marketplaceId} : undefined;

    let namesPromise;
    switch(mode) {
      case "owned":
        namesPromise = rootStore.walletClient.UserItemNames({marketplaceParams, userAddress: filterValues.userAddress});
        break;

      case "sales":
        namesPromise = rootStore.walletClient.SalesNames({marketplaceParams});
        break;

      default:
        namesPromise = rootStore.walletClient.ListingNames({marketplaceParams});
        break;
    }

    namesPromise
      .then(names => setFilterOptions(names.map(name => (name || "").trim()).sort()))
      .finally(() => setFilterOptionsLoaded(true));

    setAttributes([]);
    setDropAttributes([]);
    setRarityAttributes([]);

    if(mode === "listings") {
      rootStore.walletClient.ListingAttributes({marketplaceParams: filterValues.marketplaceId ? {marketplaceId: filterValues.marketplaceId} : undefined})
        .then(attributes => {
          attributes = (attributes || [])
            .sort((a, b) => a.name < b.name ? -1 : 1);

          setAttributes(attributes.filter(attr => !["rarity", "drop", "drop event"].includes(attr?.name?.toLowerCase())));
          setDropAttributes(attributes.filter(attr => ["drop", "drop event"].includes(attr?.name?.toLowerCase())));
          setRarityAttributes(attributes.filter(attr => ["rarity"].includes(attr?.name?.toLowerCase())));
        });
    }
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
        <AutoComplete
          className="filters__search"
          key={`autocomplete-${filterOptionsLoaded}-${savedOptionsLoaded}-${renderIndex}`}
          placeholder={rootStore.l10n.filters.filter_placeholder}
          value={filterValues.filter}
          onChange={value => setFilterValues({...filterValues, filter: value, editionFilters: []})}
          onEnterPressed={async () => await Update(true)}
          options={filterOptions}
        />
        <ButtonWithLoader onClick={async () => await Update(true)} className="filters__search-button">
          <ImageIcon icon={FilterIcon} label={rootStore.l10n.filters.search} />
        </ButtonWithLoader>
        <div className="filters__search-border" />
      </div>
      <div className="filters__controls">
        <FilterSelect
          className="filters__select-container--main"
          label="Sort By"
          optionLabelPrefix={`${rootStore.l10n.filters.sort.sort}: `}
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
              rarityAttributes={rarityAttributes}
              setFilterValues={setFilterValues}
              Hide={() => setShowFilterMenu(false)}
              ResetFilters={ResetFilters}
            /> : null }
      </div>
    </div>
  );
});

export default ListingFilters;
