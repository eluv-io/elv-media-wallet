import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {NavLink, useRouteMatch} from "react-router-dom";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Swiper, SwiperSlide} from "swiper/react";
import ItemIcon from "Assets/icons/image";
import {MediaImageUrl, MediaLinkPath} from "Components/nft/media/Utils";


import LockedIcon from "Assets/icons/Lock icon";
import PlayIcon from "Assets/icons/media/Play icon";
import RightArrow from "Assets/icons/right-arrow";
import UnlockedIcon from "Assets/icons/unlock icon";
import LeftArrow from "Assets/icons/left-arrow";


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


const NFTMediaBrowser = observer(({nftInfo}) => {
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
    <div className="nft-media-browser nft-media-browser--sections">
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

export default NFTMediaBrowser;