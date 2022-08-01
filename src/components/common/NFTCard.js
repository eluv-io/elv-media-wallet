import React from "react";
import {rootStore} from "Stores";
import {NFTImage} from "Components/common/Images";
import {observer} from "mobx-react";
import {Link} from "react-router-dom";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {NFTInfo} from "../../utils/Utils";

// TODO: Route through nft info where appropriate
const NFTCard = observer(({
  nft,
  item,
  selectedListing,
  price,
  usdcAccepted,
  usdcOnly,
  stock,
  link,
  imageWidth,
  showFullMedia,
  showToken,
  allowFullscreen,
  hideAvailable,
  truncateDescription,
  selectedMediaIndex=-1,
  setSelectedMediaIndex,
  playerCallback,
  onClick,
  className="",
  cardClassName="",
  style
}) => {
  const info = NFTInfo({
    nft,
    item,
    selectedListing,
    price,
    usdcAccepted,
    usdcOnly,
    stock,
    imageWidth,
    showFullMedia,
    showToken,
    hideAvailable,
    selectedMediaIndex,
    truncateDescription
  });

  let sideText;
  if(info.sideText) {
    sideText = (
      <div className="item-card__side-text">
        <div className="item-card__side-text__primary">
          {info.sideText[0]}
        </div>
        {
          info.sideText[1] ?
            <div className="item-card__side-text__secondary">
              { ` / ${info.sideText[1]}`}
            </div> : null
        }
      </div>
    );
  }

  // NOTE: Keep class/structure in sync with ItemCard
  const cardContents = (
    <>
      <NFTImage
        nft={nft}
        item={item}
        selectedMedia={info.selectedMedia}
        showFullMedia={showFullMedia}
        width={imageWidth}
        allowFullscreen={allowFullscreen}
        playerCallback={playerCallback}
      />
      { sideText }
      <div className="item-card__text">
        <div className="item-card__title">
          { info.name }
        </div>
        {
          info.subtitle1 ?
            <div className="item-card__edition">
              { info.subtitle1 }
            </div> : null
        }
        {
          info.subtitle2 ?
            <div className="item-card__edition">
              { info.subtitle2 }
            </div> : null
        }
        {
          info.selectedMedia ?
            <div
              className="item-card__description rich-text markdown-document"
              ref={element => {
                if(!element) { return; }

                render(
                  <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                    { SanitizeHTML(info.selectedMedia.description) }
                  </ReactMarkdown>,
                  element
                );
              }}
            /> :
            <ResponsiveEllipsis
              component="div"
              className="item-card__description"
              text={info.nft.metadata.description}
              maxLine={truncateDescription ? 3 : 100}
            />
        }
        {
          !info.selectedMedia && info.renderedPrice || info.status ?
            <div className="item-card__status">
              {
                info.renderedPrice ?
                  <div className="item-card__status__price">
                    {info.renderedPrice}
                  </div> : null
              }
              {
                info.status ?
                  <div className="item-card__status__text">
                    {info.status}
                  </div> : null
              }
            </div> : null
        }
        {
          selectedMediaIndex >= 0 || info.mediaInfo.mediaLink ?
            <div className="item-card__actions">
              {
                info.mediaInfo.mediaLink ?
                  <a href={info.mediaInfo.mediaLink} target="_blank" className="action">
                    View Media
                  </a> : null
              }
              {
                selectedMediaIndex >= 0 ?
                  <button onClick={() => setSelectedMediaIndex(-1)} className="action">
                    Back to NFT
                  </button> : null
              }
            </div> : null
        }
      </div>
    </>
  );

  if(link) {
    return (
      <div className={`card-container card-container--link ${rootStore.centerItems ? "card-container--centered" : ""} ${info.variant ? `card-container--variant-${info.variant}` : ""} ${className}`} style={style}>
        <Link
          to={link}
          className={`item-card ${cardClassName}`}
        >
          { cardContents }
        </Link>
      </div>
    );
  }

  return (
    <div className={`card-container ${rootStore.centerItems ? "card-container--centered" : ""} ${info.variant ? `card-container--variant-${info.variant}` : ""} ${className}`} style={style}>
      <div
        onClick={onClick}
        className={`item-card ${cardClassName}`}
      >
        { cardContents }
      </div>
    </div>
  );
});

export default NFTCard;
