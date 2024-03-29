import {makeAutoObservable, flow} from "mobx";
import MiniSearch from "minisearch";

class MediaPropertyStore {
  mediaProperties = {};
  media = {};
  searchIndexes = {};
  tags = [];

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;
    this.Log = this.rootStore.Log;

    this.loadedMediaCatalogs = {};
  }

  get appId() {
    return this.rootStore.appId;
  }

  get client() {
    return this.rootStore.client;
  }

  get walletClient() {
    return this.rootStore.walletClient;
  }

  async SearchMedia({mediaPropertySlugOrId, query}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});

    if(!mediaProperty) {
      return [];
    }

    const mediaPropertyId = mediaProperty.mediaPropertyId;

    let suggestions = this.searchIndexes[mediaPropertyId].autoSuggest(query);
    if(suggestions.length === 0) {
      suggestions = [{suggestion: query}];
    }

    let results = suggestions
      .map(({suggestion}) => this.searchIndexes[mediaPropertyId].search(suggestion))
      .flat()
      .filter((value, index, array) => array.findIndex(({id}) => id === value.id) === index);


    results = results.sort((a, b) => {
      const diff = a.score - b.score;

      // Sort by score
      if(Math.abs(diff) > 0.25) {
        return diff > 0 ? -1 : 1;
      // Approximately same score, prioritize collections/lists
      } else if(a.category !== b.category) {
        if(a.category === "collection") {
          return -1;
        } else if(b.category === "collection") {
          return 1;
        } else if(a.category === "list") {
          return -1;
        }

        return 1;
      // Sort by catalog title
      } else {
        return a.catalog_title > b.catalog_title ? 1 : -1;
      }
    });

    return results;
  }

  MediaProperty({mediaPropertySlugOrId}) {
    return this.mediaProperties[mediaPropertySlugOrId];
  }

  MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId="main"}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});

    const pageId = mediaProperty.metadata.slug_map.pages[pageSlugOrId]?.page_id || pageSlugOrId;

    return mediaProperty.metadata.pages[pageId];
  }

  MediaPropertySection({mediaPropertySlugOrId, sectionSlugOrId, mediaListSlugOrId}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});
    const sectionId = mediaProperty.metadata.slug_map.sections[sectionSlugOrId]?.section_id || sectionSlugOrId;

    if(!mediaListSlugOrId) {
      return mediaProperty.metadata.sections[sectionId];
    } else {
      // Media list specified - treat as section with expanded list
      // TODO: Look up list by slug
      const mediaListId = mediaListSlugOrId;
      const mediaList = this.media[mediaListId];

      if(!mediaList) { return; }

      return {
        sectionId,
        mediaListId,
        mediaPropertyId: mediaProperty.mediaPropertyId,
        id: mediaListId,
        isMediaList: true,
        label: `Media List ${mediaList.label} as Section`,
        type: "manual",
        display: {
          content_display_text: "titles",
          display_format: "grid",
          ...mediaList
        },
        content: [{
          label: `Media List ${mediaList.label}`,
          type: "media",
          media_id: mediaListId,
          media_type: "list",
          expand: true,
          use_media_settings: true,
          display: {}
        }]
      };
    }
  }

  MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId}) {
    // TODO: Media slugs
    return this.media[mediaItemSlugOrId];
  }

  ResolveSectionItem({sectionId, sectionItem}) {
    // If section item should use media
    let mediaItem;
    if(sectionItem.type === "media") {
      mediaItem = this.media[sectionItem.media_id];
    }

    return {
      ...sectionItem,
      sectionId,
      mediaItem,
      display: {
        ...((sectionItem.use_media_settings && mediaItem) || sectionItem.display)
      }
    };
  }

  MediaPropertySectionContent = flow(function * ({mediaPropertySlugOrId, sectionSlugOrId, mediaListSlugOrId}) {
    const section = this.MediaPropertySection({mediaPropertySlugOrId, sectionSlugOrId, mediaListSlugOrId});

    if(!section) { return []; }

    if(section.type === "manual") {
      // Manual Section
      return (
        section.content.map(sectionItem => {
          if(!sectionItem.expand || sectionItem.type !== "media") {
            return this.ResolveSectionItem({sectionId: section.id, sectionItem});
          }

          // Expanded collection or list
          const mediaItem = this.media[sectionItem.media_id];

          if(!mediaItem) { return; }

          return (
            (mediaItem.type === "collection" ? mediaItem.media_lists : mediaItem.media).map(subMediaItemId =>
              this.ResolveSectionItem({
                sectionId: section.id,
                sectionItem: {
                  isExpandedMediaItem: true,
                  expand: false,
                  id: subMediaItemId,
                  media_id: subMediaItemId,
                  media_type: mediaItem.type === "collection" ? "list" : "media",
                  type: "media",
                  use_media_settings: true,
                  display: {}
                }
              })
            )
          );
        })
          .flat()
          .filter(sectionItem => sectionItem)
      );
    }

    // Automatic filter
    let mediaCatalogIds = section.select.media_catalog ?
      [ section.select.media_catalog ] :
      this.MediaProperty({mediaPropertySlugOrId})?.metadata?.media_catalogs || [];

    return (
      yield this.FilteredMedia({sectionId: section.id, mediaCatalogIds, select: section.select})
    )
      .sort((a, b) => a.catalog_title < b.catalog_title ? -1 : 1);
  });

  FilteredMedia = flow(function * ({sectionId, mediaCatalogIds=[], select}) {
    const now = new Date();
    return Object.values(this.media).filter(mediaItem => {
      // Media catalog
      if(mediaCatalogIds.length > 0 && !mediaCatalogIds.includes(mediaItem.media_catalog_id)) {
        return false;
      }

      // Content type
      if(select.content_type && select.content_type !== mediaItem.type) {
        return false;
      }

      // Media type
      if(select.content_type === "media" && select.media_types?.length > 0 && !select.media_types.includes(mediaItem.media_type)) {
        return false;
      }

      // Schedule filter
      // Only videos can be filtered by schedule
      if(
        select.schedule &&
        select.content_type === "media" &&
        (select.media_types.length === 0 || (select.media_types.length === 1 && select.media_types[0] === "Video"))
      ) {
        if(!mediaItem.live_video || mediaItem.media_type !== "Video" || !mediaItem.start_time) {
          return false;
        }

        const startTime = new Date(mediaItem.start_time);
        const endTime = mediaItem.end_time && new Date(mediaItem.end_time);

        const started = startTime < now;
        const ended = endTime < now;
        const afterStartLimit = !select.start_time || new Date(select.start_time) < startTime;
        const beforeEndLimit = !select.end_time || new Date(select.end_time) > startTime;

        switch(select.schedule) {
          case "live":
            if(!started || ended) { return false; }

            break;

          case "upcoming":
            if(started || !beforeEndLimit) { return false; }

            break;

          case "past":
            if(!ended || !afterStartLimit) { return false; }

            break;

          case "period":
            if(!afterStartLimit || !!beforeEndLimit) { return false; }

            break;
        }
      }

      // Tags
      if(select.tags?.length > 0 && select.tags.find(tag => !mediaItem.tags.includes(tag))) {
        return false;
      }

      // Attributes
      for(const attributeId of (select.attributes || [])) {
        if(!mediaItem?.attributes?.[attributeId]?.includes(select.attribute_values[attributeId])) {
          return false;
        }
      }

      return true;
    })
      .map(mediaItem =>
        this.ResolveSectionItem({
          sectionId,
          sectionItem: {
            isAutomaticContent: true,
            expand: false,
            id: mediaItem.id,
            media_id: mediaItem.id,
            media_type: mediaItem.type === "collection" ? "list" : "media",
            type: "media",
            use_media_settings: true,
            display: {}
          }
        })
      )
      .sort((a, b) => a.display.catalog_title > b.display.catalog_title ? -1 : 1);
  });

  LoadMediaProperty = flow(function * ({mediaPropertySlugOrId, force=false}) {
    const mediaPropertyId = this.MediaProperty({mediaPropertySlugOrId})?.mediaPropertyId || mediaPropertySlugOrId;
    if(!this.mediaProperties[mediaPropertyId] || force) {
      const versionHash = yield this.client.LatestVersionHash({objectId: mediaPropertyId});
      const metadata = yield this.client.ContentObjectMetadata({
        versionHash,
        metadataSubtree: "/public/asset_metadata/info",
        produceLinkUrls: true
      });

      yield Promise.all(
        (metadata.media_catalogs || []).map(async mediaCatalogId =>
          await this.LoadMediaCatalog({mediaCatalogId})
        )
      );

      const indexableMedia = Object.values(this.media)
        .filter(mediaItem => metadata.media_catalogs.includes(mediaItem.media_catalog_id))
        .map(mediaItem => ({
          id: mediaItem.id,
          title: mediaItem.title || "",
          catalog_title: mediaItem.catalog_title || "",
          category: mediaItem.type
        }));

      const searchIndex = new MiniSearch({
        fields: ["title", "catalog_title"],
        storeFields: ["id", "title", "catalog_title", "category"]
      });
      searchIndex.addAll(indexableMedia);

      this.searchIndexes[mediaPropertyId] = searchIndex;


      // Start loading associated marketplaces but don't block on it
      (metadata.associated_marketplaces || []).map(({marketplace_id}) =>
        this.rootStore.LoadMarketplace(marketplace_id)
      );

      this.mediaProperties[mediaPropertyId] = {
        mediaPropertyHash: versionHash,
        mediaPropertyId: mediaPropertyId,
        mediaPropertySlug: metadata.slug,
        metadata
      };
    }

    return this.mediaProperties[mediaPropertyId];
  });

  LoadMediaCatalog = flow(function * ({mediaCatalogId, force}) {
    if(this.loadedMediaCatalogs[mediaCatalogId] && !force) {
      return;
    }

    const versionHash = yield this.client.LatestVersionHash({objectId: mediaCatalogId});
    const metadata = yield this.client.ContentObjectMetadata({
      versionHash,
      metadataSubtree: "/public/asset_metadata/info",
      select: [
        "media",
        "media_collections",
        "media_lists",
        "tags"
      ],
      produceLinkUrls: true
    });

    this.media = {
      ...this.media,
      ...(metadata.media || {}),
      ...(metadata.media_lists || {}),
      ...(metadata.media_collections || {}),
    };

    this.tags = [
      ...this.tags,
      ...(metadata.tags || [])
    ].sort();

    this.loadedMediaCatalogs[mediaCatalogId] = true;
  });
}

export default MediaPropertyStore;
