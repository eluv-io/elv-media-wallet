import AudioPlayCircleIcon from "Assets/icons/media/blue play bars icon.svg";
import AudioPlayIcon from "Assets/icons/media/bars icon (no circle).svg";
import VideoPlayCircleIcon from "Assets/icons/media/video play icon.svg";
import VideoPlayIcon from "Assets/icons/media/video play icon (no circle).svg";
import {rootStore} from "Stores";
import {toJS} from "mobx";

export const Slugify = str =>
  (str || "")
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9\-]/g,"")
    .replace(/-+/g, "-");

export const RarityToPercentage = (rarity) => {
  if(!rarity) {
    return "";
  }

  rarity = rarity.toString();

  if(!rarity.includes("/")) {
    return rarity;
  }

  const [ numerator, denominator ] = rarity.split("/");
  let percentage = 100 * parseInt(numerator) / parseInt(denominator);

  if(percentage < 1) {
    percentage = percentage.toFixed(2);
  } else {
    percentage = percentage.toFixed(1).toString().replace(".0", "");
  }

  return percentage;
};

export const MediaIcon = (media, circle=false) => {
  switch(media?.media_type) {
    case "Audio":
      return circle ? AudioPlayCircleIcon : AudioPlayIcon;
    case "Video":
      return circle ? VideoPlayCircleIcon : VideoPlayIcon;
    default:
      return circle ? AudioPlayCircleIcon : AudioPlayIcon;
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

    if(nft.details.Cap && parseInt(nft.details.Cap) > 10000000) {
      return nft.details.TokenOrdinal;
    }

    return typeof nft.details.TokenOrdinal !== "undefined" ?
      `${parseInt(nft.details.TokenOrdinal) + 1} / ${nft.details.Cap}` :
      nft.details.TokenIdStr;
  } catch(error) {
    return "";
  }
};

export const MobileOption = (width, desktop, mobile) => {
  return (width < 850 && mobile) || desktop || "";
};

export const LinkTargetHash = (link) => {
  if(!link) { return; }

  if(link["."] && link["."].source) {
    return link["."].source;
  }

  if(link["/"]) {
    return link["/"].split("/").find(segment => segment.startsWith("hq__"));
  }
};

export const FormatNFT = (nft) => {
  if(!nft) {
    return;
  }

  nft = toJS(nft);

  // Surface relevant details to top level
  nft.contractAddress = nft.details.ContractAddr;
  nft.contractId = nft.details.ContractId;
  nft.tokenId = nft.details.TokenIdStr;
  nft.name = nft.metadata.display_name;

  if(nft.details.ListingId) {
    nft.listingId = nft.details.ListingId;
  }

  // Format traits
  const FILTERED_ATTRIBUTES = ["Content Fabric Hash", "Creator", "Total Minted Supply"];
  const traits = (nft.metadata?.attributes || [])
    .filter(attribute => attribute && !FILTERED_ATTRIBUTES.includes(attribute.trait_type));

  if(traits.length > 0) {
    nft.metadata.attributes = traits.map(trait => ({...trait, name: trait.trait_type, rarity_percent: RarityToPercentage(trait.rarity)}));
  }

  // Generate embed URLs for additional media
  if(nft.metadata?.additional_media) {
    nft.metadata.additional_media = nft.metadata.additional_media.map(media => {
      try {
        // Generate embed URLs for additional media
        const mediaType = (media.media_type || "").toLowerCase();

        if(mediaType === "image") {
          return {
            ...media,
            embed_url: media.media_file.url
          };
        }

        let embedUrl = new URL("https://embed.v3.contentfabric.io");
        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("ath", rootStore.authToken);

        if(mediaType === "video") {
          embedUrl.searchParams.set("vid", LinkTargetHash(media.media_link));
          embedUrl.searchParams.set("ct", "h");
          embedUrl.searchParams.set("ap", "");
        } else if(mediaType === "ebook") {
          embedUrl.searchParams.set("type", "ebook");
          embedUrl.searchParams.set("vid", media.media_file["."].container);
          embedUrl.searchParams.set("murl", btoa(media.media_file.url));
        }

        return {
          ...media,
          embed_url: embedUrl.toString()
        };
      } catch(error) {
        return media;
      }
    });
  }

  // Generate embed URLs for pack opening animations
  ["open_animation", "open_animation__mobile", "reveal_animation", "reveal_animation_mobile"].forEach(key => {
    try {
      if(nft.metadata?.pack_options && nft.metadata.pack_options[key]) {
        let embedUrl = new URL("https://embed.v3.contentfabric.io");
        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("ath", rootStore.authToken || rootStore.staticToken);
        embedUrl.searchParams.set("vid", LinkTargetHash(nft.metadata.pack_options[key]));
        embedUrl.searchParams.set("ap", "");

        if(!key.startsWith("reveal")) {
          embedUrl.searchParams.set("m", "");
          embedUrl.searchParams.set("lp", "");
        }

        nft.metadata.pack_options[`${key}_embed_url`] = embedUrl.toString();
      }
      // eslint-disable-next-line no-empty
    } catch(error) {
    }
  });

  return nft;
};
