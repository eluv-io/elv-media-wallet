import AudioPlayCircleIcon from "Assets/icons/media/blue play bars icon.svg";
import AudioPlayIcon from "Assets/icons/media/bars icon (no circle).svg";
import VideoPlayCircleIcon from "Assets/icons/media/video play icon.svg";
import VideoPlayIcon from "Assets/icons/media/video play icon (no circle).svg";
import PlayIcon from "Assets/icons/media/Play icon.svg";

import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import Utils from "@eluvio/elv-client-js/src/Utils";

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

export const TimeDiff = (diffSeconds) => {
  let days = Math.floor(Math.max(0, diffSeconds) / 60 / 60 / 24);
  let hours = Math.floor(Math.max(0, diffSeconds) / 60 / 60) % 24;
  let minutes = Math.floor(Math.max(0, diffSeconds) / 60 % 60);
  let seconds = Math.ceil(Math.max(diffSeconds, 0) % 60);

  if(days) {
    return `${days} ${days === 1 ? "day" : "days"} `;
  }

  if(hours) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} `;
  }

  if(minutes) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} `;
  }

  return `${seconds} ${seconds === 1 ? "second" : "seconds"} `;
};

export const Ago = (time) => {
  let diffSeconds = Math.ceil((new Date() - new Date(time)) / 1000);

  return TimeDiff(diffSeconds);
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

const FormatAdditionalMedia = ({metadata={}, versionHash}) => {
  let additionalMedia, additionalMediaType, hasAdditionalMedia;
  if(metadata?.additional_media_type === "Sections") {
    additionalMediaType = "Sections";
    additionalMedia = { ...(metadata?.additional_media_sections || {}) };
    hasAdditionalMedia = additionalMedia.featured_media?.length > 0 ||
      (additionalMedia?.sections || []).find(section => section.collections?.length > 0);

    additionalMedia.type = "Sections";
  } else {
    additionalMediaType = "List";
    hasAdditionalMedia = metadata?.additional_media?.length > 0;
    const display =  metadata.additional_media_display ||
      (typeof metadata.additional_media_display === "undefined" && !metadata.hide_additional_media_player_controls) ? "Album" : "Media";
    additionalMedia = {
      type: "List",
      featured_media: [],
      sections: [{
        id: "list",
        name: display === "Album" ? "Tracks" : "Media",
        isSingleAlbum: display === "Album",
        collections: [{
          id: "list",
          name: name,
          display,
          media: [ ...(metadata?.additional_media || []) ]
        }]
      }]
    };
  }

  if(hasAdditionalMedia) {
    const MediaInfo = ({mediaItem, type, sectionIndex, collectionIndex, mediaIndex}) => {
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
        versionHash,
        selectedMedia: mediaItem,
        selectedMediaPath: path,
        showFullMedia: true
      });
    };

    additionalMedia.featured_media = (additionalMedia.featured_media || []).map((mediaItem, mediaIndex) => ({
      ...mediaItem,
      sectionId: "featured",
      collectionId: "featured",
      mediaIndex,
      mediaInfo: MediaInfo({mediaItem, type: "Featured", mediaIndex})
    }));

    additionalMedia.sections = (additionalMedia.sections || []).map((section, sectionIndex) => ({
      ...section,
      collections: (section.collections || []).map((collection, collectionIndex) => ({
        ...collection,
        media: (collection.media || []).map((mediaItem, mediaIndex) => ({
          ...mediaItem,
          sectionIndex,
          sectionId: section.id,
          collectionIndex,
          collectionId: collection.id,
          mediaIndex,
          mediaInfo: MediaInfo({mediaItem, type: additionalMediaType, sectionIndex, collectionIndex, mediaIndex})
        }))
      }))
    }));
  }

  return {
    additionalMedia,
    additionalMediaType,
    hasAdditionalMedia
  };
};

export const NFTInfo = ({
  nft,
  item,
  listing,
  imageWidth,
  showFullMedia,
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
        ContractAddr: item.nftTemplateMetadata?.address || Utils.nullAddress
      }
    };
  }

  const tenantId = (nft || listing)?.details?.TenantId;
  const ownerAddress = (nft || listing)?.details?.TokenOwner;
  const listingId = nft?.details?.ListingId;
  const price = item ? ItemPrice(item, checkoutStore.currency) : listing?.details?.Price;
  const free = !price || item?.free;
  const usdcAccepted = listing?.details?.USDCAccepted;
  const usdcOnly = listing?.details?.USDCOnly;

  const stock = item && checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const unauthorized = item && item.requires_permissions && !item.authorized;
  const mediaInfo = NFTMediaInfo({nft, item, showFullMedia, width: imageWidth});

  const variant = (item?.nftTemplateMetadata || nft?.metadata).style;

  const name = item?.name || nft.metadata.display_name;
  const subtitle1 = nft.metadata.edition_name;
  const subtitle2 = undefined;

  const isOwned = nft?.details?.TokenOwner && Utils.EqualAddress(nft.details.TokenOwner, rootStore.CurrentAddress());
  const heldDate = nft?.details?.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) && nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

  const timeToAvailable = item && item.available_at ? new Date(item.available_at).getTime() - Date.now() : 0;
  const timeToExpired = item && item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : Infinity;
  const available = !item || timeToAvailable <= 0 && timeToExpired > 0;
  const released = !item || !item.available_at || timeToAvailable <= 0;
  const expired = item && item.expires_at && timeToExpired > 0;
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;
  const marketplacePurchaseAvailable = item && !outOfStock && available && !unauthorized && !maxOwned;
  const hideAvailable = !available || (item && item.hide_available);

  let status;
  if(outOfStock) {
    status = "Sold Out!";
  }

  let renderedPrice;
  if(price) {
    renderedPrice = FormatPriceString(price || {USD: listing.details.Price}, {includeCurrency: !usdcOnly, includeUSDCIcon: usdcAccepted, prependCurrency: true, useCurrencyIcon: false});
  }

  const offers = (nft?.metadata?.redeemable_offers || []).map(offer => {
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
      releaseDate = new Date(offer.available_at).toLocaleDateString("en-US", dateFormat);
      released = Date.now() > new Date(offer.available_at).getTime();
    }

    if(offer.expires_at) {
      expired = Date.now() > new Date(offer.expires_at).getTime();
      expirationDate = new Date(offer.expires_at).toLocaleDateString("en-US", dateFormat);
    }

    let {hide, hide_if_unreleased, hide_if_expired} = (offer.visibility || {});

    let hidden = false;
    if(hide || (hide_if_unreleased && !released) || (hide_if_expired && expired)) {
      hidden = true;
    }

    const state = nft?.details?.Offers?.find(offerDetails => offerDetails.id === offer.offer_id);

    if(state?.redeemer) {
      state.redeemer = Utils.FormatAddress(state.redeemer);
    }

    return {
      ...offer,
      state,
      imageUrl,
      released,
      releaseDate,
      expired,
      expirationDate,
      hidden
    };
  });

  const hasOffers = offers.filter(offer => !offer.hidden).length > 0;

  const { additionalMedia, additionalMediaType, hasAdditionalMedia } = FormatAdditionalMedia({metadata: nft?.metadata, versionHash: nft?.details?.VersionHash});

  let sideText;
  if(item && !hideAvailable && !outOfStock && !expired && !unauthorized && stock && stock.max && stock.max < 10000000) {
    sideText = `${stock.max - stock.minted} / ${stock.max} Available`;
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
    hasOffers,
    offers,

    // Media
    hasAdditionalMedia,
    additionalMediaType,
    additionalMedia,

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
    heldDate
  };
};

export const NFTMediaInfo = ({versionHash, nft, item, selectedMedia, selectedMediaPath, showFullMedia, width}) => {
  let imageUrl, embedUrl, mediaLink, useFrame=false;

  const requiresPermissions = item?.requires_permissions || selectedMedia?.requires_permissions;
  const authToken = requiresPermissions ? rootStore.authToken : rootStore.staticToken;

  if(!selectedMedia && nft && nft.metadata.media && ["Ebook", "HTML"].includes(nft.metadata.media_type)) {
    selectedMedia = {
      media_type: nft.metadata.media_type,
      media_file: nft.metadata.media,
      parameters: nft.metadata.media_parameters
    };
  }

  const selectedMediaImageUrl = selectedMedia && ((selectedMedia.media_type === "Image" && selectedMedia.media_file?.url) || selectedMedia.image);
  if(selectedMediaImageUrl) {
    imageUrl = new URL(selectedMediaImageUrl);

    imageUrl.searchParams.set("authorization", authToken);
    if(imageUrl && width) {
      imageUrl.searchParams.set("width", width);
    }
  }

  if(!imageUrl && ((item && item.image) || nft?.metadata.image)) {
    imageUrl = new URL((item && item.image && item.image.url) || nft?.metadata.image);
    imageUrl.searchParams.set("authorization", authToken);

    if(imageUrl && width) {
      imageUrl.searchParams.set("width", width);
    }
  }

  // TODO: Consolidate embed url determination
  if(showFullMedia) {
    if(selectedMedia && selectedMedia.media_type === "Link") {
      mediaLink = selectedMedia.link;
    } else if((selectedMedia && selectedMedia.media_type === "HTML") && selectedMedia.media_file) {
      const targetHash = LinkTargetHash(selectedMedia.media_file);
      const filePath = selectedMedia.media_file["/"].split("/files/")[1];

      mediaLink = new URL(
        rootStore.network === "demo" ?
          "https://demov3.net955210.contentfabric.io/s/demov3" :
          "https://main.net955305.contentfabric.io/s/main"
      );

      mediaLink.pathname = UrlJoin(mediaLink.pathname, "q", targetHash, "files", filePath);

      (selectedMedia.parameters || []).forEach(({name, value}) =>
        mediaLink.searchParams.set(name, value)
      );

      useFrame = true;
    } else if((selectedMedia && selectedMedia.media_type === "Ebook" && selectedMedia.media_file)) {
      embedUrl = new URL("https://embed.v3.contentfabric.io");

      embedUrl.searchParams.set("p", "");
      embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
      embedUrl.searchParams.set("type", "ebook");
      embedUrl.searchParams.set("vid", selectedMedia.media_file["."].container);
      embedUrl.searchParams.set("murl", Utils.B64(selectedMedia.media_file.url));
      useFrame = true;
    } else if(selectedMedia && selectedMedia.media_type === "Gallery" && selectedMedia.gallery) {
      embedUrl = new URL("https://embed.v3.contentfabric.io");

      embedUrl.searchParams.set("p", "");
      embedUrl.searchParams.set("mt", "g");
      embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
      embedUrl.searchParams.set("vid", versionHash);
      embedUrl.searchParams.set("ln", Utils.B64(selectedMediaPath));
      embedUrl.searchParams.set("ht", "");
    } else if((selectedMedia && ["Audio", "Video"].includes(selectedMedia.media_type) && selectedMedia.media_link)) {
      embedUrl = new URL("https://embed.v3.contentfabric.io");

      embedUrl.searchParams.set("p", "");
      embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
      embedUrl.searchParams.set("vid", LinkTargetHash(selectedMedia.media_link));
      embedUrl.searchParams.set("ct", "h");
      embedUrl.searchParams.set("ap", "");
    } else if(item && item.video) {
      embedUrl = new URL("https://embed.v3.contentfabric.io");

      embedUrl.searchParams.set("p", "");
      embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
      embedUrl.searchParams.set("vid", LinkTargetHash(item.video));
      embedUrl.searchParams.set("ap", "");
      embedUrl.searchParams.set("lp", "");
      embedUrl.searchParams.set("m", "");

      if(item?.nftTemplateMetadata?.has_audio) {
        embedUrl.searchParams.set("ct", "h");
      }
    } else if(!selectedMedia && (typeof nft?.metadata.playable === "undefined" || nft?.metadata.playable) && nft?.metadata.embed_url) {
      embedUrl = new URL(nft?.metadata.embed_url);
    }

    if(embedUrl) {
      embedUrl.searchParams.set("nwm", "");

      if(requiresPermissions) {
        embedUrl.searchParams.set("ath", authToken);
      }
    }
  }

  return {
    imageUrl,
    embedUrl,
    mediaLink,
    requiresPermissions,
    useFrame
  };
};

export const MobileOption = (width, desktop, mobile) => {
  return (width < 850 && mobile) || desktop || "";
};

export const LinkTargetHash = (link) => {
  if(!link) { return; }

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
