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

const MediaPropertySearchPage = observer(() => {
  const [searchResults, setSearchResults] = useState(undefined);
  const history = useHistory();
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const query = mediaPropertyStore.searchOptions.query;
  let {
    primary_filter,
    filter_options,
    group_by
  } = mediaProperty?.metadata?.search || {};

  let secondary_filter;
  if(filter_options?.length > 0) {
    const selectedPrimaryValue = primary_filter === "__media-type" ?
      mediaPropertyStore.searchOptions.mediaType :
      mediaPropertyStore.searchOptions.attributes[primary_filter];
    secondary_filter = filter_options
      .find(({primary_filter_value}) =>
        primary_filter_value === selectedPrimaryValue ||
        (!primary_filter_value && !selectedPrimaryValue)
      )?.secondary_filter_attribute;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.query);
    params.set("q", mediaPropertyStore.searchOptions.query);
    history.replace(location.pathname + "?" + params.toString());
  }, [mediaPropertyStore.searchOptions.query]);

  useEffect(() => {
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => setSearchResults(mediaPropertyStore.GroupContent({content: results, groupBy: group_by})));
  }, [query, JSON.stringify(mediaPropertyStore.searchOptions)]);

  if(!searchResults) {
    return null;
  }

  let groups = Object.keys(searchResults || {}).filter(attr => attr !== "__other");
  if(group_by === "__date") {
    groups = groups.sort();
  }

  return (
    <PageContainer className={S("search")}>
      {
        !primary_filter ? null :
          <AttributeFilter
            filterOptions={filter_options}
            attributeKey={primary_filter}
            variant="primary"
            options={mediaPropertyStore.searchOptions}
            setOption={args => mediaPropertyStore.SetSearchOption(args)}
          />
      }
      {
        !secondary_filter ? null :
          <AttributeFilter
            attributeKey={secondary_filter}
            variant="secondary"
            options={mediaPropertyStore.searchOptions}
            setOption={args => mediaPropertyStore.SetSearchOption(args)}
          />
      }
      <div key={`search-results-${JSON.stringify(mediaPropertyStore.searchOptions)}`} className={S("search__content")}>
        {
          groups.map(attribute =>
            <SectionResultsGroup
              key={`results-${attribute}`}
              groupBy={group_by}
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
