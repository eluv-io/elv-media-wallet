import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {useHistory, useRouteMatch} from "react-router-dom";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";
import SearchStyles from "Assets/stylesheets/media_properties/property-search.module.scss";

import {
  AttributeFilter,
  PageContainer
} from "Components/properties/Common";
import {SectionResultsGroup} from "Components/properties/MediaPropertySection";

const S = (...classes) => classes.map(c => SearchStyles[c] || PageStyles[c] || SectionStyles[c] || "").join(" ");

const FormatFilterOptions = ({match, type="primary", ...options}) => {
  const selectedPrimaryValue = options.primary_filter === "__media-type" ?
    mediaPropertyStore.searchOptions.mediaType :
    mediaPropertyStore.searchOptions.attributes[options.primary_filter];

  if(type === "primary") {
    return {
      attributeKey: options.primary_filter,
      value: selectedPrimaryValue,
      variant: options.primary_filter_style || "box",
      filterOptions: options.filter_options?.map(option => ({
        value: option.primary_filter_value || "",
        image: option.primary_filter_image,
      }))
    };
  }

  const selectedPrimaryOption = options.filter_options
    .find(({primary_filter_value}) =>
      primary_filter_value === selectedPrimaryValue ||
      (!primary_filter_value && !selectedPrimaryValue)
    );

  if(!selectedPrimaryOption) {
    return {};
  }

  return {
    attributeKey: selectedPrimaryOption.secondary_filter_attribute,
    variant: selectedPrimaryOption.secondary_filter_style || "text",
    filterOptions:
      selectedPrimaryOption.secondary_filter_spec === "manual" ?
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

const MediaPropertySearchPage = observer(() => {
  const [searchResults, setSearchResults] = useState(undefined);
  const history = useHistory();
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const query = mediaPropertyStore.searchOptions.query;

  const primaryFilterOptions = FormatFilterOptions({match, type: "primary", ...mediaProperty.metadata.search});
  const secondaryFilterOptions = FormatFilterOptions({match, type: "secondary", ...mediaProperty.metadata.search});

  useEffect(() => {
    const params = new URLSearchParams(window.location.query);
    params.set("q", mediaPropertyStore.searchOptions.query);
    history.replace(location.pathname + "?" + params.toString());
  }, [mediaPropertyStore.searchOptions.query]);

  useEffect(() => {
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => setSearchResults(mediaPropertyStore.GroupContent({content: results, groupBy: mediaProperty?.metadata?.search?.group_by})));
  }, [query, JSON.stringify(mediaPropertyStore.searchOptions)]);

  useEffect(() => {
    // Set initial primary filter value
    if(
      primaryFilterOptions?.filterOptions?.length > 0 &&
      !primaryFilterOptions.filterOptions.find(option => !option.value)
    ) {
      if(primaryFilterOptions.attributeKey === "__media-type") {
        mediaPropertyStore.SetSearchOption({field: "mediaType", value: primaryFilterOptions.filterOptions[0].value});
      } else {
        mediaPropertyStore.SetSearchOption({
          field: "attributes",
          value: {
            [primaryFilterOptions.attributeKey]: primaryFilterOptions.filterOptions[0].value
          }
        });
      }}
  }, []);

  useEffect(() => {
    // Set initial secondary filter value
    if(
      secondaryFilterOptions?.filterOptions?.length > 0 &&
      !secondaryFilterOptions.filterOptions.find(option => !option.value)
    ) {
      if(secondaryFilterOptions.attributeKey === "__media-type") {
        mediaPropertyStore.SetSearchOption({field: "mediaType", value: secondaryFilterOptions.filterOptions[0].value});

      } else {
        mediaPropertyStore.SetSearchOption({
          field: "attributes",
          value: {
            [secondaryFilterOptions.attributeKey]: secondaryFilterOptions.filterOptions[0].value
          }
        });
      }}
  }, [primaryFilterOptions.value]);

  if(!searchResults) {
    return null;
  }

  let groups = Object.keys(searchResults || {}).filter(attr => attr !== "__other");
  if(mediaProperty?.metadata?.search?.group_by === "__date") {
    groups = groups.sort();
  }

  return (
    <PageContainer className={S("search")}>
      <AttributeFilter
        {...primaryFilterOptions}
        options={mediaPropertyStore.searchOptions}
        setOption={args => mediaPropertyStore.SetSearchOption(args)}
        dependentAttribute={secondaryFilterOptions?.attributeKey}
      />
      <AttributeFilter
        {...secondaryFilterOptions}
        options={mediaPropertyStore.searchOptions}
        setOption={args => mediaPropertyStore.SetSearchOption(args)}
      />
      <div key={`search-results-${JSON.stringify(mediaPropertyStore.searchOptions)}`} className={S("search__content")}>
        {
          groups.map(attribute =>
            <SectionResultsGroup
              key={`results-${attribute}`}
              groupBy={mediaProperty?.metadata?.search?.group_by}
              label={Object.keys(searchResults).length > 1 ? attribute : ""}
              results={searchResults[attribute]}
              navContext="search"
            />
          )
        }
        {
          !searchResults.__other ? null :
            <SectionResultsGroup
              label={Object.keys(searchResults || {}).length > 1 ? "Other" : ""}
              results={searchResults.__other}
              navContext="search"
            />
        }
      </div>
    </PageContainer>
  );
});

export default MediaPropertySearchPage;
