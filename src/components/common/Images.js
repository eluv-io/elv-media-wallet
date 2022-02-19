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

export const NFTImage = observer(({nft, item, selectedMedia, width, video=false, className=""}) => {
  const [initialized, setInitialized] = useState(false);
  const [player, setPlayer] = useState(undefined);

  useEffect(() => {
    if(player) {
      player.Destroy();
      setPlayer(undefined);
    }

    setInitialized(false);
  }, [selectedMedia]);

  let url;
  if(selectedMedia && selectedMedia.media_type === "Image" && selectedMedia.media_file) {
    window.mediaUrl = selectedMedia.media_file;
    url = new URL(selectedMedia.media_file.url);
    url.searchParams.set("authorization", selectedMedia.requires_permissions ? rootStore.authedToken : rootStore.staticToken);

    if(url && width) {
      url.searchParams.set("width", width);
    }
  } else if(item && item.image || nft.metadata.image) {
    url = new URL((item && item.image && item.image.url) || nft.metadata.image);
    url.searchParams.set("authorization", rootStore.authedToken);

    if(url && width) {
      url.searchParams.set("width", width);
    }
  }

  if(video) {
    let embedUrl;
    if((selectedMedia && selectedMedia.media_type === "Video" && selectedMedia.media_link)) {
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
      embedUrl.searchParams.set("ct", "h");
      embedUrl.searchParams.set("ap", "");
    } else if(!selectedMedia && (typeof nft.metadata.playable === "undefined" || nft.metadata.playable) && nft.metadata.embed_url) {
      embedUrl = new URL(nft.metadata.embed_url);
    }

    if(embedUrl) {
      return (
        <div className="card__image-container" key={`media-${embedUrl}`}>
          <div className={`card__image card__image-video-embed ${className}`}>
            <div
              key={`media-element-${embedUrl}`}
              ref={async element => {
                if(!element || initialized) { return; }

                setInitialized(true);

                setPlayer(
                  await Initialize({
                    client: rootStore.client,
                    target: element,
                    url: embedUrl.toString(),
                    playerOptions: {
                      capLevelToPlayerSize: true
                    }
                  })
                );
              }}
              className="card__image-video-embed__frame"
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="card__image-container">
      {
        nft.metadata.image ?
          <img
            src={url.toString()}
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
