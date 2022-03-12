import React, {useEffect, useState} from "react";
import ImageIcon from "Components/common/ImageIcon";
import {rootStore} from "Stores";
import {MediaIcon} from "../../utils/Utils";

import PlayIcon from "Assets/icons/media/Play icon.svg";
import PauseIcon from "Assets/icons/media/Pause icon.svg";
import SkipBackIcon from "Assets/icons/media/skip back icon.svg";
import SkipForwardIcon from "Assets/icons/media/skip forward icon.svg";
import ShuffleIcon from "Assets/icons/media/shuffle icon.svg";
import LoopIcon from "Assets/icons/media/loop icon.svg";

const Shuffle = (list, selectedMediaIndex) => {
  let shuffledList = list
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  if(selectedMediaIndex >= 0) {
    // If shuffle was hit when an item was currently selected, assume that item is first item of shuffled list
    shuffledList = [selectedMediaIndex, ...(shuffledList.filter(index => index !== selectedMediaIndex))];
  }

  return shuffledList;
};

const UpdateCallbacks = ({newVideo, oldVideo, order, loop, selectedMediaIndex, setPlaying, setSelectedMediaIndex}) => {
  const SetPlaying = event => {
    setPlaying(!event.target.paused || false);
  };

  const PlayNext = () => {
    const currentIndex = order.findIndex(mediaIndex => mediaIndex === selectedMediaIndex);

    if(typeof order[currentIndex + 1] !== "undefined") {
      setSelectedMediaIndex(order[currentIndex + 1]);
    } else if(loop) {
      setSelectedMediaIndex(order[0]);
    }
  };

  if(oldVideo) {
    oldVideo.removeEventListener("play", SetPlaying);
    oldVideo.removeEventListener("pause", SetPlaying);
    oldVideo.removeEventListener("ended", PlayNext);
  }

  if(newVideo) {
    newVideo.addEventListener("play", SetPlaying);
    newVideo.addEventListener("pause", SetPlaying);
    newVideo.addEventListener("ended", PlayNext);
  }
};

const ScrollToMedia = (selectedMedia, containerElement) => {
  if(containerElement) {
    const top = containerElement.getBoundingClientRect().top;

    if(selectedMedia?.media_type !== "Audio" && top < 0) {
      window.scrollTo({top: Math.max(0, window.scrollY + top - 20), behavior: "smooth"});
    }
  }
};

const NFTMediaControls = ({nft, containerElement, selectedMediaIndex, orderKey, setSelectedMediaIndex, currentPlayerInfo}) => {
  let media = nft.metadata.additional_media || [];
  const isOwned = nft.details && rootStore.NFTInfo({contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr});

  if(!isOwned) {
    media = media.filter(item => !item.requires_permissions);
  }

  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);

  const [videoElement, setVideoElement] = useState(undefined);
  const [playing, setPlaying] = useState(false);
  const [order, setOrder] = useState(media.map((_, index) => index));

  useEffect(() => {
    // If selected item was changed externally and shuffle is active, we need to reshuffle the order
    if(shuffle) {
      setOrder(Shuffle(order, selectedMediaIndex));
    }
  }, [orderKey]);

  useEffect(() => {
    if(selectedMediaIndex < 0) {
      setPlaying(false);
      return;
    }

    if(videoElement !== currentPlayerInfo?.videoElement) {
      UpdateCallbacks({
        newVideo: currentPlayerInfo?.videoElement,
        oldVideo: videoElement,
        order,
        loop,
        selectedMediaIndex,
        setPlaying,
        setSelectedMediaIndex
      });

      setVideoElement(currentPlayerInfo?.videoElement);
    }

  }, [currentPlayerInfo]);

  const selectedMedia = media[selectedMediaIndex];
  const selectedTitle = selectedMedia ? [selectedMedia.name, selectedMedia.subtitle_1, selectedMedia.subtitle_2].filter(str => str).join(" - ") : "";
  return (
    <div className="media-controls">
      <div className="media-controls__left">
        <button
          disabled={!loop && selectedMediaIndex === order[0]}
          onClick={() => {
            let newMediaIndex = order.slice(-1)[0];

            const prevIndex = order.findIndex(mediaIndex => mediaIndex === selectedMediaIndex) - 1;
            if(prevIndex >= 0) {
              newMediaIndex = order[prevIndex];
            }

            setSelectedMediaIndex(newMediaIndex);
            ScrollToMedia(media[newMediaIndex], containerElement);
          }}
          className="media-controls__button"
        >
          <ImageIcon icon={SkipBackIcon} className="media-controls__button-icon" title="Skip Back" />
        </button>
        <button className="media-controls__button media-controls__button--play-pause">
          <ImageIcon
            icon={playing ? PauseIcon : PlayIcon}
            className="media-controls__button-icon"
            title={playing ? "Pause" : "Play"}
            onClick={() => {
              if(selectedMediaIndex < 0) {
                setSelectedMediaIndex(order[0]);

                if(!playing) {
                  ScrollToMedia(media[order[0]], containerElement);
                }

                return;
              }

              if(videoElement) {
                videoElement.paused ? videoElement.play() : videoElement.pause();
              }

              if(!playing) {
                ScrollToMedia(selectedMedia, containerElement);
              }
            }}
          />
        </button>
        <button
          disabled={!loop && selectedMediaIndex === order.slice(-1)[0]}
          onClick={() => {
            let newMediaIndex = order[0];
            const nextIndex = order.findIndex(mediaIndex => mediaIndex === selectedMediaIndex) + 1;
            if(nextIndex < order.length) {
              newMediaIndex = order[nextIndex];
            }

            setSelectedMediaIndex(newMediaIndex);
            ScrollToMedia(media[newMediaIndex], containerElement);
          }}
          className="media-controls__button"
        >
          <ImageIcon icon={SkipForwardIcon} className="media-controls__button-icon" title="Skip Forward" />
        </button>
      </div>
      <div className="media-controls__title">
        { selectedMediaIndex >=0 ? <ImageIcon icon={MediaIcon(media[selectedMediaIndex], false)} label="Audio Icon" className="media-controls__title__icon" /> : null }
        <div className="media-controls__title__text scroll-text" title={selectedTitle}>
          <span>
            { selectedTitle }
          </span>
        </div>
      </div>
      <div className="media-controls__right">
        <button
          onClick={() => {
            const newOrder = shuffle ? media.map((_, index) => index) : Shuffle(order, selectedMediaIndex);
            setOrder(newOrder);
            setShuffle(!shuffle);

            // Must update callbacks so order is correct
            UpdateCallbacks({
              newVideo: videoElement,
              oldVideo: videoElement,
              order: newOrder,
              loop,
              selectedMediaIndex,
              setPlaying,
              setSelectedMediaIndex
            });
          }}
          className={`media-controls__toggle ${shuffle ? "media-controls__toggle--active" : ""}`}
        >
          <ImageIcon
            icon={ShuffleIcon}
            className="media-controls__button-icon"
            title={shuffle ? "Disable Shuffle" : "Enable Shuffle"}
          />
        </button>
        <button
          onClick={() => {
            setLoop(!loop);

            // Must update callbacks so loop behavior is correct
            UpdateCallbacks({
              newVideo: videoElement,
              oldVideo: videoElement,
              order,
              loop: !loop,
              selectedMediaIndex,
              setPlaying,
              setSelectedMediaIndex
            });
          }}
          className={`media-controls__toggle ${loop ? "media-controls__toggle--active" : ""}`}
        >
          <ImageIcon
            icon={LoopIcon}
            className="media-controls__button-icon"
            title={loop ? "Disable Loop" : "Enable Loop"}
          />
        </button>
      </div>
    </div>
  );
};

export default NFTMediaControls;
