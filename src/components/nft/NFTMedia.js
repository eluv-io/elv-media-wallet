import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, NavLink, useHistory, useRouteMatch} from "react-router-dom";
import {NFTInfo} from "../../utils/Utils";
import {MarketplaceItemDetails, MintedNFTDetails} from "Components/nft/NFTDetails";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import SwiperCore, {Lazy, Navigation, Keyboard, Mousewheel} from "swiper";
import {Swiper, SwiperSlide} from "swiper/react";

SwiperCore.use([Lazy, Navigation, Keyboard, Mousewheel]);

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
            href={isExternal ? mediaItem.mediaInfo.mediaLink : undefined}
            target={isExternal ? "_blank" : undefined}
            rel="noopener"
            useNavLink
            onClick={() => Unlock(mediaItem.id)}
            className="nft-media-browser__locked-featured-item__button"
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
      href={isExternal ? mediaItem.mediaInfo.mediaLink : undefined}
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

const MediaCollection = ({sectionId, collection}) => {
  const match = useRouteMatch();

  const activeIndex = match.params.mediaIndex;

  return (
    <div className={`nft-media-browser__collection ${collection.display === "Album" ? "nft-media-browser__collection--album" : ""}`}>
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
        </Swiper>
        <button className="nft-media-browser__carousel__arrow nft-media-browser__carousel__arrow--next">
          <ImageIcon icon={RightArrow} />
        </button>
      </div>
    </div>
  );
};

const MediaSection = ({section, locked}) => {
  return (
    <div className="nft-media-browser__section">
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
            {section.collections.map(collection => <MediaCollection key={`collection-${collection.id}`} sectionId={section.id} collection={collection}/>)}
          </div> : null
      }
    </div>
  );
};

export const NFTMediaBrowser = observer(({nftInfo, activeMedia}) => {
  const [locks, setLocks] = useState(undefined);

  useEffect(() => {
    if(!nftInfo.hasAdditionalMedia) { return; }

    let lockInfo = [];
    Promise.all(
      (nftInfo.additionalMedia.featured_media || []).map(async mediaItem => {
        if(!mediaItem.required) { return; }

        const viewed = await rootStore.walletClient.ProfileMetadata({
          type: "app",
          mode: "private",
          appId: rootStore.appId,
          key: `media-viewed-${nftInfo.nft.details.ContractAddr}-${nftInfo.nft.details.TokenIdStr}-${mediaItem.id}`
        });

        if(!viewed) {
          lockInfo.push(mediaItem.id);
        }
      })
    ).then(() => setLocks(lockInfo));
  }, []);

  const Unlock = async (mediaId) => {
    await rootStore.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: rootStore.appId,
      key: `media-viewed-${nftInfo.nft.details.ContractAddr}-${nftInfo.nft.details.TokenIdStr}-${mediaId}`,
      value: true
    });

    setLocks(locks.filter(id => id !== mediaId));
  };

  if(!locks || !nftInfo.hasAdditionalMedia) {
    return null;
  }

  const lockedFeaturedMedia = (nftInfo.additionalMedia.featured_media || []).filter(mediaItem => mediaItem.required && locks.includes(mediaItem.id));
  const unlockedFeaturedMedia = (nftInfo.additionalMedia.featured_media || []).filter(mediaItem => !mediaItem.required || !locks.includes(mediaItem.id));

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
      { nftInfo.additionalMedia.sections.map(section => <MediaSection key={`section-${section.id}`} section={section} locked={lockedFeaturedMedia.length > 0} />) }
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
                { isSelected ? <ImageIcon icon={MediaIcon(item, true)} className="nft-media__album-view__media__selected-indicator" title="Selected" /> : null }
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

const NFTActiveMediaContent = observer(({mediaItem, SetVideoElement}) => {
  const targetRef = useRef();

  useEffect(() => {
    if(!targetRef || !targetRef.current || !mediaItem.mediaInfo) { return; }

    if(!mediaItem.mediaInfo.embedUrl) { return; }

    const playerPromise = new Promise(async resolve =>
      Initialize({
        client: rootStore.client,
        target: targetRef.current,
        url: mediaItem.mediaInfo.embedUrl.toString(),
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

  if(!mediaItem.mediaInfo) {
    return null;
  }

  if(mediaItem.mediaInfo.useFrame) {
    return (
      <iframe
        src={mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.embedUrl || mediaItem.mediaInfo.imageUrl}
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

const NFTActiveMedia = observer(({nftInfo}) => {
  const match = useRouteMatch();
  const [videoElement, setVideoElement] = useState(undefined);

  useEffect(() => {
    setVideoElement(undefined);
  }, [match.params.sectionId, match.params.collectionId, match.params.mediaIndex]);

  const media = nftInfo.additionalMedia;
  const mediaIndex = parseInt(match.params.mediaIndex);

  let mediaItem, sectionIndex, collectionIndex, nextMediaIndex, previousMediaIndex, currentCollection;
  if(match.params.sectionId === "list") {
    previousMediaIndex = mediaIndex - 1;
    nextMediaIndex = mediaIndex < media.length - 2 ? mediaIndex + 1 : -1;
    currentCollection = nftInfo.additionalMedia.sections[0].collections[0];
    mediaItem = currentCollection.media[match.params.mediaIndex];
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
        currentCollection = nftInfo.additionalMedia.sections[sectionIndex].collections[collectionIndex];
      });
    });
  }

  if(!mediaItem) { return null; }

  const albumView = currentCollection?.display === "Album";
  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <div className={`nft-media ${albumView ? "nft-media--with-album-view" : ""}`}>
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

          {
            !albumView && previousMediaIndex >= 0 ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaIndex: previousMediaIndex})}
                className="nft-media__content__button nft-media__content__button--previous"
              >
                <ImageIcon icon={LeftArrow} />
              </Link> : null
          }
          {
            !albumView && nextMediaIndex >= 0 ?
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
          { albumView ? null : <div className="nft-media__content__subtitle-1">{mediaItem.subtitle_1 || ""}</div> }
          { albumView ? null : <div className="nft-media__content__subtitle-2">{mediaItem.subtitle_2 || ""}</div> }
          { mediaItem.description ? <RichText richText={mediaItem.description} className="nft-media__content__description" /> : null }
        </div>
        { albumView ? <AlbumView media={currentCollection.media} videoElement={videoElement} showPlayerControls /> : null }
      </div>
    </div>
  );
});

const NFTMedia = observer(({nft, item}) => {
  const match = useRouteMatch();

  const nftInfo = NFTInfo({nft, item});

  const isSingleAlbum = (nftInfo?.additionalMedia?.sections || [])[0]?.isSingleAlbum;
  return (
    <div className="nft-media-page">
      <div className="page-block page-block--main-content">
        <div className="page-block__content">
          <NFTActiveMedia nftInfo={nftInfo} key={`nft-media-${match.params.sectionIndex}-${match.params.collectionIndex}`} />
        </div>
      </div>
      {
        isSingleAlbum ? null :
          <div className="page-block page-block--media-browser">
            <div className="page-block__content">
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
