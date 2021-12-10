import React from "react";
import {NFTImage} from "Components/common/Images";
import {FormatPriceString} from "Components/common/UIComponents";
import {observer} from "mobx-react";
import {Link} from "react-router-dom";

const NFTCard = observer(({nft, selectedListing, price, stock, link, showVideo, showOrdinal}) => {
  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  nft = selectedListing || nft;

  const card =(
    <div className="card card-shadow">
      <NFTImage width={400} nft={nft} video={showVideo} />
      <div className="card__titles">
        <h2 className="card__title">
          <div className="card__title__title">
            { nft.metadata.display_name }
          </div>
          {
            price || selectedListing ?
              <div className="card__title__price">
                { FormatPriceString(price || {USD: selectedListing.details.Price}) }
              </div> : null
          }
        </h2>
        {
          nft.metadata.edition_name ?
            <h2 className="card__title-edition">
              { nft.metadata.edition_name }
            </h2> : null
        }
        {
          showOrdinal ?
            <h2 className="card__title-edition card__title-ordinal">
              {
                typeof nft.details.TokenOrdinal !== "undefined" ?
                  `${parseInt(nft.details.TokenOrdinal) + 1} / ${nft.details.Cap}` :
                  nft.details.TokenIdStr
              }
            </h2> : null
        }
        <div className="card__description">
          { nft.metadata.description }
        </div>
      </div>
      {
        stock && stock.max ?
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
