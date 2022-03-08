import React from "react";
import ImageIcon from "Components/common/ImageIcon";

import PlayIcon from "Assets/icons/media/Play icon.svg";
import PauseIcon from "Assets/icons/media/Pause icon.svg";
import SkipBackIcon from "Assets/icons/media/skip back icon.svg";
import SkipForwardIcon from "Assets/icons/media/skip forward icon.svg";
import ShuffleIcon from "Assets/icons/media/shuffle icon.svg";
import LoopIcon from "Assets/icons/media/loop icon.svg";
import {rootStore} from "Stores";

const NFTMediaControls = ({nft, selectedMediaIndex, setSelectedMediaIndex}) => {
  let media = nft.metadata.additional_media || [];
  const isOwned = nft.details && rootStore.NFTInfo({contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr});

  if(!isOwned) {
    media = media.filter(item => !item.requires_permissions);
  }

  const selectedMedia = media[selectedMediaIndex];
  const selectedTitle = selectedMedia ? `${selectedMedia.name} - ${selectedMedia.subtitle_1} - ${selectedMedia.subtitle_2}` : "";
  return (
    <div className="media-controls">
      <div className="media-controls__left">
        <button className="media-controls__button">
          <ImageIcon icon={SkipBackIcon} className="media-controls__button-icon" title="Skip Back" />
        </button>
        <button className="media-controls__button media-controls__button--play-pause">
          <ImageIcon icon={PlayIcon} className="media-controls__button-icon" title="Play" />
        </button>
        <button className="media-controls__button">
          <ImageIcon icon={SkipForwardIcon} className="media-controls__button-icon" title="Skip Forward" />
        </button>
      </div>
      <div className="media-controls__title">
        <div className="media-controls__title__text scroll-text" title={selectedTitle}>
          <span>
            { selectedTitle }
          </span>
        </div>
      </div>
      <div className="media-controls__right">
        <button className="media-controls__toggle">
          <ImageIcon icon={ShuffleIcon} className="media-controls__button-icon" title="Play" />
        </button>
        <button className="media-controls__toggle">
          <ImageIcon icon={LoopIcon} className="media-controls__button-icon" title="Play" />
        </button>
      </div>
    </div>
  );
};

export default NFTMediaControls;
