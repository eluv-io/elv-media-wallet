import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Initialize} from "@eluvio/elv-embed/src/Import";
import {Redirect, Link, useHistory, useRouteMatch} from "react-router-dom";
import {
  AvailableMedia,
  MediaImageUrl,
  MediaLinkPath,
  MediaLockState,
  NavigateToMedia
} from "Components/nft/media/Utils";
import ImageIcon from "Components/common/ImageIcon";
import {
  AnnotatedField,
  ButtonWithLoader,
  ButtonWithMenu, Copy,
  FullScreenImage,
  LocalizeString,
  QRCodeElement,
  RichText
} from "Components/common/UIComponents";
import AlbumView from "Components/nft/media/Album";
import Modal from "Components/common/Modal";
import {MediaCollection} from "Components/nft/media/Browser";
import {LiveMediaInfo, SearchParams, SetImageUrlDimensions, ToggleFullscreen} from "../../../utils/Utils";

import BackIcon from "Assets/icons/arrow-left";
import LeftArrow from "Assets/icons/left-arrow";
import RightArrow from "Assets/icons/right-arrow";
import MediaErrorIcon from "Assets/icons/media-error-icon.svg";
import QRCodeIcon from "Assets/icons/QR Code Icon.svg";
import ARPhoneIcon from "Assets/icons/AR Phone Icon.svg";
import FullscreenIcon from "Assets/icons/full screen.svg";
import MinimizeIcon from "Assets/icons/minimize.svg";
import PlayIcon from "Assets/icons/media/play";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";
import ShareIcon from "Assets/icons/share icon";
import {Loader} from "Components/common/Loaders";
import PictureIcon from "Assets/icons/image";
import TwitterIcon from "Assets/icons/X logo.svg";
import WhatsAppIcon from "Assets/icons/whatsapp";
import CopyIcon from "Assets/icons/copy";

const iframePermissions = {
  allow: [
    "accelerometer",
    "autoplay",
    "clipboard-read",
    "clipboard-write",
    "encrypted-media *",
    "fullscreen",
    "gyroscope",
    "picture-in-picture",
    "camera",
    "microphone"
  ].join(";"),
  sandbox: [
    "allow-same-origin",
    "allow-downloads",
    "allow-scripts",
    "allow-forms",
    "allow-modals",
    "allow-pointer-lock",
    "allow-orientation-lock",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-presentation",
    "allow-downloads-without-user-activation",
    "allow-storage-access-by-user-activation"
  ].join(" ")
};

const NFTActiveMediaQRCode = ({link, Close}) => {
  return (
    <Modal className="nft-media__qr-modal-container" closable Toggle={Close} >
      <div className="nft-media__qr-modal">
        <h1 className="nft-media__qr-modal__header">
          { rootStore.l10n.item_details.additional_media.view_ar }
        </h1>
        <div className="nft-media__qr-modal__content">
          <QRCodeElement content={link} className="nft-media__qr-modal__qr-code" />
          <ImageIcon icon={ARPhoneIcon} className="nft-media__qr-modal__icon" />
          <div className="nft-media__qr-modal__text">
            { rootStore.l10n.item_details.additional_media.qr_code_instructions }
          </div>
        </div>
      </div>
    </Modal>
  );
};

const NFTActiveMediaShare = observer(({nftInfo, mediaItem}) => {
  const [urls, setURLs] = useState(undefined);
  const match = useRouteMatch();

  if(mediaItem.requires_permissions || nftInfo.nft?.metadata?.hide_share || mediaItem.hide_share) {
    return null;
  }

  const ownerAddress = nftInfo.ownerAddress;
  const ownerProfile = ownerAddress ? rootStore.userProfiles[Utils.FormatAddress(ownerAddress)] : undefined;

  const InitializeURLs = async () => {
    let itemUrl;
    if(match.params.marketplaceId && match.params.sku) {
      itemUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
      itemUrl.pathname = UrlJoin("/marketplace", match.params.marketplaceId, "store", match.params.sku);
    } else if(ownerProfile) {
      itemUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
      itemUrl.pathname = match.params.marketplaceId ?
        UrlJoin("/marketplace", match.params.marketplaceId, "users", ownerProfile.userAddress, "items", match.params.contractId, match.params.tokenId) :
        UrlJoin("/wallet", "users", ownerProfile.userAddress, "items", match.params.contractId, match.params.tokenId);
    }

    if(itemUrl) {
      itemUrl.searchParams.set(
        "og",
        rootStore.client.utils.B64(
          JSON.stringify({
            "og:title": nftInfo.name,
            "og:description": nftInfo.item?.description || nftInfo.nft.metadata.description,
            "og:image": SetImageUrlDimensions({url: nftInfo?.item?.url || nftInfo.nft.metadata.image, width: 400}),
            "og:image:alt": nftInfo.name
          })
        )
      );
    }

    let mediaUrl;
    if(mediaItem.mediaInfo.mediaType === "image") {
      mediaUrl = mediaItem.mediaInfo.imageUrl;
    } else {
      const embedUrl = new URL(mediaItem.mediaInfo.embedUrl?.toString());
      embedUrl.searchParams.delete("ath");
      embedUrl.searchParams.delete("vrk");
      mediaUrl = embedUrl.toString();
    }

    if(!itemUrl || !mediaUrl) {
      setURLs({});

      return;
    }

    const [shortItemUrl, shortMediaUrl] = await Promise.all([
      rootStore.CreateShortURL(itemUrl),
      mediaUrl ? rootStore.CreateShortURL(mediaUrl) : undefined
    ]);

    let twitterUrl = new URL("https://twitter.com/share");
    twitterUrl.searchParams.set("url", shortMediaUrl);
    twitterUrl.searchParams.set("text", `${nftInfo.name} - ${mediaItem.name}\n\n`);

    let whatsAppUrl = new URL("https://wa.me");
    whatsAppUrl.searchParams.set("url", shortMediaUrl);
    whatsAppUrl.searchParams.set("text", `${nftInfo.name} - ${mediaItem.name}\n\n${shortMediaUrl}`);

    setURLs({
      shortItemUrl: shortItemUrl,
      mediaUrl,
      twitterUrl,
      whatsAppUrl,
      shortMediaUrl
    });
  };

  return (
    <ButtonWithMenu
      className="nft-media__content__target__share-button-container"
      buttonProps={{
        className: "action nft-media__content__target__button nft-media__content__target__share-button",
        children: (
          <>
            <ImageIcon icon={ShareIcon} />
            { rootStore.l10n.actions.share }
          </>
        )
      }}
      RenderMenu={Close => {
        if(!urls) {
          InitializeURLs();
          return <Loader className="action-menu__loader" />;
        }

        return (
          <>
            {
              mediaItem.mediaInfo.mediaType === "image" && urls.mediaUrl ?
                <ButtonWithLoader
                  onClick={async () => await rootStore.UpdateUserProfile({newProfileImageUrl: urls.mediaUrl.toString()})}>
                  <ImageIcon icon={PictureIcon}/>
                  {rootStore.l10n.item_details.menu.set_as_profile}
                </ButtonWithLoader> : null
            }
            {
              urls.twitterUrl ?
                <a href={urls.twitterUrl.toString()} target="_blank" onClick={Close}>
                  <ImageIcon icon={TwitterIcon}/>
                  {rootStore.l10n.item_details.menu.share_on_twitter}
                </a> : null
            }
            {
              urls.whatsAppUrl ?
                <a href={urls.whatsAppUrl.toString()} target="_blank" onClick={Close}>
                  <ImageIcon icon={WhatsAppIcon} />
                  {rootStore.l10n.item_details.menu.share_on_whatsapp}
                </a> : null
            }
            {
              urls.shortItemUrl ?
                <button
                  onClick={() => {
                    Copy(urls.shortItemUrl);
                    Close();
                  }}
                >
                  <ImageIcon icon={CopyIcon}/>
                  { rootStore.l10n.item_details.menu.copy_item_url }
                </button> : null
            }
            {
              urls.shortMediaUrl ?
                <button
                  onClick={() => {
                    Copy(urls.shortMediaUrl);
                    Close();
                  }}
                >
                  <ImageIcon icon={CopyIcon}/>
                  {rootStore.l10n.item_details.menu.copy_media_url}
                </button> : null
            }
          </>
        );
      }}
    />
  );
});

const NFTActiveMediaActions = observer(({nftInfo, mediaItem, showFullscreen, setShowFullscreen}) => {
  if(!mediaItem.mediaInfo) { return null; }

  const fullscreenable = ["embedded webpage", "html", "ebook", "image"].includes(mediaItem.mediaInfo.mediaType);
  const shareable = !mediaItem.mediaInfo.requires_permissions;

  if(!fullscreenable && !shareable) {
    return null;
  }

  return (
    <div className="nft-media__content__target__actions">
      {
        !shareable ? null :
          <NFTActiveMediaShare key={`media-share-${mediaItem.id}`} nftInfo={nftInfo} mediaItem={mediaItem} />
      }
      {
        !fullscreenable ? null :
          <button
            onClick={() => {
              mediaItem.mediaInfo.mediaType === "image" ?
                setShowFullscreen(!showFullscreen) :
                ToggleFullscreen(document.querySelector(".nft-media__content__target"));
            }}
            className="nft-media__content__target__button nft-media__content__target__fullscreen-button"
          >
            <ImageIcon icon={showFullscreen ? MinimizeIcon : FullscreenIcon} alt="Toggle Full Screen"/>
          </button>
      }
    </div>
  );
});

const NFTActiveMediaContent = observer(({nftInfo, mediaItem, showFullscreen, setShowFullscreen, SetVideoElement}) => {
  const [error, setError] = useState(false);
  const targetRef = useRef();

  if(!mediaItem.mediaInfo) { return null; }

  useEffect(() => {
    if(mediaItem.mediaInfo?.recordView) {
      rootStore.SetMediaViewed({
        nft: nftInfo.nft,
        mediaId: mediaItem.id,
        preview: !nftInfo.nft.details.TokenIdStr
      });
    }

    if(!targetRef || !targetRef.current) { return; }

    // eslint-disable-next-line no-async-promise-executor
    const playerPromise = new Promise(async resolve =>
      Initialize({
        client: rootStore.client,
        target: targetRef.current,
        url: mediaItem.mediaInfo.embedUrl,
        errorCallback: (error, player) => {
          setError(error);
          rootStore.Log(error, true);

          player?.Destroy();
        },
        playerOptions: {
          // Poster only for audio
          posterUrl: mediaItem.mediaInfo.mediaType === "audio" ? mediaItem.mediaInfo.imageUrl : undefined,
          playerCallback: ({player, videoElement}) => {
            if(SetVideoElement) {
              SetVideoElement(videoElement);
            }

            resolve(player);
          },
          errorCallback: (error, player) => {
            setError(error);
            rootStore.Log(error, true);

            player?.Destroy();
          }
        }
      })
    );

    return async () => {
      if(!playerPromise) { return; }

      try {
        (await playerPromise)?.Destroy();
      } catch(error) {
        console.log(error);
      }
    };
  }, [targetRef]);

  useEffect(() => {
    const UpdateFullscreen =  () => setShowFullscreen(!!document.fullscreenElement);

    document.addEventListener("fullscreenchange", UpdateFullscreen);

    return () => document.removeEventListener("fullscreenchange", UpdateFullscreen);
  }, []);

  if(error) {
    return (
      <div className="nft-media__content__target nft-media__content__target--error">
        <ImageIcon icon={MediaErrorIcon} className="nft-media__content__target__error-icon" />
        <ImageIcon icon={mediaItem.mediaInfo.imageUrl} className="nft-media__content__target__error-image" />
        <div className="nft-media__content__target__error-cover" />
        <div className="nft-media__content__target__error-message">
          { error?.permission_message || rootStore.l10n.item_details.additional_media.errors.default }
        </div>
      </div>
    );
  }

  switch(mediaItem.mediaInfo.mediaType) {
    case "gallery":
      return (
        <div className={`nft-media__content__target nft-media__content__target--${mediaItem.mediaInfo.mediaType}`}>
          <iframe
            src={mediaItem.mediaInfo.embedUrl}
            allowFullScreen
            allow={iframePermissions.allow}
            sandbox={iframePermissions.sandbox}
            className="nft-media__content__target nft-media__content__target--frame"
          />
        </div>
      );

    case "embedded webpage":
    case "html":
    case "ebook":
      return (
        <div className={`nft-media__content__target nft-media__content__target--${mediaItem.mediaInfo.mediaType}`}>
          <iframe
            src={mediaItem.mediaInfo.mediaType === "ebook" ? mediaItem.mediaInfo.embedUrl : mediaItem.mediaInfo.mediaLink}
            allowFullScreen
            allow={iframePermissions.allow}
            sandbox={iframePermissions.sandbox}
            className={`nft-media__content__target nft-media__content__target--frame ${showFullscreen ? "nft-media__content__target--fullscreen" : ""}`}
          />
        </div>
      );

    case "image":
      return (
        <>
          <div className="nft-media__content__target">
            <img alt={mediaItem.mediaInfo.name} src={mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.imageUrl} className="nft-media__content__target__image" />
          </div>
          {
            showFullscreen ?
              <FullScreenImage
                Toggle={() => setShowFullscreen(false)}
                modalClassName="nft-media__content__fullscreen-modal"
                className="nft-media__content__fullscreen-modal__image"
                alt={mediaItem.mediaInfo.name}
                src={mediaItem.mediaInfo.mediaLink || mediaItem.mediaInfo.imageUrl}
              /> : null
          }
        </>
      );

    default:
      return <div className="nft-media__content__target" ref={targetRef} />;
  }
});

const NFTActiveMedia = observer(({nftInfo}) => {
  const match = useRouteMatch();
  const history = useHistory();
  const [videoElement, setVideoElement] = useState(undefined);
  const [showQRModal, setShowQRModal] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const mediaIndex = parseInt(match.params.mediaIndex);

  const { availableMediaList, currentListIndex } = AvailableMedia({
    nftInfo,
    additionalMedia: nftInfo.additionalMedia,
    sectionId: match.params.sectionId,
    collectionId: match.params.collectionId,
    mediaIndex: match.params.mediaIndex
  });

  const previous = availableMediaList[currentListIndex - 1];
  const current = availableMediaList[currentListIndex];
  const next = availableMediaList[currentListIndex + 1];

  const autoplayableNext = current.showAutoplay && next?.sectionId === current.sectionId && next.collectionId === current.collectionId;

  useEffect(() => {
    setVideoElement(undefined);
    setEnded(false);
    setShowFullscreen(false);
    setAutoplay(autoplay || !!(SearchParams()["ap"]));
  }, [match.params.sectionId, match.params.collectionId, match.params.mediaIndex]);

  useEffect(() => {
    if(!videoElement) { return; }

    videoElement.addEventListener("ended", () => setEnded(true));
    videoElement.addEventListener("playing", () => setEnded(false));
    videoElement.addEventListener("seeking", () => setEnded(false));
  }, [videoElement]);

  useEffect(() => {
    if(ended && autoplay && autoplayableNext) {
      NavigateToMedia({match, history, sectionId: next.sectionId, collectionId: next.collectionId, mediaIndex: next.mediaIndex, autoplay: true});
    }
  }, [ended]);

  if(!current) { return null; }

  let currentMediaItem = current.mediaItem;
  const { locked, hidden } = MediaLockState({nftInfo, mediaItem: currentMediaItem});

  if(hidden) {
    // Item is hidden, should not be here
    return <Redirect to={match.url.split("/media")[0]} />;
  }

  if(locked) {
    currentMediaItem = {
      ...currentMediaItem.locked_state,
      mediaInfo: {
        mediaType: "image",
        imageUrl: MediaImageUrl({mediaItem: currentMediaItem.locked_state}) || MediaImageUrl({mediaItem: currentMediaItem})
      }
    };
  }

  window.currentMediaItem = currentMediaItem;

  const albumView = current.display === "Album";
  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];

  let description = currentMediaItem.description ?
    <RichText richText={currentMediaItem.description} className="nft-media-album__content__description" /> :
    currentMediaItem.description_text ? <div className="nft-media-album__content__description">{ currentMediaItem.description_text }</div> :
      null;

  const textContent = (
    <div className="nft-media-album__content__info">
      {
        currentMediaItem.annotated_title ?
          <AnnotatedField
            text={currentMediaItem.annotated_title}
            referenceImages={nftInfo.referenceImages}
            className="nft-media-album__content__name nft-media__annotated-title"
          /> :
          <div className="nft-media-album__content__name">{currentMediaItem.name || ""}</div>
      }
      { description && currentMediaItem.subtitle_1 ? <div className="nft-media-album__content__subtitle-1">{ currentMediaItem.subtitle_1 }</div> : null }
      { description && currentMediaItem.subtitle_2 ? <div className="nft-media-album__content__subtitle-2">{ currentMediaItem.subtitle_2 }</div> : null }
      { description }
    </div>
  );

  if(albumView) {
    return (
      <div className="page-block page-block--main-content">
        <div className="page-block__content page-block__content--wide">
          <div className="nft-media-album">
            {
              backPage ?
                <Link to={match.url.split("/media")[0]} className="details-page__back-link">
                  <ImageIcon icon={BackIcon}/>
                  <div className="details-page__back-link__text ellipsis">
                    { LocalizeString(rootStore.l10n.actions.back_to, {thing: backPage.name}) }
                  </div>
                </Link> : null
            }
            <div className="nft-media-album__content">
              <div className="nft-media-album__row nft-media-album__row--content">
                <div className="nft-media-album__content__target-border">
                  <div className="nft-media-album__content__target-container">
                    <NFTActiveMediaContent
                      key={`nft-media-album-${current.sectionIndex}-${current.collectionIndex}-${mediaIndex}`}
                      nftInfo={nftInfo}
                      mediaItem={currentMediaItem}
                      collectionIndex={current.collectionIndex}
                      sectionIndex={current.sectionIndex}
                      mediaIndex={mediaIndex}
                      showFullscreen={showFullscreen}
                      setShowFullscreen={setShowFullscreen}
                      SetVideoElement={setVideoElement}
                    />
                  </div>
                </div>
                <div className={`nft-media-album__text-container nft-media-album__text-container--mobile nft-media-album__content__info ${currentMediaItem.description ? "nft-media-album__text-container--description" : ""}`}>
                  { textContent }
                </div>
                <AlbumView
                  media={availableMediaList.filter(item => item.collectionId === match.params.collectionId)}
                  videoElement={videoElement}
                  showPlayerControls
                />
              </div>
              <div className={`nft-media-album__text-container nft-media-album__text-container--desktop ${currentMediaItem.description ? "nft-media-album__text-container--description" : ""}`}>
                { textContent }
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
      { showQRModal ? <NFTActiveMediaQRCode link={currentMediaItem.mediaInfo.mediaLink} Close={() => setShowQRModal(false)} /> : null }
      <div className={`page-block__content ${nftInfo.additionalMedia.isSingleList ? "" : "page-block__content--extra-wide"}`}>
        <div className={`nft-media ${nftInfo.additionalMedia.isSingleList ? "nft-media--single-list" : ""}`}>
          {
            backPage ?
              <Link to={`${match.url.split("/media")[0]}?tab=Media`} className="details-page__back-link">
                <ImageIcon icon={BackIcon}/>
                <div className="details-page__back-link__text ellipsis">
                  { LocalizeString(rootStore.l10n.actions.back_to, {thing: backPage.name}) }
                </div>
              </Link> : null
          }
          <div className="nft-media__title-container">
            <h1 className="nft-media__title">
              {
                currentMediaItem.annotated_title ?
                  <AnnotatedField
                    text={currentMediaItem.annotated_title}
                    referenceImages={nftInfo.referenceImages}
                    className="nft-media__annotated-title"
                  /> :
                  currentMediaItem.name || ""
              }
              { LiveMediaInfo(currentMediaItem).isLive ? <div className="nft-media__live-indicator">LIVE</div> : null }
            </h1>
            { currentMediaItem.subtitle_1 ? <div className="nft-media__subtitle">{currentMediaItem.subtitle_1 || ""}</div> : null }
            { currentMediaItem.subtitle_2 ? <div className="nft-media__subtitle2">{currentMediaItem.subtitle_2 || ""}</div> : null }
          </div>
          <div className="nft-media__content">
            <div className={`nft-media__content__target-container nft-media__content__target-container--${currentMediaItem?.mediaInfo?.mediaType?.toLowerCase() || "video"}`}>
              <NFTActiveMediaContent
                key={`nft-media-${current.sectionIndex}-${current.collectionIndex}-${mediaIndex}`}
                nftInfo={nftInfo}
                mediaItem={currentMediaItem}
                collectionIndex={current.collectionIndex}
                sectionIndex={current.sectionIndex}
                mediaIndex={mediaIndex}
                showFullscreen={showFullscreen}
                setShowFullscreen={setShowFullscreen}
                SetVideoElement={setVideoElement}
              />
            </div>
            <NFTActiveMediaActions nftInfo={nftInfo} mediaItem={currentMediaItem} showFullscreen={showFullscreen} setShowFullscreen={setShowFullscreen} />
            <div className="nft-media__content__info">
              {
                previous ?
                  <div className="nft-media__content__button-container nft-media__content__button-container--left">
                    <Link
                      to={MediaLinkPath({match, sectionId: previous.sectionId, collectionId: previous.collectionId, mediaIndex: previous.mediaIndex})}
                      className="nft-media__content__button nft-media__content__button--previous"
                    >
                      <ImageIcon icon={LeftArrow} />
                      <div className="nft-media__content__button__text ellipsis">
                        {rootStore.l10n.item_details.additional_media.previous}{previous.mediaItem?.name ? `: ${previous.mediaItem.name}` : ""}
                      </div>
                    </Link>
                  </div> : null
              }
              <div className="nft-media__content__text">
                { currentMediaItem.description ?
                  <RichText richText={currentMediaItem.description} className="nft-media__content__description" /> :
                  currentMediaItem.description_text ?
                    <div className="nft-media__content__description">
                      { currentMediaItem.description_text }
                    </div> : null
                }
                {
                  currentMediaItem.mediaInfo.mediaType === "html" ?
                    <button onClick={() => setShowQRModal(!showQRModal)} className="nft-media__content__button nft-media__content__button--qr">
                      <ImageIcon icon={QRCodeIcon} />
                      <ImageIcon icon={ARPhoneIcon} />
                      <div className="nft-media__content__button__text">
                        { rootStore.l10n.item_details.additional_media.view_ar }
                      </div>
                    </button> : null
                }
              </div>
              {
                next ?
                  <div className="nft-media__content__button-container nft-media__content__button-container--right">
                    { autoplayableNext ?
                      <button
                        onClick={() => setAutoplay(!autoplay)}
                        className={`nft-media__content__button nft-media__content__button--autoplay ${autoplay ? "nft-media__content__button--autoplay--active" : ""}`}
                      >
                        <ImageIcon icon={PlayIcon}/>
                        <div className="nft-media__content__button__text">
                          {rootStore.l10n.item_details.additional_media.play_all}
                        </div>
                      </button> : null
                    }
                    <Link
                      to={MediaLinkPath({match, sectionId: next.sectionId, collectionId: next.collectionId, mediaIndex: next.mediaIndex})}
                      className="nft-media__content__button nft-media__content__button--next"
                    >
                      <div className="nft-media__content__button__text ellipsis">
                        {rootStore.l10n.item_details.additional_media.next}{next.mediaItem?.name ? `: ${next.mediaItem.name}` : ""}
                      </div>
                      <ImageIcon icon={RightArrow} />
                    </Link>
                  </div> : null
              }
            </div>
          </div>
        </div>
        {
          nftInfo.additionalMedia.isSingleList ?
            <div className="nft-media-browser nft-media-browser--single-list">
              <MediaCollection
                collection={nftInfo.additionalMedia.sections[0].collections[0]}
                nftInfo={nftInfo}
                sectionId="list"
                singleCollection
              />
            </div> :
            null
        }
      </div>
    </div>
  );
});

export default NFTActiveMedia;
