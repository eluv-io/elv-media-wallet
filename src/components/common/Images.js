import React, {useEffect, useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import SVG from "react-inlinesvg";
import UserIcon from "Assets/icons/user.svg";
import NFTPlaceholderIcon from "Assets/icons/nft";
import ImageIcon from "Components/common/ImageIcon";
import {Initialize} from "@eluvio/elv-embed/src/Embed";

export const ProfileImage = observer(({className=""}) => {
  const hasImage = rootStore.initialized && rootStore.userProfile.profileImage;
  return (
    <div className={`profile-image ${hasImage ? "profile-image-image" : "profile-image-placeholder"} ${className}`}>
      {
        hasImage ?
          <img className="profile-image__image" src={rootStore.userProfile.profileImage} alt="Profile Image" /> :
          <SVG src={UserIcon} className="profile-image__placeholder" alt="Profile Image" />
      }
    </div>
  );
});

export const NFTImage = observer(({nft, item, selectedMedia, width, video=false, className="", playerCallback}) => {
  const [player, setPlayer] = useState(undefined);
  const [media, setMedia] = useState({imageUrl: undefined, embedUrl: undefined});
  const [targetElement, setTargetElement] = useState(undefined);

  useEffect(() => () => player && player.Destroy(), []);

  useEffect(() => {
    if(!targetElement || !media.embedUrl) { return; }

    const posterUrl = selectedMedia && selectedMedia.media_type === "Audio" && media.imageUrl ? media.imageUrl.toString() : undefined;
    Initialize({
      client: rootStore.client,
      target: targetElement,
      url: media.embedUrl.toString(),
      playerOptions: {
        posterUrl,
        capLevelToPlayerSize: true,
        playerCallback
      }
    }).then(player => setPlayer(player));
  }, [targetElement]);

  useEffect(() => {
    setMedia({imageUrl: undefined, embedUrl: undefined});

    if(player) {
      player.Destroy();
      setPlayer(undefined);
    }

    let imageUrl, embedUrl;

    const selectedMediaImageUrl = selectedMedia && ((selectedMedia.media_type === "Image" && selectedMedia.media_file?.url) || selectedMedia.image);
    if(selectedMediaImageUrl) {
      imageUrl = new URL(selectedMediaImageUrl);

      imageUrl.searchParams.set("authorization", selectedMedia.requires_permissions ? rootStore.authedToken : rootStore.staticToken);
      if(imageUrl && width) {
        imageUrl.searchParams.set("width", width);
      }
    }

    if(!imageUrl && ((item && item.image) || nft.metadata.image)) {
      imageUrl = new URL((item && item.image && item.image.url) || nft.metadata.image);
      imageUrl.searchParams.set("authorization", rootStore.authedToken);

      if(imageUrl && width) {
        imageUrl.searchParams.set("width", width);
      }
    }

    if(video) {
      if((selectedMedia && ["Audio", "Video"].includes(selectedMedia.media_type) && selectedMedia.media_link)) {
        embedUrl = new URL("https://embed.v3.contentfabric.io");
        const videoHash = ((selectedMedia.media_link["/"] && selectedMedia.media_link["/"].split("/").find(component => component.startsWith("hq__")) || selectedMedia.media_link["."].source));

        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("vid", videoHash);
        embedUrl.searchParams.set("ct", "h");
        embedUrl.searchParams.set("ap", "");
        embedUrl.searchParams.set("ath", selectedMedia.requires_permissions ? rootStore.authedToken : rootStore.staticToken);
      } else if(item && item.video) {
        embedUrl = new URL("https://embed.v3.contentfabric.io");
        const videoHash = ((item.video["/"] && item.video["/"].split("/").find(component => component.startsWith("hq__")) || item.video["."].source));

        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("vid", videoHash);
        embedUrl.searchParams.set("ap", "");
        embedUrl.searchParams.set("lp", "");

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

    setMedia({imageUrl, embedUrl});
  }, [selectedMedia]);

  if(media?.embedUrl) {
    return (
      <div className="card__image-container" key={`media-${media.embedUrl}`}>
        <div className={`card__image card__image-video-embed ${className}`}>
          <div ref={element => setTargetElement(element)} className="card__image-video-embed__frame" />
        </div>
      </div>
    );
  }

  return (
    <div className="card__image-container" ref={() => playerCallback && playerCallback(undefined)}>
      {
        media?.imageUrl ?
          <img
            src={media.imageUrl.toString()}
            className={`card__image ${className}`}
            alt={nft.metadata.display_name}
          /> :
          <SVG
            src={NFTPlaceholderIcon}
            className={`card__image ${className}`}
            alt={nft.metadata.display_name}
          />
      }
    </div>
  );
});

export const MarketplaceImage = ({marketplaceHash, item, title, path, url, icon, templateImage=false, rawImage=false, className=""}) => {
  if(!(url || icon)) {
    if(!item || item.image && (!templateImage || !item.nft_template || !item.nft_template.nft || !item.nft_template.nft.image)) {
      url = rootStore.PublicLink({
        versionHash: marketplaceHash,
        path,
        queryParams: {
          width: 800
        }
      });
    } else if(item.nft_template && item.nft_template.nft && item.nft_template.nft.image) {
      url = (item.nft_template.nft || {}).image;
      url = new URL(url);
      url.searchParams.set("authorization", rootStore.authedToken);
      url.searchParams.set("width", "800");
      url = url.toString();
    } else {
      icon = NFTPlaceholderIcon;
      className = `card__image-placeholder ${className}`;
    }
  }

  const image = (
    <ImageIcon
      title={title || item && item.name || ""}
      icon={url || icon || NFTPlaceholderIcon}
      alternateIcon={NFTPlaceholderIcon}
      className={rawImage ? className : `card__image ${className}`}
    />
  );

  if(rawImage) {
    return image;
  }

  return (
    <div className={`card__image-container ${className}`}>
      { image }
    </div>
  );
};
