import React from "react";
import {useRouteMatch} from "react-router-dom";
import {MarketplaceImage} from "Components/common/Images";
import UrlJoin from "url-join";
import ItemCard from "Components/common/ItemCard";
import FeaturedItemCard from "Components/common/FeaturedItemCard";
import ImageIcon from "Components/common/ImageIcon";

import TestIcon from "Assets/icons/alert-circle";
import {NFTInfo} from "../../utils/Utils";

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
  showVideo=false,
  className="",
  cardClassName=""
}) => {
  const match = useRouteMatch();

  if(item.type === "nft" && (!item.nft_template || item.nft_template["/"])) {
    return null;
  }

  const info = NFTInfo({
    item,
    showVideo
  });

  let description = item.description || item.nftTemplateMetadata.description;
  let descriptionRichText = item.description_rich_text || (!item.description && item.nftTemplateMetadata.description_rich_text);
  if(info.unauthorized && !info.expired) {
    description = item.permission_description || description;
    descriptionRichText = undefined;
  }

  const variant = item.nftTemplateMetadata.style;

  let status, action, linkDisabled=noLink;
  if(info.expired) {
    action = "Listings";
    status = "Sale Ended";
  } else if(info.unauthorized) {
    status = item.permission_message || "Private Offering";
    linkDisabled = true;
  } else if(info.outOfStock) {
    action = "Listings";
    status = "Sold Out!";
  } else if(!info.released) {
    linkDisabled = true;
    status = "";
  } else {
    action = info.free ? "Claim" : "Buy";
  }

  let CardComponent = ItemCard;
  let sideText = noStock ? undefined : info.sideText;
  if(type === "Featured") {
    CardComponent = FeaturedItemCard;

    sideText = undefined;
    if(item.available_at) {
      sideText = `Release Date: ${new Date(item.available_at).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}) }`;
    }
  }

  let priceText = "";
  if(!noPrice) {
    if(info.maxOwned) {
      priceText = "Maximum owned!";
    } else if(!info.free) {
      priceText = info.renderedPrice;
    }
  }

  const unavailable = info.outOfStock || info.expired || info.unauthorized;

  return (
    <CardComponent
      info={info}
      link={linkDisabled ? undefined : (to || `${match.url}/${item.sku}`)}
      badges={
        item.nftTemplateMetadata.test ?
          <ImageIcon
            icon={TestIcon}
            title="This is a test NFT"
            alt="Test NFT"
            className="item-card__badge item-card__badge--test"
          /> : null
      }
      image={(
        <MarketplaceImage
          marketplaceHash={marketplaceHash}
          item={item}
          path={UrlJoin("public", "asset_metadata", "info", "items", index.toString(), "image")}
          showVideo={showVideo}
        />
      )}
      name={info.name}
      searchName={item.nftTemplateMetadata.display_name}
      subtitle1={info.subtitle1}
      description={description}
      descriptionRichText={descriptionRichText}
      price={priceText}
      sideText={sideText}
      status={status}
      justification={justification}
      fullDescription={type === "Detail"}
      action={action}
      variant={variant}
      disabled={unavailable}
      className={`${className} item-card--marketplace`}
      cardClassName={`${cardClassName}`}
    />
  );
};

export default MarketplaceItemCard;
