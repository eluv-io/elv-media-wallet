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
import USDCIcon from "Assets/icons/USDC coin icon.svg";

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
  playerCallback
}) => {
  if(item) {
    nft = { metadata: item.nftTemplateMetadata };
  }

  const selectedMedia = (selectedMediaIndex >= 0 && (nft.metadata.additional_media || [])[selectedMediaIndex]);
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const info = selectedListing || nft;

  let details = {
    name: selectedMedia?.name || info.metadata.display_name,
    subtitle_1: selectedMedia ? selectedMedia.subtitle_1 : info.metadata.edition_name,
    subtitle_2: selectedMedia ? selectedMedia.subtitle_2 : ( showOrdinal ? NFTDisplayToken(info) : undefined )
  };

  const card = (
    <div className="card card-shadow">
      <NFTImage
        nft={nft}
        item={item}
        selectedMedia={selectedMedia}
        video={showVideo}
        allowFullscreen={allowFullscreen}
        playerCallback={playerCallback}
      />
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
    </div>
  );

  if(link) {
    return (
      <Link to={link} className="card-padding-container nft-card">
        { card }
      </Link>
    );
  }

  return (
    <div className="card-padding-container nft-card">
      { card }
    </div>
  );
});

export default NFTCard;
