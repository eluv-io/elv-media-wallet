import {makeAutoObservable, flow, runInAction, toJS} from "mobx";
import MiniSearch from "minisearch";
import {MediaItemScheduleInfo} from "../utils/MediaPropertyUtils";

class MediaPropertyStore {
  mediaProperties = {};
  mediaCatalogs = {};
  media = {};
  permissionItems = {};
  searchIndexes = {};
  searchOptions = {
    query: new URLSearchParams(location.search).get("q") || "",
    attributes: {},
    tags: [],
    tagSelect: {},
    mediaType: undefined,
    startTime: undefined,
    endTime: undefined
  };
  tags = [];

  PERMISSION_BEHAVIORS = {
    HIDE: "hide",
    DISABLE: "disable",
    SHOW_PURCHASE: "show_purchase",
    SHOW_IF_UNAUTHORIZED: "show_if_unauthorized",
    SHOW_ALTERNATE_PAGE: "show_alternate_page"
  };

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;
    this.Log = this.rootStore.Log;
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

  GetMediaPropertyAttributes({mediaPropertySlugOrId}) {
    const associatedCatalogIds = this.MediaProperty({mediaPropertySlugOrId})?.metadata.media_catalogs || [];

    let attributes = {};
    associatedCatalogIds.map(mediaCatalogId =>
      Object.keys(this.mediaCatalogs[mediaCatalogId]?.attributes || {})
        .forEach(attributeId =>
          attributes[attributeId] = {
            ...this.mediaCatalogs[mediaCatalogId].attributes[attributeId]
          }
        )
    );

    return attributes;
  }

  SetSearchOption({field, value}) {
    this.searchOptions[field] = value;

    if(
      field === "startTime" &&
      this.searchOptions.endTime &&
      this.searchOptions.startTime > this.searchOptions.endTime
    ) {
      // Start time before end time
      this.searchOptions.endTime = new Date(this.searchOptions.startTime.getTime() + 24 * 60 * 60 * 1000);
    } else if(
      field === "endTime" &&
      this.searchOptions.startTime &&
      this.searchOptions.endTime < this.searchOptions.startTime
    ) {
      // End time before start time
      this.searchOptions.startTime = new Date(this.searchOptions.endTime.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  ClearSearchOptions() {
    this.searchOptions = {
      query: "",
      attributes: {},
      tags: [],
      tagSelect: {},
      mediaType: null,
      startTime: null,
      endTime: null
    };
  }

  async SearchMedia({mediaPropertySlugOrId, query}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});

    if(!mediaProperty) {
      return [];
    }

    const mediaPropertyId = mediaProperty.mediaPropertyId;

    let results;
    if(query) {
      let suggestions = this.searchIndexes[mediaPropertyId].autoSuggest(query);
      if(suggestions.length === 0) {
        suggestions = [{suggestion: query}];
      }

      // TODO: Integrate category attr
      results = suggestions
        .map(({suggestion}) => this.searchIndexes[mediaPropertyId].search(suggestion))
        .flat()
        .filter((value, index, array) => array.findIndex(({id}) => id === value.id) === index)
        .map(result => ({
          ...result,
          mediaItem: this.media[result.id]
        }));
    } else {
      // All content
      const associatedCatalogIds = mediaProperty.metadata.media_catalogs || [];
      results = Object.values(this.media)
        .filter(mediaItem =>
          (mediaItem.authorized || mediaItem.public) &&
          associatedCatalogIds.includes(mediaItem.media_catalog_id)
        )
        .map(mediaItem => ({
          id: mediaItem.id,
          catalog_title: mediaItem.catalog_title,
          title: mediaItem.title,
          score: 1.0,
          category: mediaItem.type,
          mediaItem
        }));
    }

    results = results.filter(({mediaItem}) => mediaItem?.authorized || mediaItem?.public);

    // Filter
    const hasDateFilter = !!(this.searchOptions.startTime || this.searchOptions.endTime);
    let select = {
      attributes: Object.keys(this.searchOptions.attributes).filter(key => !!this.searchOptions.attributes[key]),
      attribute_values: this.searchOptions.attributes,
      tags: [
        ...Object.values(this.searchOptions.tagSelect).filter(tag => tag)
      ],
      content_type: this.searchOptions.mediaType || hasDateFilter ? "media" : undefined,
      media_types: this.searchOptions.mediaType ? [this.searchOptions.mediaType] : (hasDateFilter ? ["Video"] : []) || [],
      schedule: hasDateFilter ? "period" : undefined,
      start_time: this.searchOptions.startTime,
      end_time: this.searchOptions.endTime ? new Date(this.searchOptions.endTime.getTime() + 24 * 60 * 60 * 1000) : undefined
    };

    results = await this.FilteredMedia({
      media: results,
      select
    });

    // Arbitrary tags filtered separately because they should be match any, not all
    if(this.searchOptions.tags.length > 0) {
      results = results.filter(result =>
        result.mediaItem.tags.find(tag => this.searchOptions.tags.includes(tag))
      );
    }

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

  GroupContent({content, groupBy, excludePast=true}) {
    const today = new Date().toISOString().split("T")[0];

    let groupedResults = {};
    content
      .filter(result => {
        if(groupBy !== "__date") { return true; }

        const {isLiveContent, ended} = MediaItemScheduleInfo(result.mediaItem);

        if(excludePast) {
          if(isLiveContent) {
            return !ended;
          } else if(result.mediaItem.canonical_date) {
            return today <= result.mediaItem.canonical_date;
          }
        }

        return true;
      })
      .forEach(result => {
        let categories;
        if(groupBy === "__media-type") {
          categories = [result.mediaItem.media_type || "__other"];
        } else if(groupBy === "__date") {
          categories = [result.mediaItem.canonical_date || "__other"];
        } else {
          categories = result.mediaItem.attributes?.[groupBy];
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

    return groupedResults;
  }

  MediaProperty({mediaPropertySlugOrId}) {
    return this.mediaProperties[mediaPropertySlugOrId];
  }

  MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId="main"}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});

    if(!mediaProperty) { return; }

    // Show alternate page if not authorized option
    if(mediaProperty.permissions?.showAlternatePage) {
      pageSlugOrId = mediaProperty.permissions.alternatePageId || pageSlugOrId;
    }

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

  MediaPropertySectionContent = flow(function * ({mediaPropertySlugOrId, pageSlugOrId, sectionSlugOrId, mediaListSlugOrId, filterOptions={}}) {
    const section = this.MediaPropertySection({mediaPropertySlugOrId, sectionSlugOrId, mediaListSlugOrId});

    if(!section) { return []; }

    let content;
    if(section.type === "automatic") {
      // Automatic filter
      let mediaCatalogIds = section.select.media_catalog ?
        [section.select.media_catalog] :
        this.MediaProperty({mediaPropertySlugOrId})?.metadata?.media_catalogs || [];

      let select = { ...toJS(section.select || {}) };

      Object.keys(filterOptions.attributes || {}).forEach(attributeKey => {
        select.attributes.push(attributeKey);
        select.attribute_values[attributeKey] = filterOptions.attributes[attributeKey];
      });

      select.attributes = select.attributes.filter(key => !!select.attribute_values[key]);

      select.media_types = filterOptions.mediaType ? [filterOptions.mediaType] : select.media_types;

      content = (
        yield this.FilteredMedia({
          media: Object.values(this.media),
          mediaCatalogIds,
          select
        })
      )
        .map(mediaItem =>
          this.ResolveSectionItem({
            sectionId: section.id,
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
        .sort((a, b) => {
          if(a.display.live_video && b.display.live_video) {
            // Sort live content by start time
            return a.display.start_time < b.display.start_time ? -1 : 1;
          } else {
            return (a.display.catalog_title || a.display.title) < (b.display.catalog_title || b.display.title) ? -1 : 1;
          }
        });
    } else {
      // Manual Section
      content = section.content;

      const hasActiveFilters = Object.keys(filterOptions.attributes).length > 0 || !!filterOptions.mediaType;
      if(hasActiveFilters) {
        let select = {
          attributes: [],
          attribute_values: {},
        };

        Object.keys(filterOptions.attributes || {}).forEach(attributeKey => {
          select.attributes.push(attributeKey);
          select.attribute_values[attributeKey] = filterOptions.attributes[attributeKey];
        });

        select.attributes = select.attributes.filter(key => !!select.attribute_values[key]);
        select.media_types = filterOptions.mediaType ? [filterOptions.mediaType] : [];

        // Active filters - only applies to section items with media
        content = section.content
          .filter(sectionItem => ["collection", "list", "media"].includes(sectionItem.type));

        // Find which media matches the specified filters, then filter the section items based whether it contains matching media
        let filteredMediaIds = {};
        (yield this.FilteredMedia({
          select,
          media: content
            .map(sectionItem => this.media[sectionItem.media_id])
            .filter(mediaItem => mediaItem)
        })).forEach(mediaItem => filteredMediaIds[mediaItem.id] = true);

        content = content.filter(sectionItem => filteredMediaIds[sectionItem.media_id]);
      }

      content = (
        content.map(sectionItem => {
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

    return content
      .map(sectionItem => ({
        ...sectionItem,
        resolvedPermissions: this.ResolvePermission({
          mediaPropertySlugOrId,
          pageSlugOrId,
          sectionSlugOrId,
          sectionItemId: sectionItem.id,
          mediaListSlugOrId,
          mediaItemSlugOrId: sectionItem.mediaItem?.id
        })
      }))
      .filter(sectionItem => sectionItem.resolvedPermissions.authorized || !sectionItem.resolvedPermissions.hide);
  });

  FilteredMedia = flow(function * ({media, mediaCatalogIds, select}) {
    const now = new Date();
    return media.filter(mediaItem => {
      mediaItem = mediaItem?.mediaItem || mediaItem;

      // Media catalog
      if(mediaCatalogIds && mediaCatalogIds.length > 0 && !mediaCatalogIds.includes(mediaItem.media_catalog_id)) {
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

      const scheduleFiltersActive =
        select.content_type === "media" &&
        (select.media_types.length === 0 || (select.media_types.length === 1 && select.media_types[0] === "Video"));

      if(
        scheduleFiltersActive &&
        select.date &&
        (!mediaItem.date || mediaItem.date.split("T")[0] !== select.date.split("T")[0])
      ) {
        return false;
      }

      // Schedule filter
      // Only videos can be filtered by schedule
      if(
        scheduleFiltersActive &&
        select.schedule
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
            if(!afterStartLimit || !beforeEndLimit) { return false; }

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
    });
  });

  PermissionItem({permissionItemId}) {
    const permissionItem = this.permissionItems[permissionItemId];

    if(!permissionItem) {
      this.Log(`Unable to find permission item ${permissionItemId}`, true);
    }

    return permissionItem;
  }

  ResolvePermission({
    mediaPropertySlugOrId,
    pageSlugOrId,
    sectionSlugOrId,
    sectionItemId,
    mediaCollectionSlugOrId,
    mediaListSlugOrId,
    mediaItemSlugOrId
  }) {
    // Resolve permissions from top down
    let authorized = true;
    let behavior = this.PERMISSION_BEHAVIORS.HIDE;
    let cause;
    let permissionItemIds;

    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});
    behavior = mediaProperty?.metadata?.permissions?.behavior || behavior;

    const page = this.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId: pageSlugOrId || "main"});
    behavior = page.permissions?.behavior || behavior;

    let alternatePageId = mediaProperty.permissions?.alternate_page_id;

    if(sectionSlugOrId) {
      const section = this.MediaPropertySection({mediaPropertySlugOrId, sectionSlugOrId});

      if(section) {
        behavior = section.permissions?.behavior || behavior;
        authorized = section.authorized;
        cause = !authorized && "Section permissions";
        permissionItemIds = section.permissions?.permission_item_ids || [];
        alternatePageId = section.permissions?.alternate_page_id || alternatePageId;

        if(authorized && sectionItemId) {
          const sectionItem = this.MediaPropertySection({mediaPropertySlugOrId, sectionSlugOrId})?.content
            ?.find(sectionItem => sectionItem.id === sectionItemId);

          if(sectionItem) {
            behavior = sectionItem.permissions?.behavior || behavior;
            permissionItemIds = sectionItem.permissions?.permission_item_ids || [];
            authorized = sectionItem.authorized;
            cause = cause || !authorized && "Section item permissions";
            alternatePageId = sectionItem.permissions?.alternate_page_id || alternatePageId;
          }
        }
      }
    }

    if(authorized && mediaCollectionSlugOrId) {
      const mediaCollection = this.MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId: mediaCollectionSlugOrId});
      authorized = mediaCollection?.authorized || false;
      permissionItemIds = mediaCollection.permissions?.map(permission => permission.permission_item_id) || [];
      cause = !authorized && "Media collection permissions";
    }

    if(authorized && mediaListSlugOrId) {
      const mediaList = this.MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId: mediaListSlugOrId});
      authorized = mediaList?.authorized || false;
      permissionItemIds = mediaList.permissions?.map(permission => permission.permission_item_id) || [];
      cause = !authorized && "Media list permissions";
    }

    if(authorized && mediaItemSlugOrId) {
      const mediaItem = this.MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId});
      authorized = mediaItem?.authorized || false;
      permissionItemIds = mediaItem.permissions?.map(permission => permission.permission_item_id) || [];
      cause = !authorized && "Media permissions";
    }

    if(behavior === this.PERMISSION_BEHAVIORS.SHOW_IF_UNAUTHORIZED) {
      authorized = !authorized;
      behavior = this.PERMISSION_BEHAVIORS.HIDE;
    }

    permissionItemIds = permissionItemIds || [];

    const purchaseGate = !authorized && behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE;

    const showAlternatePage = behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE;
    if(showAlternatePage) {
      alternatePageId = this.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId: alternatePageId})?.slug || alternatePageId;
    }

    return {
      authorized,
      behavior,
      // Hide by default, or if behavior is hide, or if no purchasable permissions are available
      hide: !authorized && (!behavior || behavior === this.PERMISSION_BEHAVIORS.HIDE || (purchaseGate && permissionItemIds.length === 0)),
      disable: !authorized && behavior === this.PERMISSION_BEHAVIORS.DISABLE,
      purchaseGate: purchaseGate && permissionItemIds.length > 0,
      showAlternatePage,
      alternatePageId,
      permissionItemIds,
      cause: cause || ""
    };
  }

  LoadMediaProperties = flow(function * () {
    return yield this.LoadResource({
      key: "MediaProperties",
      id: "media-properties",
      Load: async () => {
        const properties = [
          {propertyId: "iq__ix2KtiranDQ4Zh3Qr24mYkKXm6x", marketplaceId: "iq__4XGTENKuEp8Tdx3v3MgsbTgtbstr"},
          {propertyId: "iq__ix2KtiranDQ4Zh3Qr24mYkKXm6x", subPropertyId: "iq__2oqzMjCeDZyr4pgoPtyPdoUF9rCm", marketplaceId: "iq__36Xv1Q6BAskNyvWzxJ5K1PU1ryYG"},
          {propertyId: "iq__ix2KtiranDQ4Zh3Qr24mYkKXm6x", subPropertyId: "iq__2iRwi1aTMQ6GGaiKC6yyyDanBqKo", marketplaceId: "iq__2E32eXX5wABsMcJwc9DH95aeXSmz"},

          {propertyId: "iq__2vo9ruJ2ZPc8imK7GNG3NVP51x3g", marketplaceId: "iq__2Utm3HfQ2dVWquyGPWvrPXtgpy8v"},
          {propertyId: "iq__46rbdnidu71Hs54iS9gREsGLwZXj", marketplaceId: "iq__2nDj1bBBkRtN7VnX1zzpHYpoCd7V"},
          {propertyId: "iq__3iCRaVZ2YsxBWuHeBu6rAB8zNs4d", marketplaceId: "iq__2nDj1bBBkRtN7VnX1zzpHYpoCd7V"},
          {propertyId: "iq__SgJvnK6sW1exHXwWR8GfGnAg6NS", marketplaceId: "iq__3YdURECX5V1rhE84vREnXfavwn5s"},
          {propertyId: "iq__SgJvnK6sW1exHXwWR8GfGnAg6NS", subPropertyId: "iq__kbhfTxt1c1CgT9zptFyCUhyqAkq", marketplaceId: "iq__mEA97ZQwAjaabEJvRJtrCfdxraG" },
          {propertyId: "iq__SgJvnK6sW1exHXwWR8GfGnAg6NS", subPropertyId: "iq__4XrUn6Z7g1yioEJnvpiKZ5aYfiK8", marketplaceId: "iq__3oCrYs3goRxY16JEFr4JqbeEJU6c" },
          {propertyId: "iq__SgJvnK6sW1exHXwWR8GfGnAg6NS", subPropertyId: "iq__D4VkWm51vGyXWK4wVMyi1MN3ii6", marketplaceId: "iq__3YdURECX5V1rhE84vREnXfavwn5s" },
          {propertyId: "iq__3pJZ5CzhEwEZQ5K997fuRHV21J1F"},
          {propertyId: "iq__fZJu14zfZLF4nVMxDE59voRaubJ"},
          {propertyId: "iq__zaX95x1MsLx7o7V9ECREVpbMAMx"},
          {propertyId: "iq__3KBXsWvinwFLjUNugBebsApFDPjV"},
          {propertyId: "iq__2yWBgqX6ZT2gyXos8m1VTqW3Crf9"},
        ];

        const LoadPropertyInfo = async ({propertyId, subPropertyId, marketplaceId}) => {
          const meta = await this.client.ContentObjectMetadata({
            libraryId: await this.client.ContentObjectLibraryId({objectId: subPropertyId || propertyId}),
            objectId: subPropertyId || propertyId,
            metadataSubtree: "/public/asset_metadata/info",
            produceLinkUrls: true,
            select: [
              "image",
              "title"
            ]
          });

          return {
            ...meta,
            propertyId,
            subPropertyId,
            marketplaceId
          };
        };

        return await Promise.all(
          properties.map(async (params) =>
            await this.LoadResource({
              key: "BasicMediaProperty",
              id: params.subPropertyId || params.propertyId,
              Load: async () => await LoadPropertyInfo(params)
            })
          )
        );
      }
    });
  });

  LoadMediaProperty = flow(function * ({mediaPropertySlugOrId, force=false}) {
    const mediaPropertyId = this.MediaProperty({mediaPropertySlugOrId})?.mediaPropertyId || mediaPropertySlugOrId;

    yield this.LoadResource({
      key: "MediaProperty",
      id: mediaPropertyId,
      force,
      Load: async () => {
        const versionHash = await this.client.LatestVersionHash({objectId: mediaPropertyId});
        const metadata = await this.client.ContentObjectMetadata({
          versionHash,
          metadataSubtree: "/public/asset_metadata/info",
          produceLinkUrls: true
        });

        await Promise.all(
          (metadata.permission_sets || []).map(async permissionSetId =>
            await this.LoadPermissionSet({permissionSetId, force})
          )
        );

        await Promise.all(
          (metadata.media_catalogs || []).map(async mediaCatalogId =>
            await this.LoadMediaCatalog({mediaCatalogId, force})
          )
        );

        const indexableMedia = Object.values(this.media)
          .filter(mediaItem => mediaItem.authorized || mediaItem.permissions?.length > 0)
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

        // Resolve authorized state of sections and section items

        const ResolveSectionPermission = (sectionItem) => {
          let sectionAuthorized = true;
          if(sectionItem.permissions?.permission_item_ids?.length > 0) {
            sectionAuthorized = !!sectionItem.permissions.permission_item_ids.find(permissionItemId =>
              this.PermissionItem({permissionItemId})?.authorized
            );
          }

          return sectionAuthorized;
        };

        const sections = metadata.sections || {};
        Object.keys(sections).forEach(sectionId => {
          const section = metadata.sections[sectionId];
          metadata.sections[sectionId].authorized = ResolveSectionPermission(section);

          if(metadata.sections[sectionId].type === "manual") {
            section.content?.forEach((sectionItem, index) => {
              metadata.sections[sectionId].content[index].authorized = ResolveSectionPermission(sectionItem);
            });
          }
        });

        // Start loading associated marketplaces but don't block on it
        (metadata.associated_marketplaces || []).map(({marketplace_id}) =>
          this.LoadMarketplace({marketplaceId: marketplace_id, force})
        );

        let permissions = {authorized: true};
        if(metadata.permissions?.property_permissions?.length > 0) {
          const authorized = metadata.permissions.property_permissions.find(permissionItemId =>
            this.PermissionItem({permissionItemId}).authorized
          );

          if(!authorized) {
            permissions = {
              authorized: false,
              behavior: metadata.permissions.property_permissions_behavior,
              showAlternatePage: metadata.permissions.property_permissions_behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE,
              alternatePageId: metadata.permissions.alternate_page_id,
              purchaseGate: metadata.permissions.property_permissions_behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE,
              permissionItemIds: metadata.permissions.property_permissions,
              cause: "Property permissions"
            };
          }
        }

        this.mediaProperties[mediaPropertyId] = {
          accountAddress: this.rootStore.CurrentAddress(),
          mediaPropertyHash: versionHash,
          mediaPropertyId: mediaPropertyId,
          mediaPropertySlug: metadata.slug,
          permissions,
          metadata
        };
      }
    });
  });

  // Ensure the specified load method is called only once unless forced
  LoadResource = flow(function * ({key, id, force, Load}) {
    key = `load${key}-${this.rootStore.CurrentAddress() || "anonymous"}`;

    if(force) {
      // Force - drop all loaded content
      this[key] = {};
    }

    this[key] = this[key] || {};

    if(force || !this[key][id]) {
      this[key][id] = Load();
    }

    return yield this[key][id];
  });

  LoadMediaCatalog = flow(function * ({mediaCatalogId, force}) {
    yield this.LoadResource({
      key: "MediaCatalog",
      id: mediaCatalogId,
      force,
      Load: async () => {
        const versionHash = await this.client.LatestVersionHash({objectId: mediaCatalogId});
        const metadata = await this.client.ContentObjectMetadata({
          versionHash,
          metadataSubtree: "/public/asset_metadata/info",
          select: [
            "permission_sets",
            "media",
            "media_collections",
            "media_lists",
            "attributes",
            "tags"
          ],
          produceLinkUrls: true
        });

        await Promise.all(
          (metadata.permission_sets || []).map(async permissionSetId =>
            await this.LoadPermissionSet({permissionSetId})
          )
        );

        const IsAuthorized = mediaItem =>
          mediaItem.public ||
          !!mediaItem.permissions?.find(({permission_item_id}) => this.PermissionItem({permissionItemId: permission_item_id})?.authorized);

        runInAction(() => {
          this.mediaCatalogs[mediaCatalogId] = {
            versionHash,
            tags: metadata.tags || [],
            attributes: metadata.attributes || []
          };

          const media = {
            ...(metadata.media || {}),
            ...(metadata.media_lists || {}),
            ...(metadata.media_collections || {}),
          };

          Object.keys(media).forEach(mediaId => {
            media[mediaId].authorized = IsAuthorized(media[mediaId]);
            if(media[mediaId].date) {
              media[mediaId].canonical_date = media[mediaId].date.split("T")[0];
            }
          });

          this.media = {
            ...this.media,
            ...media
          };

          this.tags = [
            ...this.tags,
            ...(metadata.tags || [])
          ].sort();
        });
      }
    });
  });

  LoadPermissionSet = flow(function * ({permissionSetId, force}) {
    yield this.LoadResource({
      key: "PermissionSet",
      force,
      id: permissionSetId,
      Load: async () => {
        const versionHash = await this.client.LatestVersionHash({objectId: permissionSetId});
        const permissionItems = (await this.client.ContentObjectMetadata({
          versionHash,
          metadataSubtree: "/public/asset_metadata/info/permission_items",
          produceLinkUrls: true
        })) || {};

        if(this.rootStore.loggedIn) {
          await Promise.all(
            Object.keys(permissionItems).map(async permissionItemId => {
              const permissionItem = permissionItems[permissionItemId];
              if(!permissionItem?.marketplace?.marketplace_id) {
                return;
              }

              await this.LoadMarketplace({marketplaceId: permissionItem.marketplace.marketplace_id});

              const marketplaceItem = this.rootStore.marketplaces[permissionItem.marketplace.marketplace_id]?.items
                ?.find(item => item.sku === permissionItem.marketplace_sku);

              const contractAddress = marketplaceItem?.nftTemplateMetadata?.address;


              if(!contractAddress) {
                return;
              }

              const ownedItem = (await rootStore.walletClient.UserItems({
                userAddress: this.rootStore.CurrentAddress(),
                contractAddress,
                limit: 1
              })).results?.[0];

              if(ownedItem) {
                permissionItems[permissionItemId].authorized = true;
                permissionItems[permissionItemId].ownedItem = ownedItem;
              }
            })
          );
        }

        runInAction(() => {
          this.permissionItems = {
            ...this.permissionItems,
            ...permissionItems
          };
        });
      }
    });
  });

  LoadMarketplace = flow(function * ({marketplaceId, force}) {
    yield this.LoadResource({
      key: "Marketplace",
      id: marketplaceId,
      force,
      Load: async () => this.rootStore.LoadMarketplace(marketplaceId)
    });
  });
}

export default MediaPropertyStore;
