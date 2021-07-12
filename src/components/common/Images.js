import React from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import SVG from "react-inlinesvg";
import UserIcon from "Assets/icons/user.svg";
import NFTPlaceholderIcon from "Assets/icons/nft";

export const ProfileImage = observer(({height=100, className=""}) => {
  const hasImage = rootStore.initialized && rootStore.profileMetadata.public.profile_image;
  return (
    <div className={`profile-image ${hasImage ? "profile-image-image" : "profile-image-placeholder"} ${className}`}>
      {
        hasImage ?
          <img className="profile-image__image" src={rootStore.ProfileLink({path: "public/profile_image", queryParams: {height}})} alt="Profile Image" /> :
          <SVG src={UserIcon} className="profile-image__placeholder" alt="Profile Image" />
      }
    </div>
  );
});

export const NFTImage = observer(({nft, width, className=""}) => {
  let queryParams = {};
  if(width) {
    queryParams = { width };
  }

  const name = (nft.metadata.nft || {}).name;
  return nft.metadata.display_image ?
    <img
      src={rootStore.PublicLink({versionHash: nft.nftInfo.versionHash, path: "public/display_image", queryParams})}
      className={`nft-image nft-image-image ${className}`}
      alt={name}
    /> :
    <SVG src={NFTPlaceholderIcon} className={`nft-image nft-image-placeholder ${className}`} alt={name} />;
});
