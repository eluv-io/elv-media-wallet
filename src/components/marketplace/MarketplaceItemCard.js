import React from "react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {MarketplaceImage} from "Components/common/Images";
import ItemCard from "Components/common/ItemCard";
import FeaturedItemCard from "Components/common/FeaturedItemCard";
import ImageIcon from "Components/common/ImageIcon";
import {NFTInfo} from "../../utils/Utils";

import TestIcon from "Assets/icons/alert-circle";

const MarketplaceItemCard = ({
  type="Standard",
  marketplaceHash,
  to,
  item,
  justification="Left",
  noLink,
  noStock,
  noPrice,
  showCta=false,
  showVideo=false,
  countdown,
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

  let status, action, cta, linkDisabled=noLink;
  if(info.expired) {
    action = "listings";
    status = rootStore.l10n.item_details.status.sale_ended;
  } else if(info.unauthorized) {
    status = item.permission_message || rootStore.l10n.item_details.status.private_offering;
    linkDisabled = true;
  } else if(info.outOfStock) {
    action = "listings";
    status = rootStore.l10n.item_details.status.sold_out;
  } else if(!info.released) {
    if(item.viewable_if_unreleased) {
      action = "view";
    } else {
      linkDisabled = true;
      status = "";
    }
  } else if(!item.for_sale && item.viewable) {
    action = "view";
  } else {
    action = info.free ? "claim" : "buy";
    cta = rootStore.l10n.actions.purchase[info.free ? "claim" : "buy_now"];
  }

  let CardComponent = ItemCard;
  let sideText = noStock ? undefined : info.sideText;
  if(type === "Featured") {
    CardComponent = FeaturedItemCard;

    sideText = undefined;
    if(item.available_at) {
      sideText = `${rootStore.l10n.item_details.status.release_date}: ${new Date(item.available_at).toLocaleDateString(navigator.languages, {year: "numeric", month: "long", day: "numeric"}) }`;
    }
  }

  let priceText = "";
  if(!noPrice) {
    if(info.maxOwned) {
      priceText = rootStore.l10n.item_details.status.max_owned;
      action = "";
    } else if(!info.free && item.for_sale) {
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
          url={item?.image?.url}
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
      cta={showCta ? cta : undefined}
      justification={justification}
      fullDescription={type === "Detail"}
      action={action}
      variant={variant}
      disabled={unavailable}
      countdown={countdown}
      className={`${className} item-card--marketplace`}
      cardClassName={`${cardClassName}`}
    />
  );
};

export default MarketplaceItemCard;
