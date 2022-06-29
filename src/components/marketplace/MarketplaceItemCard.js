import React from "react";
import {useRouteMatch} from "react-router-dom";
import {checkoutStore} from "Stores";
import {FormatPriceString, ItemPrice} from "Components/common/UIComponents";
import {MarketplaceImage} from "Components/common/Images";
import UrlJoin from "url-join";
import ItemCard from "Components/common/ItemCard";
import FeaturedItemCard from "Components/common/FeaturedItemCard";

const MarketplaceItemCard = ({
  type="Standard",
  marketplaceHash,
  to,
  item,
  index,
  justification="Left",
  noLink,
  noStock,
  noPrice,
  showFullMedia=false,
  className="",
  cardClassName=""
}) => {
  const match = useRouteMatch();

  if(item.type === "nft" && (!item.nft_template || item.nft_template["/"])) {
    return null;
  }


  const released = !item.available_at || Date.now() - new Date(item.available_at).getTime() > 0;
  const expired = item.expires_at && new Date(item.expires_at).getTime() - Date.now() < 0;
  const unauthorized = item.requires_permissions && !item.authorized;
  const stock = checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;
  const total = ItemPrice(item, checkoutStore.currency);
  const isFree = !total || item.free;

  let description = item.description || item.nftTemplateMetadata.description;
  if(unauthorized && !expired) {
    description = item.permission_description || description;
  }

  const variant = item.nftTemplateMetadata.style;

  let status, action, linkDisabled=noLink;
  if(expired) {
    action = "Listings";
    status = "Sale Ended";
  } else if(unauthorized) {
    status = item.permission_message || "Private Offering";
    noPrice = true;
    linkDisabled = true;
  } else if(outOfStock) {
    action = "Listings";
    status = "Sold Out!";
  } else if(!released) {
    linkDisabled = true;
    status = "";
  } else {
    action = isFree ? "Claim" : "Buy";
  }

  let availableStock;
  if(item && !item.hide_available && !outOfStock && !expired && !unauthorized && stock &&stock.max && stock.max < 10000000) {
    availableStock = `${stock.max - stock.minted} / ${stock.max} Available`;
  }

  let CardComponent = ItemCard;
  let sideText = noStock ? undefined : availableStock;
  if(type === "Featured") {
    CardComponent = FeaturedItemCard;

    sideText = undefined;
    if(item.available_at) {
      sideText = `Release Date: ${new Date(item.available_at).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}) }`;
    }
  }

  let priceText = "";
  if(!noPrice) {
    if(maxOwned) {
      priceText = "Maximum owned!";
    } else if(!isFree) {
      priceText = FormatPriceString(item.price, {includeCurrency: true, prependCurrency: true, useCurrencyIcon: false});
    }
  }

  return (
    <CardComponent
      link={linkDisabled ? undefined : (to || `${match.url}/${item.sku}`)}
      image={(
        <MarketplaceImage
          marketplaceHash={marketplaceHash}
          item={item}
          path={UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image")}
          showFullMedia={showFullMedia}
        />
      )}
      name={item.name}
      searchName={item.nftTemplateMetadata.display_name}
      edition={item.nftTemplateMetadata.edition_name}
      description={description}
      price={priceText}
      sideText={sideText}
      status={status}
      justification={justification}
      fullDescription={type === "Detail"}
      action={action}
      variant={variant}
      className={`${className} item-card--marketplace ${type !== "Featured" && (outOfStock || expired || unauthorized) ? "card-container--disabled" : ""}`}
      cardClassName={`${cardClassName}`}
    />
  );
};

export default MarketplaceItemCard;
