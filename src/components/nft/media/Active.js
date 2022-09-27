import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Initialize} from "@eluvio/elv-embed/src/Import";
import {Link, useRouteMatch} from "react-router-dom";
import {AvailableMedia, MediaImageUrl, MediaLinkPath} from "Components/nft/media/Utils";
import ImageIcon from "Components/common/ImageIcon";
import {RichText} from "Components/common/UIComponents";
import AlbumView from "Components/nft/media/Album";

import BackIcon from "Assets/icons/arrow-left";
import LeftArrow from "Assets/icons/left-arrow";
import RightArrow from "Assets/icons/right-arrow";
import MediaErrorIcon from "Assets/icons/media-error-icon.svg";


const NFTActiveMediaContent = observer(({nftInfo, mediaItem, SetVideoElement}) => {
  const [error, setError] = useState(false);
  const targetRef = useRef();

  if(!mediaItem.mediaInfo) { return null; }

  useEffect(() => {
    if(mediaItem.mediaInfo?.recordView) {
      rootStore.SetMediaViewed({
        nft: nftInfo.nft,
        mediaId: mediaItem.id
      });
    }

    if(!targetRef || !targetRef.current) { return; }

    const playerPromise = new Promise(async resolve =>
      Initialize({
        client: rootStore.client,
        target: targetRef.current,
        url: mediaItem.mediaInfo.embedUrl,
        errorCallback: error => {
          setError(error);
          rootStore.Log(error, true);
        },
        playerOptions: {
          posterUrl: mediaItem.mediaInfo.imageUrl,
          playerCallback: ({player, videoElement}) => {
            if(SetVideoElement) {
              SetVideoElement(videoElement);
            }

            resolve(player);
          },
          errorCallback: error => {
            setError(error);
            rootStore.Log(error, true);
          }
        }
      })
    );

    return async () => {
      if(!playerPromise) { return; }

      const player = await playerPromise;
      player.Destroy();
    };
  }, [targetRef]);

  if(error) {
    return (
      <div className="nft-media__content__target nft-media__content__target--error">
        <ImageIcon icon={MediaErrorIcon} className="nft-media__content__target__error-icon" />
        <div className="nft-media__content__target__error-message">
          This media is no longer available
        </div>
      </div>
    );
  }

  switch(mediaItem.mediaInfo.mediaType) {
    case "html":
      return (
        <iframe
          src={mediaItem.mediaInfo.mediaLink}
          allowFullScreen
          allow="accelerometer;autoplay;clipboard-write;encrypted-media;fullscreen;gyroscope;picture-in-picture"
          className="nft-media__content__target nft-media__content__target--frame"
        />
      );

    case "image":
      return <img alt={mediaItem.mediaInfo.name} src={mediaItem.mediaInfo.imageUrl} className="nft-media__content__target" />;

    default:
      return <div className="nft-media__content__target" ref={targetRef} />;

  }
});

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
    currentMediaItem = {
      ...currentMediaItem.locked_state,
      mediaInfo: {
        mediaType: "image",
        imageUrl: MediaImageUrl({mediaItem: currentMediaItem})
      }
    };
  }

  const albumView = current.display === "Album";
  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];

  if(albumView) {
    return (
      <div className="page-block page-block--main-content">
        <div className="page-block__content">
          <div className="nft-media-album">
            {
              backPage ?
                <Link to={`${match.url.split("/media")[0]}?tab=Media`} className="details-page__back-link">
                  <ImageIcon icon={BackIcon}/>
                  <div className="details-page__back-link__text ellipsis">
                    Back to {backPage.name}
                  </div>
                </Link> : null
            }
            <div className="nft-media-album__content">
              <div className="nft-media-album__row nft-media-album__row--content">
                <div className="nft-media-album__content__target-container">
                  <NFTActiveMediaContent
                    key={`nft-media-album-${current.sectionIndex}-${current.collectionIndex}-${mediaIndex}`}
                    nftInfo={nftInfo}
                    mediaItem={currentMediaItem}
                    collectionIndex={current.collectionIndex}
                    sectionIndex={current.sectionIndex}
                    mediaIndex={mediaIndex}
                    SetVideoElement={setVideoElement}
                  />
                </div>
                <div className="nft-media-album__text--mobile nft-media__content__text">
                  <div className="nft-media__content__name">{currentMediaItem.name || ""}</div>
                  { currentMediaItem.description ? <RichText richText={currentMediaItem.description} className="nft-media__content__description" /> : null }
                </div>
                <AlbumView
                  media={availableMediaList.filter(item => item.collectionId === match.params.collectionId)}
                  videoElement={videoElement}
                  showPlayerControls
                />
              </div>
              <div className="nft-media-album__text--desktop nft-media-album__row">
                <div className="nft-media__content__text">
                  <div className="nft-media__content__name">{currentMediaItem.name || ""}</div>
                  { currentMediaItem.description ? <RichText richText={currentMediaItem.description} className="nft-media__content__description" /> : null }
                </div>
                <div className="nft-media-album__row-placeholder" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-block page-block--main-content">
      <div className="page-block__content page-block__content--unrestricted">
        <div className="nft-media">
          {
            backPage ?
              <Link to={`${match.url.split("/media")[0]}?tab=Media`} className="details-page__back-link">
                <ImageIcon icon={BackIcon}/>
                <div className="details-page__back-link__text ellipsis">
                  Back to {backPage.name}
                </div>
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
              <div className="nft-media__content__subtitle-1">{currentMediaItem.subtitle_1 || ""}</div>
              <div className="nft-media__content__subtitle-2">{currentMediaItem.subtitle_2 || ""}</div>
              { currentMediaItem.description ? <RichText richText={currentMediaItem.description} className="nft-media__content__description" /> : null }
              {
                previous ?
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
                next ?
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
          </div>
        </div>
      </div>
    </div>
  );
});

export default NFTActiveMedia;
