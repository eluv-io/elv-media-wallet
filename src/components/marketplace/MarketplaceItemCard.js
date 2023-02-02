import React from "react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {MarketplaceImage} from "Components/common/Images";
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
    action = rootStore.l10n.item_details.status.listings;
    status = rootStore.l10n.item_details.status.sale_ended;
  } else if(info.unauthorized) {
    status = item.permission_message || rootStore.l10n.item_details.status.private_offering;
    linkDisabled = true;
  } else if(info.outOfStock) {
    action = rootStore.l10n.item_details.status.listings;
    status = rootStore.l10n.item_details.status.sold_out;
  } else if(!info.released) {
    linkDisabled = true;
    status = "";
  } else {
    action = rootStore.l10n.item_details.status[info.free ? "claim": "buy"];
  }

  let CardComponent = ItemCard;
  let sideText = noStock ? undefined : info.sideText;
  if(type === "Featured") {
    CardComponent = FeaturedItemCard;

    sideText = undefined;
    if(item.available_at) {
      sideText = `${rootStore.l10n.item_detais.status.release_date}: ${new Date(item.available_at).toLocaleDateString(navigator.languages, {year: "numeric", month: "long", day: "numeric"}) }`;
    }
  }

  let priceText = "";
  if(!noPrice) {
    if(info.maxOwned) {
      priceText = rootStore.l10n.item_details.status.max_owned;
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
