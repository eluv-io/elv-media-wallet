import React, {useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {MarketplaceImage} from "Components/common/Images";
import UrlJoin from "url-join";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";

const FeaturedIcon = ({marketplaceHash, item}) => {
  return (
    <div className="featured-item__icon">
      <MarketplaceImage
        marketplaceHash={marketplaceHash}
        item={item}
        path={UrlJoin("public", "asset_metadata", "info", "items", item.itemIndex.toString(), "image")}
      />
    </div>
  );
};


const MarketplaceFeatured = observer(({marketplaceHash, items, justification, showGallery}) => {
  const [featuredItem, setFeaturedItem] = useState(items[0]);

  console.log(featuredItem);
  return (
    <MarketplaceItemCard
      type="Featured"
      justification={justification}
      marketplaceHash={marketplaceHash}
      item={featuredItem}
      index={featuredItem.itemIndex}
    />
  );
});

export default MarketplaceFeatured;
