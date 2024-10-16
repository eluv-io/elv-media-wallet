import {makeAutoObservable, flow, runInAction, toJS} from "mobx";
import MiniSearch from "minisearch";
import {
  MediaItemScheduleInfo,
  PurchaseParamsToItems
} from "../utils/MediaPropertyUtils";
import UrlJoin from "url-join";
import {Utils} from "@eluvio/elv-client-js";
import {NFTInfo} from "../utils/Utils";

class MediaPropertyStore {
  allMediaProperties;
  mediaPropertyHashes;
  mediaPropertyIds;
  mediaProperties = {};
  mediaCatalogs = {};
  media = {};
  permissionItems = {};
  previewPropertyId;
  previewAll = false;
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
  logTiming = false;
  _resources = {};

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

    this.previewPropertyId = new URLSearchParams(location.search).get("preview") || rootStore.GetSessionStorage("preview-property");
    if(this.previewPropertyId) {
      rootStore.SetSessionStorage("preview-property", this.previewPropertyId);
    }

    this.previewAll = new URLSearchParams(location.search).has("previewAll") || rootStore.GetSessionStorage("preview-all");
    if(this.previewAll) {
      rootStore.SetSessionStorage("preview-all", true);
    }

    this.logTiming = new URLSearchParams(location.search).has("logTiming") || rootStore.GetSessionStorage("log-timing");
    if(this.logTiming) {
      rootStore.SetSessionStorage("log-timing", true);
    }
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

    let attributes = {
      "__media-type": {
        id: "__media-type",
        title: "Media Type",
        tags: ["Video", "Gallery", "Image", "Ebook"]
      }
    };

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

  async SearchMedia({mediaPropertySlugOrId, query, searchOptions}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});

    if(!mediaProperty) {
      return [];
    }

    searchOptions = searchOptions || this.searchOptions;

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
        }))
        .filter(result => result.mediaItem);
    } else {
      // All content
      const associatedCatalogIds = mediaProperty.metadata.media_catalogs || [];
      results = Object.values(this.media)
        .filter(mediaItem =>
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

    results = results
      .map(result => {
        return {
          ...result,
          mediaItem: {
            ...result.mediaItem,
            resolvedPermissions: this.ResolvePermission({
              mediaPropertySlugOrId,
              mediaCollectionSlugOrId: result.mediaItem.type === "collection" && result.mediaItem.id,
              mediaListSlugOrId: result.mediaItem.type === "list" && result.mediaItem.id,
              mediaItemSlugOrId: result.mediaItem.type === "media" && result.mediaItem.id,
              search: true
            })
          }
        };
      })
      .filter(result => !result?.mediaItem?.resolvedPermissions?.hide);

    // Filter
    const hasDateFilter = !!(searchOptions.startTime || searchOptions.endTime) || searchOptions.schedule;
    let select = {
      attributes: Object.keys(searchOptions.attributes || {}).filter(key => !!searchOptions.attributes[key]),
      attribute_values: searchOptions.attributes,
      tags: [
        ...Object.values(searchOptions.tagSelect || {}).filter(tag => tag)
      ],
      content_type: searchOptions.mediaType || hasDateFilter ? "media" : undefined,
      media_types: searchOptions.mediaType ? [searchOptions.mediaType] : (hasDateFilter ? ["Video"] : []) || [],
      schedule: searchOptions.schedule || (hasDateFilter ? "period" : undefined),
      start_time: searchOptions.startTime,
      end_time: searchOptions.endTime ? new Date(searchOptions.endTime.getTime() + 24 * 60 * 60 * 1000) : undefined
    };

    results = await this.FilteredMedia({
      media: results,
      select
    });

    // Arbitrary tags filtered separately because they should be match any, not all
    if(searchOptions.tags?.length > 0) {
      results = results.filter(result =>
        result.mediaItem.tags.find(tag => searchOptions.tags.includes(tag))
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
          } else if(result.mediaItem?.canonical_date) {
            return today <= result.mediaItem?.canonical_date;
          }
        }

        return true;
      })
      .forEach(result => {
        let categories;
        if(result.mediaItem) {
          if(groupBy === "__media-type") {
            categories = [result.mediaItem.media_type || "__other"];
          } else if(groupBy === "__date") {
            categories = [result.mediaItem.canonical_date || "__other"];
          } else {
            categories = result.mediaItem.attributes?.[groupBy];
          }
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
    const propertyId =
      this.allMediaProperties?.[mediaPropertySlugOrId]?.propertyId ||
      (this.mediaPropertyHashes?.[mediaPropertySlugOrId] && Utils.DecodeVersionHash(this.mediaPropertyHashes[mediaPropertySlugOrId]).objectId) ||
      mediaPropertySlugOrId;

    return this.mediaProperties[propertyId];
  }

  MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId="main"}) {
    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});

    if(!mediaProperty) { return; }

    // Property level permissions - Show alternate page if not authorized option
    if(mediaProperty.permissions?.showAlternatePage) {
      pageSlugOrId = mediaProperty.permissions.alternatePageId || pageSlugOrId;
    }

    let pageId = mediaProperty.metadata.slug_map.pages[pageSlugOrId]?.page_id ||
      mediaProperty.metadata.page_ids[pageSlugOrId] ||
      pageSlugOrId;

    let page = mediaProperty.metadata.pages[pageId];

    if(!page) {
      return;
    }

    let permissions = {
      authorized: true,
      behavior: page?.permissions?.behavior,
      alternatePageId: (
        page.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE &&
        page.permissions?.alternate_page_id
      )
    };

    if(page.permissions?.page_permissions?.length > 0) {
      const authorized = page.permissions.page_permissions.find(permissionItemId =>
        this.PermissionItem({permissionItemId})?.authorized
      );

      if(!authorized) {
        permissions = {
          authorized: false,
          behavior: page.permissions.page_permissions_behavior,
          showAlternatePage: page.permissions.page_permissions_behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE,
          alternatePageId: page.permissions.page_permissions_alternate_page_id,
          purchaseGate: page.permissions.page_permissions_behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE,
          secondaryPurchaseOption: page.permissions.page_permissions_secondary_market_purchase_option,
          permissionItemIds: page.permissions.page_permissions,
          cause: "Page permissions"
        };

        // Page level permissions - Show alternate page if not authorized option
        if(permissions.showAlternatePage) {
          if(permissions.alternatePageId !== pageSlugOrId) {
            return this.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId: permissions.alternatePageId});
          } else {
            this.Log("Circular alternate page redirect for " + pageSlugOrId, true);
          }
        }
      }
    }

    return {
      ...page,
      permissions
    };
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
          aspect_ratio: mediaList.preferred_aspect_ratio,
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

  MediaPropertyMediaItem({mediaItemSlugOrId}) {
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

      const hasActiveFilters = Object.keys(filterOptions.attributes || {}).length > 0 || !!filterOptions.mediaType;
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
      .filter(sectionItem => (
        // Filter purchase section items that have no purchasable items
        sectionItem.type !== "item_purchase" ||
        PurchaseParamsToItems(
          {
            type: "purchase",
            sectionSlugOrId,
            sectionItemId: sectionItem.id
          },
          sectionItem?.resolvedPermissions?.secondaryPurchaseOption
        ).length > 0
      ))
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
      if(select.media_types?.length > 0 && !select.media_types.includes(mediaItem.media_type)) {
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

          case "live_and_upcoming":
            if(ended || !beforeEndLimit) { return false; }

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
    mediaItemSlugOrId,
    search=false
  }) {
    // Resolve permissions from top down
    let authorized = true;
    let behavior = this.PERMISSION_BEHAVIORS.HIDE;
    let cause;
    let permissionItemIds;

    const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});
    behavior = mediaProperty?.metadata?.permissions?.behavior || behavior;

    let alternatePageId = (
      behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE &&
      mediaProperty?.metadata?.permissions?.alternate_page_id
    );

    let secondaryPurchaseOption = (
      behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE &&
      mediaProperty?.metadata?.permissions?.secondary_market_purchase_option
    );

    const page = this.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId: pageSlugOrId || "main"});
    behavior = page.permissions?.behavior || behavior;

    alternatePageId = (
      page?.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE &&
      page?.permissions?.alternate_page_id
    ) || alternatePageId;

    secondaryPurchaseOption = (
      page?.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE &&
      page?.permissions?.permissions?.secondary_market_purchase_option
    ) || secondaryPurchaseOption;

    if(sectionSlugOrId) {
      const section = this.MediaPropertySection({mediaPropertySlugOrId, sectionSlugOrId});

      if(section) {
        behavior = section.permissions?.behavior || behavior;

        if(!section.authorized) {
          authorized = false;
          permissionItemIds = section.permissions?.permission_item_ids || [];
          cause = "Section permissions";
        }

        alternatePageId =
          (
            section.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE &&
            section.permissions?.alternate_page_id
          ) || alternatePageId;

        secondaryPurchaseOption =
          (
            section.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE &&
            section.permissions?.secondary_market_purchase_option
          ) || secondaryPurchaseOption;

        if(sectionItemId) {
          const sectionItem = section?.content
            ?.find(sectionItem => sectionItem.id === sectionItemId);

          if(sectionItem) {
            if(!sectionItem.authorized) {
              authorized = false;
              permissionItemIds = sectionItem.permissions?.permission_item_ids || [];
              cause = "Section item permissions";
            }

            behavior = sectionItem.permissions?.behavior || behavior;

            alternatePageId =
              (
                sectionItem.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE &&
                sectionItem.permissions?.alternate_page_id
              ) || alternatePageId;

            secondaryPurchaseOption =
              (
                sectionItem.permissions?.behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE &&
                sectionItem.permissions?.secondary_market_purchase_option
              ) || secondaryPurchaseOption;
          }

          // Section item 'disabled' option - apply regardless of authorization status but don't override 'hide'
          if(sectionItem && sectionItem.disabled && !(!authorized && behavior === this.PERMISSION_BEHAVIORS.HIDE)) {
            authorized = false;
            behavior = this.PERMISSION_BEHAVIORS.DISABLE;
            cause = "Section item disabled";
          }
        }
      }
    }

    if(search) {
      behavior = mediaProperty.metadata.permissions.search_permissions_behavior || behavior;
      alternatePageId = mediaProperty.metadata.permissions.search_permissions_alternate_page_id || alternatePageId;
      secondaryPurchaseOption = mediaProperty.metadata.permissions.search_permissions_secondary_market_purchase_option || secondaryPurchaseOption;
    }

    if(authorized && mediaCollectionSlugOrId) {
      const mediaCollection = this.MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId: mediaCollectionSlugOrId});

      if(!mediaCollection.authorized) {
        authorized = false;
        permissionItemIds = mediaCollection.permissions?.map(permission => permission.permission_item_id) || [];
        cause = "Media collection permissions";
      }
    }

    if(authorized && mediaListSlugOrId) {
      const mediaList = this.MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId: mediaListSlugOrId});

      if(!mediaList.authorized) {
        authorized = false;
        permissionItemIds = mediaList.permissions?.map(permission => permission.permission_item_id) || [];
        cause = "Media list permissions";
      }
    }

    if(authorized && mediaItemSlugOrId) {
      const mediaItem = this.MediaPropertyMediaItem({mediaPropertySlugOrId, mediaItemSlugOrId});

      if(!mediaItem.authorized) {
        authorized = false;
        permissionItemIds = mediaItem.permissions?.map(permission => permission.permission_item_id) || [];
        cause = "Media permissions";
      }
    }

    if(behavior === this.PERMISSION_BEHAVIORS.SHOW_IF_UNAUTHORIZED) {
      authorized = !authorized;
      behavior = this.PERMISSION_BEHAVIORS.HIDE;
    }

    permissionItemIds = permissionItemIds || [];

    const purchaseGate = !authorized && behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE;
    let showAlternatePage = !authorized && behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE;

    if(showAlternatePage) {
      const page = this.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId: alternatePageId ? alternatePageId : undefined});

      alternatePageId = page?.slug || page?.id;

      if(!alternatePageId) {
        showAlternatePage = false;
        this.Log("Warning: Show alternate page permission set but alternate page not valid", true);
        this.Log(arguments, true);
        behavior = this.PERMISSION_BEHAVIORS.HIDE;
      }
    }

    const purchasable = !!secondaryPurchaseOption || !!permissionItemIds.find(permissionItemId =>
      this.permissionItems[permissionItemId]?.purchasable
    );

    // If not authorized and the user can't purchase access, hide or disable
    if(!authorized && (!purchasable || permissionItemIds.length === 0)) {
      authorized = false;
      behavior = behavior === this.PERMISSION_BEHAVIORS.DISABLE ?
        behavior :
        this.PERMISSION_BEHAVIORS.HIDE;
      cause = `${cause} and not purchasable`;
      showAlternatePage = false;
    }

    return {
      authorized,
      purchasable: !!purchasable,
      behavior,
      // Hide by default, or if behavior is hide, or if no purchasable permissions are available
      hide: !authorized && (!behavior || behavior === this.PERMISSION_BEHAVIORS.HIDE || (purchaseGate && permissionItemIds.length === 0)),
      disable: !authorized && behavior === this.PERMISSION_BEHAVIORS.DISABLE,
      purchaseGate: purchaseGate && permissionItemIds.length > 0,
      secondaryPurchaseOption,
      showAlternatePage,
      alternatePageId,
      permissionItemIds,
      cause: cause || ""
    };
  }

  LoadMediaPropertyHashes = flow(function * () {
    return yield this.LoadResource({
      key: "MediaPropertySlugs",
      id: "media-property-slugs",
      anonymous: true,
      Load: async () => {
        const metadataUrl = new URL(
          this.rootStore.network === "demo" ?
            "https://demov3.net955210.contentfabric.io/s/demov3" :
            "https://main.net955305.contentfabric.io/s/main"
        );

        metadataUrl.pathname = UrlJoin(
          metadataUrl.pathname,
          "qlibs",
          this.rootStore.siteConfiguration.siteLibraryId,
          "q",
          this.rootStore.siteConfiguration.siteId,
          "meta/public/asset_metadata/media_properties"
        );

        metadataUrl.searchParams.set("resolve", "false");

        const metadata = (await (await fetch(metadataUrl.toString())).json()) || {};

        let mediaPropertyHashes = {};
        let mediaPropertyIds = {};
        Object.keys(metadata).forEach(mediaPropertySlug => {
          const mediaPropertyHash = metadata[mediaPropertySlug]?.["/"]?.split("/")?.find(segment => segment.startsWith("hq__"));

          if(mediaPropertyHash) {
            const mediaPropertyId = Utils.DecodeVersionHash(mediaPropertyHash).objectId;

            mediaPropertyHashes[mediaPropertySlug] = mediaPropertyHash;
            mediaPropertyHashes[mediaPropertyId] = mediaPropertyHash;

            mediaPropertyIds[mediaPropertySlug] = mediaPropertyId;
            mediaPropertyIds[mediaPropertyId] = mediaPropertyId;
          }
        });

        this.mediaPropertyHashes = mediaPropertyHashes;
        this.mediaPropertyIds = mediaPropertyIds;
      }
    });
  });

  LoadMediaProperties = flow(function * () {
    return yield this.LoadResource({
      key: "MediaProperties",
      id: "media-properties",
      anonymous: true,
      Load: async () => {
        const metadataUrl = new URL(
          this.rootStore.network === "demo" ?
            "https://demov3.net955210.contentfabric.io/s/demov3" :
            "https://main.net955305.contentfabric.io/s/main"
        );

        metadataUrl.pathname = UrlJoin(
          metadataUrl.pathname,
          "qlibs",
          this.rootStore.siteConfiguration.siteLibraryId,
          "q",
          this.rootStore.siteConfiguration.siteId,
          "meta/public/asset_metadata"
        );
        metadataUrl.searchParams.set("resolve", "true");
        metadataUrl.searchParams.set("resolve_ignore_errors", "true");
        metadataUrl.searchParams.set("resolve_include_source", "true");
        metadataUrl.searchParams.set("link_depth", "2");

        [
          "info/media_property_order",
          "tenants/*/.",
          "tenants/*/media_properties/*/.",
          "tenants/*/media_properties/*/name",
          "tenants/*/media_properties/*/title",
          "tenants/*/media_properties/*/slug",
          "tenants/*/media_properties/*/image",
          "tenants/*/media_properties/*/video",
          "tenants/*/media_properties/*/show_on_main_page",
          "tenants/*/media_properties/*/main_page_url",
          "tenants/*/media_properties/*/parent_property"
        ].forEach(select => metadataUrl.searchParams.append("select", select));

        const metadata = await (await fetch(metadataUrl.toString())).json();

        let allProperties = {};
        const propertyOrder = metadata?.info?.media_property_order || [];
        const properties = Object.keys(metadata?.tenants || {}).map(tenantSlug => {
          return Object.keys(metadata.tenants[tenantSlug]?.media_properties || {}).map(propertySlug => {
            try {
              let property = metadata.tenants[tenantSlug].media_properties[propertySlug];

              property = {
                ...property,
                tenantSlug,
                tenantObjectHash: metadata.tenants[tenantSlug]["."].source,
                tenantObjectId: Utils.DecodeVersionHash(metadata.tenants[tenantSlug]["."].source).objectId,
                propertyHash: property["."].source,
                propertyId: Utils.DecodeVersionHash(property["."].source).objectId
              };

              if(property.image) {
                const imageUrl = new URL(
                  this.rootStore.network === "demo" ?
                    "https://demov3.net955210.contentfabric.io/s/demov3" :
                    "https://main.net955305.contentfabric.io/s/main"
                );

                imageUrl.pathname = UrlJoin(imageUrl.pathname, "q", property.propertyHash, "meta/public/asset_metadata/info/image");

                property.image.url = imageUrl.toString();
              }

              allProperties[property.propertyId] = property;
              allProperties[property.slug] = property;

              return property;
            } catch(error) {
              this.Log(`Failed to load property ${tenantSlug}/${propertySlug}`, true);
              this.Log(error, true);
            }
          })
            .filter(property => property);
        })
          .flat()
          .filter(property => property.show_on_main_page)
          .sort((a, b) => {
            const indexA = propertyOrder.findIndex(propertySlugOrId => a.slug === propertySlugOrId || a.propertyId === propertySlugOrId);
            const indexB = propertyOrder.findIndex(propertySlugOrId => b.slug === propertySlugOrId || b.propertyId === propertySlugOrId);

            return indexA < 0 ?
              (indexB < 0 ? 0 : 1) :
              (indexA < indexB ? -1 : 1);
          });

        this.allMediaProperties = allProperties;

        return properties;
      }
    });
  });

  LoadMediaPropertyCustomizationMetadata = flow(function * ({mediaPropertySlugOrId, force=false}) {
    yield this.LoadMediaPropertyHashes();

    return yield this.LoadResource({
      key: "MediaPropertyCustomizationMetadata",
      id: this.mediaPropertyIds[mediaPropertySlugOrId] || mediaPropertySlugOrId,
      force,
      anonymous: true,
      Load: async () => {
        const mediaProperty = this.MediaProperty({mediaPropertySlugOrId});
        if(mediaProperty) {
          return mediaProperty.metadata;
        }

        const isPreview = this.previewAll || mediaPropertySlugOrId === this.previewPropertyId;

        let versionHash = this.mediaPropertyHashes[mediaPropertySlugOrId];
        if(isPreview) {
          versionHash = await this.client.LatestVersionHash({
            versionHash,
            objectId: !versionHash && mediaPropertySlugOrId
          });
        }

        if(!versionHash && !mediaPropertySlugOrId?.startsWith("iq__")) {
          throw Error("Unable to find property " + mediaPropertySlugOrId);
        }

        const storageKey = `customization-metadata-${versionHash}`;

        const metadata =
          this.rootStore.GetSessionStorageJSON(storageKey, true) ||
          await this.client.ContentObjectMetadata({
            versionHash,
            metadataSubtree: "/public/asset_metadata/info",
            produceLinkUrls: true,
            select: [
              "tenant",
              "login",
              "styling",
              "domain"
            ]
          });

        this.rootStore.SetSessionStorage(
          storageKey,
          this.client.utils.B64(JSON.stringify(metadata))
        );

        return metadata;
      }
    });
  });

  MediaPropertyShouldReload = flow(function * ({mediaPropertySlugOrId}) {
    if(!this.rootStore.CurrentAddress()) { return; }

    const existingProperty = yield this.MediaProperty({mediaPropertySlugOrId});

    if(!existingProperty) {
      return;
    }

    if((Date.now() - existingProperty.__permissionsLastChecked || 0) < 30000) {
      return;
    }

    const ownedItemCount = (yield this.rootStore.walletClient.UserItems())?.paging?.total;
    const shouldReload = ownedItemCount !== existingProperty.__ownedItemCount;

    runInAction(() => {
      existingProperty.__permissionsLastChecked = Date.now();
      existingProperty.__ownedItemCount = ownedItemCount;
    });

    return shouldReload;
  });

  LoadMediaProperty = flow(function * ({mediaPropertySlugOrId, force=false}) {
    yield this.LoadMediaPropertyHashes();


    // Check if we should automatically reload - if the user has acquired new item(s) since last load
    force = force || (yield this.MediaPropertyShouldReload({mediaPropertySlugOrId}));

    yield this.LoadResource({
      key: "MediaProperty",
      id: this.mediaPropertyIds[mediaPropertySlugOrId] || mediaPropertySlugOrId,
      force,
      Load: async () => {
        const isPreview = this.previewAll || mediaPropertySlugOrId === this.previewPropertyId;

        let versionHash = this.mediaPropertyHashes[mediaPropertySlugOrId];
        if(isPreview) {
          versionHash = await this.client.LatestVersionHash({
            versionHash,
            objectId: !versionHash && mediaPropertySlugOrId
          });
        }

        if(!versionHash && !mediaPropertySlugOrId?.startsWith("iq__")) {
          throw Error("Unable to find property " + mediaPropertySlugOrId);
        }

        const mediaPropertyId = versionHash && Utils.DecodeVersionHash(versionHash).objectId;

        const metadata = await this.client.ContentObjectMetadata({
          versionHash,
          metadataSubtree: "/public/asset_metadata/info",
          produceLinkUrls: true
        });

        const provider = this.rootStore.AuthInfo()?.provider || "external";
        const propertyProvider = metadata?.login?.settings?.provider || "auth0";
        if(
          this.rootStore.loggedIn &&
          provider !== propertyProvider &&
          // Only allow metamask for auth0
          !(provider === "external" && propertyProvider === "auth0")
        ) {
          this.rootStore.Log("Signing out due to mismatched login provider with property");
          await this.rootStore.SignOut({reload: false});
          return;
        }

        // Start loading associated marketplaces but don't block on it
        (metadata.associated_marketplaces || []).map(({marketplace_id}) =>
          this.LoadMarketplace({marketplaceId: marketplace_id, force})
        );

        if(!isPreview && metadata.permission_set_links) {
          // Load from links
          await Promise.all(
            Object.keys(metadata.permission_set_links).map(async permissionSetId =>
              await this.LoadPermissionSet({
                permissionSetId,
                permissionSetHash: metadata.permission_set_links[permissionSetId]["/"].split("/").find(segment => segment.startsWith("hq__")),
                force
              })
            )
          );
        } else {
          // Load latest versions
          await Promise.all(
            (metadata.permission_sets || []).map(async permissionSetId =>
              await this.LoadPermissionSet({permissionSetId, force})
            )
          );
        }

        // Load Media Catalogs
        let mediaCatalogContent;
        if(!isPreview && metadata.media_catalog_links) {
          // Load from links
          mediaCatalogContent = await Promise.all(
            Object.keys(metadata.media_catalog_links).map(async mediaCatalogId =>
              await this.LoadMediaCatalog({
                mediaCatalogId,
                mediaCatalogHash: metadata.media_catalog_links[mediaCatalogId]["/"].split("/").find(segment => segment.startsWith("hq__")),
                force
              })
            )
          );
        } else {
          // Load latest versions
          mediaCatalogContent = await Promise.all(
            (metadata.media_catalogs || []).map(async mediaCatalogId =>
              await this.LoadMediaCatalog({mediaCatalogId, force})
            )
          );
        }

        this.tags = [...new Set([
          ...(this.tags || []),
          ...(mediaCatalogContent
            .map(({tags}) => tags)
            .flat())
        ])];

        let allMedia = {};
        mediaCatalogContent.forEach(({media}) =>
          allMedia = Object.assign(allMedia, media)
        );

        this.media = {
          ...(this.media || {}),
          ...allMedia
        };

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

        let permissions = {authorized: true};
        if(metadata.permissions?.property_permissions?.length > 0) {
          const authorized = metadata.permissions.property_permissions.find(permissionItemId =>
            this.PermissionItem({permissionItemId})?.authorized
          );

          if(!authorized) {
            permissions = {
              authorized: false,
              behavior: metadata.permissions.property_permissions_behavior,
              showAlternatePage: metadata.permissions.property_permissions_behavior === this.PERMISSION_BEHAVIORS.SHOW_ALTERNATE_PAGE,
              alternatePageId: metadata.permissions.property_permissions_alternate_page_id,
              purchaseGate: metadata.permissions.property_permissions_behavior === this.PERMISSION_BEHAVIORS.SHOW_PURCHASE,
              secondaryPurchaseOption: metadata.permissions.property_permissions_secondary_market_purchase_option,
              permissionItemIds: metadata.permissions.property_permissions,
              cause: "Property permissions"
            };
          }
        }

        let ownedItemCount = 0;
        if(this.rootStore.CurrentAddress()) {
          ownedItemCount = (await this.rootStore.walletClient.UserItems())?.paging?.total;
        }

        this.mediaProperties[mediaPropertyId] = {
          accountAddress: this.rootStore.CurrentAddress(),
          mediaPropertyHash: versionHash,
          mediaPropertyId: mediaPropertyId,
          mediaPropertySlug: metadata.slug,
          permissions,
          metadata,
          __permissionsLastChecked: Date.now(),
          __ownedItemCount: ownedItemCount
        };
      }
    });
  });

  // Ensure the specified load method is called only once unless forced
  LoadResource = flow(function * ({key, id, force=false, anonymous=false, Load}) {
    if(anonymous) {
      key = `load${key}-anonymous`;
    } else if(!anonymous) {
      while(
        !this.rootStore.loaded ||
        this.rootStore.authenticating ||
        // Auth0 login - wait for completion
        (!this.rootStore.loggedIn && new URLSearchParams(decodeURIComponent(window.location.search)).has("code"))
      ) {
        yield new Promise(resolve => setTimeout(resolve, 500));
      }

      key = `load${key}-${this.rootStore.CurrentAddress() || "anonymous"}`;
    }

    if(force) {
      // Force - drop all loaded content
      this._resources[key] = {};
    }

    this._resources[key] = this._resources[key] || {};

    if(force || !this._resources[key][id]) {
      if(this.logTiming) {
        this._resources[key][id] = (async (...args) => {
          // eslint-disable-next-line no-console
          console.time(`${key} - ${id}`);
          const result = await Load(...args);
          // eslint-disable-next-line no-console
          console.timeEnd(`${key} - ${id}`);

          return result;
        })();
      } else {
        this._resources[key][id] = Load();
      }
    }

    return yield this._resources[key][id];
  });

  LoadMediaCatalog = flow(function * ({mediaCatalogId, mediaCatalogHash, force}) {
    if(mediaCatalogHash) {
      mediaCatalogId = this.client.utils.DecodeVersionHash(mediaCatalogHash).objectId;
    } else {
      mediaCatalogHash = yield this.client.LatestVersionHash({objectId: mediaCatalogId});
    }

    return yield this.LoadResource({
      key: "MediaCatalog",
      id: mediaCatalogHash,
      force,
      Load: async () => {
        const metadata = await this.client.ContentObjectMetadata({
          versionHash: mediaCatalogHash,
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
            versionHash: mediaCatalogHash,
            tags: metadata.tags || [],
            attributes: metadata.attributes || []
          };
        });

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

        return {
          media,
          tags: metadata.tags || []
        };
      }
    });
  });

  LoadPermissionSet = flow(function * ({permissionSetId, permissionSetHash, force}) {
    if(permissionSetHash) {
      permissionSetId = this.client.utils.DecodeVersionHash(permissionSetHash).objectId;
    } else {
      permissionSetHash = yield this.client.LatestVersionHash({objectId: permissionSetId});
    }

    yield this.LoadResource({
      key: "PermissionSet",
      force,
      id: permissionSetId,
      Load: async () => {
        const permissionItems = (await this.client.ContentObjectMetadata({
          versionHash: permissionSetHash,
          metadataSubtree: "/public/asset_metadata/info/permission_items",
          produceLinkUrls: true
        })) || {};

        if(this.rootStore.loggedIn) {
          let permissionContracts = {};
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
                this.Log(`Warning: No contract or missing item for permission item ${permissionItemId}. Marketplace ${permissionItem.marketplace.marketplace_id} SKU ${permissionItem.marketplace_sku}`);
                return;
              }

              if(!permissionContracts[permissionItem.marketplace.marketplace_id]) {
                permissionContracts[permissionItem.marketplace.marketplace_id] = {};
              }

              permissionContracts[permissionItem.marketplace.marketplace_id][contractAddress] = permissionItemId;

              permissionItems[permissionItemId].purchasable = NFTInfo({
                item: marketplaceItem
              })?.marketplacePurchaseAvailable;
            })
          );

          await Promise.all(
            Object.keys(permissionContracts).map(async marketplaceId => {
              const ownedItems = (await this.rootStore.walletClient.UserItems({
                userAddress: this.rootStore.CurrentAddress(),
                marketplaceParams: {marketplaceId},
                limit: 1000
              })).results || [];

              for(const item of ownedItems) {
                const permissionItemId = permissionContracts[marketplaceId][this.client.utils.FormatAddress(item.contractAddress)];

                if(permissionItemId) {
                  permissionItems[permissionItemId].authorized = true;
                  permissionItems[permissionItemId].ownedItem = item;
                }
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

  LoadMarketplace = flow(function * ({marketplaceId, force=false}) {
    yield this.LoadResource({
      key: "Marketplace",
      id: marketplaceId,
      force,
      Load: async () => await this.rootStore.LoadMarketplace(marketplaceId)
    });
  });
}

export default MediaPropertyStore;
