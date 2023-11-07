import AudioPlayCircleIcon from "Assets/icons/media/blue play bars icon.svg";
import AudioPlayIcon from "Assets/icons/media/bars icon (no circle).svg";
import VideoPlayCircleIcon from "Assets/icons/media/video play icon.svg";
import VideoPlayIcon from "Assets/icons/media/video play icon (no circle).svg";
import PlayIcon from "Assets/icons/media/Play icon.svg";

import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import {FormatPriceString, LocalizeString} from "Components/common/UIComponents";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {mediaTypes} from "@eluvio/elv-embed/src/Utils";

export const Slugify = str =>
  (str || "")
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9\-]/g,"")
    .replace(/-+/g, "-");


// Closure for saving values until a discriminant changes, e.g. page number or filters
export const SavedValue = (initialValue, initialDiscriminant) => {
  let value = initialValue;
  let discriminant = initialDiscriminant;

  return {
    GetValue: (currentDiscriminant) => {
      if(currentDiscriminant !== discriminant) {
        value = initialValue;
      }

      return value;
    },
    SetValue: (newValue, newDiscriminant) => {
      value = newValue;
      discriminant = newDiscriminant;
    },
    Reset: () => {
      value = initialValue;
      discriminant = initialDiscriminant;
    }
  };
};

export const SearchParams = () => {
  let params = {};
  const urlParameters = (new URL(document.location)).searchParams;
  // Some cases (ebanx) might blindly add search parameters to the end of the URL without considering the hash
  const hashUrlParameters = new URLSearchParams("?" + window.location.hash.split(/[?&]/).slice(1).join("&"));

  for(const [key, value] of urlParameters.entries()) {
    params[key] = value;
  }

  for(const [key, value] of hashUrlParameters.entries()) {
    params[key] = value;
  }

  return params;
};

export const MediaIcon = (media, circle=false) => {
  switch(media?.media_type) {
    case "Audio":
      return circle ? AudioPlayCircleIcon : AudioPlayIcon;
    case "Video":
      return circle ? VideoPlayCircleIcon : VideoPlayIcon;
    default:
      return PlayIcon;
  }
};

export const TimeDiff = (diffSeconds, includeAgo) => {
  let days = Math.floor(Math.max(0, diffSeconds) / 60 / 60 / 24);
  let hours = Math.floor(Math.max(0, diffSeconds) / 60 / 60) % 24;
  let minutes = Math.floor(Math.max(0, diffSeconds) / 60 % 60);
  let seconds = Math.ceil(Math.max(diffSeconds, 0) % 60);

  const loc = rootStore.l10n[includeAgo ? "ago" : "time"];

  if(days) {
    return LocalizeString(loc[days === 1 ? "day" : "days"], {days}, {stringOnly: true});
  }

  if(hours) {
    return LocalizeString(loc[hours === 1 ? "hour" : "hours"], {hours}, {stringOnly: true});
  }

  if(minutes) {
    return LocalizeString(loc[minutes === 1 ? "minute" : "minutes"], {minutes}, {stringOnly: true});
  }

  return LocalizeString(loc[seconds === 1 ? "second" : "seconds"], {seconds}, {stringOnly: true});
};

export const Ago = (time, includeAgo=true) => {
  let diffSeconds = Math.ceil((new Date() - new Date(time)) / 1000);

  return TimeDiff(diffSeconds, includeAgo);
};

export const MiddleEllipsis = (str="", maxLength=8) => {
  if(str.length <= maxLength) {
    return str;
  }

  const perSide = Math.floor(maxLength / 2);

  return `${str.slice(0, perSide)} ... ${str.slice(str.length - perSide, str.length)}`;
};

export const ValidEmail = email => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    .test(email);
};

export const ScrollTo = (top=0, target) => {
  // Don't scroll to 0 by default, it will cause the header to un-minimize. Should only scroll to 0 if the page is already scrolled to 0.
  if(!target) {
    top = Math.max(top, Math.min(window.scrollY, 1));
  } else {
    top = target.getBoundingClientRect().top + window.scrollY + top;
  }

  // Mobile has a bug that prevents scroll top from working
  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.scrollTo(0, top);
  } else {
    window.scrollTo({top, behavior: "smooth"});
  }
};

export const Debounce = (f, ms) => {
  let lastUpdate = 0;
  let timeout;

  return (args) => {
    const diff = performance.now() - lastUpdate;

    if(diff > ms) {
      lastUpdate = performance.now();
      f(args);
    } else {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        lastUpdate = performance.now();
        f(args);
      }, ms - diff);
    }
  };
};

export const SetImageUrlDimensions = ({url, height, width}) => {
  if(!url) { return ""; }

  url = new URL(url);
  if(width) {
    url.searchParams.set("width", width);
  } else if(height) {
    url.searchParams.set("height", height);
  }

  return url.toString();
};

export const NFTDisplayToken = nft => {
  try {
    if(!nft || !nft.details) {
      return "";
    }

    const cap = nft.details.Cap && parseInt(nft.details.Cap) < 10000000 ? nft.details.Cap.toString() : undefined;
    const ordinal = typeof nft.details.TokenOrdinal !== "undefined" ? nft.details.TokenOrdinal + 1 : undefined;
    const tokenId = nft.details.TokenIdStr.toString();

    switch(nft.metadata?.id_format) {
      case "token_id":
        return `# ${tokenId}`;

      case "token_id/cap":
        return cap ? `${tokenId} / ${cap}` : tokenId;

      case "ordinal":
        return ordinal || tokenId;

      // ordinal/cap
      default:
        if(!ordinal) {
          return tokenId;
        }

        return cap ? `${ordinal} / ${cap}` : ordinal;

    }
  } catch(error) {
    return nft?.details?.TokenIdStr || "";
  }
};

const FormatAdditionalMedia = ({nft, name, metadata={}}) => {
  let additionalMedia, additionalMediaType, hasAdditionalMedia;
  let watchedMediaIds = [];

  if(metadata?.additional_media_type === "Sections") {
    additionalMediaType = "Sections";
    additionalMedia = { ...(metadata?.additional_media_sections || {}) };
    hasAdditionalMedia = additionalMedia.featured_media?.length > 0 ||
      (additionalMedia?.sections || []).find(section => section.collections?.length > 0);

    additionalMedia.type = "Sections";
  } else {
    additionalMediaType = "List";
    hasAdditionalMedia = metadata?.additional_media?.length > 0;

    const display = metadata.additional_media_display || "Media";
    additionalMedia = {
      type: "List",
      featured_media: [],
      isSingleAlbum: display === "Album",
      isSingleList: display !== "Album",
      sections: [{
        id: "list",
        name: display === "Album" ? "Tracks" : "Media",
        collections: [{
          id: "list",
          name,
          display,
          media: [ ...(metadata?.additional_media || []) ]
        }]
      }]
    };
  }

  if(hasAdditionalMedia) {
    const MediaInfo = ({mediaItem, type, sectionIndex, collectionIndex, mediaIndex, watchedMediaIds}) => {
      type = type.toLowerCase();
      mediaIndex = mediaIndex.toString();
      let path = "/public/asset_metadata/nft";
      if(type === "list") {
        path = UrlJoin(path, "additional_media", mediaIndex);
      } else if(type === "featured") {
        path = UrlJoin(path, "additional_media_sections", "featured_media", mediaIndex);
      } else {
        path = UrlJoin(path, "additional_media_sections", "sections", sectionIndex.toString(), "collections", collectionIndex.toString(), "media", mediaIndex);
      }

      return NFTMediaInfo({
        nft,
        selectedMedia: mediaItem,
        selectedMediaPath: path,
        watchedMediaIds,
        requiresPermissions: true
      });
    };

    additionalMedia.featured_media = (additionalMedia.featured_media || []).map((mediaItem, mediaIndex) => {
      if(mediaItem.required) {
        watchedMediaIds.push(mediaItem.id);
      }

      return {
        ...mediaItem,
        sectionId: "featured",
        collectionId: "featured",
        mediaIndex,
        mediaInfo: MediaInfo({mediaItem, type: "Featured", mediaIndex, watchedMediaIds})
      };
    });

    (additionalMedia.sections || []).forEach(({collections}) =>
      collections.forEach(({media}) =>
        media.forEach(mediaItem => {
          if(mediaItem.locked && mediaItem.locked_state.lock_condition === "View Media") {
            watchedMediaIds = [...watchedMediaIds, ...mediaItem.locked_state.required_media];
          }
        })
      )
    );

    additionalMedia.sections = (additionalMedia.sections || []).map((section, sectionIndex) => ({
      ...section,
      collections: (section.collections || []).map((collection, collectionIndex) => ({
        ...collection,
        media: (collection.media || []).map((mediaItem, mediaIndex) => {
          return {
            ...mediaItem,
            sectionIndex,
            sectionId: section.id,
            collectionIndex,
            collectionId: collection.id,
            mediaIndex,
            mediaInfo: MediaInfo({mediaItem, type: additionalMediaType, sectionIndex, collectionIndex, mediaIndex, watchedMediaIds})
          };
        })
      }))
    }));
  }

  return {
    additionalMedia,
    additionalMediaType,
    hasAdditionalMedia,
    watchedMediaIds
  };
};

export const NFTInfo = ({
  nft,
  item,
  listing,
  imageWidth,
  showToken
}) => {
  if(listing) {
    nft = {
      ...(nft || {}),
      ...listing,
      details: {
        ...(nft?.details || {}),
        ...listing.details
      },
      metadata: {
        ...(nft?.metadata || {}),
        ...listing.metadata
      }
    };
  } else if(item && !nft) {
    nft = {
      metadata: item.nftTemplateMetadata,
      details: {
        VersionHash: item.nftTemplateHash,
        ContractAddr: item.nftTemplateMetadata?.address || Utils.nullAddress
      }
    };
  }

  const tenantId = (nft || listing)?.details?.TenantId;
  const ownerAddress = (nft || listing)?.details?.TokenOwner;
  const listingId = nft?.details?.ListingId;
  const price = item ? item?.price?.USD : listing?.details?.Price;
  const free = !price || item?.free;

  const usdcAccepted = listing?.details?.SolUSDCAccepted || listing?.details?.EthUSDCAccepted;
  const usdcOnly = listing?.details?.SolUSDCOnly || listing?.details?.EthUSDCOnly;

  const stock = item && checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const unauthorized = item && item.requires_permissions && !item.authorized;

  const variant = (item?.nftTemplateMetadata || nft?.metadata)?.style;

  const name = item?.name || nft.metadata.display_name;
  const subtitle1 = item?.subtitle || nft.metadata.edition_name;
  const subtitle2 = undefined;

  const isOwned = nft?.details?.TokenOwner && Utils.EqualAddress(nft.details.TokenOwner, rootStore.CurrentAddress());
  const heldDate = nft?.details?.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) && nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

  const timeToAvailable = item && item.available_at ? new Date(item.available_at).getTime() - Date.now() : 0;
  const timeToExpired = item && item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : Infinity;
  const available = !item || timeToAvailable <= 0 && timeToExpired > 0;
  const released = !item || !item.available_at || timeToAvailable <= 0;
  const expired = item && item.expires_at && timeToExpired < 0;
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;
  const marketplacePurchaseAvailable = item && item.for_sale && !outOfStock && available && !unauthorized && !maxOwned;
  const hideAvailable = !available || (item && item.hide_available);

  const timeToSecondaryAvailable = nft?.metadata?.secondary_resale_available_at ? new Date(nft.metadata.secondary_resale_available_at).getTime() - Date.now() : 0;
  const timeToSecondaryExpired = nft?.metadata?.secondary_resale_expires_at ? new Date(nft.metadata.secondary_resale_expires_at).getTime() - Date.now() : Infinity;
  const secondaryAvailable = timeToSecondaryAvailable <= 0 && timeToSecondaryExpired > 0;
  const secondaryReleased = !nft?.metadata?.secondary_resale_available_at  || timeToSecondaryAvailable <= 0;
  const secondaryReleaseDate = nft?.metadata?.secondary_resale_available_at ? new Date(nft.metadata.secondary_resale_available_at).toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) : undefined;
  const secondaryExpirationDate = nft?.metadata?.secondary_resale_expires_at ? new Date(nft.metadata.secondary_resale_expires_at).toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) : undefined;
  const offerable = nft?.details.TokenIdStr && !nft?.metadata?.test && !heldDate;

  let status;
  if(outOfStock) {
    status = "Sold Out!";
  }

  let renderedPrice;
  if(price) {
    renderedPrice = FormatPriceString(price || listing?.details?.Price || 0, {includeCurrency: !usdcOnly, includeUSDCIcon: usdcAccepted, prependCurrency: true, useCurrencyIcon: false});
  }

  const redeemables = (nft?.metadata?.redeemable_offers || []).map(offer => {
    let imageUrl;
    if(offer.image && offer.image.url) {
      imageUrl = new URL(offer.image.url);
      imageUrl.searchParams.set("width", "1000");
      imageUrl.searchParams.set("authorization", rootStore.staticToken);
      imageUrl = imageUrl.toString();
    }

    const dateFormat = { year: "numeric", month: "long", day: "numeric" };

    let released = true;
    let expired = false;
    let releaseDate, expirationDate;
    if(offer.available_at) {
      releaseDate = new Date(offer.available_at).toLocaleDateString(navigator.languages, dateFormat);
      released = Date.now() > new Date(offer.available_at).getTime();
    }

    if(offer.expires_at) {
      expired = Date.now() > new Date(offer.expires_at).getTime();
      expirationDate = new Date(offer.expires_at).toLocaleDateString(navigator.languages, dateFormat);
    }

    let {hide, hide_if_unreleased, hide_if_expired} = (offer.visibility || {});

    let hidden = false;
    if(hide || (hide_if_unreleased && !released) || (hide_if_expired && expired)) {
      hidden = true;
    }

    let state = nft?.details?.Offers?.find(offerDetails => offerDetails.id === offer.offer_id);

    if(!state) {
      rootStore.Log(`Redeemable offer ${offer.name} (${offer.offer_id}) has no corresponding offer in NFT details`, "warn");
    }

    if(state?.redeemer) {
      state = { ...state, redeemer: Utils.FormatAddress(state.redeemer) };
    }

    return {
      ...offer,
      featured: offer.visibility.featured,
      state,
      imageUrl,
      released,
      releaseDate,
      expired,
      expirationDate,
      hidden
    };
  });

  const hasRedeemables = redeemables.filter(offer => !offer.hidden).length > 0;
  const hasFeaturedRedeemables = redeemables.filter(offer => !offer.hidden && offer.featured).length > 0;

  const { additionalMedia, additionalMediaType, hasAdditionalMedia, watchedMediaIds } = FormatAdditionalMedia({nft, name, metadata: nft?.metadata, versionHash: nft?.details?.VersionHash});
  const mediaInfo = NFTMedia({nft, item, width: imageWidth});

  let sideText;
  if(item && !hideAvailable && !outOfStock && !expired && !unauthorized && stock && stock.max && stock.max < 10000000) {
    const available = stock.max - stock.minted;
    sideText = `${available} / ${stock.max} ${rootStore.l10n.item_details[available === 1 ? "available_single" : "available"]}`;
  } else if(!item && showToken) {
    sideText = NFTDisplayToken(nft);
  }

  sideText = sideText ? sideText.toString().split("/") : undefined;

  return {
    // Details
    nft,
    item,
    ownerAddress,
    tenantId,
    listing,
    listingId,
    name,
    subtitle1,
    subtitle2,
    variant,
    sideText,

    // Price
    price,
    free,
    renderedPrice,
    usdcAccepted,
    usdcOnly,

    // Media
    mediaInfo,

    // Offers
    hasRedeemables,
    hasFeaturedRedeemables,
    redeemables,

    // Media
    hasAdditionalMedia,
    additionalMediaType,
    additionalMedia,
    watchedMediaIds,

    // Status
    stock,
    status,
    marketplacePurchaseAvailable,
    available,
    timeToAvailable,
    timeToExpired,
    released,
    expired,
    maxOwned,
    unauthorized,
    outOfStock,
    isOwned,

    // Secondary market status
    heldDate,
    offerable,
    secondaryAvailable,
    secondaryReleased,
    secondaryReleaseDate,
    secondaryExpirationDate,
    timeToSecondaryAvailable,
    timeToSecondaryExpired
  };
};

// Primary NFT media
export const NFTMedia = ({nft, item, width}) => {
  if(nft && ["HTML", "Ebook"].includes(nft.metadata.media_type)) {
    return NFTMediaInfo({
      nft,
      item
    });
  }

  let mediaType = "image";
  let embedUrl, imageUrl;
  if(item?.video) {
    embedUrl = new URL("https://embed.v3.contentfabric.io");
    embedUrl.searchParams.set("vid", LinkTargetHash(item.video));

    if(item.video_has_audio) {
      embedUrl.searchParams.set("ct", "h");
      embedUrl.searchParams.delete("m");
      embedUrl.searchParams.delete("ap");
      embedUrl.searchParams.delete("lp");
    } else {
      embedUrl.searchParams.delete("ct");
      embedUrl.searchParams.set("m", "");
      embedUrl.searchParams.set("ap", "");
      embedUrl.searchParams.set("lp", "");
    }
  } else if(nft?.metadata?.embed_url && nft.metadata.playable) {
    embedUrl = new URL(nft.metadata.embed_url);

    if(nft.metadata.has_audio) {
      embedUrl.searchParams.set("ct", "h");
      embedUrl.searchParams.delete("m");
      embedUrl.searchParams.delete("ap");
      embedUrl.searchParams.delete("lp");
    } else {
      embedUrl.searchParams.delete("ct");
      embedUrl.searchParams.set("m", "");
      embedUrl.searchParams.set("ap", "");
      embedUrl.searchParams.set("lp", "");
    }
  }

  if(embedUrl) {
    embedUrl.searchParams.set("nwm", "");
    embedUrl.searchParams.set("p", "");
    embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");

    if(item?.requires_permissions && rootStore.authToken) {
      embedUrl.searchParams.set("ath", rootStore.authToken);
    }

    mediaType = nft?.metadata?.media_type === "Audio" ? "audio" : "video";
  }

  if(nft?.metadata?.media_type === "Image" && nft.metadata.media) {
    imageUrl = nft.metadata.media.url;

    if(embedUrl) {
      embedUrl.searchParams.set("type", "Image");
      embedUrl.searchParams.set("murl", btoa(nft.metadata.media.url));
    }
  } else if(item?.image) {
    imageUrl = typeof item.image === "string" ? item.image : item.image.url;
  } else {
    imageUrl = item?.nftTemplateMetadata?.image || nft?.metadata?.image;
  }

  if(imageUrl && width) {
    imageUrl = new URL(imageUrl);
    imageUrl.searchParams.set("width", width);
    imageUrl = imageUrl.toString();
  }

  return {
    embedUrl,
    imageUrl,
    mediaType
  };
};

// Additional media
export const NFTMediaInfo = ({nft, item, selectedMedia, selectedMediaPath, requiresPermissions, watchedMediaIds=[], width}) => {
  let embedUrl = new URL("https://embed.v3.contentfabric.io");
  let imageUrl, mediaLink, mediaType, viewRecordKey, recordView=false, useFrame=false;

  const versionHash = item ? item.nftTemplateHash : nft?.details?.VersionHash;

  if(!selectedMedia) {
    selectedMedia = {
      media_type: nft.metadata.media_type,
      media_file: nft.metadata.media,
      parameters: nft.metadata.media_parameters,
      image: nft.metadata.image
    };
  }

  imageUrl = selectedMedia.image;
  mediaType = (selectedMedia.media_type || "Image").toLowerCase();

  const embedMediaTypeParameter = Object.keys(mediaTypes).find(key => mediaTypes[key].toLowerCase() === mediaType.toLowerCase());
  if(embedMediaTypeParameter) {
    embedUrl.searchParams.set("mt", embedMediaTypeParameter);
  }

  switch(mediaType) {
    case "embedded webpage":
      mediaLink = selectedMedia.link;
      break;

    case "link":
      mediaLink = selectedMedia.link;

      if(selectedMedia.authorized_link) {
        try {
          mediaLink = new URL(mediaLink);
          mediaLink.searchParams.set("authorization", rootStore.authToken);
          mediaLink = mediaLink.toString();
        } catch(error) {
          rootStore.Log(error);
        }
      }

      break;

    case "gallery":
      embedUrl.searchParams.set("vid", versionHash);
      embedUrl.searchParams.set("ln", Utils.B64(selectedMediaPath));
      embedUrl.searchParams.set("ht", "");
      break;

    case "ebook":
    case "html":
    case "image":
      const targetHash = LinkTargetHash(selectedMedia.media_file || selectedMedia.image) || versionHash;
      embedUrl.searchParams.set("vid", targetHash);

      if(selectedMedia.media_file) {
        mediaLink = new URL(
          rootStore.network === "demo" ?
            "https://demov3.net955210.contentfabric.io/s/demov3" :
            "https://main.net955305.contentfabric.io/s/main"
        );

        const filePath = selectedMedia.media_file["/"].split("/files/")[1];
        mediaLink.pathname = UrlJoin(mediaLink.pathname, "q", targetHash, "files", filePath);

        (selectedMedia.parameters || []).forEach(({name, value}) =>
          mediaLink.searchParams.set(name, value)
        );

        if(requiresPermissions && rootStore.authToken) {
          mediaLink.searchParams.set("authorization", rootStore.authToken);
        }
      } else {
        mediaLink = selectedMedia.image;
      }

      if(mediaLink) {
        const murl = new URL(mediaLink.toString());
        if(requiresPermissions && rootStore.authToken) {
          // Remove authroization token from the murl in the embed url, as the embed auth token parameter will be used
          murl.searchParams.delete("authorization");
        }

        embedUrl.searchParams.set("murl", Utils.B64(murl.toString()));
      }

      break;

    case "audio":
    case "video":
    case "live video":
    default:
      // Fall back to image if video is not set properly for some reason
      if(!selectedMedia.media_link) {
        mediaLink = selectedMedia.image;
        mediaType = "image";

        if(mediaLink) {
          embedUrl.searchParams.set("murl", Utils.B64(mediaLink.toString()));
        }

        break;
      }

      embedUrl.searchParams.set("vid", LinkTargetHash(selectedMedia.media_link) || versionHash);
      embedUrl.searchParams.set("ct", "h");
      embedUrl.searchParams.set("ap", "");

      if(selectedMedia.offerings?.length > 0) {
        embedUrl.searchParams.set("off", selectedMedia.offerings.map(o => (o || "").toString().trim()).join(","));
      }

      if(selectedMedia.embed_url_parameters) {
        try {
          Object.keys(selectedMedia.embed_url_parameters).map(key =>
            embedUrl.searchParams.set(key, selectedMedia.embed_url_parameters[key])
          );
        } catch(error) {
          rootStore.Log(`Unable to parse embed URL parameters for ${selectedMedia.name}:`, true);
          rootStore.Log(selectedMedia.embed_url_parameters);
          rootStore.Log(error, true);
        }
      }

      break;
  }

  embedUrl.searchParams.set("nwm", "");
  embedUrl.searchParams.set("p", "");
  embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");

  if(watchedMediaIds.includes(selectedMedia?.id)) {
    recordView = true;

    if(embedUrl && nft) {
      const key = rootStore.MediaViewKey({
        contractAddress: nft.details.ContractAddr,
        tokenId: nft.details.TokenIdStr,
        mediaId: selectedMedia.id,
        preview: !nft.details.TokenIdStr
      });

      embedUrl.searchParams.set("vrk", Utils.B64(`${rootStore.appId}:${key}`));
      viewRecordKey = key;
    }
  }

  if(requiresPermissions && rootStore.authToken) {
    embedUrl.searchParams.set("ath", rootStore.authToken);
  }

  if(imageUrl && width) {
    imageUrl = new URL(imageUrl);
    imageUrl.searchParams.set("width", width);
    imageUrl = imageUrl.toString();
  }

  return {
    imageUrl,
    embedUrl,
    mediaLink,
    mediaType,
    viewRecordKey,
    requiresPermissions,
    recordView,
    useFrame
  };
};

export const MobileOption = (width, desktop, mobile) => {
  return (width < 850 && mobile) || desktop || "";
};

export const LinkTargetHash = (link) => {
  if(!link) { return; }

  if(typeof link === "string") {
    return link.split("/").find(segment => segment.startsWith("hq__"));
  }

  if(link["."] && link["."].source) {
    return link["."].source;
  }

  if(link["/"] && link["/"].startsWith("/qfab/")) {
    return link["/"].split("/").find(segment => segment.startsWith("hq__"));
  }

  if(link["."] && link["."].container) {
    return link["."].container;
  }
};

export const StaticFabricUrl = ({libraryId, objectId, versionHash, path="", authToken, resolve=true, width}) => {
  let url = new URL(
    rootStore.network === "main" ?
      "https://main.net955305.contentfabric.io" :
      "https://demov3.net955210.contentfabric.io"
  );

  let urlPath = UrlJoin("s", rootStore.network);
  if(authToken) {
    urlPath = UrlJoin("t", authToken);
  }

  if(versionHash) {
    urlPath = UrlJoin(urlPath, "q", writeToken || versionHash, path);
  } else {
    urlPath = UrlJoin(urlPath, "qlibs", libraryId, "q", writeToken || objectId, path);
  }

  url.pathname = urlPath;

  if(resolve) {
    url.searchParams.set("resolve", "true");
  }

  if(width) {
    url.searchParams.set("width", width);
  }

  return url.toString();
};

export const ActionPopup = async ({url, onMessage, onCancel}) => {
  await new Promise(resolve => {
    const newWindow = window.open(url);

    const closeCheck = setInterval(async () => {
      if(newWindow.closed) {
        clearInterval(closeCheck);

        if(onCancel) {
          await onCancel();
        }

        resolve();
      }
    }, 500);

    window.addEventListener("message", async event => {
      await onMessage(
        event,
        () => {
          clearInterval(closeCheck);
          newWindow.close();
          resolve();
        }
      );
    });
  });
};

export const IsFullscreen = () => {
  const fullscreenElement = (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

  // Ignore fullscreen video case - player will handle that case
  return fullscreenElement && !fullscreenElement.classList.contains("eluvio-player");
};

export const ToggleFullscreen = (target) => {
  if(IsFullscreen()) {
    if(document.exitFullscreen) {
      document.exitFullscreen();
    } else if(document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if(document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if(document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  } else {
    if(target.requestFullscreen) {
      target.requestFullscreen({navigationUI: "hide"});
    } else if(target.mozRequestFullScreen) {
      target.mozRequestFullScreen({navigationUI: "hide"});
    } else if(target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen({navigationUI: "hide"});
    } else if(target.msRequestFullscreen) {
      target.msRequestFullscreen({navigationUI: "hide"});
    } else {
      // iPhone - Use native fullscreen on video element only
      target.querySelector("img, video, iframe").webkitEnterFullScreen();
    }
  }
};
