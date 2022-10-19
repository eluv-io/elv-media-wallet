import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, useHistory, useRouteMatch} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {MediaLinkPath, NavigateToMedia} from "Components/nft/media/Utils";

import SkipBackIcon from "Assets/icons/media/skip back icon";
import PauseIcon from "Assets/icons/media/Pause icon";
import PlayIcon from "Assets/icons/media/Play icon";
import SkipForwardIcon from "Assets/icons/media/skip forward icon";
import ShuffleIcon from "Assets/icons/media/shuffle icon";
import LoopIcon from "Assets/icons/media/loop icon";
import AudioPlayCircleIcon from "Assets/icons/media/blue play bars icon";
import AudioPlayIcon from "Assets/icons/media/bars icon (no circle)";
import VideoPlayCircleIcon from "Assets/icons/media/video play icon";
import VideoPlayIcon from "Assets/icons/media/video play icon (no circle)";

const MediaIcon = (media, circle=false) => {
  switch(media?.media_type) {
    case "Audio":
      return circle ? AudioPlayCircleIcon : AudioPlayIcon;
    case "Video":
      return circle ? VideoPlayCircleIcon : VideoPlayIcon;
    default:
      return PlayIcon;
  }
};

const Shuffle = (list, currentIndex) => {
  let shuffledList = list
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  if(currentIndex >= 0) {
    // If shuffle was hit when an item was currently selected, assume that item is first item of shuffled list
    shuffledList = [currentIndex, ...(shuffledList.filter(index => index !== currentIndex))];
  }

  return shuffledList;
};

const UpdateVideoCallbacks = ({match, order, loop, history, currentVideoElement, videoElement, setPlaying}) => {
  const SetPlaying = event => {
    setPlaying(!event.target.paused || false);
  };

  const PlayNext = () => {
    const currentIndex = order.findIndex(mediaIndex => mediaIndex.toString() === match.params.mediaIndex.toString());

    if(typeof order[currentIndex + 1] !== "undefined") {
      NavigateToMedia({match, history, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: order[currentIndex + 1]});
    } else if(loop) {
      NavigateToMedia({match, history, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: order[0]});
    }
  };

  if(currentVideoElement) {
    currentVideoElement.removeEventListener("play", SetPlaying);
    currentVideoElement.removeEventListener("pause", SetPlaying);
    currentVideoElement.removeEventListener("ended", PlayNext);
  }

  if(videoElement) {
    videoElement.addEventListener("play", SetPlaying);
    videoElement.addEventListener("pause", SetPlaying);
    videoElement.addEventListener("ended", PlayNext);
  }
};

const AlbumControls = observer(({videoElement, media}) => {
  const match = useRouteMatch();
  const history = useHistory();

  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [order, setOrder] = useState(media.map((_, index) => index));
  const [playing, setPlaying] = useState(videoElement?.paused);
  const [currentVideoElement, setCurrentVideoElement] = useState(videoElement);

  const currentIndex = parseInt(match.params.mediaIndex);
  const currentMedia = media[currentIndex]?.mediaItem;

  useEffect(() => {
    UpdateVideoCallbacks({match, history, order, loop, currentVideoElement, videoElement, setPlaying});

    setCurrentVideoElement(videoElement);
  }, [videoElement, order, loop]);

  const selectedTitle = currentMedia ? [currentMedia.name, currentMedia.subtitle_1, currentMedia.subtitle_2].filter(str => str).join(" - ") : "";
  return (
    <div className="media-controls">
      <div className="media-controls__left">
        <button
          disabled={!loop && currentIndex === order[0]}
          onClick={() => {
            let newMediaIndex = order.slice(-1)[0];

            const prevIndex = order.findIndex(mediaIndex => mediaIndex === currentIndex) - 1;
            if(prevIndex >= 0) {
              newMediaIndex = order[prevIndex];
            }

            NavigateToMedia({match, history, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: newMediaIndex});
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
              if(videoElement) {
                videoElement.paused ? videoElement.play() : videoElement.pause();
              }
            }}
          />
        </button>
        <button
          disabled={!loop && currentIndex === order.slice(-1)[0]}
          onClick={() => {
            let newMediaIndex = order[0];
            const nextIndex = order.findIndex(mediaIndex => mediaIndex === currentIndex) + 1;
            if(nextIndex < order.length) {
              newMediaIndex = order[nextIndex];
            }

            NavigateToMedia({match, history, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: newMediaIndex});
          }}
          className="media-controls__button"
        >
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
        <button
          onClick={() => {
            const newOrder = shuffle ? media.map((_, index) => index) : Shuffle(order, currentIndex);
            setOrder(newOrder);
            setShuffle(!shuffle);
          }}
          className={`action action-selection media-controls__toggle ${shuffle ? "action-selection--active media-controls__toggle--active" : ""}`}
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
          }}
          className={`action action-selection media-controls__toggle ${loop ? "action-selection--active media-controls__toggle--active" : ""}`}
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
});

const AlbumView = observer(({media, videoElement, showPlayerControls}) => {
  const match = useRouteMatch();

  if(!media) {
    return;
  }

  useEffect(() => {
    setTimeout(() => {
      const activeElement = document.querySelector(".nft-media-album__album-view__media--selected");
      if(activeElement) {
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY,
          behavior: "smooth"
        });
      }
    }, 1);
  }, [match.params.mediaIndex]);

  return (
    <div className="nft-media-album__album-view">
      <div className={`nft-media-album__album-view__media-container ${showPlayerControls ? "nft-media-album__album-view__media-container--with-controls" : ""}`}>
        { media.map((mediaInfo, mediaIndex) => {
          const item = mediaInfo.mediaItem;
          const isSelected = mediaIndex.toString() === match.params.mediaIndex;

          let image;
          if(item.image) {
            const url = new URL(typeof item.image === "string" ? item.image : item.image.url);
            url.searchParams.set("width", "600");
            image = url.toString();
          }

          return (
            <Link
              key={`alternate-media-${mediaIndex}`}
              className={`nft-media-album__album-view__media ${isSelected ? "nft-media-album__album-view__media--selected" : ""}`}
              to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex})}
            >
              <div className="nft-media-album__album-view__media__track-number">{mediaIndex + 1}</div>
              <div className="nft-media-album__album-view__media__image-container">
                {
                  image ?
                    <ImageIcon icon={image} title={item.name} className="nft-media-album__album-view__media__image" /> :
                    <div className="nft-media-album__album-view__media__image nft-media-album__album-view__media__image--fallback" />
                }
                { isSelected ? <ImageIcon icon={MediaIcon(item, true)} className="nft-media-album__album-view__media__selected-indicator" title="Selected" /> : null }
              </div>
              <div className="nft-media-album__album-view__media__details">
                <ResponsiveEllipsis
                  component="h2"
                  className="nft-media-album__album-view__media__name"
                  text={(item.name || "").replace(/\d+\.\w?/, "")}
                  title={item.name || ""}
                  maxLine="2"
                />
                <div className="nft-media-album__album-view__media__subtitles">
                  <h3 className="nft-media-album__album-view__media__subtitle-1 ellipsis" title={item.subtitle_1 || ""}>{item.subtitle_1 || ""}</h3>
                  <h3 className="nft-media-album__album-view__media__subtitle-2 ellipsis" title={item.subtitle_2 || ""}>{item.subtitle_2 || ""}</h3>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      { showPlayerControls ? <AlbumControls media={media} videoElement={videoElement} /> : null }
    </div>
  );
});

export default AlbumView;
