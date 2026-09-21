import StyledCardStyles from "@/assets/stylesheets/media_properties/styled-cards.module.scss";
import CardStyles from "@/assets/stylesheets/media_properties/media-cards.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "@/stores";
import {useRouteMatch} from "react-router-dom";
import {Carousel, LoaderImage} from "@/components/properties/Common";

const S = (...classes) => classes.map(c => StyledCardStyles[c] || CardStyles[c] || "").join(" ");

const AttributeFilterOption = observer(({
  value,
  image,
  imageHash,
  selected,
  attributeKey,
  dependentAttribute,
  level="primary",
  variant="text",
  activeFilters,
  SetActiveFilters,
}) => {
  const [imageLoaded, setImageLoaded] = useState(variant !== "image");
  const [imageAspectRatio, setImageAspectRatio] = useState("");

  const cardTheme = mediaPropertyStore.CardTheme({search: true, searchLevel: level}).cardTheme;

  const Select = () => {
    let newFilters = {};

    if(attributeKey === "__media-type") {
      // Media type + attribute
      newFilters.mediaType = value;

      if(dependentAttribute) {
        newFilters.attributes = {
          ...activeFilters.attributes,
          [dependentAttribute]: ""
        };
      }
    } else {
      // 2 Attributes
      if(dependentAttribute && dependentAttribute !== "__media-type") {
        newFilters = {
          attributes: {
            ...activeFilters.attributes,
            [attributeKey]: value,
            [dependentAttribute]: ""
          }
        };
      } else {
        // Attribute + media type
        newFilters.attributes = {...activeFilters.attributes, [attributeKey]: value};

        if(dependentAttribute === "__media-type") {
          newFilters.mediaType = "";
        }
      }
    }

    SetActiveFilters(newFilters);
  };

  if(variant === "text") {
    return (
      <button
        onClick={Select}
        className={S("attribute-filter__option", "attribute-filter__option--text", selected ? "attribute-filter__option--active" : "",)}
      >
        { value || "All" }
      </button>
    );
  } else if(variant === "box") {
    return (
      <button
        onClick={Select}
        className={S("attribute-filter__option", "attribute-filter__option--box", selected ? "attribute-filter__option--active" : "",)}
      >
        <div className={S("styled-card__image-container")}>
          {value || "All"}
        </div>
      </button>
    );
  }

  // Image
  return (
    <button
      style={{...(cardTheme?.css || {})}}
      onClick={Select}
      key={`attribute-${imageAspectRatio}`}
      className={
        S(...[
          "attribute-filter__option",
          imageLoaded ? "attribute-filter__option--loaded" : "attribute-filter__option--loading",
          "attribute-filter__option--image",
          selected ? "attribute-filter__option--active" : "",
          "styled-card",
          "styled-card--size-fixed",
          `styled-card--${imageAspectRatio}`,
          selected ? "styled-card--active" : "",
          ...(cardTheme?.variants || []).map(v => `styled-card--${v}`)
        ])
      }
    >
      <div className={S("styled-card__image-container", "attribute-filter__option-image-container")}>
        <LoaderImage
          hideLoader
          src={image?.url}
          hash={imageHash}
          loaderAspectRatio={1}
          preferHashRatio
          loaderHeight={level === "primary" ? 150 : 120}
          alt={value || "All"}
          title={value || "All"}
          lazy={false}
          width={300}
          onLoad={event => {
            setTimeout(() => setImageLoaded(true), 250);

            if(!event?.target?.naturalWidth || !event?.target?.naturalHeight) { return; }

            const ratio = event.target.naturalWidth / event.target.naturalHeight;

            if(ratio < 0.8) {
              setImageAspectRatio("portrait");
            } else if(ratio > 1.5) {
              setImageAspectRatio("landscape");
            } else {
              setImageAspectRatio("square");
            }
          }}
          className={S("styled-card__image")}
        />
      </div>
      <div className={S("attribute-filter__attribute-title")}>
        {value || "All"}
      </div>
    </button>
  );
});

export const AttributeFilter = observer(({
  attributeKey,
  filterOptions,
  dependentAttribute,
  variant="text",
  level="primary",
  centered=false,
  activeFilters,
  SetActiveFilters,
  className="",
  swiperOptions = {}
}) => {
  if(!attributeKey || !filterOptions || filterOptions.length === 0) {
    return null;
  }

  const selectedValue = attributeKey === "__media-type" ?
    (activeFilters?.mediaType || "") :
    activeFilters?.attributes[attributeKey] || "";

  return (
    <Carousel
      key={`filter-${level}-${variant}`}
      content={filterOptions}
      className={
        [
          S(
            "attribute-filter",
            centered ? "attribute-filter--centered" : "",
            `attribute-filter--${variant}`,
            `attribute-filter--${level}`
          ),
          className
        ].join(" ")
      }
      swiperOptions={{
        threshold: 0,
        spaceBetween: level === "primary" && !(variant === "box" || variant === "image") ? 30 : 15,
        slidesPerView: "auto",
        ...swiperOptions
      }}
      RenderSlide={({item}) =>
        <AttributeFilterOption
          value={item?.value}
          image={item?.image}
          imageHash={item?.imageHash}
          selected={selectedValue === item?.value}
          attributeKey={attributeKey}
          filterOptions={filterOptions}
          dependentAttribute={dependentAttribute}
          variant={variant}
          level={level}
          activeFilters={activeFilters}
          SetActiveFilters={SetActiveFilters}
        />
      }
    />
  );
});


const FormatFilterOptions = ({match, type="primary", filterSettings, activeFilters}) => {
  const selectedPrimaryValue = filterSettings.primary_filter === "__media-type" ?
    activeFilters.mediaType :
    activeFilters.attributes[filterSettings.primary_filter];

  if(type === "primary") {
    return {
      attributeKey: filterSettings.primary_filter,
      value: selectedPrimaryValue,
      variant: filterSettings.primary_filter_style || "box",
      filterOptions: filterSettings.filter_options?.map(option => ({
        value: option.primary_filter_value || "",
        image: option.primary_filter_image,
        imageHash: option.primary_filter_image_hash
      }))
    };
  }

  const selectedPrimaryOption = filterSettings.filter_options
    ?.find(({primary_filter_value}) =>
      primary_filter_value === selectedPrimaryValue ||
      (!primary_filter_value && !selectedPrimaryValue)
    );

  if(!selectedPrimaryOption) {
    return {};
  }

  const selectedSecondaryValue = selectedPrimaryOption.secondary_filter_attribute === "__media-type" ?
    activeFilters.mediaType :
    activeFilters.attributes[selectedPrimaryOption.secondary_filter_attribute];

  return {
    attributeKey: selectedPrimaryOption.secondary_filter_attribute,
    variant: selectedPrimaryOption.secondary_filter_style || "text",
    value: selectedSecondaryValue,
    filterOptions:
      selectedPrimaryOption.secondary_filter_options.length > 0 ?
        selectedPrimaryOption.secondary_filter_options?.map(option => ({
          value: option.secondary_filter_value || "",
          image: option.secondary_filter_image,
          imageHash: option.secondary_filter_image_hash
        })) :
        [
          "",
          ...(mediaPropertyStore.GetMediaPropertyAttributes(match.params)?.[selectedPrimaryOption.secondary_filter_attribute]?.tags || [])
        ].map(value => ({value}))
  };
};

let onChangeTimeout;
const Filters = observer(({
  filterSettings={},
  activeFilters={},
  initialPrimaryFilter="",
  initialSecondaryFilter="",
  primaryOnly,
  SetActiveFilters,
  centered=false,
  onChange,
  className=""
}) => {
  const match = useRouteMatch();
  const primaryFilterOptions = FormatFilterOptions({match, type: "primary", filterSettings, activeFilters});
  const secondaryFilterOptions = FormatFilterOptions({match, type: "secondary", filterSettings, activeFilters});

  const primaryFilterValue = primaryFilterOptions.attributeKey === "__media-type" ?
    activeFilters.mediaType : activeFilters.attributes?.[primaryFilterOptions.attributeKey];

  const secondaryFilterValue = secondaryFilterOptions.attributeKey === "__media-type" ?
    activeFilters.mediaType : activeFilters.attributes?.[secondaryFilterOptions.attributeKey];

  useEffect(() => {
    clearTimeout(onChangeTimeout);

    onChangeTimeout = setTimeout(() => onChange?.({primaryFilterValue, secondaryFilterValue}), 250);
  }, [primaryFilterValue, secondaryFilterValue]);

  useEffect(() => {
    // Already set
    if(!initialPrimaryFilter && activeFilters?.attributes?.[primaryFilterOptions.attributeKey]) { return; }

    // Set initial primary filter value
    if(
      initialPrimaryFilter ||
      (
        primaryFilterOptions?.filterOptions?.length > 0 &&
        !primaryFilterOptions.filterOptions.find(option => !option.value)
      )
    ) {
      if(primaryFilterOptions.attributeKey === "__media-type") {
        SetActiveFilters({mediaType: initialPrimaryFilter || primaryFilterOptions.filterOptions[0].value});
      } else {
        SetActiveFilters({
          attributes: {
            ...activeFilters.attributes,
            [primaryFilterOptions.attributeKey]: initialPrimaryFilter || primaryFilterOptions.filterOptions[0].value
          }
        });
      }}
  }, []);

  useEffect(() => {
    if(primaryOnly) { return; }

    // Set initial secondary filter value
    if(
      initialSecondaryFilter ||
      (
        secondaryFilterOptions?.filterOptions?.length > 0 &&
        !secondaryFilterOptions.filterOptions.find(option => !option.value)
      )
    ) {
      if(secondaryFilterOptions.attributeKey === "__media-type") {
        SetActiveFilters({mediaType: initialSecondaryFilter || secondaryFilterOptions.filterOptions[0].value});
      } else {
        SetActiveFilters({
          attributes: {
            ...mediaPropertyStore.searchOptions.attributes,
            [secondaryFilterOptions.attributeKey]: initialSecondaryFilter || secondaryFilterOptions.filterOptions[0].value
          }
        });
      }}
  }, [primaryFilterOptions.value]);

  useEffect(() => {
    onChange?.({
      primary: activeFilters[primaryFilterOptions.attributeKey],
      secondary: activeFilters[primaryFilterOptions.attributeKey]
    });
  }, [activeFilters[primaryFilterOptions.attributeKey], activeFilters[secondaryFilterOptions.attributeKey]]);

  return (
    <>
      <AttributeFilter
        {...primaryFilterOptions}
        centered={centered}
        level="primary"
        activeFilters={activeFilters}
        SetActiveFilters={SetActiveFilters}
        dependentAttribute={secondaryFilterOptions?.attributeKey}
        className={className}
      />
      {
        primaryOnly ? null :
          <AttributeFilter
            {...secondaryFilterOptions}
            centered={centered}
            key={`secondary-filter-${secondaryFilterOptions?.attributeKey}`}
            level="secondary"
            activeFilters={activeFilters}
            SetActiveFilters={SetActiveFilters}
            className={className}
          />
      }
    </>
  );
});

export default Filters;
