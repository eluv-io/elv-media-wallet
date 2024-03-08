import {makeAutoObservable, flow} from "mobx";

class MediaPropertyStore {
  mediaProperties = {};
  media = {};
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

  MediaProperty({mediaPropertySlugOrId}) {
    return this.mediaProperties[mediaPropertySlugOrId];
  }

  ResolveSectionItem(sectionItem) {
    // If section item should use media
    let mediaItem;
    if(sectionItem.type === "media") {
      mediaItem = this.media[sectionItem.media_id];
    }

    return {
      ...sectionItem,
      mediaItem,
      display: {
        ...((sectionItem.use_media_settings && mediaItem) || sectionItem.display)
      }
    };
  }

  MediaPropertySectionContent = flow(function * ({mediaPropertyId, sectionId}) {
    const mediaProperty = this.mediaProperties[mediaPropertyId];

    if(!mediaProperty) { return []; }

    const section = mediaProperty.metadata.sections[sectionId];

    if(!section) { return []; }


    if(section.type === "manual") {
      // Manual Section
      return (
        section.content.map(sectionItem => {
          if(!sectionItem.expand || sectionItem.type !== "media") {
            return this.ResolveSectionItem(sectionItem);
          }

          // Expanded collection or list
          const mediaItem = this.media[sectionItem.media_id];

          if(!mediaItem) { return; }

          return (
            (mediaItem.type === "collection" ? mediaItem.media_lists : mediaItem.media).map(subMediaItemId =>
              this.ResolveSectionItem({
                isExpandedMediaItem: true,
                expand: false,
                id: subMediaItemId,
                media_id: subMediaItemId,
                media_type: mediaItem.type === "collection" ? "list" : "media",
                type: "media",
                use_media_settings: true,
                display: {}
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
      mediaProperty.metadata.media_catalogs || [];

    return (
      yield this.FilteredMedia({mediaCatalogIds, select: section.select})
    )
      .sort((a, b) => a.catalog_title < b.catalog_title ? -1 : 1);
  });

  FilteredMedia = flow(function * ({mediaCatalogIds=[], select}) {
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

      return true;
    })
      .map(mediaItem =>
        this.ResolveSectionItem({
          isAutomaticContent: true,
          expand: false,
          id: mediaItem.id,
          media_id: mediaItem.id,
          media_type: mediaItem.type === "collection" ? "list" : "media",
          type: "media",
          use_media_settings: true,
          display: {}
        })
      )
      .sort((a, b) => a.display.catalog_title > b.display.catalog_title ? -1 : 1);
  });

  LoadMediaProperty = flow(function * ({mediaPropertySlugOrId, force=false}) {
    const mediaPropertyId = mediaPropertySlugOrId;
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
