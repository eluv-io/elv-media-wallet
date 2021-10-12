import React, {useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import SVG from "react-inlinesvg";
import UserIcon from "Assets/icons/user.svg";
import NFTPlaceholderIcon from "Assets/icons/nft";
import ImageIcon from "Components/common/ImageIcon";

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
  const [loaded, setLoaded] = useState(video && nft.metadata.embed_url || nft.metadata.image);

  let url = new URL(nft.metadata.image);
  url.searchParams.set("authorization", rootStore.authedToken);

  if(url && width) {
    url.searchParams.set("width", width);
  }

  if(video && (typeof nft.metadata.playable === "undefined" || nft.metadata.playable) && nft.metadata.embed_url) {
    return (
      <div className="card__image-container">
        <div className={`card__image card__image-video-embed ${className}`}>
          <iframe
            className="card__image-video-embed__frame"
            src={nft.metadata.embed_url}
            allowFullScreen
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
            onLoad={() => setLoaded(true)}
            src={url.toString()}
            className={`card__image ${loaded ? "" : "card__image-loading"} ${className}`}
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

export const MarketplaceImage = ({marketplaceHash, item, title, path, url, icon, templateImage=false, className=""}) => {
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

  return (
    <div className={`card__image-container ${className}`}>
      <ImageIcon
        title={title || item && item.name || ""}
        icon={url || icon || NFTPlaceholderIcon}
        alternateIcon={NFTPlaceholderIcon}
        className={`card__image ${className}`}
      />
    </div>
  );
};
