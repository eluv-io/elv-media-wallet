import React from "react";
import {rootStore} from "Stores";
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
    sideText = `${stock.max - stock.minted} / ${stock.max}`;
  } else if(!item && showOrdinal) {
    sideText = NFTDisplayToken(info);
  }

  if(sideText) {
    const [first, second] = sideText.split("/");

    sideText = (
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
    );
  }

  let status;
  if(outOfStock) {
    status = "Sold Out!";
  }

  if(price) {
    price = FormatPriceString(price || {USD: selectedListing.details.Price}, {includeCurrency: true, prependCurrency: true});
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
          !selectedMedia && price || status ?
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
    </>
  );

  if(link) {
    return (
      <div className={`card-container card-container--link card-shadow ${rootStore.centerItemText ? "card-container--centered" : ""} ${className}`}>
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
    <div className={`card-container card-shadow ${rootStore.centerItemText ? "card-container--centered" : ""} ${className}`}>
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
