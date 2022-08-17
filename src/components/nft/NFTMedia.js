import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, NavLink, useRouteMatch} from "react-router-dom";
import {NFTMediaInfo} from "../../utils/Utils";
import {MintedNFTDetails} from "Components/nft/NFTDetails";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import ItemIcon from "Assets/icons/image.svg";
import {Initialize} from "@eluvio/elv-embed/src/Embed";
import {rootStore} from "Stores";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import BackIcon from "Assets/icons/arrow-left";

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

  if(sectionId === "featured") {
    return UrlJoin(path, "media", "featured", mediaId);
  }

  return UrlJoin(path, "media", sectionId, collectionId, mediaId);
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

  return (
    <div className="nft-media-browser__collection">
      <button className="nft-media-browser__collection__header" onClick={() => setShow(!show)}>
        { collection.name }
      </button>
      <div className={`nft-media-browser__collection__content ${show ? "" : "nft-media-browser__collection__content--hidden"}`}>
        <div className="nft-media-browser__carousel">
          <div
            className="nft-media-browser__carousel-content"
            ref={element => {
              if(!element) { return; }

              element.addEventListener("wheel", event => {
                event.preventDefault();
                element.scrollLeft += event.deltaY;
              });
            }}
          >
            { collection.media.map(mediaItem => {
              let imageUrl = MediaImageUrl({mediaItem, maxWidth: 600});

              return (
                <NavLink
                  key={`item-${mediaItem.id}-${Math.random()}`}
                  to={MediaLinkPath({match, sectionId, collectionId: collection.id, mediaId: mediaItem.id})}
                  className="nft-media-browser__item"
                >
                  <div className="nft-media-browser__item__image-container">
                    <ImageIcon icon={imageUrl || ItemIcon} className="nft-media-browser__item__image" />
                  </div>

                  <div className="nft-media-browser__item__name">
                    { mediaItem.name }
                  </div>
                </NavLink>
              );
            })}
          </div>
          <div className="nft-media-browser__carousel__shadow" />
        </div>
      </div>
    </div>
  );
};

const MediaSection = ({section}) => {
  const [show, setShow] = useState(true);

  return (
    <div className="nft-media-browser__section">
      <button className="nft-media-browser__section__header" onClick={() => setShow(!show)}>
        { section.name }
      </button>
      <div className={`nft-media-browser__section__content ${show ? "" : "nft-media-browser__section__content--hidden"}`}>
        { section.collections.map(collection => <MediaCollection key={`collection-${collection.id}`} sectionId={section.id} collection={collection}/>) }
      </div>
    </div>
  );
};

export const NFTMediaBrowser = observer(({nft}) => {
  const media = nft.metadata.additional_media;
  const noMedia = media.featured_media.length === 0 && media.sections.length === 0;

  if(noMedia) {
    return null;
  }

  return (
    <div className="nft-media-browser">
      {
        media.featured_media.length > 0 ?
          <div className="nft-media-browser__featured">
            { media.featured_media.map(mediaItem => <FeaturedMediaItem key={`featured-${media.id}`} mediaItem={mediaItem} />) }
          </div> : null
      }
      { media.sections.map(section => <MediaSection key={`section-${section.id}`} section={section} />) }
    </div>
  );
});

const NFTActiveMediaContent = observer(({mediaItem}) => {
  const targetRef = useRef();
  const [player, setPlayer] = useState(undefined);

  const mediaInfo = NFTMediaInfo({selectedMedia: mediaItem, showFullMedia: true});

  useEffect(() => {
    const mediaInfo = NFTMediaInfo({selectedMedia: mediaItem, showFullMedia: true});

    if(!mediaInfo.embedUrl || !targetRef || !targetRef.current) { return; }

    Initialize({
      client: rootStore.client,
      target: targetRef.current,
      url: mediaItem.embed_url.toString(),
    }).then(player => setPlayer(player));

    return () => {
      if(player) {
        player.Destroy();
      }
    };
  }, [targetRef]);

  if(!mediaInfo.embedUrl && mediaInfo.imageUrl) {
    return <img alt={mediaInfo.name} src={mediaInfo.imageUrl} className="nft-media__content__target" />;
  }

  return (
    <div className="nft-media__content__target" ref={targetRef} />
  );
});

const NFTActiveMedia = observer(({nft}) => {
  const match = useRouteMatch();

  const media = nft.metadata.additional_media;

  let mediaItem, nextMediaId, previousMediaId;
  if(match.params.sectionId) {
    // Find item from section -> collections
    media.sections.forEach(section =>
      section.collections.forEach(collection =>
        collection.media.forEach((item, index) => {
          if(mediaItem) { return; }

          if(item.id === match.params.mediaId) {
            mediaItem = item;

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
  } else {
    // Featured item
    const mediaIndex = media.featured_media.findIndex(mediaItem => mediaItem.id === match.params.mediaId);
    mediaItem = media.featured_media[mediaIndex];
    previousMediaId = mediaIndex > 0 ? media.featured_media[mediaIndex - 1].id : undefined;
    nextMediaId = mediaIndex < media.featured_media.length - 1 ? media.featured_media[mediaIndex + 1].id : undefined;
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
          <NFTActiveMediaContent mediaItem={mediaItem} key={`nft-media-${mediaItem.id}`} />

          {
            previousMediaId ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId || "featured", collectionId: match.params.collectionId, mediaId: previousMediaId})}
                className="nft-media__content__button nft-media__content__button--previous"
              >
                { "<" }
              </Link> : null
          }
          {
            nextMediaId ?
              <Link
                to={MediaLinkPath({match, sectionId: match.params.sectionId || "featured", collectionId: match.params.collectionId, mediaId: nextMediaId})}
                className="nft-media__content__button nft-media__content__button--next"
              >
                { ">" }
              </Link> : null
          }
        </div>
        <div className="nft-media__content__text">
          <div className="nft-media__content__name">{mediaItem.name || ""}</div>
          <div className="nft-media__content__subtitle-1">{mediaItem.subtitle_1 || ""}</div>
          <div className="nft-media__content__subtitle-2">{mediaItem.subtitle_2 || ""}</div>
          {
            mediaItem.description ?
              <div
                className="nft-media__content__description"
                ref={element => {
                  if(!element) { return; }

                  render(
                    <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                      { SanitizeHTML(mediaItem.description) }
                    </ReactMarkdown>,
                    element
                  );
                }}
              /> : null
          }
        </div>
      </div>
    </div>
  );
});

const NFTMedia = observer(({nft}) => {
  return (
    <div className="nft-media-page">
      <div className="page-block page-block--main-content">
        <div className="page-block__content">
          <NFTActiveMedia nft={nft} />
        </div>
      </div>
      <div className="page-block page-block--media-browser">
        <div className="page-block__content">
          <NFTMediaBrowser nft={nft} />
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
