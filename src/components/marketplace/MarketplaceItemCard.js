import React from "react";
import {useRouteMatch} from "react-router-dom";
import {checkoutStore} from "Stores";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {MarketplaceImage} from "Components/common/Images";
import UrlJoin from "url-join";
import ItemCard from "Components/common/ItemCard";

const MarketplaceItemCard = ({marketplaceHash, to, item, index, className="", cardClassName=""}) => {
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

  let status, linkDisabled=false;
  if(expired) {
    status = "Sale Ended";
  } else if(unauthorized) {
    status = "Private Offering";
    linkDisabled = true;
  } else if(outOfStock) {
    status = "Sold Out!";
  }

  let availableStock;
  if(item && !item.hide_available && !outOfStock && !expired && !unauthorized && stock &&stock.max && stock.max < 10000000) {
    availableStock = stock.max - stock.minted;
  }

  return (
    <ItemCard
      link={linkDisabled ? undefined : (to || `${match.url}/${item.sku}`)}
      image={(
        <MarketplaceImage
          marketplaceHash={marketplaceHash}
          item={item}
          path={UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image")}
        />
      )}
      name={item.name}
      edition={item.nftTemplateMetadata.edition_name}
      description={description}
      price={!isFree ? FormatPriceString(item.price) : ((expired || unauthorized || outOfStock) ? "" : "Claim Now!")}
      availableStock={availableStock}
      status={status}
      className={className}
      cardClassName={`${cardClassName} ${outOfStock || expired || unauthorized ? "item-card--disabled" : ""}`}
    />
  );
};

export default MarketplaceItemCard;
