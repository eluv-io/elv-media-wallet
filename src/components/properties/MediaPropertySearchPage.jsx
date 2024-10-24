import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {useHistory, useRouteMatch} from "react-router-dom";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";
import SearchStyles from "Assets/stylesheets/media_properties/property-search.module.scss";

import {
  PageContainer
} from "Components/properties/Common";
import {SectionResultsGroup} from "Components/properties/MediaPropertySection";
import Filters from "Components/properties/Filters";
import {PageLoader} from "Components/common/Loaders";

const S = (...classes) => classes.map(c => SearchStyles[c] || PageStyles[c] || SectionStyles[c] || "").join(" ");

const MediaPropertySearchPage = observer(() => {
  const [searchResults, setSearchResults] = useState(undefined);
  const history = useHistory();
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const query = mediaPropertyStore.searchOptions.query;

  useEffect(() => {
    const params = new URLSearchParams(window.location.query);
    params.set("q", mediaPropertyStore.searchOptions.query);
    history.replace(location.pathname + "?" + params.toString());
  }, [mediaPropertyStore.searchOptions.query]);

  useEffect(() => {
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => setSearchResults(mediaPropertyStore.GroupContent({content: results, groupBy: mediaProperty?.metadata?.search?.group_by})));
  }, [query, JSON.stringify(mediaPropertyStore.searchOptions)]);


  if(!searchResults) {
    return <PageLoader className={S("search__loader")} />;
  }

  let groups = Object.keys(searchResults || {}).filter(attr => attr !== "__other");
  if(mediaProperty?.metadata?.search?.group_by === "__date") {
    groups = groups.sort();
  }

  return (
    <PageContainer className={S("search")}>
      <div className={S("search__filters")}>
        <Filters
          filterSettings={mediaProperty.metadata.search}
          activeFilters={mediaPropertyStore.searchOptions}
          SetActiveFilters={filters => {
            Object.keys(filters).forEach(field =>
              mediaPropertyStore.SetSearchOption({field, value: filters[field]})
            );
          }}
        />
      </div>
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
