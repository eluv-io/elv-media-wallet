import React from "react";
import {NFTImage} from "Components/common/Images";
import {FormatPriceString} from "Components/common/UIComponents";
import {observer} from "mobx-react";

const ListingModalCard = observer(({nft, price, stock}) => {
  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  return (
    <div className="card-padding-container listing-modal-card">
      <div className="card card-shadow">
        <NFTImage width={400} nft={nft} />
        <div className="card__titles">
          <h2 className="card__title">
            <div className="card__title__title">
              { nft.metadata.display_name }
            </div>
            <div className="card__title__price">
              { FormatPriceString(price) }
            </div>
          </h2>
          {
            nft.metadata.edition_name ?
              <h2 className="card__title-edition">
                { nft.metadata.edition_name }
              </h2> : null
          }
          <h2 className="card__subtitle card__title-edition">
            {
              typeof nft.details.TokenOrdinal !== "undefined" ?
              `${parseInt(nft.details.TokenOrdinal)} / ${nft.details.Cap}` :
                nft.details.TokenIdStr
            }
          </h2>
          <h2 className="card__subtitle">
            <div className="card__subtitle__title">
              { nft.metadata.description }
            </div>
          </h2>
        </div>
        {
          stock && stock.max ?
            <div className="card__stock">
              <div className="header-dot" style={{backgroundColor: outOfStock ? "#a4a4a4" : "#ff0000"}} />
              { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
            </div> : null
        }
      </div>
    </div>
  );
});

export default ListingModalCard;
