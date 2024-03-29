import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {NavLink, useRouteMatch} from "react-router-dom";
import {AnnotatedField, Linkish} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Swiper, SwiperSlide} from "swiper/react";
import ItemIcon from "Assets/icons/image";
import {MediaImageUrl, MediaLinkPath, MediaLockState} from "Components/nft/media/Utils";
import {NFTRedeemableOfferModal} from "Components/nft/NFTRedeemableOffers";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Video from "Components/common/Video";

import LockedIcon from "Assets/icons/Lock icon";
import RightArrow from "Assets/icons/right-arrow";
import UnlockedIcon from "Assets/icons/unlock icon";
import LeftArrow from "Assets/icons/left-arrow";
import PlayIcon from "Assets/icons/media/play.svg";
import {LiveMediaInfo, ScrollTo} from "../../../utils/Utils";

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
                  <Video videoLink={offer.animation} className="nft-media-browser__featured-item__image nft-media-browser__featured-item__video"/> :
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

const FeaturedMediaItem = ({nftInfo, mediaItem, mediaIndex, required, locked}) => {
  const match = useRouteMatch();

  let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});

  const isExternal = ["HTML", "Link"].includes(mediaItem.media_type);
  const isReference = mediaItem.media_type === "Media Reference";

  let itemDetails = mediaItem;
  if(required || locked) {
    imageUrl = MediaImageUrl({mediaItem: mediaItem.locked_state, maxWidth: 600}) || imageUrl;
    itemDetails = mediaItem.locked_state;
  }

  const hasButton = itemDetails.button_text || itemDetails.button_image;
  const linkParams = {
    to: isReference || isExternal ? undefined : MediaLinkPath({match, sectionId: "featured", mediaIndex}),
    href: !isReference && isExternal ? mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.embedUrl : undefined,
    onClick: () => {
      if(required) {
        rootStore.SetMediaViewed({
          nft: nftInfo.nft,
          mediaId: mediaItem.id,
          preview: !nftInfo.nft.details.TokenIdStr
        });
      }

      if(isReference) {
        const target = mediaItem.media_reference?.collection_id ?
          document.querySelector(`#nft-media-collection-${mediaItem.media_reference.collection_id}`) :
          document.querySelector(`#nft-media-section-${mediaItem.media_reference.section_id}`);

        if(target) {
          ScrollTo(-100, target);
        }
      }
    },
    target: isExternal ? "_blank" : undefined,
    disabled: !!mediaItem.disabled,
    rel: "noopener",
    useNavLink: true,
  };

  return (
    <Linkish
      {...(hasButton ? {} : linkParams)}
      className={`nft-media-browser__featured-item ${required || locked ? "nft-media-browser__featured-item--locked" : ""}`}
    >
      {itemDetails.background_image ?
        <img
          alt={`${itemDetails.name || mediaItem.name} background`}
          src={itemDetails.background_image.url}
          className="nft-media-browser__featured-item__background-image"
        /> : null
      }
      {
        imageUrl || itemDetails.animation ?
          <div className="nft-media-browser__featured-item__image-container">
            {
              itemDetails.animation ?
                <Video videoLink={itemDetails.animation} className="nft-media-browser__featured-item__image nft-media-browser__featured-item__video"/> :
                <img src={imageUrl} alt={name || mediaItem.name} className="nft-media-browser__featured-item__image"/>
            }
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
  const anySubtitles = collection.media.find(mediaItem => !!mediaItem.subtitle_1);

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
    <div
      id={`nft-media-collection-${collection.id}`}
      className={`nft-media-browser__collection ${collectionActive ? "nft-media-browser__collection--active" : ""} ${collection.display === "Album" ? "nft-media-browser__collection--album" : ""}`}
    >
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
          className={`nft-media-browser__carousel ${anySubtitles ? "nft-media-browser__carousel--with-subtitles" : ""}`}
          keyboard
          navigation={{
            prevEl: "." + previousArrowClass,
            nextEl: "." + nextArrowClass
          }}
          slidesPerView="auto"
          slidesPerGroup={rootStore.pageWidth > 1000 ? 3 : 1}
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
            const { locked, hidden } = MediaLockState({nftInfo, mediaItem});

            if(hidden) {
              // Hidden due to lock conditions - Render empty hidden slide
              return (
                <SwiperSlide
                  key={`item-${mediaItem.id}-${Math.random()}`}
                  className="nft-media-browser__item-slide nft-media-browser__item-slide--hidden"
                />
              );
            }

            let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});

            if(locked) {
              imageUrl = MediaImageUrl({mediaItem: mediaItem.locked_state, maxWidth: 600}) || imageUrl;
              mediaItem = mediaItem.locked_state;
            }

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
                    { LiveMediaInfo(mediaItem).isLive ? <div className="nft-media__live-indicator">LIVE</div> : null }
                  </div>

                  <div className="nft-media-browser__item__text-container">
                    <div className="nft-media-browser__item__name">
                      {
                        locked ?
                          <ImageIcon icon={LockedIcon} className="nft-media-browser__item__name__icon" /> :
                          itemActive ? <ImageIcon icon={PlayIcon} className="nft-media-browser__item__name__icon" /> : null
                      }
                      {
                        mediaItem.annotated_title ?
                          <AnnotatedField
                            text={mediaItem.annotated_title}
                            referenceImages={nftInfo.referenceImages}
                            className="nft-media-browser__item__name__text nft-media__annotated-title"
                          /> :
                          <div className="nft-media-browser__item__name__text ellipsis">
                            {mediaItem.name}
                          </div>
                      }
                    </div>
                    {
                      mediaItem.subtitle_1 ?
                        <div className="nft-media-browser__item__subtitle ellipsis">
                          { mediaItem.subtitle_1 }
                        </div> : null
                    }
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
    <div
      id={`nft-media-section-${section.id}`}
      className={`nft-media-browser__section ${match.params.sectionId === section.id ? "nft-media-browser__section--active" : ""} ${locked ? "nft-media-browser__section--locked" : ""}`}
    >
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

  let featuredMedia = {
    required: [],
    available: [],
    locked: [],
    hidden: []
  };

  // Only show 'lock' icons in browser if any featured media is/was required
  let lockable = false;

  // Separate media into categories based on locked/required state
  nftInfo.additionalMedia.featured_media.forEach(mediaItem => {
    if(mediaItem.required) {
      lockable = true;

      if(!rootStore.MediaViewed({nft: nftInfo.nft, mediaId: mediaItem.id, preview: !nftInfo.nft.details.TokenIdStr})) {
        featuredMedia.required.push(mediaItem);
        return;
      }
    }

    const { locked, hidden } = MediaLockState({nftInfo, mediaItem});
    if(hidden) {
      featuredMedia.hidden.push(mediaItem);
    } else if(locked) {
      featuredMedia.locked.push(mediaItem);
    } else {
      featuredMedia.available.push(mediaItem);
    }
  });

  const featuredRedeemables = nftInfo.redeemables.filter(offer => !offer.hidden && offer.featured);

  return (
    <div className="nft-media-browser nft-media-browser--sections">
      {
        (nftInfo.additionalMedia.featured_media || []).length > 0 ?
          <div className="nft-media-browser__featured">
            {
              featuredMedia.required
                .map(mediaItem => <FeaturedMediaItem nftInfo={nftInfo} key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} required />)
            }
            {
              featuredMedia.available
                .map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} />)
            }
            {
              featuredMedia.locked
                .map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} mediaIndex={mediaItem.mediaIndex} locked />)
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
            locked={featuredMedia.required.length > 0}
          />
        )
      }
    </div>
  );
});

export default NFTMediaBrowser;
