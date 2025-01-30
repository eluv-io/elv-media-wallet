import {LinkTargetHash, NFTInfo, SetImageUrlDimensions, StaticFabricUrl} from "./Utils";
import UrlJoin from "url-join";
import {mediaPropertyStore, rootStore} from "Stores";

export const MediaPropertyBasePath = (params, {includePage=true}={}) => {
  if(!params.mediaPropertySlugOrId) { return "/"; }

  let parentPage = params.parentPageSlugOrId && params.parentPageSlugOrId !== "main" ? params.parentPageSlugOrId : "";
  if(parentPage) {
    parentPage = mediaPropertyStore.MediaPropertyPage({
      mediaPropertySlugOrId: params.parentMediaPropertySlugOrId,
      pageSlugOrId: parentPage,
      permissionRedirect: false
    })?.slug || parentPage;
  }

  let page = params.pageSlugOrId && params.pageSlugOrId !== "main" ? params.pageSlugOrId : "";
  if(page) {
    page = mediaPropertyStore.MediaPropertyPage({
      mediaPropertySlugOrId: params.mediaPropertySlugOrId,
      pageSlugOrId: page,
      permissionRedirect: false
    })?.slug || page;
  }
  let path = params.parentMediaPropertySlugOrId ?
    UrlJoin("/", params.parentMediaPropertySlugOrId, parentPage, "p", params.mediaPropertySlugOrId, (includePage && page) || "") :
    UrlJoin("/", params.mediaPropertySlugOrId, (includePage && page) || "");

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
  secondaryPurchaseOption,
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
      secondaryPurchaseOption,
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

export const CreateRedeemableParams = ({
  marketplaceId,
  marketplaceSKU,
  contractAddress,
  tokenId,
  offerId
}) => {
  return (
    mediaPropertyStore.client.utils.B58(JSON.stringify({
      marketplaceId,
      marketplaceSKU,
      contractAddress,
      tokenId,
      offerId
    }))
  );
};

export const PurchaseParamsToItems = (params, secondaryEnabled) => {
  if(!params || params.type !== "purchase") {
    return [];
  }

  let purchaseItems = [];
  if(params.permissionItemIds) {
    purchaseItems = (
      params.permissionItemIds
        .map(permissionItemId => mediaPropertyStore.PermissionItem({permissionItemId}))
        .filter(item => item)
    );
  } else if(params.sectionItemId) {
    const section = mediaPropertyStore.MediaPropertySection({...rootStore.routeParams, sectionSlugOrId: params.sectionSlugOrId});

    if(section?.type === "hero") {
      const matchingItem = section.hero_items?.find(heroItem => heroItem.id === params.sectionItemId);
      const action = matchingItem?.actions?.find(action => action.id === params.actionId);

      if(action) {
        purchaseItems = (
          (action.items || [])
            .map(item => ({
              ...item,
              ...(mediaPropertyStore.permissionItems[item.permission_item_id] || {}),
              id: item.id
            }))
            .filter(item => item)
        );
      }
    } else if(section) {
      const matchingItem = section.content?.find(sectionItem => sectionItem.id === params.sectionItemId);

      if(matchingItem) {
        purchaseItems = (
          (matchingItem.items || [])
            .map(item => ({
              ...item,
              ...(mediaPropertyStore.permissionItems[item.permission_item_id] || {}),
              id: item.id
            }))
            .filter(item => item)
        );
      }
    }
  }

  let items = (
    purchaseItems
      // Filter non-purchasable items
      .map(item => {
        const marketplaceItem = rootStore.marketplaces[item.marketplace?.marketplace_id]?.items
          ?.find(marketplaceItem => marketplaceItem.sku === item.marketplace_sku);

        const itemInfo = NFTInfo({item: marketplaceItem});

        return {
          ...item,
          marketplaceItem,
          price: itemInfo.price,
          purchasable: (
            !!item.secondary_market_purchase_option ||
            secondaryEnabled ||
            marketplaceItem && itemInfo?.marketplacePurchaseAvailable
          )
        };
      })
  );

  // For purchase gate, hide all non-purchasable items and sort by price
  if(params.gate) {
    items = items
      .filter(item => !params.gate || item.purchasable)
      .sort((a, b) => a.price < b.price ? -1 : 1);
  }

  return items;
};

export const MediaPropertyLink = ({match, sectionItem, mediaItem, navContext}) => {
  if(sectionItem?.type === "visual_only") {
    return {
      authorized: true
    };
  }

  let linkPath = MediaPropertyBasePath(match.params);

  mediaItem = mediaItem || sectionItem?.mediaItem;
  let params = new URLSearchParams();

  if(match.params.sectionSlugOrId) {
    linkPath = UrlJoin(linkPath, "s", match.params.sectionSlugOrId);
  }

  let url, purchaseItems;
  if(mediaItem || sectionItem?.type === "media") {
    if(match.params.mediaCollectionSlugOrId) {
      linkPath = UrlJoin(linkPath, "c", match.params.mediaCollectionSlugOrId);
    }

    if(match.params.mediaListSlugOrId) {
      linkPath = UrlJoin(linkPath, "l", match.params.mediaListSlugOrId);
    }

    const mediaId = mediaItem?.id || sectionItem?.media_id;

    if((mediaItem?.type || sectionItem?.media_type) === "collection") {
      linkPath = UrlJoin(linkPath, "c", mediaId);
    } else if((mediaItem?.type || sectionItem?.media_type) === "list") {
      linkPath = UrlJoin(linkPath, "l", mediaId);
    } else if((mediaItem?.type || sectionItem?.media_type) === "media") {
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
    const purchaseParams = {
      type: "purchase",
      id: sectionItem.id,
      sectionSlugOrId: sectionItem?.sectionId || match.params.sectionSlugOrId,
      sectionItemId: sectionItem.id
    };

    purchaseItems = PurchaseParamsToItems(
      purchaseParams,
      sectionItem?.resolvedPermissions?.secondaryPurchaseOption
    );

    params.set("p", CreateMediaPropertyPurchaseParams(purchaseParams));
  } else if(sectionItem?.type === "page_link") {
    const page = mediaPropertyStore.MediaPropertyPage({...match.params, pageSlugOrId: sectionItem.page_id});

    if(page) {
      const pageSlugOrId = page?.slug || sectionItem.page_id;
      linkPath = MediaPropertyBasePath({...match.params, pageSlugOrId});
      navContext = undefined;
    }
  } else if(sectionItem?.type === "property_link") {
    linkPath = MediaPropertyBasePath({
      mediaPropertySlugOrId: mediaPropertyStore.MediaPropertyIdToSlug(sectionItem.property_id) || sectionItem.property_id,
      pageSlugOrId: sectionItem.property_page_id
    });
  } else if(sectionItem?.type === "subproperty_link") {
    linkPath = MediaPropertyBasePath({
      ...match.params,
      parentMediaPropertySlugOrId: match.params.parentMediaPropertySlugOrId || match.params.mediaPropertySlugOrId,
      parentPageId: typeof match.params.parentPageSlugOrId !== "undefined" ? match.params.parentPageSlugOrId : match.params.pageSlugOrId,
      mediaPropertySlugOrId: mediaPropertyStore.MediaPropertyIdToSlug(sectionItem.subproperty_id) || sectionItem.subproperty_id,
      pageSlugOrId: sectionItem.subproperty_page_id && sectionItem.subproperty_page_id !== "main" ? sectionItem.subproperty_page_id : ""
    });
  } else if(sectionItem?.type === "marketplace_link") {
    const marketplaceId = sectionItem.marketplace?.marketplace_id;

    if(marketplaceId) {
      const sku = sectionItem.marketplace_sku || "";
      linkPath = UrlJoin("/marketplace", marketplaceId, "store", sku);
    }
  } else if(sectionItem?.type === "external_link") {
    linkPath = undefined;
    url = sectionItem.url;
  } else if(sectionItem?.type === "redeemable_offer") {
    linkPath = match.url;
    params = new URLSearchParams(location.search);
    params.set("r", CreateRedeemableParams({
      marketplaceId: sectionItem.marketplace?.marketplace_id,
      marketplaceSKU: sectionItem.marketplace_sku,
      offerId: sectionItem.offer_id
    }));
  }

  if(navContext) {
    params.set("ctx", navContext);
  }

  linkPath = !linkPath ? undefined : linkPath + (params.size > 0 ? `?${params.toString()}` : "");

  // Purchase gate - include intended path to go to after successful purchase
  const permissions = mediaItem?.resolvedPermissions || sectionItem?.resolvedPermissions || {};
  if(!permissions.authorized && permissions.purchaseGate) {
    params = new URLSearchParams(location.search);
    params.set("p", CreateMediaPropertyPurchaseParams({
      id: mediaItem?.id || sectionItem?.id,
      gate: true,
      permissionItemIds: permissions.permissionItemIds,
      secondaryPurchaseOption: permissions.secondaryPurchaseOption,
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
    url,
    purchaseItems: purchaseItems || [],
    authorized: permissions?.authorized
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
    const displayStartDate = startTime?.toLocaleDateString?.(rootStore.preferredLocale, {day: "numeric", month: "numeric"}).replace(/0(\d)/g, "$1");
    const displayStartDateLong = startTime?.toLocaleDateString?.(rootStore.preferredLocale, {day: "numeric", month: "short"}).replace(/0(\d)/g, "$1");
    const displayStartTime = startTime?.toLocaleTimeString?.(rootStore.preferredLocale, {hour: "numeric", minute: "numeric"}).replace(/^0(\d)/, "$1");

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
    // eslint-disable-next-line no-console
    console.error(mediaItem);

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

  if(!linkHash) { return; }

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
    imageAspectRatio,
    altText: display.thumbnail_alt_text
  };
};
