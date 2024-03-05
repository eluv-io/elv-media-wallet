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
