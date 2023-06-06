import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {NavLink, useRouteMatch} from "react-router-dom";
import {Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Swiper, SwiperSlide} from "swiper/react";
import ItemIcon from "Assets/icons/image";
import {MediaImageUrl, MediaLinkPath} from "Components/nft/media/Utils";

import LockedIcon from "Assets/icons/Lock icon";
import PlayCircleIcon from "Assets/icons/media/Play icon";
import RightArrow from "Assets/icons/right-arrow";
import UnlockedIcon from "Assets/icons/unlock icon";
import LeftArrow from "Assets/icons/left-arrow";
import PlayIcon from "Assets/icons/media/play.svg";
import {NFTRedeemableOfferModal, NFTRedeemableOfferVideo} from "Components/nft/NFTRedeemableOffers";
import Utils from "@eluvio/elv-client-js/src/Utils";

const FeaturedRedeemable = observer(({nftInfo, offer}) => {
  const [showOfferModal, setShowOfferModal] = useState(false);

  const redeemer = offer.state?.redeemer;
  const isRedeemer = Utils.EqualAddress(redeemer, rootStore.CurrentAddress());
  const disabled = (redeemer && !isRedeemer);

  if(offer.hidden) {
    return null;
  }

  return (
    <>
      {
        showOfferModal ?
          <NFTRedeemableOfferModal
            nftInfo={nftInfo}
            offerId={offer.offer_id}
            Close={() => setShowOfferModal(false)}
          /> : null
      }
      <button
        disabled={disabled}
        onClick={() => setShowOfferModal(true)}
        className="nft-media-browser__featured-item"
      >
        {
          offer.image || offer.animation ?
            <div className="nft-media-browser__featured-item__image-container">
              {
                offer.animation ?
                  <NFTRedeemableOfferVideo videoLink={offer.animation} className="nft-media-browser__featured-item__image nft-media-browser__featured-item__video"/> :
                  <img src={offer.image.url} alt={offer.name} className="nft-media-browser__featured-item__image"/>
              }
            </div> : null
        }
        <div className="nft-media-browser__featured-item__content">
          <div className={`nft-media-browser__featured-item__subtitle-2 ${redeemer ? "nft-media-browser__featured-item__subtitle-2--faded" : ""}`}>
            { rootStore.l10n.item_details[redeemer ? "reward_redeemed" : "reward"] }
          </div>
          <div className="nft-media-browser__featured-item__name">{offer.name}</div>
          {
            !disabled ?
              <div className="nft-media-browser__featured-item__cta">
                { rootStore.l10n.redeemables[redeemer ? "view_redemption" : (!offer.released || offer.expired ? "view_details" : "claim_reward")] }
              </div> : null
          }
          {
            !redeemer && (offer.releaseDate || offer.expirationDate) ?
              <div className="nft-media-browser__featured-item__date-container">
                <div className="nft-media-browser__featured-item__date-header">
                  { rootStore.l10n.redeemables[offer.releaseDate && !offer.released ? "reward_valid" : "reward_expires"] }
                </div>
                <div className="nft-media-browser__featured-item__date">
                  { offer.releaseDate && !offer.released ? offer.releaseDate : offer.expirationDate }
                </div>
              </div> : null
          }
        </div>
      </button>
    </>
  );
});

const FeaturedMediaItem = ({mediaItem, mediaIndex, locked, Unlock}) => {
  const match = useRouteMatch();

  let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});
  const isExternal = ["HTML", "Link"].includes(mediaItem.media_type);

  let itemDetails = mediaItem;
  if(locked) {
    itemDetails = mediaItem.locked_state;
  }

  const hasButton = itemDetails.button_text || itemDetails.button_image;
  const linkParams = {
    to: isExternal ? undefined : MediaLinkPath({match, sectionId: "featured", mediaIndex}),
    href: isExternal ? mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.embedUrl : undefined,
    onClick: () => Unlock && Unlock(mediaItem.id),
    target: isExternal ? "_blank" : undefined,
    disabled: !!mediaItem.disabled,
    rel: "noopener",
    useNavLink: true,
  };

  return (
    <Linkish
      {...(hasButton ? {} : linkParams)}
      className={`nft-media-browser__featured-item ${locked ? "nft-media-browser__featured-item--locked" : ""}`}
    >
      {itemDetails.background_image ?
        <img
          alt={`${itemDetails.name || mediaItem.name} background`}
          src={itemDetails.background_image.url}
          className="nft-media-browser__featured-item__background-image"
        /> : null
      }
      {
        imageUrl ?
          <div className="nft-media-browser__featured-item__image-container">
            <img src={imageUrl} alt={name || mediaItem.name} className="nft-media-browser__featured-item__image"/>
          </div> : null
      }
      <div className="nft-media-browser__featured-item__content">
        <div className="nft-media-browser__featured-item__subtitle-2">{itemDetails.subtitle_2 || ""}</div>
        <div className="nft-media-browser__featured-item__name">{itemDetails.name || mediaItem.name || ""}</div>
        <div className="nft-media-browser__featured-item__subtitle-1">{itemDetails.subtitle_1 || ""}</div>
        {
          hasButton ?
            <div className="nft-media-browser__featured-item__actions">
              <Linkish
                {...linkParams}
                className={`action action-primary nft-media-browser__featured-item__button ${itemDetails.button_image ? "nft-media-browser__featured-item__button--image" : ""}`}
              >
                {
                  itemDetails.button_image ?
                    <img src={itemDetails.button_image.url} alt={itemDetails.button_text}/> :
                    itemDetails.button_text
                }
              </Linkish>
            </div> : null
        }
      </div>
    </Linkish>
  );
};

export const MediaCollection = observer(({nftInfo, sectionId, collection, singleCollection}) => {
  const match = useRouteMatch();
  const [swiper, setSwiper] = useState();

  const collectionActive = singleCollection || (match.params.sectionId === sectionId && match.params.collectionId === collection.id);
  const activeIndex = collectionActive ? parseInt(match.params.mediaIndex) : undefined;

  const previousArrowClass = `swiper-arrow-${sectionId}-${collection.id}--previous`;
  const nextArrowClass = `swiper-arrow-${sectionId}-${collection.id}--next`;

  useEffect(() => {
    // Slide to active index if necessary
    if(!swiper || typeof activeIndex === "undefined") { return; }

    const currentSlideDimensions = swiper.slides[activeIndex].getBoundingClientRect();
    const swiperDimensions = swiper.el.getBoundingClientRect();
    const slideX = currentSlideDimensions.x - swiperDimensions.x;

    if(slideX < 0 || (slideX + currentSlideDimensions.width > swiperDimensions.width)) {
      swiper.slideTo(activeIndex);
    }
  }, [swiper, activeIndex]);

  return (
    <div className={`nft-media-browser__collection ${collectionActive ? "nft-media-browser__collection--active" : ""} ${collection.display === "Album" ? "nft-media-browser__collection--album" : ""}`}>
      <div className="nft-media-browser__collection__header">
        <div className="nft-media-browser__collection__header-text ellipsis">
          { collection.name }
        </div>
        {
          collection.show_autoplay ?
            <NavLink
              to={MediaLinkPath({match, sectionId, collectionId: collection.id, mediaIndex: 0, autoplay: true})}
              className="nft-media-browser__collection__header__button"
            >
              <ImageIcon icon={PlayIcon}/>
              { rootStore.l10n.item_details.additional_media.play_all }
            </NavLink> : null
        }
      </div>
      <div className="nft-media-browser__collection__content">
        <button className={`nft-media-browser__carousel__arrow nft-media-browser__carousel__arrow--previous ${previousArrowClass}`}>
          <ImageIcon icon={LeftArrow} />
        </button>
        <Swiper
          threshold={5}
          className="nft-media-browser__carousel"
          keyboard
          navigation={{
            prevEl: "." + previousArrowClass,
            nextEl: "." + nextArrowClass
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
          onSwiper={setSwiper}
        >
          { collection.media.map((mediaItem, mediaIndex) => {
            const locked = mediaItem.locked && (mediaItem.locked_state.required_media || []).find(requiredMediaId =>
              !rootStore.MediaViewed({nft: nftInfo.nft, mediaId: requiredMediaId, preview: !nftInfo.nft.details.TokenIdStr})
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
                        itemActive ? <ImageIcon icon={PlayCircleIcon} className="nft-media-browser__item__name__icon" /> : null
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
        <button className={`nft-media-browser__carousel__arrow nft-media-browser__carousel__arrow--next ${nextArrowClass}`}>
          <ImageIcon icon={RightArrow} />
        </button>
      </div>
    </div>
  );
});

const MediaSection = ({nftInfo, section, locked, lockable}) => {
  const match = useRouteMatch();

  return (
    <div className={`nft-media-browser__section ${match.params.sectionId === section.id ? "nft-media-browser__section--active" : ""} ${locked ? "nft-media-browser__section--locked" : ""}`}>
      <div className="nft-media-browser__section__header">
        { lockable ? <ImageIcon icon={locked ? LockedIcon : UnlockedIcon} className="nft-media-browser__section__header-icon" /> : null }
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

  const lockable = !!(nftInfo.additionalMedia.featured_media || []).find(mediaItem => mediaItem.required);
  const lockedFeaturedMedia = (nftInfo.additionalMedia.featured_media || [])
    .filter(mediaItem => mediaItem.required && !rootStore.MediaViewed({nft: nftInfo.nft, mediaId: mediaItem.id, preview: !nftInfo.nft.details.TokenIdStr}));
  const unlockedFeaturedMedia = (nftInfo.additionalMedia.featured_media || [])
    .filter(mediaItem => !mediaItem.required || rootStore.MediaViewed({nft: nftInfo.nft, mediaId: mediaItem.id, preview: !nftInfo.nft.details.TokenIdStr}));
  const featuredRedeemables = nftInfo.redeemables.filter(offer => !offer.hidden && offer.featured);

  const Unlock = mediaId => rootStore.SetMediaViewed({
    nft: nftInfo.nft,
    mediaId,
    preview: !nftInfo.nft.details.TokenIdStr
  });

  return (
    <div className="nft-media-browser nft-media-browser--sections">
      {
        (nftInfo.additionalMedia.featured_media || []).length > 0 ?
          <div className="nft-media-browser__featured">
            {
              lockedFeaturedMedia
                .map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} locked Unlock={Unlock} />)
            }
            {
              unlockedFeaturedMedia
                .map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} />)
            }
            {
              featuredRedeemables
                .map(offer => <FeaturedRedeemable key={`featured-offer-${offer.offer_id}`} nftInfo={nftInfo} offer={offer} />)
            }
          </div> : null
      }
      {
        nftInfo.additionalMedia.sections.map(section =>
          <MediaSection
            key={`section-${section.id}`}
            nftInfo={nftInfo}
            section={section}
            lockable={lockable}
            locked={lockedFeaturedMedia.length > 0}
            Unlock={Unlock}
          />
        )
      }
    </div>
  );
});

export default NFTMediaBrowser;
