import MediaCollectionStyles from "Assets/stylesheets/media_properties/property-media-collection.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useHistory, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import {PageBackground, PageContainer, PageHeader} from "Components/properties/Common";
import MediaCard from "Components/properties/MediaCards";
import {Select} from "Components/common/UIComponents";
import {LoginGate} from "Components/common/LoginGate";

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
        .map(mediaList => ({
          ...mediaList,
          permissions: mediaPropertyStore.ResolvePermission({
            ...match.params,
            mediaListSlugOrId: mediaList.id,
            sectionSlugOrId: match.params.sectionSlugOrId || navContext
          })
        }))
        .filter(mediaItem => !mediaItem.permissions?.hide)
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
              <div
                key={`media-list-${mediaList.id}`}
                className={S(
                  "media-collection__list-select-option",
                  mediaList.id === activeListId ? "media-collection__list-select-option--active" : "",
                  mediaList.permissions?.disable ? "media-collection__list-select-option--disabled" : ""
                )}
              >
                <div className={S("media-collection__list-select-title")}>
                  { mediaList.title }
                </div>
                <div className={S("media-collection__list-select-subtitle")}>
                  { mediaList.subtitle }
                </div>
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
            className={S("media-collection__list", mediaList.id === activeListId ? "media-collection__list--active" : "", mediaList.permissions?.disable ? "media-collection__list--disabled" : "")}
          >
            <div className={S("media-collection__list-title")}>
              { mediaList.title }
            </div>
            <div className={S("media-collection__list-subtitle")}>
              { mediaList.subtitle }
            </div>
          </Link>
        )
      }
    </div>
  );
});

const MediaCollectionMedia = observer(({mediaListId, navContext}) => {
  const match = useRouteMatch();
  const [media, setMedia] = useState([]);
  const [aspectRatio, setAspectRatio] = useState("");

  useEffect(() => {
    const mediaList = mediaPropertyStore.MediaPropertyMediaItem({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      mediaItemSlugOrId: mediaListId
    });

    if(!mediaList) { return; }

    setAspectRatio(mediaList.preferred_aspect_ratio);

    setMedia(
      (mediaList?.media || [])
        .map(mediaItemId =>
          mediaPropertyStore.MediaPropertyMediaItem({
            mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
            mediaItemSlugOrId: mediaItemId
          })
        )
        .filter(mediaItem => mediaItem)
        .map(mediaItem => ({
          ...mediaItem,
          permissions: mediaPropertyStore.ResolvePermission({
            ...match.params,
            mediaItemSlugOrId: mediaItem.id,
            sectionSlugOrId: match.params.sectionSlugOrId || navContext
          })
        }))
        .filter(mediaItem => !mediaItem.permissions?.hide)
    );
  }, [match.params.mediaCollectionSlugOrId]);

  return (
    <div className={S("media-collection__media-container")}>
      {
        (media || []).map(mediaItem =>
          <MediaCard
            aspectRatio={aspectRatio}
            disabled={mediaItem.permissions?.disable}
            format="horizontal"
            key={`media-item-${mediaItem.id}`}
            mediaItem={mediaItem}
            textDisplay="titles"
            navContext={navContext}
            params={{mediaListSlugOrId: mediaListId}}
            className={S("media-collection__media-card")}
          />
        )
      }
    </div>
  );
});

const MediaPropertyCollectionPage = observer(() => {
  const url = new URL(window.location.href);
  const history = useHistory();

  const match = useRouteMatch();
  const [activeListId, setActiveListId] = useState(url.searchParams.get("l"));

  const mediaCollection = mediaPropertyStore.MediaPropertyMediaItem({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    mediaItemSlugOrId: match.params.mediaCollectionSlugOrId
  });

  const navContext = new URLSearchParams(location.search).get("ctx");

  useEffect(() => {
    if(!activeListId) {
      const listId = mediaCollection?.media_lists?.[0];
      if(listId) {
        setActiveListId(listId);
        const url = new URL(window.location.href);
        url.searchParams.set("l", listId);
        history.replace(url.pathname + url.search);
      }
    }
  }, [mediaCollection, activeListId]);

  const permissions = mediaPropertyStore.ResolvePermission({
    ...match.params,
  });

  if(!mediaCollection) {
    return <Redirect to={rootStore.backPath} />;
  }

  return (
    <PageContainer className={S("media-collection__page-container")}>
      <PageBackground display={mediaCollection} />
      <PageHeader display={mediaCollection} className={S("media-collection__page-header")} />
      <LoginGate backPath={rootStore.backPath} Condition={() => !permissions.authorized}>
        <div className={S("media-collection__content")}>
          <MediaCollectionLists mediaCollection={mediaCollection} activeListId={activeListId} setActiveListId={setActiveListId} navContext={navContext} />
          <MediaCollectionMedia mediaListId={activeListId} key={`media-${activeListId}`} navContext={navContext} />
        </div>
      </LoginGate>
    </PageContainer>
  );
});

export default MediaPropertyCollectionPage;
