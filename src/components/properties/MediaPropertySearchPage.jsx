import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";
import {
  PageContainer
} from "Components/properties/Common";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import {MediaCardVertical} from "Components/properties/MediaCards";
import {LocalizeString} from "Components/common/UIComponents";

const S = (...classes) => classes.map(c => PageStyles[c] || SectionStyles[c] || "").join(" ");

const MediaPropertySearchPage = observer(() => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const pageId = mediaProperty.metadata.slug_map.pages[(match.params.pageSlugOrId || "main")]?.page_id || match.params.pageSlugOrId;
  const page = mediaProperty.metadata.pages[pageId];
  const query = new URLSearchParams(location.search).get("q");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    mediaPropertyStore.SearchMedia({...match.params, query})
      .then(results => setSearchResults(results));
  }, [query]);

  if(!page || !query) {
    return <Redirect to={MediaPropertyBasePath(match.params)} />;
  }

  console.log(searchResults);

  return (
    <PageContainer
      backPath={location.pathname.replace(/\/search$/, "")}
      className={S("page__container")}
    >
      <h1 className={S("search__title")}>
        { LocalizeString(mediaPropertyStore.rootStore.l10n.media_properties.search.title, {query}) }
      </h1>
      <div className={S("section", "section--page")}>
        <div className={S("section__content", "section__content--grid")}>
          {
            searchResults.map(result => {
              const mediaItem = mediaPropertyStore.media[result.id];

              if(!mediaItem) { return null; }

              return (
                <MediaCardVertical
                  key={`search-result-${query}-${result.id}`}
                  mediaItem={mediaItem}
                  textDisplay="titles"
                />
              );
            })
          }
        </div>
      </div>
    </PageContainer>
  );
});

export default MediaPropertySearchPage;
