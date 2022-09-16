import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, NavLink, useHistory, useRouteMatch} from "react-router-dom";
import {NFTInfo, NFTMediaInfo} from "../../utils/Utils";
import {MintedNFTDetails} from "Components/nft/NFTDetails";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import SwiperCore, {Lazy, Navigation, Keyboard, Mousewheel} from "swiper";
import {Swiper, SwiperSlide} from "swiper/react";

SwiperCore.use([Lazy, Navigation, Keyboard, Mousewheel]);

import ItemIcon from "Assets/icons/image.svg";
import {Initialize} from "@eluvio/elv-embed/src/Import";
import {rootStore} from "Stores";
import {PossibleButton, RichText} from "Components/common/UIComponents";

import BackIcon from "Assets/icons/arrow-left";
import UpArrow from "Assets/icons/up-caret.svg";
import DownArrow from "Assets/icons/down-caret.svg";
import LeftArrow from "Assets/icons/left-caret.svg";
import RightArrow from "Assets/icons/right-caret.svg";
import AudioPlayCircleIcon from "Assets/icons/media/blue play bars icon.svg";
import AudioPlayIcon from "Assets/icons/media/bars icon (no circle).svg";
import VideoPlayCircleIcon from "Assets/icons/media/video play icon.svg";
import VideoPlayIcon from "Assets/icons/media/video play icon (no circle).svg";
import PlayIcon from "Assets/icons/media/Play icon.svg";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import SkipBackIcon from "Assets/icons/media/skip back icon";
import PauseIcon from "Assets/icons/media/Pause icon";
import SkipForwardIcon from "Assets/icons/media/skip forward icon";
import ShuffleIcon from "Assets/icons/media/shuffle icon";
import LoopIcon from "Assets/icons/media/loop icon";

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

const MediaImageUrl = ({mediaItem, maxWidth}) => {
  let imageUrl = mediaItem.image || (mediaItem.media_type === "Image" && mediaItem.media_file?.url);

  if(imageUrl){
    imageUrl = new URL(imageUrl);
    imageUrl.searchParams.set("width", maxWidth);
    imageUrl = imageUrl.toString();
  }

  return imageUrl;
};

const MediaLinkPath = ({match, sectionId, collectionId, mediaIndex}) => {
  let path = match.url.split("/media")[0];

  if(sectionId === "list") {
    return UrlJoin(path, "media", "list", mediaIndex.toString());
  } else if(sectionId === "featured") {
    return UrlJoin(path, "media", "featured", mediaIndex.toString());
  }

  return UrlJoin(path, "media", sectionId, collectionId, mediaIndex.toString());
};

const NavigateToMedia = ({match, history, sectionId, collectionId, mediaIndex}) => {
  const path = MediaLinkPath({match, sectionId, collectionId, mediaIndex});

  history.push(path);
};

const FeaturedMediaItem = ({mediaItem, mediaIndex}) => {
  const match = useRouteMatch();

  let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});

  return (
    <NavLink to={MediaLinkPath({match, sectionId: "featured", mediaIndex})} className="nft-media-browser__featured-item">
      {
        imageUrl ?
          <div className="nft-media-browser__featured-item__image-container">
            <img src={imageUrl} alt={mediaItem.name} className="nft-media-browser__featured-item__image" />
          </div> : null
      }
      <div className="nft-media-browser__featured-item__content">
        <div className="nft-media-browser__featured-item__subtitle-2">{mediaItem.subtitle_2 || ""}</div>
        <div className="nft-media-browser__featured-item__name">{mediaItem.name || ""}</div>
        <div className="nft-media-browser__featured-item__subtitle-1">{mediaItem.subtitle_1 || ""}</div>
      </div>
    </NavLink>
  );
};

const MediaCollection = ({sectionId, collection}) => {
  const match = useRouteMatch();
  const [show, setShow] = useState(true);

  const collapsible = sectionId !== "list";
  const activeIndex = match.params.mediaIndex;

  return (
    <div className="nft-media-browser__collection">
      <PossibleButton isButton={collapsible} className="nft-media-browser__collection__header" onClick={() => collapsible && setShow(!show)}>
        <div className="nft-media-browser__collection__header-text ellipsis">
          { collection.name }
        </div>
        { collapsible ? <ImageIcon className="nft-media-browser__collection__header-indicator" icon={show ? UpArrow : DownArrow} /> : null }
      </PossibleButton>
      <div className={`nft-media-browser__collection__content ${show ? "" : "nft-media-browser__collection__content--hidden"}`}>
        <Swiper
          className="nft-media-browser__carousel"
          keyboard
          navigation
          slidesPerView="auto"
          lazy={{
            enabled: true,
            loadPrevNext: true,
            loadOnTransitionStart: true
          }}
          mousewheel
          observer
          observeParents
          parallax
          updateOnWindowResize
          spaceBetween={10}
          initialSlide={activeIndex > 2 ? activeIndex - 1 : 0}
        >
          { collection.media.map((mediaItem, mediaIndex) => {
            let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});

            return (
              <SwiperSlide
                key={`item-${mediaItem.id}-${Math.random()}`}
                className={`nft-media-browser__item-slide nft-media-browser__item-slide--${(mediaItem.image_aspect_ratio || "square").toLowerCase()}`}
              >
                <NavLink
                  to={MediaLinkPath({match, sectionId, collectionId: collection.id, mediaIndex})}
                  className="nft-media-browser__item"
                >
                  <div className="nft-media-browser__item__image-container">
                    <ImageIcon icon={imageUrl || ItemIcon} className="nft-media-browser__item__image" />
                  </div>

                  <div className="nft-media-browser__item__name ellipsis">
                    { mediaItem.name }
                  </div>
                </NavLink>
              </SwiperSlide>
            );
          })}
          <div className="nft-media-browser__carousel__shadow" />
        </Swiper>
      </div>
    </div>
  );
};

const MediaSection = ({section}) => {
  const [show, setShow] = useState(true);

  const collapsible = section.id !== "list";

  return (
    <div className="nft-media-browser__section">
      <PossibleButton isButton={collapsible} className="nft-media-browser__section__header" onClick={() => collapsible && setShow(!show)}>
        <div className="nft-media-browser__section__header-text ellipsis">
          { section.name }
        </div>
        { collapsible ? <ImageIcon className="nft-media-browser__section__header-indicator" icon={show ? UpArrow : DownArrow} /> : null }
      </PossibleButton>
      <div className={`nft-media-browser__section__content ${show ? "" : "nft-media-browser__section__content--hidden"}`}>
        { section.collections.map(collection => <MediaCollection key={`collection-${collection.id}`} sectionId={section.id} collection={collection}/>) }
      </div>
    </div>
  );
};

export const NFTMediaBrowser = observer(({nftInfo, inactive}) => {
  if(!nftInfo.hasAdditionalMedia) {
    return null;
  }

  let additionalMedia = nftInfo.additionalMedia;
  if(nftInfo.additionalMediaType === "List") {
    additionalMedia = {
      sections: [{
        id: "list",
        name: "Media",
        collections: [{
          id: "list",
          name: nftInfo.name,
          media: additionalMedia
        }]
      }]
    };
  }

  return (
    <div className={`nft-media-browser ${inactive ? "nft-media-browser--inactive" : ""} nft-media-browser--sections`}>
      {
        additionalMedia.featured_media?.length > 0 ?
          <div className="nft-media-browser__featured">
            { additionalMedia.featured_media.map((mediaItem, mediaIndex) => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaIndex} />) }
          </div> : null
      }
      { additionalMedia.sections.map(section => <MediaSection key={`section-${section.id}`} section={section} />) }
    </div>
  );
});

const AlbumControls = observer(({videoElement, media}) => {
  const match = useRouteMatch();
  const history = useHistory();

  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [order, setOrder] = useState(media.map((_, index) => index));
  const [playing, setPlaying] = useState(videoElement?.paused);
  const [currentVideoElement, setCurrentVideoElement] = useState(videoElement);

  const currentIndex = parseInt(match.params.mediaIndex);
  const currentMedia = media[match.params.mediaIndex];

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
        { currentIndex >= 0 ? <ImageIcon icon={MediaIcon(media[currentIndex], false)} label="Audio Icon" className="media-controls__title__icon" /> : null }
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
      const activeElement = document.querySelector(".nft-media__album-view__media--selected");

      activeElement?.scrollIntoView({block: "nearest", inline: "end", behavior: "smooth"});
    }, 1);
  }, [match.params.mediaIndex]);

  return (
    <div className="nft-media__album-view">
      <div className={`nft-media__album-view__media-container ${showPlayerControls ? "nft-media__album-view__media-container--with-controls" : ""}`}>
        { media.map((item, mediaIndex) => {
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
              className={`nft-media__album-view__media ${isSelected ? "nft-media__album-view__media--selected" : ""}`}
              to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex})}
            >
              <div className="nft-media__album-view__media__image-container">
                {
                  image ?
                    <ImageIcon icon={image} title={item.name} className="nft-media__album-view__media__image" /> :
                    <div className="nft-media__album-view__media__image nft-media__album-view__media__image--fallback" />
                }
                { isSelected ?
                  <ImageIcon icon={MediaIcon(item, true)} className="nft-media__album-view__media__selected-indicator" title="Selected" /> :
                  <ImageIcon icon={PlayIcon} className="nft-media__album-view__media__hover-icon" label="Play Icon" />
                }
              </div>
              <div className="nft-media__album-view__media__details">
                <ResponsiveEllipsis
                  component="h2"
                  className="nft-media__album-view__media__name"
                  text={item.name || ""}
                  title={item.name || ""}
                  maxLine="2"
                />
                <div className="nft-media__album-view__media__subtitles">
                  <h3 className="nft-media__album-view__media__subtitle-1 ellipsis" title={item.subtitle_1 || ""}>{item.subtitle_1 || ""}</h3>
                  <h3 className="nft-media__album-view__media__subtitle-2 ellipsis" title={item.subtitle_2 || ""}>{item.subtitle_2 || ""}</h3>
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

const NFTActiveMediaContent = observer(({nftInfo, mediaItem, collectionIndex, sectionIndex, mediaIndex, SetVideoElement}) => {
  const match = useRouteMatch();
  const targetRef = useRef();
  const [player, setPlayer] = useState(undefined);
  const [mediaInfo, setMediaInfo] = useState(undefined);

  useEffect(() => {
    mediaIndex = mediaIndex.toString();
    let path = "/public/asset_metadata/nft";
    if(match.params.sectionId === "list") {
      path = UrlJoin(path, "additional_media", mediaIndex);
    } else if(match.params.sectionId === "featured") {
      path = UrlJoin(path, "additional_media_sections", "featured_media", mediaIndex);
    } else {
      path = UrlJoin(path, "additional_media_sections", "sections", sectionIndex.toString(), "collections", collectionIndex.toString(), "media", mediaIndex);
    }

    const mediaInfo = NFTMediaInfo({
      versionHash: nftInfo?.nft?.details?.VersionHash,
      selectedMedia: mediaItem,
      selectedMediaPath: path,
      showFullMedia: true
    });

    setMediaInfo(mediaInfo);
  }, []);

  useEffect(() => {
    if(!targetRef || !targetRef.current || !mediaInfo) { return; }

    if(!mediaInfo.embedUrl) { return; }

    Initialize({
      client: rootStore.client,
      target: targetRef.current,
      url: mediaInfo.embedUrl.toString(),
      playerOptions: {
        posterUrl: mediaInfo.imageUrl,
        playerCallback: ({videoElement}) => {
          if(SetVideoElement) {
            SetVideoElement(videoElement);
          }
        }
      }
    }).then(player => setPlayer(player));

    return () => {
      if(player) {
        player.Destroy();
      }
    };
  }, [targetRef, mediaInfo]);


  if(!mediaInfo) {
    return null;
  }

  if(!mediaInfo.embedUrl && mediaInfo.imageUrl) {
    return <img alt={mediaInfo.name} src={mediaInfo.imageUrl} className="nft-media__content__target" />;
  }

  return (
    <div className="nft-media__content__target" ref={targetRef} />
  );
});

const NFTActiveMedia = observer(({nftInfo}) => {
  const match = useRouteMatch();
  const [videoElement, setVideoElement] = useState(undefined);

  useEffect(() => {
    setVideoElement(undefined);
  }, [match.params.sectionId, match.params.collectionId, match.params.mediaIndex]);

  const media = nftInfo.additionalMedia;
  const mediaIndex = parseInt(match.params.mediaIndex);

  let mediaItem, sectionIndex, collectionIndex, nextMediaIndex, previousMediaIndex, mediaList, showAlbumView, showPlayerControls;
  if(match.params.sectionId === "list") {
    previousMediaIndex = mediaIndex - 1;
    nextMediaIndex = mediaIndex < media.length - 2 ? mediaIndex + 1 : -1;
    mediaItem = media[match.params.mediaIndex];

    mediaList = nftInfo.additionalMedia;

    showPlayerControls = !nftInfo.nft.metadata.hide_additional_media_player_controls;
    showAlbumView =
      nftInfo.nft.metadata.additional_media_display === "Album" ||
      typeof nftInfo.nft.metadata.additional_media_display === "undefined" && showPlayerControls;
  } else if(match.params.sectionId === "featured") {
    // Featured item
    mediaItem = media.featured_media[mediaIndex];
    previousMediaIndex = mediaIndex - 1;
    nextMediaIndex = mediaIndex < media.featured_media.length - 1 ? mediaIndex + 1 : -1;
  } else {
    // Find item from section -> collections
    media.sections.forEach((section, sIndex) => {
      if(section.id !== match.params.sectionId) {
        return;
      }

      section.collections.forEach((collection, cIndex) => {
        if(collection.id !== match.params.collectionId) { return; }

        mediaItem = collection.media[mediaIndex];

        if(!mediaItem) {
          return;
        }

        sectionIndex = sIndex;
        collectionIndex = cIndex;
        previousMediaIndex = mediaIndex - 1;
        nextMediaIndex = mediaIndex < collection.media.length - 1 ? mediaIndex + 1 : -1;
        mediaList = collection.media;
        showAlbumView = collection.display === "Album";
      });
    });
  }

  if(!mediaItem) { return null; }

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <div className={`nft-media ${showAlbumView ? "nft-media--with-album-view" : ""}`}>
      {
        backPage ?
          <Link to={match.url.split("/media")[0]} className="details-page__back-link">
            <ImageIcon icon={BackIcon}/>
            Back to {backPage.name}
          </Link> : null
      }
      <div className="nft-media__content">
        <div className="nft-media__content__target-container">
          <NFTActiveMediaContent
            key={`nft-media-${sectionIndex}-${collectionIndex}-${mediaIndex}`}
            nftInfo={nftInfo}
            mediaItem={mediaItem}
            collectionIndex={collectionIndex}
            sectionIndex={sectionIndex}
            mediaIndex={mediaIndex}
            SetVideoElement={setVideoElement}
          />

          { showAlbumView ? <AlbumView media={mediaList} videoElement={videoElement} showPlayerControls={showPlayerControls} /> : null }

          {
            !showAlbumView && previousMediaIndex >= 0 ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: previousMediaIndex})}
                className="nft-media__content__button nft-media__content__button--previous"
              >
                <ImageIcon icon={LeftArrow} />
              </Link> : null
          }
          {
            !showAlbumView && nextMediaIndex >= 0 ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: nextMediaIndex})}
                className="nft-media__content__button nft-media__content__button--next"
              >
                <ImageIcon icon={RightArrow} />
              </Link> : null
          }
        </div>
        <div className="nft-media__content__text">
          <div className="nft-media__content__name">{mediaItem.name || ""}</div>
          <div className="nft-media__content__subtitle-1">{mediaItem.subtitle_1 || ""}</div>
          <div className="nft-media__content__subtitle-2">{mediaItem.subtitle_2 || ""}</div>
          { mediaItem.description ? <RichText richText={mediaItem.description} className="nft-media__content__description" /> : null }
        </div>
      </div>
    </div>
  );
});

const NFTMedia = observer(({nft}) => {
  const match = useRouteMatch();

  const nftInfo = NFTInfo({nft});

  return (
    <div className="nft-media-page">
      <div className="page-block page-block--main-content">
        <div className="page-block__content">
          <NFTActiveMedia nftInfo={nftInfo} key={`nft-media-${match.params.sectionIndex}-${match.params.collectionIndex}`} />
        </div>
      </div>
      <div className="page-block page-block--media-browser">
        <div className="page-block__content">
          <NFTMediaBrowser nftInfo={nftInfo} />
        </div>
      </div>
    </div>
  );
});

const NFTMediaWrapper = (props) => {
  return (
    <MintedNFTDetails
      Render={({nft}) => <NFTMedia nft={nft} {...props} />}
    />
  );
};

export default NFTMediaWrapper;
