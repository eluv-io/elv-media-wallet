import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {useRouteMatch} from "react-router-dom";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";
import SearchStyles from "Assets/stylesheets/media_properties/property-search.module.scss";

import {
  PageContainer
} from "Components/properties/Common";
import MediaCard from "Components/properties/MediaCards";
import {Swiper, SwiperSlide} from "swiper/react";

const S = (...classes) => classes.map(c => SearchStyles[c] || PageStyles[c] || SectionStyles[c] || "").join(" ");

const ResultsGroup = observer(({label, results}) => {
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
              textDisplay="title"
            />
          )
        }
      </div>
    </div>
  );
});

const PrimaryAttributeSelection = observer(({primaryAttributeOptions, attributeFilter, setAttributeFilter}) => {
  if(!primaryAttributeOptions || primaryAttributeOptions.length === 0) { return null; }

  return (
    <Swiper
      threshold={0}
      spaceBetween={10}
      observer
      observeParents
      slidesPerView="auto"
      className={S("search__primary-attributes")}
    >
      <SwiperSlide className={S("search__primary-attribute-slide")}>
        <button
          onClick={() => setAttributeFilter("")}
          className={S("search__primary-attribute", !attributeFilter ? "search__primary-attribute--active" : "")}
        >
          All
        </button>
      </SwiperSlide>
      {
        primaryAttributeOptions.map(attribute =>
          <SwiperSlide key={`attribute-${attribute}`} className={S("search__primary-attribute-slide")}>
            <button
              onClick={() => setAttributeFilter(attribute)}
              className={S("search__primary-attribute", attributeFilter === attribute ? "search__primary-attribute--active" : "")}
            >
              {attribute}
            </button>
          </SwiperSlide>
        )
      }
    </Swiper>
  );
});

const MediaPropertySearchPage = observer(() => {
  const [searchResults, setSearchResults] = useState(undefined);
  const [attributeFilter, setAttributeFilter] = useState(undefined);
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const query = new URLSearchParams(location.search).get("q") || "";
  const categoryAttribute = mediaProperty?.metadata?.search?.category_attribute;
  const primaryAttribute = mediaProperty?.metadata?.search?.primary_attribute;
  const primaryAttributeOptions = primaryAttribute &&
      primaryAttribute === "__media-type" ?
        ["Video", "Gallery", "Image", "Ebook"] :
        mediaPropertyStore.GetMediaPropertyAttributes(match.params)[primaryAttribute]?.tags;

  useEffect(() => {
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => {
        let groupedResults = {
          __other: []
        };

        results
          .map(result => {
            const mediaItem = mediaPropertyStore.media[result.id];

            if(!mediaItem) { return; }

            return {
              ...result,
              mediaItem
            };
          })
          .filter(result => {
            if(!result) { return false; }

            if(primaryAttribute && attributeFilter) {
              return primaryAttribute === "__media-type" ?
                result.mediaItem.media_type === attributeFilter :
                result.mediaItem.attributes?.[primaryAttribute]?.includes(attributeFilter);
            }

            return true;
          })
          .forEach(result => {
            const categories = categoryAttribute === "__media-type"?
              [result.mediaItem.media_type || ""] :
              result.mediaItem.attributes?.[categoryAttribute];

            if(!categories || !Array.isArray(categories)) {
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
  }, [query, attributeFilter]);

  if(!searchResults) {
    return null;
  }

  return (
    <PageContainer
      backPath={location.pathname.replace(/\/search$/, "")}
      className={S("search")}
    >
      <PrimaryAttributeSelection
        primaryAttributeOptions={primaryAttributeOptions}
        attributeFilter={attributeFilter}
        setAttributeFilter={setAttributeFilter}
      />
      <div key={`search-results-${query}`} className={S("search__content")}>
        {
          Object.keys(searchResults || {}).map(attribute => {
            if(attribute === "__other") { return null; }

            return (
              <ResultsGroup
                key={`results-${attribute}`}
                label={Object.keys(searchResults || {}).length > 1 && searchResults.__other.length > 0 ? attribute : ""}
                results={searchResults[attribute]}
              />
            );
          })
        }
        {
          searchResults.__other.length === 0 ? null :
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
