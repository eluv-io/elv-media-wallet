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
import MediaCard from "Components/properties/MediaCards";
import {Swiper, SwiperSlide} from "swiper/react";

const S = (...classes) => classes.map(c => SearchStyles[c] || PageStyles[c] || SectionStyles[c] || "").join(" ");

const ResultsGroup = observer(({groupBy, label, results}) => {
  if(label && groupBy === "__date") {
    const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
    label = new Date(label).toLocaleDateString(currentLocale, { weekday:"long", year: "numeric", month: "long", day:"numeric"});
  }

  return (
    <div className={S("section", "section--page", "search__group")}>
      {
        !label ? null :
          <h2 className={S("search__title")}>
            { label }
          </h2>
      }
      <div className={S("section__content", "section__content--grid", "section__content--flex", "search__results")}>
        {
          results.map(result =>
            <MediaCard
              size="mixed"
              format="vertical"
              key={`search-result-${result.id}`}
              mediaItem={result.mediaItem}
              textDisplay="all"
            />
          )
        }
      </div>
    </div>
  );
});

const AttributeSelection = observer(({attributeKey, variant="primary"}) => {
  const match = useRouteMatch();

  const attributeOptions = attributeKey &&
  attributeKey === "__media-type" ?
    ["Video", "Gallery", "Image", "Ebook"] :
    mediaPropertyStore.GetMediaPropertyAttributes(match.params)[attributeKey]?.tags;

  if(!attributeKey || !attributeOptions || attributeOptions.length === 0) { return null; }

  const selected = attributeKey === "__media-type" ?
    (mediaPropertyStore.searchOptions.mediaType || "") :
    mediaPropertyStore.searchOptions.attributes[attributeKey] || "";

  return (
    <Swiper
      threshold={0}
      spaceBetween={variant === "primary" ? 30 : 10}
      observer
      observeParents
      slidesPerView="auto"
      className={S("search__attributes", `search__attributes--${variant}`)}
    >
      <SwiperSlide className={S("search__attribute-slide")}>
        <button
          onClick={() => {
            if(attributeKey === "__media-type") {
              mediaPropertyStore.SetSearchOption({field: "mediaType", value: null});
            } else {
              const updatedAttributes = {...(mediaPropertyStore.searchOptions.attributes || {})};
              delete updatedAttributes[attributeKey];
              mediaPropertyStore.SetSearchOption({field: "attributes", value: updatedAttributes});
            }
          }}
          className={S("search__attribute", `search__attribute--${variant}`, !selected ? "search__attribute--active" : "")}
        >
          All
        </button>
      </SwiperSlide>
      {
        attributeOptions.map(attribute =>
          <SwiperSlide key={`attribute-${attribute}`} className={S("search__attribute-slide")}>
            <button
              onClick={() => {
                if(attributeKey === "__media-type"){
                  mediaPropertyStore.SetSearchOption({field: "mediaType", value: attribute});
                } else {
                  mediaPropertyStore.SetSearchOption({
                    field: "attributes",
                    value: {...mediaPropertyStore.searchOptions.attributes, [attributeKey]: attribute}
                  });
                }
              }}
              className={S("search__attribute", `search__attribute--${variant}`, selected === attribute ? "search__attribute--active" : "")}
            >
              { attribute }
            </button>
          </SwiperSlide>
        )
      }
    </Swiper>
  );
});

const MediaPropertySearchPage = observer(() => {
  const [searchResults, setSearchResults] = useState(undefined);
  const history = useHistory();
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const query = mediaPropertyStore.searchOptions.query;
  let {
    primary_filter,
    secondary_filter,
    group_by
  } = mediaProperty?.metadata?.search || {};

  useEffect(() => {
    const params = new URLSearchParams(window.location.query);
    params.set("q", mediaPropertyStore.searchOptions.query);
    history.replace(location.pathname + "?" + params.toString());
  }, [mediaPropertyStore.searchOptions.query]);

  useEffect(() => {
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => {
        let groupedResults = {};

        results
          .forEach(result => {
            let categories;
            if(group_by === "__media-type") {
              categories = [result.mediaItem.media_type || "__other"];
            } else if(group_by === "__date") {
              categories = [result.mediaItem.canonical_date || "__other"];
            } else {
              categories = result.mediaItem.attributes?.[group_by];
            }

            if(!categories || !Array.isArray(categories)) {
              if(!groupedResults.__other) {
                groupedResults.__other = [];
              }

              groupedResults.__other.push(result);
            } else {
              categories.forEach(category => {
                if(!groupedResults[category]) {
                  groupedResults[category] = [];
                }

                groupedResults[category].push(result);
              });
            }
          });

        setSearchResults(groupedResults);
      });
  }, [query, JSON.stringify(mediaPropertyStore.searchOptions)]);

  if(!searchResults) {
    return null;
  }

  window.searchResults = searchResults;

  return (
    <PageContainer
      backPath={location.pathname.replace(/\/search$/, "")}
      className={S("search")}
    >
      {
        !primary_filter ? null :
          <AttributeSelection attributeKey={primary_filter} variant="primary"/>
      }
      {
        !secondary_filter ? null :
          <AttributeSelection attributeKey={secondary_filter} variant="secondary"/>
      }
      <div key={`search-results-${JSON.stringify(mediaPropertyStore.searchOptions)}`} className={S("search__content")}>
        {
          Object.keys(searchResults || {}).map(attribute => {
            if(attribute === "__other") { return null; }

            return (
              <ResultsGroup
                key={`results-${attribute}`}
                groupBy={group_by}
                label={Object.keys(searchResults).length > 1 ? attribute : ""}
                results={searchResults[attribute]}
              />
            );
          })
        }
        {
          !searchResults.__other ? null :
            <ResultsGroup
              label={Object.keys(searchResults || {}).length > 1 ? "Other" : ""}
              results={searchResults.__other}
            />
        }
      </div>
    </PageContainer>
  );
});

export default MediaPropertySearchPage;
