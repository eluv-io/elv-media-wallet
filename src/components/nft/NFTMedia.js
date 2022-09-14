import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, NavLink, useRouteMatch} from "react-router-dom";
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
import BackIcon from "Assets/icons/arrow-left";
import UpArrow from "Assets/icons/up-caret.svg";
import DownArrow from "Assets/icons/down-caret.svg";
import LeftArrow from "Assets/icons/left-caret.svg";
import RightArrow from "Assets/icons/right-caret.svg";
import {RichText} from "Components/common/UIComponents";

const MediaImageUrl = ({mediaItem, maxWidth}) => {
  let imageUrl = mediaItem.image || (mediaItem.media_type === "Image" && mediaItem.media_file?.url);

  if(imageUrl){
    imageUrl = new URL(imageUrl);
    imageUrl.searchParams.set("width", maxWidth);
    imageUrl = imageUrl.toString();
  }

  return imageUrl;
};

const MediaLinkPath = ({match, sectionId, collectionId, mediaId}) => {
  let path = match.url.split("/media")[0];

  if(sectionId === "list") {
    return UrlJoin(path, "media", "list", mediaId.toString());
  } else if(sectionId === "featured") {
    return UrlJoin(path, "media", "featured", mediaId);
  }

  return UrlJoin(path, "media", sectionId, collectionId, mediaId);
};

const MediaListItem = ({mediaItem, itemIndex}) => {
  const match = useRouteMatch();

  let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});
  const isActive = match.params.mediaId === itemIndex.toString();

  return (
    <NavLink
      to={MediaLinkPath({match, sectionId: "list", mediaId: itemIndex})}
      className={`nft-media-browser__list-item ${isActive ? "nft-media-browser__list-item--active" : ""}`}
    >
      {
        imageUrl ?
          <div className="nft-media-browser__list-item__image-container">
            <img src={imageUrl} alt={mediaItem.name} className="nft-media-browser__list-item__image" />
          </div> : null
      }
      <div className="nft-media-browser__list-item__content">
        <div className="nft-media-browser__list-item__name ellipsis">{mediaItem.name || ""}</div>
        <div className="nft-media-browser__list-item__subtitle-1">{mediaItem.subtitle_1 || ""}</div>
        <div className="nft-media-browser__list-item__subtitle-2">{mediaItem.subtitle_2 || ""}</div>
      </div>
    </NavLink>
  );
};

const FeaturedMediaItem = ({mediaItem}) => {
  const match = useRouteMatch();

  let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});

  return (
    <NavLink to={MediaLinkPath({match, sectionId: "featured", mediaId: mediaItem.id})} className="nft-media-browser__featured-item">
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


  const activeIndex =
    match.params.sectionId === sectionId &&
    match.params.collectionId === collection.id &&
    collection.media.findIndex(mediaItem => mediaItem.id === match.params.mediaId);

  return (
    <div className="nft-media-browser__collection">
      <button className="nft-media-browser__collection__header" onClick={() => setShow(!show)}>
        <div className="nft-media-browser__collection__header-text ellipsis">
          { collection.name }
        </div>
        <ImageIcon className="nft-media-browser__collection__header-indicator" icon={show ? UpArrow : DownArrow} />
      </button>
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
          { collection.media.map(mediaItem => {
            let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});
            return (
              <SwiperSlide
                key={`item-${mediaItem.id}-${Math.random()}`}
                className={`nft-media-browser__item-slide nft-media-browser__item-slide--${(mediaItem.image_aspect_ratio || "square").toLowerCase()}`}
              >
                <NavLink
                  to={MediaLinkPath({match, sectionId, collectionId: collection.id, mediaId: mediaItem.id})}
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

  return (
    <div className="nft-media-browser__section">
      <button className="nft-media-browser__section__header" onClick={() => setShow(!show)}>
        <div className="nft-media-browser__section__header-text ellipsis">
          { section.name }
        </div>
        <ImageIcon className="nft-media-browser__section__header-indicator" icon={show ? UpArrow : DownArrow} />
      </button>
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

  if(nftInfo.additionalMediaType === "List") {
    return (
      <div className={`nft-media-browser ${inactive ? "nft-media-browser--inactive" : ""} nft-media-browser--list`}>
        <div className="nft-media-browser__list">
          { nftInfo.additionalMedia.map((mediaItem, index) => <MediaListItem key={`featured-${index}`} mediaItem={mediaItem} itemIndex={index} />) }
        </div>
      </div>
    );
  }

  return (
    <div className={`nft-media-browser ${inactive ? "nft-media-browser--inactive" : ""} nft-media-browser--sections`}>
      {
        nftInfo.additionalMedia.featured_media.length > 0 ?
          <div className="nft-media-browser__featured">
            { nftInfo.additionalMedia.featured_media.map(mediaItem => <FeaturedMediaItem key={`featured-${mediaItem.id}`} mediaItem={mediaItem} />) }
          </div> : null
      }
      { nftInfo.additionalMedia.sections.map(section => <MediaSection key={`section-${section.id}`} section={section} />) }
    </div>
  );
});

const NFTActiveMediaContent = observer(({nftInfo, mediaItem, collectionIndex, sectionIndex, mediaIndex}) => {
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

  const media = nftInfo.additionalMedia;

  let mediaItem, sectionIndex, collectionIndex, mediaIndex, nextMediaId, previousMediaId;
  if(match.params.sectionId === "list") {
    mediaIndex = parseInt(match.params.mediaId);
    previousMediaId = mediaIndex > 0 ? mediaIndex - 1 : undefined;
    nextMediaId = mediaIndex < media.length - 2 ? mediaIndex + 1 : undefined;
    mediaItem = media[match.params.mediaId];
  } else if(match.params.sectionId === "featured") {
    // Featured item
    mediaIndex = media.featured_media.findIndex(mediaItem => mediaItem.id === match.params.mediaId);
    mediaItem = media.featured_media[mediaIndex];
    previousMediaId = mediaIndex > 0 ? media.featured_media[mediaIndex - 1].id : undefined;
    nextMediaId = mediaIndex < media.featured_media.length - 1 ? media.featured_media[mediaIndex + 1].id : undefined;
  } else {
    // Find item from section -> collections
    media.sections.forEach((section, sIndex) =>
      section.collections.forEach((collection, cIndex) =>
        collection.media.forEach((item, index) => {
          if(mediaItem) { return; }

          if(item.id === match.params.mediaId) {
            mediaItem = item;
            sectionIndex = sIndex;
            collectionIndex = cIndex;
            mediaIndex = index;

            if(index > 0) {
              previousMediaId = collection.media[index - 1].id;
            }

            if(index < collection.media.length - 1) {
              nextMediaId = collection.media[index + 1].id;
            }
          }
        })
      )
    );
  }

  if(!mediaItem) { return null; }

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <div className="nft-media">
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
            key={`nft-media-${mediaItem.id}`}
            nftInfo={nftInfo}
            mediaItem={mediaItem}
            collectionIndex={collectionIndex}
            sectionIndex={sectionIndex}
            mediaIndex={mediaIndex}
          />

          {
            previousMediaId ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaId: previousMediaId})}
                className="nft-media__content__button nft-media__content__button--previous"
              >
                <ImageIcon icon={LeftArrow} />
              </Link> : null
          }
          {
            nextMediaId ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId, collectionId: match.params.collectionId, mediaId: nextMediaId})}
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
  const nftInfo = NFTInfo({nft});

  return (
    <div className="nft-media-page">
      <div className="page-block page-block--main-content">
        <div className="page-block__content">
          <NFTActiveMedia nftInfo={nftInfo} />
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
