import {LinkTargetHash, SetImageUrlDimensions, StaticFabricUrl} from "./Utils";
import UrlJoin from "url-join";
import {mediaPropertyStore, rootStore} from "Stores";

export const MediaPropertyBasePath = (params, {includePage=true}={}) => {
  if(!params.mediaPropertySlugOrId) { return "/"; }

  let path = params.parentMediaPropertySlugOrId ?
    UrlJoin("/", params.parentMediaPropertySlugOrId, params.parentPageSlugOrId || "", "p", params.mediaPropertySlugOrId, (includePage && params.pageSlugOrId) || "") :
    UrlJoin("/", params.mediaPropertySlugOrId, (includePage && params.pageSlugOrId) || "");

  if(params.propertyItemContractId) {
    path = UrlJoin("/m", params.propertyItemContractId, params.propertyItemTokenId, "p", path);
  }

  return path;
};

export const CreateMediaPropertyPurchaseParams = ({
  id,
  gate,
  listingId,
  permissionItemIds,
  sectionSlugOrId,
  sectionItemId,
  actionId,
  unlessPermissions,
  successPath,
  cancelPath
}) => {
  return (
    mediaPropertyStore.client.utils.B58(JSON.stringify({
      id,
      gate: !!gate,
      type: "purchase",
      listingId,
      sectionSlugOrId,
      sectionItemId,
      actionId,
      permissionItemIds,
      unlessPermissions,
      cancelPath,
      successPath
    }))
  );
};

export const MediaPropertyPurchaseParams = () => {
  const urlParams = new URLSearchParams(location.search);

  let params = {};
  if(urlParams.has("p")) {
    try {
      params = JSON.parse(rootStore.client.utils.FromB58ToStr(urlParams.get("p")));
    } catch(error) {
      rootStore.Log("Failed to parse URL params", true);
      rootStore.Log(error, true);
    }
  }

  if(urlParams.has("confirmationId")) {
    params.confirmationId = urlParams.get("confirmationId");
  }

  return Object.keys(params).length === 0 ? undefined : params;
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

      url = ["Link", "HTML"].includes(mediaItem?.media_type) && MediaItemMediaUrl(mediaItem);
    }
  } else if(sectionItem?.type === "item_purchase") {
    linkPath = match.url;
    // Preserve params
    params = new URLSearchParams(location.search);
    params.set("p", CreateMediaPropertyPurchaseParams({
      id: sectionItem.id,
      sectionSlugOrId: sectionItem?.sectionId || match.params.sectionSlugOrId,
      sectionItemId: sectionItem.id
    }));
  } else if(sectionItem?.type === "page_link") {
    const page = mediaPropertyStore.MediaPropertyPage({...match.params, pageSlugOrId: sectionItem.page_id});

    if(page) {
      const pageSlugOrId = page?.slug || sectionItem.page_id;
      linkPath = MediaPropertyBasePath({mediaPropertySlugOrId: match.params.mediaPropertySlugOrId, pageSlugOrId});
      navContext = undefined;
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

  linkPath = linkPath + (params.size > 0 ? `?${params.toString()}` : "");

  // Purchase gate - include intended path to go to after successful purchase
  const permissions = mediaItem?.resolvedPermissions || sectionItem?.resolvedPermissions || {};
  if(!permissions.authorized && permissions.purchaseGate) {
    params = new URLSearchParams(location.search);
    params.set("p", CreateMediaPropertyPurchaseParams({
      id: mediaItem?.id || sectionItem?.id,
      gate: true,
      permissionItemIds: permissions.permissionItemIds,
      successPath: linkPath
    }));

    linkPath = match.url + `?${params.toString()}`;
    url = undefined;
  } else if(!permissions.authorized && permissions.showAlternatePage) {
    linkPath = MediaPropertyBasePath({
      ...match.params,
      pageSlugOrId: permissions.alternatePageId
    });
    url = undefined;
  }

  return {
    linkPath,
    url
  };
};

export const MediaItemMediaUrl = mediaItem => {
  if(mediaItem.media_type === "Link") {
    return mediaItem.url;
  }

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

export const MediaPropertyMediaBackPath = ({params, navContext}) => {
  const path = location.pathname;
  let pathComponents = path.replace(/^\//, "").split("/");
  let urlParams = new URLSearchParams();

  const currentNavContext = new URLSearchParams(location.search).get("ctx");

  if(navContext) {
    urlParams.set("ctx", navContext);
  }

  if(currentNavContext === "search") {
    pathComponents = UrlJoin(MediaPropertyBasePath(rootStore.routeParams), "search").replace(/^\//, "").split("/");
  } else if(params.mediaItemSlugOrId) {
    pathComponents = pathComponents.slice(0, -2);

    if(params.mediaCollectionSlugOrId && params.mediaListSlugOrId) {
      pathComponents = pathComponents.slice(0, -2);
      urlParams.set("l", params.mediaListSlugOrId);
    } else if(params.sectionSlugOrId && currentNavContext !== "s") {
      // Only go back to section page if we got there from here
      pathComponents = pathComponents.slice(0, -2);
    }
  } else if(params.mediaListSlugOrId || params.mediaCollectionSlugOrId) {
    pathComponents = pathComponents.slice(0, -2);

    if(params.sectionSlugOrId && currentNavContext !== "s") {
      // Only go back to section page if we got there from here
      pathComponents = pathComponents.slice(0, -2);
    }
  } else if(params.sectionSlugOrId) {
    pathComponents = pathComponents.slice(0, -2);
  } else {
    pathComponents = pathComponents.slice(0, -1);
  }

  return "/" + pathComponents.join("/") + (urlParams.size > 0 ? `?${urlParams.toString()}` : "");
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
    const startTime = !!mediaItem.start_time && new Date(mediaItem.start_time);
    const streamStartTime = (!!mediaItem.stream_start_time && new Date(mediaItem.stream_start_time)) || startTime;
    const endTime = !!mediaItem.end_time && new Date(mediaItem.end_time);
    const started = !streamStartTime || now > streamStartTime;
    const ended = !!endTime && now > endTime;
    const displayStartDate = startTime?.toLocaleDateString(rootStore.preferredLocale, {day: "numeric", month: "numeric"}).replace(/0(\d)/g, "$1");
    const displayStartDateLong = startTime?.toLocaleDateString(rootStore.preferredLocale, {day: "numeric", month: "short"}).replace(/0(\d)/g, "$1");
    const displayStartTime = startTime?.toLocaleTimeString(rootStore.preferredLocale, {hour: "numeric", minute: "numeric"}).replace(/^0(\d)/, "$1");

    return {
      startTime,
      streamStartTime,
      endTime,
      isLiveContent: true,
      currentlyLive: started && !ended,
      started,
      ended,
      displayStartDate,
      displayStartDateLong,
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

export const MediaItemLivePreviewImageUrl = async ({mediaItem, width}) => {
  if(!MediaItemScheduleInfo(mediaItem)?.currentlyLive) {
    return;
  }

  const nonce = Date.now();
  const linkHash = LinkTargetHash(mediaItem.media_link);

  const versionHash = await mediaPropertyStore.client.LatestVersionHash({versionHash: linkHash});

  // TODO: Support offering(s)
  const url = new URL(await mediaPropertyStore.client.Rep({
    versionHash,
    rep: "frame/default/video",
    queryParams: width ? {width, nonce} : {nonce}
  }));

  return url.toString();
};

export const MediaItemImageUrl = ({mediaItem, display, aspectRatio, width}) => {
  if(!mediaItem && !display) { return {}; }

  display = display || mediaItem;

  aspectRatio = aspectRatio?.toLowerCase();
  const aspectRatioPreference =
    (mediaItem?.type === "media" && mediaItem?.media_type === "Video") ?
      ["landscape", "square", "portrait"] :
      ["square", "landscape", "portrait"];

  const imageAspectRatio =
    [aspectRatio, ...aspectRatioPreference].find(ratio => display?.[`thumbnail_image_${ratio}`]) || aspectRatioPreference[0];

  let imageUrl = display?.[`thumbnail_image_${imageAspectRatio}`]?.url;

  if(width) {
    imageUrl = SetImageUrlDimensions({url: imageUrl, width});
  }

  return {
    imageUrl,
    imageAspectRatio
  };
};
