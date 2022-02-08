import React, {useState} from "react";

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

export const NFTImage = observer(({nft, width, video=false, className=""}) => {
  const [initialized, setInitialized] = useState(false);

  let url;
  if(nft.metadata.image) {
    url = new URL(nft.metadata.image);
    url.searchParams.set("authorization", rootStore.authedToken);

    if(url && width) {
      url.searchParams.set("width", width);
    }
  }

  if(video && (typeof nft.metadata.playable === "undefined" || nft.metadata.playable) && nft.metadata.embed_url) {
    return (
      <div className="card__image-container">
        <div className={`card__image card__image-video-embed ${className}`}>
          <div
            ref={element => {
              if(!element || initialized) { return; }

              setInitialized(true);

              Initialize({
                client: rootStore.client,
                target: element,
                url: nft.metadata.embed_url,
                playerOptions: {
                  capLevelToPlayerSize: true
                }
              });
            }}
            className="card__image-video-embed__frame"
          />
        </div>
      </div>
    );
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
