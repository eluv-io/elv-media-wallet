import React, {useState, useEffect} from "react";
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

const MediaSelection = observer(({nft, selected, SelectMedia}) => {
  let media = nft.metadata.additional_media || [];
  const isOwned = nft.details && rootStore.NFT({contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr});

  if(!isOwned) {
    media = media.filter(item => !item.requires_permissions);
  }

  useEffect(() => {
    const defaultMediaIndex = media.findIndex(media => media.default);

    if(defaultMediaIndex > 0){
      SelectMedia(defaultMediaIndex);
    }
  }, []);

  if(!media || media.length === 0) {
    return null;
  }

  return (
    <select className="card__media-selection" value={selected} onChange={event => SelectMedia(parseInt(event.target.value))}>
      <option value={-1}>{ "Select Additional Media" }</option>
      <option value={-2}>{ "Default" }</option>
      {
        media.map((item, index) =>
          <option value={index} key={`media-selection-${index}`}>{ item.name }</option>
        )
      }
    </select>
  );
});

const NFTCard = observer(({
  nft,
  selectedListing,
  price,
  stock,
  link,
  showVideo,
  showOrdinal,
  showAdditionalMedia,
  hideAvailable,
  truncateDescription
}) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);
  const selectedMedia = (selectedMediaIndex >= 0 && (nft.metadata.additional_media || [])[selectedMediaIndex]);

  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  const info = selectedListing || nft;

  const card = (
    <div className="card card-shadow">
      <NFTImage width={400} nft={nft} selectedMedia={selectedMedia} video={showVideo} />
      { showAdditionalMedia ? <MediaSelection nft={nft} selected={selectedMediaIndex} SelectMedia={setSelectedMediaIndex} /> : null }
      <div className="card__titles">
        <h2 className="card__title">
          <div className="card__title__title">
            { info.metadata.display_name }
          </div>
          {
            (price || selectedListing) ?
              <div className="card__title__price">
                { FormatPriceString(price || {USD: selectedListing.details.Price}) }
              </div> : null
          }
        </h2>
        {
          info.metadata.edition_name ?
            <h2 className="card__title-edition">
              { info.metadata.edition_name }
            </h2> : null
        }
        {
          showOrdinal ?
            <h2 className="card__title-edition card__title-ordinal">
              { NFTDisplayToken(info) }
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
        !hideAvailable && stock && stock.max ?
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
