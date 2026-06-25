import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, mediaStore} from "Stores";
import {useRouteMatch} from "react-router-dom";

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

const MediaPropertyDefaultSearchPage = observer(() => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const query = new URLSearchParams(window.location.search).get("q") || mediaPropertyStore.searchOptions.query;

  useEffect(() => {
    mediaStore.ClearSearchResults();
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => mediaStore.SetSearchResults({query, mode: "default", ...results}));
  }, [query, JSON.stringify(mediaPropertyStore.searchOptions)]);

  if(!mediaStore.searchResults?.results) {
    return <PageLoader className={S("search__loader")} />;
  }

  return (
    <>
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
          mediaStore.searchResults.groups.map(attribute =>
            <SectionResultsGroup
              key={`results-${attribute}`}
              groupBy={mediaStore.searchResults.groupBy}
              label={Object.keys(mediaStore.searchResults.groupedResults || {}).length > 1 ? attribute : ""}
              results={mediaStore.searchResults.groupedResults[attribute]}
              navContext="search"
            />
          )
        }
        {
          !mediaStore.searchResults.groupedResults.__other ? null :
            <SectionResultsGroup
              label={Object.keys(mediaStore.searchResults.groupedResults || {}).length > 1 ? "Other" : ""}
              results={mediaStore.searchResults.groupedResults.__other}
              navContext="search"
            />
        }
      </div>
    </>
  );
});

const MediaPropertyAISearchPage = observer(() => {
  const match = useRouteMatch();
  const query = new URLSearchParams(window.location.search).get("q") || mediaPropertyStore.searchOptions.query;

  useEffect(() => {
    mediaStore.ClearSearchResults();
    mediaPropertyStore.ClipSearch({...match.params, query})
      .then(ids => mediaStore.SetSearchResults({query, aiSearchResultMediaIds: ids}));
  }, [query, JSON.stringify(mediaPropertyStore.searchOptions)]);

  if(!mediaStore.searchResults?.aiSearchResultMediaIds) {
    return <PageLoader className={S("search__loader")} />;
  }

  const searchResults = mediaStore.searchResults.aiSearchResultMediaIds
    .map(id => ({
      mediaItem: mediaPropertyStore.MediaPropertyMediaItem({mediaItemSlugOrId: id})
    }))
    .filter(({mediaItem}) => mediaItem.authorized);

  return (
    <div key={`search-results-${JSON.stringify(mediaPropertyStore.searchOptions)}`} className={S("search__content")}>
      <SectionResultsGroup
        label={`Search results for ${query}`}
        sort={false}
        results={searchResults}
        navContext="search"
      />
    </div>
  );
});

const MediaPropertySearchPage = observer(() => {
  let [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if(params.get("m") && params.get("m") !== mediaPropertyStore.searchMode) {
      mediaPropertyStore.ToggleAISearchMode(params.get("m"));
    }

    if(params.get("q")) {
      mediaPropertyStore.SetSearchOption({field: "query", value: params.get("q")});
    }

    setLoaded(true);
  }, []);

  if(!loaded) { return; }

  return (
    <PageContainer className={S("search")}>
      {
        mediaPropertyStore.searchMode === "clip" ?
          <MediaPropertyAISearchPage /> :
          <MediaPropertyDefaultSearchPage />
      }
    </PageContainer>
  );
});

export default MediaPropertySearchPage;
