import React from "react";
import {Link, useRouteMatch} from "react-router-dom";
import {checkoutStore} from "Stores";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {MarketplaceImage} from "Components/common/Images";
import UrlJoin from "url-join";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";

const MarketplaceItemCard = ({marketplaceHash, to, item, index, className=""}) => {
  const match = useRouteMatch();

  if(!item.for_sale || (item.type === "nft" && (!item.nft_template || item.nft_template["/"]))) {
    return null;
  }

  const expired = item.expires_at && new Date(item.expires_at).getTime() - Date.now() < 0;
  const unauthorized = item.requires_permissions && !item.authorized;
  const stock = checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const total = ItemPrice(item, checkoutStore.currency);
  const isFree = !total || item.free;

  let description = item.description || item.nftTemplateMetadata.description;
  if(unauthorized && !expired) {
    description = item.permission_description || description;
  }

  return (
    <div className={`card-container card-shadow ${className}`}>
      <Link
        to={to || `${match.url}/${item.sku}`}
        className={`card ${outOfStock || expired || unauthorized ? "card-disabled" : ""}`}
      >
        <MarketplaceImage
          marketplaceHash={marketplaceHash}
          item={item}
          path={UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image")}
        />
        <div className="card__text">
          <div className="card__titles">
            <h2 className="card__title">
              <div className="card__title__title">
                { item.name }
              </div>
              <div className="card__title__price">
                { isFree ? "Claim Now!" : FormatPriceString(item.price) }
              </div>
            </h2>
            {
              item.nftTemplateMetadata.edition_name ?
                <h2 className="card__title card__title-edition">{ item.nftTemplateMetadata.edition_name }</h2> : null
            }
            <ResponsiveEllipsis
              component="h2"
              className="card__subtitle"
              text={description}
              maxLine="3"
            />
          </div>
          {
            expired ?
              <div className="card__stock">
                <div className="card__stock__indicator card__stock__indicator-unavailable" />
                Sale Ended
              </div> :
              unauthorized ?
                <div className="card__stock">
                  <div className="card__stock__indicator card__stock__indicator-unavailable" />
                  Private Offering
                </div> :
                !item.hide_available && stock && stock.max && stock.max < 10000000 ?
                  <div className="card__stock">
                    <div className={`card__stock__indicator ${outOfStock ? "card__stock__indicator-unavailable" : ""}`} />
                    { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
                  </div> : null
          }
        </div>
      </Link>
    </div>
  );
};

export default MarketplaceItemCard;
