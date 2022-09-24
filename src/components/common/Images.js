import React, {useEffect, useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores";
import SVG from "react-inlinesvg";
import ImageIcon from "Components/common/ImageIcon";
import {Initialize} from "@eluvio/elv-embed/src/Embed";

import NFTPlaceholderIcon from "Assets/icons/nft";
import Modal from "Components/common/Modal";
import {NFTMediaInfo} from "../../utils/Utils";

import FullscreenIcon from "Assets/icons/full screen.svg";
import ExternalLinkIcon from "Assets/icons/external-link.svg";

export const NFTImage = observer(({nft, item, width, showFullMedia=false, allowFullscreen=false, className="", playerCallback}) => {
  const [player, setPlayer] = useState(undefined);
  const [media, setMedia] = useState({imageUrl: undefined, embedUrl: undefined});
  const [targetElement, setTargetElement] = useState(undefined);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => () => player && player.Destroy(), []);

  useEffect(() => {
    const media = NFTMediaInfo({nft, item, width, showFullMedia});
    setMedia(media);

    if(!targetElement || !media.embedUrl) { return; }

    Initialize({
      client: rootStore.client,
      target: targetElement,
      url: media.embedUrl.toString(),
      playerOptions: {
        capLevelToPlayerSize: true,
        playerCallback
      }
    }).then(player => setPlayer(player));

    return () => player?.Destroy();
  }, [targetElement]);

  if(media?.embedUrl) {
    const content = media.useFrame ?
      <iframe src={media.embedUrl} className="item-card__image-video-embed__frame" /> :
      <div ref={element => setTargetElement(element)} className="item-card__image-video-embed__frame" />;

    return (
      <>
        <div className="item-card__image-container" key={`media-${media.embedUrl}`}>
          <div className={`item-card__image item-card__image-video-embed ${className}`}>
            { content }
          </div>
          <div className="item-card__image-container__actions">
            {
              !media.requiresPermissions ?
                <a href={media.embedUrl} target="_blank" className="item-card__image-container__action" title="Open Media in New Tab">
                  <ImageIcon icon={ExternalLinkIcon} label="Open Media"/>
                </a> : null
            }
            {
              allowFullscreen && media.useFrame ?
                <button className="item-card__image-container__action item-card__image-container__action--full-screen" onClick={() => setFullscreen(true)} title="Fullscreen">
                  <ImageIcon icon={FullscreenIcon} label="Enlarge Image"/>
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

  const image = media?.imageUrl ?
    <img
      src={media.imageUrl.toString()}
      className={`item-card__image ${className}`}
      alt={nft.metadata.display_name}
    /> :
    <SVG
      src={NFTPlaceholderIcon}
      className={`item-card__image ${className}`}
      alt={nft.metadata.display_name}
    />;

  return (
    <>
      <div className="item-card__image-container" ref={() => playerCallback && playerCallback(undefined)}>
        { image }
        {
          allowFullscreen ?
            <div className="item-card__image-container__actions">
              {
                media.mediaLink && !media.requiresPermissions ?
                  <a href={media.mediaLink} target="_blank" className="item-card__image-container__action" title="Open Media in New Tab">
                    <ImageIcon icon={ExternalLinkIcon} label="Open Media"/>
                  </a> : null
              }
              <button className="item-card__image-container__action item-card__image-container__action--full-screen" onClick={() => setFullscreen(true)} title="Fullscreen">
                <ImageIcon icon={FullscreenIcon} label="Enlarge Image"/>
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

export const MarketplaceImage = ({marketplaceHash, item, title, path, url, icon, width="800", showFullMedia=false, templateImage=false, rawImage=false, className=""}) => {
  if(showFullMedia) {
    return <NFTImage nft={{metadata: item.nftTemplateMetadata}} item={item} showFullMedia={showFullMedia} className={className} />;
  } else if(!(url || icon)) {
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
