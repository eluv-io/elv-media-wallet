import React from "react";
import {NFTImage} from "Components/common/Images";
import {observer} from "mobx-react";
import {NFTInfo} from "../../utils/Utils";
import {FormatPriceString} from "Components/common/UIComponents";
import ItemCard from "Components/common/ItemCard";

const NFTCard = observer(({
  nft,
  item,
  selectedListing,
  price,
  usdcAccepted,
  usdcOnly,
  link,
  detailsLink,
  badges,
  imageWidth,
  showVideo,
  hideToken,
  allowFullscreen,
  playerCallback,
  className=""
}) => {
  const info = NFTInfo({
    nft,
    item,
    listing: selectedListing,
    imageWidth,
    showToken: !hideToken
  });

  // Listing modal specifies price displayed on card
  const renderedPrice = typeof price !== "undefined" ?
    FormatPriceString(price?.USD || price, {includeCurrency: !usdcOnly, includeUSDCIcon: usdcAccepted, prependCurrency: true, useCurrencyIcon: false}) :
    info.renderedPrice;

  return (
    <ItemCard
      collectionName={info.collectionName}
      collectionImage={info.collectionImage}
      link={link}
      detailsLink={detailsLink}
      name={info.name}
      subtitle1={info.subtitle1}
      subtitle2={info.subtitle2}
      sideText={info.sideText}
      price={renderedPrice}
      status={info.status}
      badges={badges}
      image={
        <NFTImage
          nft={nft}
          item={item}
          showVideo={showVideo}
          width={imageWidth}
          allowFullscreen={allowFullscreen}
          playerCallback={playerCallback}
        />
      }
      className={className}
    />
  );
});

export default NFTCard;
