import React, {useEffect, useState} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores";
import SVG from "react-inlinesvg";
import ImageIcon from "Components/common/ImageIcon";
import {Initialize} from "@eluvio/elv-embed/src/Embed";

import NFTPlaceholderIcon from "Assets/icons/nft";
import FullscreenIcon from "Assets/icons/full screen.svg";
import Modal from "Components/common/Modal";

export const NFTImage = observer(({nft, item, selectedMedia, width, video=false, allowFullscreen=false, className="", playerCallback}) => {
  const [player, setPlayer] = useState(undefined);
  const [media, setMedia] = useState({imageUrl: undefined, embedUrl: undefined});
  const [targetElement, setTargetElement] = useState(undefined);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => () => player && player.Destroy(), []);

  useEffect(() => {
    if(!targetElement || !media.embedUrl) { return; }

    const posterUrl = selectedMedia && selectedMedia.media_type === "Audio" && media.imageUrl ? media.imageUrl.toString() : undefined;
    Initialize({
      client: rootStore.client,
      target: targetElement,
      url: media.embedUrl.toString(),
      playerOptions: {
        posterUrl,
        capLevelToPlayerSize: true,
        playerCallback
      }
    }).then(player => setPlayer(player));
  }, [targetElement]);

  useEffect(() => {
    setMedia({imageUrl: undefined, embedUrl: undefined});

    if(player) {
      player.Destroy();
      setPlayer(undefined);
    }

    let imageUrl, embedUrl, useFrame=false;

    const selectedMediaImageUrl = selectedMedia && ((selectedMedia.media_type === "Image" && selectedMedia.media_file?.url) || selectedMedia.image);
    if(selectedMediaImageUrl) {
      imageUrl = new URL(selectedMediaImageUrl);

      imageUrl.searchParams.set("authorization", rootStore.authToken);
      if(imageUrl && width) {
        imageUrl.searchParams.set("width", width);
      }
    }

    if(!imageUrl && ((item && item.image) || nft.metadata.image)) {
      imageUrl = new URL((item && item.image && item.image.url) || nft.metadata.image);
      imageUrl.searchParams.set("authorization", rootStore.authToken);

      if(imageUrl && width) {
        imageUrl.searchParams.set("width", width);
      }
    }

    if(video) {
      if((selectedMedia && selectedMedia.media_type === "Ebook" && selectedMedia.media_file)) {
        embedUrl = new URL("https://embed.v3.contentfabric.io");

        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("type", "ebook");
        embedUrl.searchParams.set("vid", selectedMedia.media_file["."].container);
        embedUrl.searchParams.set("murl", btoa(selectedMedia.media_file.url));
        useFrame = true;
      } else if((selectedMedia && ["Audio", "Video"].includes(selectedMedia.media_type) && selectedMedia.media_link)) {
        embedUrl = new URL("https://embed.v3.contentfabric.io");
        const videoHash = ((selectedMedia.media_link["/"] && selectedMedia.media_link["/"].split("/").find(component => component.startsWith("hq__")) || selectedMedia.media_link["."].source));

        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("vid", videoHash);
        embedUrl.searchParams.set("ct", "h");
        embedUrl.searchParams.set("ap", "");
        embedUrl.searchParams.set("ath", rootStore.authToken);
      } else if(item && item.video) {
        embedUrl = new URL("https://embed.v3.contentfabric.io");
        const videoHash = ((item.video["/"] && item.video["/"].split("/").find(component => component.startsWith("hq__")) || item.video["."].source));

        embedUrl.searchParams.set("p", "");
        embedUrl.searchParams.set("net", rootStore.network === "demo" ? "demo" : "main");
        embedUrl.searchParams.set("vid", videoHash);
        embedUrl.searchParams.set("ap", "");
        embedUrl.searchParams.set("lp", "");
        embedUrl.searchParams.set("m", "");

        if(item?.nftTemplateMetadata?.has_audio) {
          embedUrl.searchParams.set("ct", "h");
        }
      } else if(!selectedMedia && (typeof nft.metadata.playable === "undefined" || nft.metadata.playable) && nft.metadata.embed_url) {
        embedUrl = new URL(nft.metadata.embed_url);
      }

      if(embedUrl) {
        embedUrl.searchParams.set("nwm", "");
      }
    }

    setMedia({imageUrl, embedUrl, useFrame});
  }, [selectedMedia]);

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
          {
            allowFullscreen && media.useFrame ?
              <button className="item-card__image__full-screen" onClick={() => setFullscreen(true)}>
                <ImageIcon icon={FullscreenIcon} label="Enlarge Image"/>
              </button> : null
          }
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
            <button className="item-card__image__full-screen" onClick={() => setFullscreen(true)}>
              <ImageIcon icon={FullscreenIcon} label="Enlarge Image"/>
            </button> : null
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

export const MarketplaceImage = ({marketplaceHash, item, title, path, url, icon, video=false, templateImage=false, rawImage=false, className=""}) => {
  if(video && item.video && item.video["."]) {
    return <NFTImage nft={{metadata: item.nftTemplateMetadata}} item={item} video className={className} />;
  } else if(!(url || icon)) {
    if(!item || item.image && (!templateImage || !item.nft_template || !item.nft_template.nft || !item.nft_template.nft.image)) {
      url = rootStore.PublicLink({
        versionHash: marketplaceHash,
        path,
        queryParams: {
          width: 800
        }
      });
    } else if(item.nft_template && item.nft_template.nft && item.nft_template.nft.image) {
      url = (item.nft_template.nft || {}).image;
      url = new URL(url);
      url.searchParams.set("authorization", rootStore.authToken);
      url.searchParams.set("width", "800");
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
