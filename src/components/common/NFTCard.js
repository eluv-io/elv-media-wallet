import React from "react";
import {NFTImage} from "Components/common/Images";
import {FormatPriceString} from "Components/common/UIComponents";
import {observer} from "mobx-react";
import {Link} from "react-router-dom";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {NFTDisplayToken} from "../../utils/Utils";
import ImageIcon from "Components/common/ImageIcon";

import ReturnIcon from "Assets/icons/media/back to nft icon.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";

const NFTCard = observer(({
  nft,
  item,
  selectedListing,
  price,
  usdcAccepted,
  stock,
  link,
  showVideo,
  showOrdinal,
  allowFullscreen,
  hideAvailable,
  truncateDescription,
  selectedMediaIndex=-1,
  setSelectedMediaIndex,
  playerCallback,
  onClick,
  className="",
  cardClassName=""
}) => {
  if(item && !nft) {
    nft = {
      metadata: item.nftTemplateMetadata
    };
  }

  const selectedMedia = (selectedMediaIndex >= 0 && (nft.metadata.additional_media || [])[selectedMediaIndex]);
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const expired = item && item.expires_at && new Date(item.expires_at).getTime() - Date.now() < 0;
  const unauthorized = item && item.requires_permissions && !item.authorized;
  const info = selectedListing || nft;

  let details = {
    name: selectedMedia?.name || info.metadata.display_name,
    subtitle_1: selectedMedia ? selectedMedia.subtitle_1 : info.metadata.edition_name,
    subtitle_2: selectedMedia ? selectedMedia.subtitle_2 : undefined
  };

  let sideText;
  if(item && !hideAvailable && !outOfStock && !expired && !unauthorized && stock &&stock.max && stock.max < 10000000) {
    sideText = (
      <div className="item-card__side-text-container">
        <div className="item-card__side-text">
          <div className="header-dot" style={{backgroundColor: outOfStock ? "#a4a4a4" : "#ff0000"}} />
          <div className="item-card__side-text__primary">
            { outOfStock ? "Sold Out!" : "Available" }
          </div>
          {
            !outOfStock ?
              <div className="item-card__side-text__secondary">
                { stock.max - stock.minted }
              </div> : null
          }
        </div>
      </div>
    );
  } else if(!item && showOrdinal) {
    const [first, second] = NFTDisplayToken(info).split("/");

    sideText = (
      <div className="item-card__side-text-container">
        <div className="item-card__side-text">
          <div className="item-card__side-text__primary">
            { first } { second ? "/" : "" }
          </div>
          {
            second ?
              <div className="item-card__side-text__secondary">
                { second }
              </div> : null
          }
        </div>
      </div>
    );
  }

  let status;
  if(outOfStock) {
    status = "Sold Out!";
  } else if(!selectedMedia && !hideAvailable && stock && stock.max && stock.max < 10000000) {
    //status = `${stock.max - stock.minted} Available`;
  }

  if(price) {
    price = FormatPriceString(price || {USD: selectedListing.details.Price});
  }

  // NOTE: Keep class/structure in sync with ItemCard
  const cardContents = (
    <>
      <NFTImage
        nft={nft}
        item={item}
        selectedMedia={selectedMedia}
        video={showVideo}
        allowFullscreen={allowFullscreen}
        playerCallback={playerCallback}
      />
      { sideText }
      <div className="item-card__text">
        <div className="item-card__title">
          { details.name }
        </div>
        {
          details.subtitle_1 ?
            <div className="item-card__edition">
              { details.subtitle_1 }
            </div> : null
        }
        {
          details.subtitle_2 ?
            <div className="item-card__edition">
              { details.subtitle_2 }
            </div> : null
        }
        {
          selectedMedia ?
            <div
              className="item-card__description rich-text markdown-document"
              ref={element => {
                if(!element) { return; }

                render(
                  <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                    { SanitizeHTML(selectedMedia.description) }
                  </ReactMarkdown>,
                  element
                );
              }}
            /> :
            <ResponsiveEllipsis
              component="div"
              className="item-card__description"
              text={info.metadata.description}
              maxLine={truncateDescription ? "2" : "100"}
            />
        }
        {
          price || status ?
            <div className="item-card__status">
              {
                price ?
                  <div className="item-card__status__price">
                    {
                      usdcAccepted || selectedListing?.details.USDCAccepted ?
                        <ImageIcon icon={USDCIcon} label="USDC" title="USDC Accepted" /> : null
                    }
                    {price}
                  </div> : null
              }
              {
                status ?
                  <div className="item-card__status__text">
                    {status}
                  </div> : null
              }
            </div> : null
        }
        {
          selectedMediaIndex >= 0 ?
            <div className="item-card__actions">
              <button onClick={() => setSelectedMediaIndex(-1)} className="action item-card__action">
                <ImageIcon icon={ReturnIcon} title="Return to NFT" />
              </button>
            </div> : null
        }
      </div>
      {/*
      <div className="card__titles">
        {
          selectedMediaIndex >= 0 ?
            <button onClick={() => setSelectedMediaIndex(-1)} className="card__titles__return-button">
              <ImageIcon icon={ReturnIcon} title="Return to NFT" />
            </button> : null
        }
        <h2 className="card__title">
          <div className="card__title__title">
            { details.name }
          </div>
          {
            !selectedMedia && (price || selectedListing) ?
              <div className="card__title__price">
                { usdcAccepted || selectedListing?.details.USDCAccepted ? <ImageIcon icon={USDCIcon} label="USDC" title="USDC Accepted" /> : null }
                { FormatPriceString(price || {USD: selectedListing.details.Price}) }
              </div> : null
          }
        </h2>
        {
          details.subtitle_1 ?
            <h2 className="card__title-edition">
              { details.subtitle_1 }
            </h2> : null
        }
        {
          details.subtitle_2 ?
            <h2 className="card__title-edition card__title-ordinal">
              { details.subtitle_2 }
            </h2> : null
        }
        {
          selectedMedia ?
            <div
              className="card__description rich-text markdown-document"
              ref={element => {
                if(!element) { return; }

                render(
                  <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                    { SanitizeHTML(selectedMedia.description) }
                  </ReactMarkdown>,
                  element
                );
              }}
            /> :
            <ResponsiveEllipsis
              component="div"
              className="card__description"
              text={info.metadata.description}
              maxLine={truncateDescription ? "2" : "100"}
            />
        }
      </div>
      {
        !selectedMedia && !hideAvailable && stock && stock.max && stock.max < 10000000 ?
          <div className="card__stock">
            <div className="header-dot" style={{backgroundColor: outOfStock ? "#a4a4a4" : "#ff0000"}} />
            { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
          </div> : null
      }
      */}
    </>
  );

  if(link) {
    return (
      <div className={`card-container card-shadow ${className}`}>
        <Link
          to={link}
          className={`item-card item-card--nft-card ${cardClassName}`}
        >
          { cardContents }
        </Link>
      </div>
    );
  }

  return (
    <div className={`card-container card-shadow ${className}`}>
      <div
        onClick={onClick}
        className={`item-card item-card--nft-card ${cardClassName}`}
      >
        { cardContents }
      </div>
    </div>
  );
});

export default NFTCard;
