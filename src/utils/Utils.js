import AudioPlayCircleIcon from "Assets/icons/media/blue play bars icon.svg";
import AudioPlayIcon from "Assets/icons/media/bars icon (no circle).svg";
import VideoPlayCircleIcon from "Assets/icons/media/video play icon.svg";
import VideoPlayIcon from "Assets/icons/media/video play icon (no circle).svg";
import PlayIcon from "Assets/icons/media/Play icon.svg";

import React from "react";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {FormatPriceString} from "Components/common/UIComponents";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";

export const Slugify = str =>
  (str || "")
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9\-]/g,"")
    .replace(/-+/g, "-");

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

export const NFTInfo = ({
  nft,
  item,
  selectedListing,
  price,
  usdcAccepted,
  usdcOnly,
  stock,
  imageWidth,
  showFullMedia,
  showToken,
  hideAvailable,
  truncateDescription,
  selectedMediaIndex=-1,
}) => {
  if(selectedListing) {
    nft = selectedListing;
  } else if(item && !nft) {
    nft = {
      metadata: item.nftTemplateMetadata
    };
  }

  const selectedMedia = (selectedMediaIndex >= 0 && (nft.metadata.additional_media || [])[selectedMediaIndex]);
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const expired = item && item.expires_at && new Date(item.expires_at).getTime() - Date.now() < 0;
  const unauthorized = item && item.requires_permissions && !item.authorized;
  const mediaInfo = NFTMediaInfo({nft, item, selectedMedia, showFullMedia, width: imageWidth});

  const variant = (item?.nftTemplateMetadata || nft?.metadata).style;

  const name = selectedMedia?.name || nft.metadata.display_name;
  const subtitle1 = selectedMedia ? selectedMedia.subtitle_1 : nft.metadata.edition_name;
  const subtitle2 = selectedMedia ? selectedMedia.subtitle_2 : undefined;

  let sideText;
  if(item && !hideAvailable && !outOfStock && !expired && !unauthorized && stock &&stock.max && stock.max < 10000000) {
    sideText = `${stock.max - stock.minted} / ${stock.max}`;
  } else if(!item && showToken) {
    sideText = NFTDisplayToken(nft);
  }

  sideText = sideText ? sideText.toString().split("/") : undefined;

  let status;
  if(outOfStock) {
    status = "Sold Out!";
  }

  let renderedPrice;
  if(price) {
    renderedPrice = FormatPriceString(price || {USD: selectedListing.details.Price}, {includeCurrency: !usdcOnly, includeUSDCIcon: usdcAccepted, prependCurrency: true, useCurrencyIcon: false});
  }

  return {
    nft,
    name,
    subtitle1,
    subtitle2,
    variant,
    sideText,
    price,
    renderedPrice,
    status,
    selectedMedia,
    selectedMediaIndex,
    mediaInfo,
    expired,
    unauthorized,
    outOfStock
  };
};

export const NFTMediaInfo = ({nft, item, selectedMedia, showFullMedia, width}) => {
  let imageUrl, embedUrl, mediaLink, useFrame=false;

  if(!selectedMedia && nft.metadata.media && ["Ebook", "HTML"].includes(nft.metadata.media_type)) {
    selectedMedia = {
      media_type: nft.metadata.media_type,
      media_file: nft.metadata.media,
      parameters: nft.metadata.media_parameters
    };
  }

  const selectedMediaImageUrl = selectedMedia && ((selectedMedia.media_type === "Image" && selectedMedia.media_file?.url) || selectedMedia.image);
  if(selectedMediaImageUrl) {
    imageUrl = new URL(selectedMediaImageUrl);

    imageUrl.searchParams.set("authorization", rootStore.authToken || rootStore.staticToken);
    if(imageUrl && width) {
      imageUrl.searchParams.set("width", width);
    }
  }

  if(!imageUrl && ((item && item.image) || nft.metadata.image)) {
    imageUrl = new URL((item && item.image && item.image.url) || nft.metadata.image);
    imageUrl.searchParams.set("authorization", rootStore.authToken || rootStore.staticToken);

    if(imageUrl && width) {
      imageUrl.searchParams.set("width", width);
    }
  }

  // TODO: Consolidate embed url determination
  if(showFullMedia) {
    if((selectedMedia && selectedMedia.media_type === "HTML") && selectedMedia.media_file) {
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
      embedUrl.searchParams.set("murl", btoa(selectedMedia.media_file.url));
      useFrame = true;
    } else if((selectedMedia && ["Audio", "Video"].includes(selectedMedia.media_type) && selectedMedia.media_link)) {
      embedUrl = new URL("https://embed.v3.contentfabric.io");

      embedUrl.searchParams.set("p", "");
      embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
      embedUrl.searchParams.set("vid", LinkTargetHash(selectedMedia.media_link));
      embedUrl.searchParams.set("ct", "h");
      embedUrl.searchParams.set("ap", "");
      embedUrl.searchParams.set("ath", rootStore.authToken || rootStore.staticToken);
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
    } else if(!selectedMedia && (typeof nft.metadata.playable === "undefined" || nft.metadata.playable) && nft.metadata.embed_url) {
      embedUrl = new URL(nft.metadata.embed_url);
    }

    if(embedUrl) {
      embedUrl.searchParams.set("nwm", "");
    }
  }

  return {
    imageUrl,
    embedUrl,
    mediaLink,
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
