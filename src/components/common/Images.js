import React, {useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores";
import SVG from "react-inlinesvg";
import ImageIcon from "Components/common/ImageIcon";

import NFTPlaceholderIcon from "Assets/icons/nft";
import Modal from "Components/common/Modal";
import {NFTMedia} from "../../utils/Utils";

import FullscreenIcon from "Assets/icons/full screen.svg";
import MinimizeIcon from "Assets/icons/minimize.svg";
import ExternalLinkIcon from "Assets/icons/external-link.svg";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {LoaderImage} from "Components/properties/Common";

export const NFTImage = observer(({nft, item, width, hideEmbedLink=false, showVideo=false, allowFullscreen=false, className="", playerCallback}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const media = NFTMedia({nft, item, width});

  const isFrameContent = ["html", "ebook", "gallery"].includes(media.mediaType);
  const isOwned = Utils.EqualAddress(nft?.details?.TokenOwner, rootStore.CurrentAddress());

  const image = media?.imageUrl ?
    <LoaderImage
      src={media.imageUrl.toString()}
      showWithoutSource
      loaderAspectRatio={1}
      className={`item-card__image ${className}`}
      alt={nft?.metadata?.display_name}
    /> :
    <SVG
      src={NFTPlaceholderIcon}
      className={`item-card__image ${className}`}
      alt={nft?.metadata?.display_name}
    />;

  if(media.mediaType !== "image" && media?.embedUrl && showVideo && (!isFrameContent || isOwned)) {
    const embedUrl = new URL(media.embedUrl);
    embedUrl.searchParams.set("bg", "black");

    return (
      <>
        <div className="item-card__image-container" key={`media-${media.embedUrl}`}>
          <div className={`item-card__image item-card__image-video-embed ${className}`}>
            <iframe
              src={embedUrl}
              allow="encrypted-media *"
              allowFullScreen
              sandbox={[
                "allow-downloads",
                "allow-scripts",
                "allow-forms",
                "allow-modals",
                "allow-pointer-lock",
                "allow-orientation-lock",
                "allow-popups",
                "allow-presentation",
                "allow-same-origin",
                "allow-downloads-without-user-activation"
              ].join(" ")}
              className="item-card__image-video-embed__frame"
            />
          </div>
          <div className="item-card__image-container__actions">
            {
              !media.requiresPermissions && !hideEmbedLink ?
                <a href={media.embedUrl} target="_blank" className="item-card__image-container__action" title="Open Media in New Tab" rel="noreferrer">
                  <ImageIcon icon={ExternalLinkIcon} label="Open Media"/>
                </a> : null
            }
            {
              allowFullscreen && !isFrameContent ?
                <button className="item-card__image-container__action item-card__image-container__action--full-screen" onClick={() => setFullscreen(true)} title="Fullscreen">
                  <ImageIcon icon={fullscreen ? MinimizeIcon : FullscreenIcon} label="Enlarge Image"/>
                </button> : null
            }
          </div>
        </div>
        {
          fullscreen ?
            <Modal className="item-card__image-modal" Toggle={() => setFullscreen(false)}>
              { content }
            </Modal> : null
        }
      </>
    );
  }

  return (
    <>
      <div className="item-card__image-container" ref={() => playerCallback && playerCallback(undefined)}>
        { image }
        {
          allowFullscreen ?
            <div className="item-card__image-container__actions">
              {
                media.mediaLink && !media.requiresPermissions ?
                  <a href={media.mediaLink} target="_blank" className="item-card__image-container__action" title="Open Media in New Tab" rel="noreferrer">
                    <ImageIcon icon={ExternalLinkIcon} label="Open Media"/>
                  </a> : null
              }
              <button className="item-card__image-container__action item-card__image-container__action--full-screen" onClick={() => setFullscreen(true)} title="Fullscreen">
                <ImageIcon icon={fullscreen ? MinimizeIcon : FullscreenIcon} label="Enlarge Image"/>
              </button>
            </div> : null
        }
      </div>
      {
        fullscreen ?
          <Modal className="item-card__image-modal" Toggle={() => setFullscreen(false)}>
            { image }
          </Modal> : null
      }
    </>
  );
});

export const MarketplaceImage = ({marketplaceHash, item, title, path, url, icon, width="800", showVideo=false, templateImage=false, rawImage=false, className=""}) => {
  if(!(path || url) || showVideo) {
    return (
      <NFTImage
        item={item}
        hideEmbedLink
        showVideo={showVideo}
        width={width}
        className={className}
      />
    );
  }

  if(!(url || icon)) {
    if(!item || item.image && (!templateImage || !item.nft_template || !item.nft_template.nft || !item.nft_template.nft.image)) {
      url = rootStore.PublicLink({
        versionHash: marketplaceHash,
        path,
        queryParams: width ? { width } : {}
      });
    } else if(item.nft_template && item.nft_template.nft && item.nft_template.nft.image) {
      url = (item.nft_template.nft || {}).image;
      url = new URL(url);
      url.searchParams.set("authorization", item.requires_permissions ? rootStore.authToken || rootStore.staticToken : rootStore.staticToken);

      if(width) {
        url.searchParams.set("width", width);
      }

      url = url.toString();
    } else {
      icon = NFTPlaceholderIcon;
      className = `item-card__image-placeholder ${className}`;
    }
  }

  const image = (
    <ImageIcon
      title={title || item && item.name || ""}
      icon={url || icon || NFTPlaceholderIcon}
      alternateIcon={NFTPlaceholderIcon}
      className={rawImage ? className : `item-card__image ${className}`}
    />
  );

  if(rawImage) {
    return image;
  }

  return (
    <div className={`item-card__image-container ${className}`}>
      { image }
    </div>
  );
};
