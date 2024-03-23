import MediaCollectionStyles from "Assets/stylesheets/media_properties/property-media-collection.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore} from "Stores";
import UrlJoin from "url-join";
import {PageBackground, PageContainer, PageHeader, ScaledText} from "Components/properties/Common";
import {MediaCardHorizontal} from "Components/properties/MediaCards";
import {Select} from "Components/common/UIComponents";

const S = (...classes) => classes.map(c => MediaCollectionStyles[c] || "").join(" ");

const MediaCollectionLists = observer(({mediaCollection, activeListId, setActiveListId, navContext}) => {
  const match = useRouteMatch();
  const [mediaLists, setMediaLists] = useState([]);

  useEffect(() => {
    setMediaLists(
      (mediaCollection.media_lists || [])
        .map(mediaListId =>
          mediaPropertyStore.MediaPropertyMediaItem({
            mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
            mediaItemSlugOrId: mediaListId
          })
        )
        .filter(list => list)
    );
  }, [match.params.mediaCollectionSlugOrId]);

  if(mediaPropertyStore.rootStore.pageWidth < 1000) {
    return (
      <div className={S("media-collection__list-container-mobile")}>
        <Select
          containerClassName={S("media-collection__list-select")}
          options={(mediaLists || []).map(mediaList =>
            [
              mediaList.id,
              <div className={S("media-collection__list-select-option", mediaList.id === activeListId ? "media-collection__list-select-option--active" : "")}>
                <ScaledText maxPx={16} minPx={12} className={S("media-collection__list-select-title")}>
                  { mediaList.title }
                </ScaledText>
                <ScaledText maxPx={11} minPx={10} className={S("media-collection__list-select-subtitle")}>
                  { mediaList.subtitle }
                </ScaledText>
              </div>,
              mediaList.title
            ]
          )}
          value={activeListId}
          onChange={value => setActiveListId(value)}
        />
      </div>
    );
  }

  return (
    <div className={S("media-collection__list-container")}>
      {
        (mediaLists || []).map(mediaList =>
          <Link
            to={match.url + `?l=${mediaList.id}${navContext ? `&ctx=${navContext}` : ""}`}
            onClick={() => setActiveListId(mediaList.id)}
            key={`media-list-${mediaList.id}`}
            className={S("media-collection__list", mediaList.id === activeListId ? "media-collection__list--active" : "")}
          >
            <ScaledText maxPx={18} minPx={12} className={S("media-collection__list-title")}>
              { mediaList.title }
            </ScaledText>
            <ScaledText maxPx={12} minPx={12} className={S("media-collection__list-subtitle")}>
              { mediaList.subtitle }
            </ScaledText>
          </Link>
        )
      }
    </div>
  );
});

const MediaCollectionMedia = observer(({mediaListId, navContext}) => {
  const match = useRouteMatch();
  const [media, setMedia] = useState([]);

  useEffect(() => {
    const mediaList = mediaPropertyStore.MediaPropertyMediaItem({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      mediaItemSlugOrId: mediaListId
    });

    setMedia(
      (mediaList?.media || [])
        .map(mediaItemId =>
          mediaPropertyStore.MediaPropertyMediaItem({
            mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
            mediaItemSlugOrId: mediaItemId
          })
        )
        .filter(mediaItem => mediaItem)
    );
  }, [match.params.mediaCollectionSlugOrId]);

  return (
    <div className={S("media-collection__media-container")}>
      {
        (media || []).map(mediaItem =>
          <MediaCardHorizontal
            key={`media-item-${mediaItem.id}`}
            mediaItem={mediaItem}
            textDisplay="titles"
            navContext={navContext}
            className={S("media-collection__media-card")}
          />
        )
      }
    </div>
  );
});

const MediaPropertyCollectionPage = observer(() => {
  const url = new URL(window.location.href);

  const match = useRouteMatch();
  const [activeListId, setActiveListId] = useState(url.searchParams.get("l"));

  const mediaCollection = mediaPropertyStore.MediaPropertyMediaItem({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    mediaItemSlugOrId: match.params.mediaCollectionSlugOrId
  });

  const section = mediaPropertyStore.MediaPropertySection(match.params);

  const navContext = new URLSearchParams(location.search).get("ctx");
  const backPath = navContext === "s" && match.params.sectionSlugOrId ?
    UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.pageSlugOrId || "", "s", match.params.sectionSlugOrId) :
    UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.pageSlugOrId || "", section ? `?ctx=${section.sectionId || section.id}` : "");

  useEffect(() => {
    if(!activeListId) {
      setActiveListId(mediaCollection?.media_lists?.[0]);
    }
  }, [mediaCollection, activeListId]);

  if(!mediaCollection) {
    return <Redirect to={backPath} />;
  }

  return (
    <PageContainer backPath={backPath} className={S("media-collection__page-container")}>
      <PageBackground display={mediaCollection} />
      <PageHeader display={mediaCollection} className={S("media-collection__page-header")} />
      <div className={S("media-collection__content")}>
        <MediaCollectionLists mediaCollection={mediaCollection} activeListId={activeListId} setActiveListId={setActiveListId} navContext={navContext} />
        <MediaCollectionMedia mediaListId={activeListId} key={`media-${activeListId}`} navContext={navContext} />
      </div>
    </PageContainer>
  );
});

export default MediaPropertyCollectionPage;
