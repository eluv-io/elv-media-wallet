import {SetImageUrlDimensions, StaticFabricUrl} from "./Utils";
import UrlJoin from "url-join";
import {mediaPropertyStore, rootStore} from "Stores";

export const MediaPropertyBasePath = params => {
  if(!params.mediaPropertySlugOrId) { return "/"; }

  let path = params.parentMediaPropertySlugOrId ?
    UrlJoin("/p", params.parentMediaPropertySlugOrId, params.parentPageSlugOrId || "", "p", params.mediaPropertySlugOrId) :
    UrlJoin("/p", params.mediaPropertySlugOrId);

  if(params.contractId) {
    path = UrlJoin("/m", params.contractId, params.tokenId, path);
  }

  return path;
};

export const MediaPropertyLink = ({match, sectionItem, mediaItem, navContext}) => {
  let linkPath = MediaPropertyBasePath(match.params);

  mediaItem = mediaItem || sectionItem.mediaItem;
  let params = new URLSearchParams();

  if(match.params.sectionSlugOrId) {
    linkPath = UrlJoin(linkPath, "s", match.params.sectionSlugOrId);
  }

  let url;
  if(mediaItem || sectionItem?.type === "media") {
    if(match.params.mediaCollectionSlugOrId) {
      linkPath = UrlJoin(linkPath, "c", match.params.mediaCollectionSlugOrId);
    }

    if(match.params.mediaListSlugOrId) {
      linkPath = UrlJoin(linkPath, "l", match.params.mediaListSlugOrId);
    }

    const mediaId = mediaItem?.id || sectionItem?.media_id;

    if((mediaItem?.type || sectionItem.media_type) === "collection") {
      linkPath = UrlJoin(linkPath, "c", mediaId);
    } else if((mediaItem?.type || sectionItem.media_type) === "list") {
      linkPath = UrlJoin(linkPath, "l", mediaId);
    } else if((mediaItem?.type || sectionItem.media_type) === "media") {
      const listParam = new URLSearchParams(location.search).get("l");

      if(listParam) {
        linkPath = UrlJoin(linkPath, "l", listParam);
      }

      linkPath = UrlJoin(linkPath, "m", mediaId);

      url = mediaItem?.media_type === "HTML" && MediaItemMediaUrl(mediaItem);
    }
  } else if(sectionItem?.type === "item_purchase") {
    // Preserve params
    params = new URLSearchParams(location.search);
    params.set(
      "p",
      mediaPropertyStore.client.utils.B58(JSON.stringify({
        type: "purchase",
        sectionSlugOrId: match.params.sectionSlugOrId,
        sectionItemId: sectionItem.id
      }))
    );
  } else if(sectionItem?.type === "page_link") {
    const page = mediaPropertyStore.MediaPropertyPage({...match.params, pageSlugOrId: sectionItem.page_id});

    if(page) {
      const pageSlugOrId = page?.slug || sectionItem.page_id;
      linkPath = UrlJoin(linkPath, pageSlugOrId === "main" ? "" : pageSlugOrId);
    }
  } else if(sectionItem?.type === "property_link") {
    linkPath = MediaPropertyBasePath({mediaPropertySlugOrId: sectionItem.property_id, pageSlugOrId: sectionItem.property_page_id});
  } else if(sectionItem?.type === "subproperty_link") {
    linkPath = MediaPropertyBasePath({
      ...match.params,
      parentMediaPropertySlugOrId: match.params.parentMediaPropertySlugOrId || match.params.mediaPropertySlugOrId,
      parentPageId: typeof match.params.parentPageSlugOrId !== "undefined" ? match.params.parentPageSlugOrId : match.params.pageSlugOrId,
      mediaPropertySlugOrId: sectionItem.subproperty_id,
      pageSlugOrId: sectionItem.subproperty_page_id
    });
  } else if(sectionItem?.type === "marketplace_link") {
    const marketplaceId = sectionItem.marketplace?.marketplace_id;

    if(marketplaceId) {
      const sku = sectionItem.marketplace_sku || "";
      linkPath = UrlJoin("/marketplace", marketplaceId, "store", sku);
    }
  }

  if(navContext) {
    params.set("ctx", navContext);
  }

  return {
    linkPath: linkPath + (params.size > 0 ? `?${params.toString()}` : ""),
    url
  };
};

export const MediaItemMediaUrl = mediaItem => {
  // TODO: Handle media type link
  if(!["Ebook", "HTML"].includes(mediaItem.media_type)) { return;  }

  const requiresPermissions = true;

  let url = mediaItem.media_file?.url;

  if(!url) {
    return null;
  }

  if(mediaItem.media_type === "Ebook") {
    const mediaUrl = new URL(url);
    url = new URL("https://embed.v3.contentfabric.io");
    url.searchParams.set("p", "");
    url.searchParams.set("net", mediaPropertyStore.client.networkName === "main" ? "main" : "demo");
    url.searchParams.set("mt", "b");
    url.searchParams.set("murl", mediaPropertyStore.client.utils.B64(mediaUrl.toString()));
  } else {
    let linkHash, linkPath;
    if(mediaItem.media_file["/"].startsWith("./")) {
      linkHash = mediaPropertyStore.mediaCatalogs[mediaItem.media_catalog_id]?.versionHash;
      linkPath = mediaItem.media_file["/"].replace("./", "");
    } else {
      linkHash = mediaItem.media_file["/"].split("/")[2];
      linkPath = mediaItem.media_file["/"].split("/").slice(3).join("/");
    }

    if(linkHash && linkPath) {
      url = new URL(
        StaticFabricUrl({
          versionHash: linkHash,
          path: linkPath
        })
      );
    } else {
      url = new URL(url);
    }

    mediaItem.parameters?.forEach(({name, value}) =>
      url.searchParams.set(name, value)
    );

    if(requiresPermissions && rootStore.authToken) {
      url.searchParams.set("authorization", rootStore.authToken);
    }
  }

  return url.toString();
};

export const MediaPropertyMediaBackPath = ({match, navContext}) => {
  const path = location.pathname;
  let pathComponents = path.replace(/^\//, "").split("/");
  let params = new URLSearchParams();

  const currentNavContext = new URLSearchParams(location.search).get("ctx");

  if(navContext) {
    params.set("ctx", navContext);
  }

  if(match.params.mediaItemSlugOrId) {
    pathComponents = pathComponents.slice(0, -2);

    if(match.params.mediaCollectionSlugOrId && match.params.mediaListSlugOrId) {
      pathComponents = pathComponents.slice(0, -2);
      params.set("l", match.params.mediaListSlugOrId);
    } else if(match.params.sectionSlugOrId && currentNavContext !== "s") {
      // Only go back to section page if we got there from here
      pathComponents = pathComponents.slice(0, -2);
    }
  } else if(match.params.mediaListSlugOrId || match.params.mediaCollectionSlugOrId || match.params.sectionSlugOrId) {
    pathComponents = pathComponents.slice(0, -2);

    if(match.params.sectionSlugOrId && currentNavContext !== "s") {
      // Only go back to section page if we got there from here
      pathComponents = pathComponents.slice(0, -2);
    }
  } else {
    pathComponents = pathComponents.slice(0, -1);
  }

  return "/" + pathComponents.join("/") + (params.size > 0 ? `?${params.toString()}` : "");
};

export const MediaItemScheduleInfo = mediaItem => {
  const isLiveVideoType =
    mediaItem &&
    mediaItem?.type === "media" &&
    mediaItem.media_type === "Video" &&
    mediaItem.live_video;

  if(!isLiveVideoType) {
    return {
      isLiveContent: false
    };
  }

  try {
    const now = new Date();
    const startTime = mediaItem.start_time && new Date(mediaItem.start_time);
    const endTime = mediaItem.end_time && new Date(mediaItem.end_time);
    const started = !startTime || now > startTime;
    const ended = endTime && now > endTime;
    const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
    const displayStartDate = startTime?.toLocaleDateString(currentLocale, {day: "numeric", month: "numeric"}).replace(/0(\d)/g, "$1");
    const displayStartTime = startTime?.toLocaleTimeString(currentLocale, {hour: "numeric", minute: "numeric"}).replace(/^0(\d)/, "$1");

    return {
      startTime,
      endTime,
      isLiveContent: true,
      currentlyLive: started && !ended,
      started,
      ended,
      displayStartDate,
      displayStartTime
    };
  } catch(error) {
    // eslint-disable-next-line no-console
    console.error(`Error parsing start/end time in media item ${mediaItem.name}`);
    // eslint-disable-next-line no-console
    console.error(error);

    return {
      isLiveContent: false
    };
  }
};

export const MediaItemImageUrl = ({mediaItem, display, aspectRatio, width}) => {
  display = display || mediaItem;

  aspectRatio = aspectRatio?.toLowerCase();
  const aspectRatioPreference =
    (mediaItem?.type === "media" && mediaItem.media_type === "Video") ?
      ["landscape", "square", "portrait"] :
      ["square", "landscape", "portrait"];

  const imageAspectRatio =
    [aspectRatio, ...aspectRatioPreference].find(ratio => display[`thumbnail_image_${ratio}`]);

  let imageUrl = display[`thumbnail_image_${imageAspectRatio}`]?.url;

  if(width) {
    imageUrl = SetImageUrlDimensions({url: imageUrl, width});
  }

  return {
    imageUrl,
    imageAspectRatio
  };
};
