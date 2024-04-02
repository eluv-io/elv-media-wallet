import {SetImageUrlDimensions, StaticFabricUrl} from "./Utils";
import UrlJoin from "url-join";
import {mediaPropertyStore, rootStore} from "Stores";

export const MediaPropertyBasePath = params => {
  if(!params.mediaPropertySlugOrId) { return "/"; }

  return params.parentMediaPropertySlugOrId ?
    UrlJoin("/properties", params.parentMediaPropertySlugOrId, params.parentPageSlugOrId || "", "p", params.mediaPropertySlugOrId) :
    UrlJoin("/properties", params.mediaPropertySlugOrId);
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
