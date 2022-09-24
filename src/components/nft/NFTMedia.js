import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, NavLink, useHistory, useRouteMatch} from "react-router-dom";
import {NFTInfo} from "../../utils/Utils";
import {MarketplaceItemDetails, MintedNFTDetails} from "Components/nft/NFTDetails";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import SwiperCore, {Lazy, Navigation, Keyboard} from "swiper";
import {Swiper, SwiperSlide} from "swiper/react";

SwiperCore.use([Lazy, Navigation, Keyboard]);

import ItemIcon from "Assets/icons/image.svg";
import {Initialize} from "@eluvio/elv-embed/src/Import";
import {rootStore} from "Stores";
import {Linkish, RichText} from "Components/common/UIComponents";

import LockedIcon from "Assets/icons/Lock icon.svg";
import UnlockedIcon from "Assets/icons/unlock icon.svg";
import BackIcon from "Assets/icons/arrow-left";
import LeftArrow from "Assets/icons/left-arrow.svg";
import RightArrow from "Assets/icons/right-arrow.svg";
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
import Utils from "@eluvio/elv-client-js/src/Utils";

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

  if(imageUrl && maxWidth){
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

const FeaturedMediaItem = ({mediaItem, mediaIndex, locked, Unlock}) => {
  const match = useRouteMatch();

  let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});
  const isExternal = ["HTML", "Link"].includes(mediaItem.media_type);

  if(locked) {
    const { name, subtitle_1, subtitle_2, description, button_text, image, background_image } = mediaItem.locked_state;
    return (
      <div className="nft-media-browser__locked-featured-item">
        { background_image ?
          <img
            alt={`${name || mediaItem.name} background`}
            src={background_image.url}
            className="nft-media-browser__locked-featured-item__background-image"
          /> : null
        }
        {
          imageUrl ?
            <div className="nft-media-browser__locked-featured-item__image-container">
              <img src={image || imageUrl} alt={name || mediaItem.name} className="nft-media-browser__locked-featured-item__image" />
            </div> : null
        }
        <div className="nft-media-browser__locked-featured-item__content">
          <div className="nft-media-browser__locked-featured-item__subtitle-2">{subtitle_2 || ""}</div>
          <div className="nft-media-browser__locked-featured-item__name">{name || mediaItem.name || ""}</div>
          <div className="nft-media-browser__locked-featured-item__subtitle-1">{subtitle_1 || ""}</div>
          <div className="nft-media-browser__locked-featured-item__description">{description}</div>
        </div>
        <div className="nft-media-browser__locked-featured-item__actions">
          <Linkish
            to={isExternal ? undefined : MediaLinkPath({match, sectionId: "featured", mediaIndex})}
            href={isExternal ? mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.embedUrl : undefined}
            target={isExternal ? "_blank" : undefined}
            rel="noopener"
            useNavLink
            onClick={() => Unlock(mediaItem.id)}
            className="action action-primary nft-media-browser__locked-featured-item__button"
          >
            { button_text || "View"}
          </Linkish>
        </div>
      </div>
    );
  }

  return (
    <Linkish
      to={isExternal ? undefined : MediaLinkPath({match, sectionId: "featured", mediaIndex})}
      href={isExternal ? mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.embedUrl : undefined}
      target={isExternal ? "_blank" : undefined}
      rel="noopener"
      useNavLink
      className="nft-media-browser__featured-item"
    >
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
    </Linkish>
  );
};

const MediaCollection = observer(({nftInfo, sectionId, collection}) => {
  const match = useRouteMatch();

  const collectionActive = match.params.sectionId === sectionId && match.params.collectionId === collection.id;
  const activeIndex = collectionActive ? parseInt(match.params.mediaIndex) : undefined;

  return (
    <div className={`nft-media-browser__collection ${collectionActive ? "nft-media-browser__collection--active" : ""} ${collection.display === "Album" ? "nft-media-browser__collection--album" : ""}`}>
      <div className="nft-media-browser__collection__header">
        <div className="nft-media-browser__collection__header-text ellipsis">
          { collection.name }
        </div>
      </div>
      <div className="nft-media-browser__collection__content">
        <button className="nft-media-browser__carousel__arrow nft-media-browser__carousel__arrow--previous">
          <ImageIcon icon={LeftArrow} />
        </button>
        <Swiper
          className="nft-media-browser__carousel"
          keyboard
          navigation={{
            nextEl: ".nft-media-browser__carousel__arrow--next",
            prevEl: ".nft-media-browser__carousel__arrow--previous"
          }}
          slidesPerView="auto"
          slidesPerGroup={3}
          lazy={{
            enabled: true,
            loadPrevNext: true,
            loadOnTransitionStart: true
          }}
          observer
          observeParents
          parallax
          updateOnWindowResize
          spaceBetween={10}
          initialSlide={activeIndex > 2 ? activeIndex - 1 : 0}
        >
          { collection.media.map((mediaItem, mediaIndex) => {
            const locked = mediaItem.locked && (mediaItem.locked_state.required_media || []).find(requiredMediaId =>
              !rootStore.MediaViewed({nft: nftInfo.nft, mediaId: requiredMediaId})
            );

            if(locked) {
              mediaItem = mediaItem.locked_state;
            }

            let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});
            const itemActive = collectionActive && mediaIndex === activeIndex;

            return (
              <SwiperSlide
                key={`item-${mediaItem.id}-${Math.random()}`}
                className={`nft-media-browser__item-slide nft-media-browser__item-slide--${(mediaItem.image_aspect_ratio || "square").toLowerCase()}`}
              >
                <NavLink
                  to={MediaLinkPath({match, sectionId, collectionId: collection.id, mediaIndex})}
                  className={`nft-media-browser__item ${itemActive ? "nft-media-browser__item--active" : ""}`}
                >
                  <div className="nft-media-browser__item__image-container">
                    <ImageIcon icon={imageUrl || ItemIcon} className="nft-media-browser__item__image" />
                  </div>

                  <div className="nft-media-browser__item__name">
                    {
                      locked ?
                        <ImageIcon icon={LockedIcon} className="nft-media-browser__item__name__icon" /> :
                        itemActive ? <ImageIcon icon={PlayIcon} className="nft-media-browser__item__name__icon" /> : null
                    }
                    <div className="nft-media-browser__item__name__text ellipsis">
                      { mediaItem.name }
                    </div>
                  </div>
                </NavLink>
              </SwiperSlide>
            );
          })}
        </Swiper>
        <button className="nft-media-browser__carousel__arrow nft-media-browser__carousel__arrow--next">
          <ImageIcon icon={RightArrow} />
        </button>
      </div>
    </div>
  );
});

const MediaSection = ({nftInfo, section, locked}) => {
  const match = useRouteMatch();

  return (
    <div className={`nft-media-browser__section ${match.params.sectionId === section.id ? "nft-media-browser__section--active" : ""} ${locked ? "nft-media-browser__section--locked" : ""}`}>
      <div className="nft-media-browser__section__header">
        <ImageIcon icon={locked ? LockedIcon : UnlockedIcon} className="nft-media-browser__section__header-icon" />
        <div className="nft-media-browser__section__header-text ellipsis">
          { section.name }
        </div>
      </div>
      {
        !locked ?
          <div
            className="nft-media-browser__section__content">
            {section.collections.map(collection => <MediaCollection key={`collection-${collection.id}`} nftInfo={nftInfo} sectionId={section.id} collection={collection}/>)}
          </div> : null
      }
    </div>
  );
};

export const NFTMediaBrowser = observer(({nftInfo, activeMedia}) => {
  if(!nftInfo.hasAdditionalMedia) {
    return null;
  }

  const lockedFeaturedMedia = (nftInfo.additionalMedia.featured_media || [])
    .filter(mediaItem => mediaItem.required && !rootStore.MediaViewed({nft: nftInfo.nft, mediaId: mediaItem.id}));
  const unlockedFeaturedMedia = (nftInfo.additionalMedia.featured_media || [])
    .filter(mediaItem => !mediaItem.required || rootStore.MediaViewed({nft: nftInfo.nft, mediaId: mediaItem.id}));

  const Unlock = mediaId => rootStore.SetMediaViewed({
    nft: nftInfo.nft,
    mediaId
  });

  return (
    <div className={`nft-media-browser ${!activeMedia ? "nft-media-browser--inactive" : ""} nft-media-browser--sections`}>
      {
        lockedFeaturedMedia.length > 0 ?
          <div className="nft-media-browser__featured nft-media-browser__featured--locked">
            {
              lockedFeaturedMedia
                .map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} locked Unlock={Unlock} />)
            }
          </div> : null
      }
      {
        unlockedFeaturedMedia.length > 0 ?
          <div className="nft-media-browser__featured">
            {
              unlockedFeaturedMedia
                .map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} />)
            }
          </div> : null
      }
      { nftInfo.additionalMedia.sections.map(section => <MediaSection key={`section-${section.id}`} nftInfo={nftInfo} section={section} locked={lockedFeaturedMedia.length > 0} Unlock={Unlock} />) }
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
              className={`nft-media__album-view__media ${isSelected ? "nft-media__album-view__media--selected" : ""}`}
              to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex})}
            >
              <div className="nft-media__album-view__media__track-number">{mediaIndex + 1}</div>
              <div className="nft-media__album-view__media__image-container">
                {
                  image ?
                    <ImageIcon icon={image} title={item.name} className="nft-media__album-view__media__image" /> :
                    <div className="nft-media__album-view__media__image nft-media__album-view__media__image--fallback" />
                }
                { isSelected ? <ImageIcon icon={MediaIcon(item, true)} className="nft-media__album-view__media__selected-indicator" title="Selected" /> : null }
              </div>
              <div className="nft-media__album-view__media__details">
                <ResponsiveEllipsis
                  component="h2"
                  className="nft-media__album-view__media__name"
                  text={(item.name || "").replace(/\d+\.\w?/, "")}
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

const NFTActiveMediaContent = observer(({nftInfo, mediaItem, SetVideoElement}) => {
  const targetRef = useRef();
  const [mediaUrl, setMediaUrl] = useState(undefined);

  useEffect(() => {
    if(!mediaItem.mediaInfo) { return; }

    if(mediaItem.mediaInfo?.recordView) {
      rootStore.SetMediaViewed({
        nft: nftInfo.nft,
        mediaId: mediaItem.id
      });
    }

    // For preview mode, ensure viewed status is not actually saved
    // Or, skip view record if the item has already been viewed
    let embedUrl = mediaItem.mediaInfo.embedUrl ? new URL(mediaItem.mediaInfo.embedUrl) : undefined;
    const viewRecordKey = embedUrl.searchParams.get("vrk");
    if(viewRecordKey) {
      const key = Utils.FromB64(viewRecordKey).split(":")[1] || "";
      if(rootStore.viewedMedia[key] || !nftInfo.nft.details.TokenIdStr) {
        embedUrl.searchParams.delete("vrk");
      }
    }

    if(mediaItem.mediaInfo.mediaLink) {
      setMediaUrl(mediaItem.mediaInfo.mediaLink);
    } else if(mediaItem.mediaInfo.embedUrl) {
      setMediaUrl(embedUrl);
    } else {
      setMediaUrl(mediaItem.mediaInfo.imageUrl);
    }

    if(!targetRef || !targetRef.current) { return; }

    const playerPromise = new Promise(async resolve =>
      Initialize({
        client: rootStore.client,
        target: targetRef.current,
        url: embedUrl.toString(),
        playerOptions: {
          posterUrl: mediaItem.mediaInfo.imageUrl,
          playerCallback: ({player, videoElement}) => {
            if(SetVideoElement) {
              SetVideoElement(videoElement);
            }

            resolve(player);
          }
        }
      })
    );

    return async () => {
      if(!playerPromise) { return; }

      const player = await playerPromise;
      player.Destroy();
    };
  }, [targetRef, mediaItem.mediaInfo]);

  if(!mediaItem.mediaInfo || !mediaUrl) {
    return null;
  }

  if(mediaItem.mediaInfo.useFrame) {
    return (
      <iframe
        src={mediaUrl}
        allowFullScreen
        allow="accelerometer;autoplay;clipboard-write;encrypted-media;fullscreen;gyroscope;picture-in-picture"
        className="nft-media__content__target nft-media__content__target--frame"
      />
    );
  }

  if(!mediaItem.mediaInfo.embedUrl && mediaItem.mediaInfo.imageUrl) {
    return <img alt={mediaItem.mediaInfo.name} src={mediaItem.mediaInfo.imageUrl} className="nft-media__content__target" />;
  }

  return (
    <div className="nft-media__content__target" ref={targetRef} />
  );
});

const AvailableMedia = ({additionalMedia, sectionId, collectionId, mediaIndex}) => {
  let sectionIndex = 0;
  let collectionIndex = 0;
  mediaIndex = parseInt(mediaIndex);

  let display = "Media";
  let availableMediaList = [];
  let currentListIndex = 0;
  switch(sectionId) {
    case "list":
      display = additionalMedia.sections[0].collections[0].display;
      availableMediaList = additionalMedia.sections[0].collections[0].media
        .map((mediaItem, mediaIndex) => ({ display, sectionId, sectionIndex, collectionId, collectionIndex, mediaIndex, mediaItem }));
      currentListIndex = mediaIndex;
      break;
    case "featured":
      availableMediaList = [{ display, sectionId, sectionIndex, collectionId, collectionIndex, mediaIndex, mediaItem: additionalMedia.featured_media[mediaIndex] }];
      currentListIndex = 0;
      break;
    default:
      let listIndex = 0;
      additionalMedia.sections.forEach((section, sIndex) => {
        section.collections.forEach((collection, cIndex) => {
          collection.media.forEach((mediaItem, mIndex) => {
            availableMediaList[listIndex] = {
              display: collection.display,
              sectionId: section.id,
              sectionIndex: sIndex,
              collectionId: collection.id,
              collectionIndex: cIndex,
              mediaIndex: mIndex,
              mediaId: mediaItem.id,
              mediaItem,
              listIndex
            };

            if(sectionId === section.id && collectionId === collection.id && mediaIndex === mIndex) {
              currentListIndex = listIndex;
            }

            listIndex += 1;
          });
        });
      });
      break;
  }

  return { availableMediaList, currentListIndex };
};

const NFTActiveMedia = observer(({nftInfo}) => {
  const match = useRouteMatch();
  const [videoElement, setVideoElement] = useState(undefined);

  const mediaIndex = parseInt(match.params.mediaIndex);

  const { availableMediaList, currentListIndex } = AvailableMedia({
    additionalMedia: nftInfo.additionalMedia,
    sectionId: match.params.sectionId,
    collectionId: match.params.collectionId,
    mediaIndex: match.params.mediaIndex
  });

  const previous = availableMediaList[currentListIndex - 1];
  const current = availableMediaList[currentListIndex];
  const next = availableMediaList[currentListIndex + 1];

  useEffect(() => {
    setVideoElement(undefined);

    document.querySelector("#top-scroll-target")?.scrollIntoView({block: "start", inline: "start", behavior: "smooth"});
  }, [match.params.sectionId, match.params.collectionId, match.params.mediaIndex]);


  if(!current) { return null; }

  let currentMediaItem = current.mediaItem;
  const locked = currentMediaItem.locked && (currentMediaItem.locked_state.required_media || []).find(requiredMediaId =>
    !rootStore.MediaViewed({nft: nftInfo.nft, mediaId: requiredMediaId})
  );

  if(locked) {
    currentMediaItem = currentMediaItem.locked_state;
    currentMediaItem.mediaInfo = { imageUrl: MediaImageUrl({mediaItem: currentMediaItem}) };
  }

  const albumView = current.display === "Album";
  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <div className={`nft-media ${albumView ? "nft-media--with-album-view" : ""}`}>
      {
        backPage ?
          <Link to={`${match.url.split("/media")[0]}?tab=Media`} className="details-page__back-link">
            <ImageIcon icon={BackIcon}/>
            Back to {backPage.name}
          </Link> : null
      }
      <div className="nft-media__content">
        <div className="nft-media__content__target-container">
          <NFTActiveMediaContent
            key={`nft-media-${current.sectionIndex}-${current.collectionIndex}-${mediaIndex}`}
            nftInfo={nftInfo}
            mediaItem={currentMediaItem}
            collectionIndex={current.collectionIndex}
            sectionIndex={current.sectionIndex}
            mediaIndex={mediaIndex}
            SetVideoElement={setVideoElement}
          />
        </div>
        <div className="nft-media__content__text">
          <div className="nft-media__content__name">{currentMediaItem.name || ""}</div>
          { albumView ? null : <div className="nft-media__content__subtitle-1">{currentMediaItem.subtitle_1 || ""}</div> }
          { albumView ? null : <div className="nft-media__content__subtitle-2">{currentMediaItem.subtitle_2 || ""}</div> }
          { currentMediaItem.description ? <RichText richText={currentMediaItem.description} className="nft-media__content__description" /> : null }
          {
            !albumView && previous ?
              <Link
                to={MediaLinkPath({match, sectionId: previous.sectionId, collectionId: previous.collectionId, mediaIndex: previous.mediaIndex})}
                className="nft-media__content__button nft-media__content__button--previous"
              >
                <ImageIcon icon={LeftArrow} />
                <div className="nft-media__content__button__text ellipsis">
                  Previous{previous.mediaItem?.name ? `: ${previous.mediaItem.name}` : ""}
                </div>
              </Link> : null
          }
          {
            !albumView && next ?
              <Link
                to={MediaLinkPath({match, sectionId: next.sectionId, collectionId: next.collectionId, mediaIndex: next.mediaIndex})}
                className="nft-media__content__button nft-media__content__button--next"
              >
                <div className="nft-media__content__button__text ellipsis">
                  Next{next.mediaItem?.name ? `: ${next.mediaItem.name}` : ""}
                </div>
                <ImageIcon icon={RightArrow} />
              </Link> : null
          }
        </div>
        { albumView ? <AlbumView media={availableMediaList.filter(item => item.collectionId === match.params.collectionId)} videoElement={videoElement} showPlayerControls /> : null }
      </div>
    </div>
  );
});

const NFTMedia = observer(({nft, item}) => {
  const match = useRouteMatch();
  const [loaded, setLoaded] = useState(false);

  const nftInfo = NFTInfo({nft, item});
  window.nftInfo = nftInfo;

  useEffect(() => {
    rootStore.CheckViewedMedia({
      nft: nftInfo.nft,
      mediaIds: nftInfo.watchedMediaIds
    })
      .finally(() => setLoaded(true));
  }, []);

  if(!loaded) { return null; }

  const isSingleAlbum = (nftInfo?.additionalMedia?.sections || [])[0]?.isSingleAlbum;
  return (
    <div className="nft-media-page" id="top-scroll-target">
      <div className="page-block page-block--main-content">
        <div className="page-block__content page-block__content--unrestricted">
          <NFTActiveMedia nftInfo={nftInfo} key={`nft-media-${match.params.sectionIndex}-${match.params.collectionIndex}`} />
        </div>
      </div>
      {
        isSingleAlbum ? null :
          <div className="page-block page-block--lower-content page-block--media-browser">
            <div className="page-block__content page-block__content--unrestricted">
              <NFTMediaBrowser nftInfo={nftInfo} activeMedia/>
            </div>
          </div>
      }
    </div>
  );
});

const NFTMediaWrapper = (props) => {
  const match = useRouteMatch();

  if(match.params.sku) {
    return (
      <MarketplaceItemDetails
        Render={({item}) => <NFTMedia item={item} {...props} />}
      />
    );
  }

  return (
    <MintedNFTDetails
      Render={({nft}) => <NFTMedia nft={nft} {...props} />}
    />
  );
};

export default NFTMediaWrapper;
