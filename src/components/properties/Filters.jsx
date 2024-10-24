import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {AttributeFilter} from "Components/properties/Common";

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
          image: option.secondary_filter_image
        })) :
        [
          "",
          ...(mediaPropertyStore.GetMediaPropertyAttributes(match.params)?.[selectedPrimaryOption.secondary_filter_attribute]?.tags || [])
        ].map(value => ({value}))
  };
};

const Filters = observer(({filterSettings={}, activeFilters={}, primaryOnly, SetActiveFilters, className=""}) => {
  const match = useRouteMatch();
  const primaryFilterOptions = FormatFilterOptions({match, type: "primary", filterSettings, activeFilters});
  const secondaryFilterOptions = FormatFilterOptions({match, type: "secondary", filterSettings, activeFilters});

  if(primaryOnly) {
    // Don't show box style for primary only
    primaryFilterOptions.variant = primaryFilterOptions.variant === "box" ? "text" : primaryFilterOptions.variant;
  }

  useEffect(() => {
    // Set initial primary filter value
    if(
      primaryFilterOptions?.filterOptions?.length > 0 &&
      !primaryFilterOptions.filterOptions.find(option => !option.value)
    ) {
      if(primaryFilterOptions.attributeKey === "__media-type") {
        SetActiveFilters({mediaType: primaryFilterOptions.filterOptions[0].value});
      } else {
        SetActiveFilters({
          attributes: {
            ...activeFilters.attributes,
            [primaryFilterOptions.attributeKey]: primaryFilterOptions.filterOptions[0].value
          }
        });
      }}
  }, []);

  useEffect(() => {
    if(primaryOnly) { return; }

    // Set initial secondary filter value
    if(
      secondaryFilterOptions?.filterOptions?.length > 0 &&
      !secondaryFilterOptions.filterOptions.find(option => !option.value)
    ) {
      if(secondaryFilterOptions.attributeKey === "__media-type") {
        SetActiveFilters({mediaType: secondaryFilterOptions.filterOptions[0].value});

      } else {
        SetActiveFilters({
          attributes: {
            ...mediaPropertyStore.searchOptions.attributes,
            [secondaryFilterOptions.attributeKey]: secondaryFilterOptions.filterOptions[0].value
          }
        });
      }}
  }, [primaryFilterOptions.value]);

  return (
    <>
      <AttributeFilter
        {...primaryFilterOptions}
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
            key={`secondary-filter-${primaryFilterOptions.value}`}
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
