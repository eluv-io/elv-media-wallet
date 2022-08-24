import React from "react";
import {NFTImage} from "Components/common/Images";
import {observer} from "mobx-react";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {NFTInfo} from "../../utils/Utils";
import {FormatPriceString, RichText} from "Components/common/UIComponents";
import ItemCard from "Components/common/ItemCard";

const NFTCard = observer(({
  nft,
  item,
  selectedListing,
  price,
  usdcAccepted,
  usdcOnly,
  link,
  badges,
  imageWidth,
  showFullMedia,
  hideToken,
  allowFullscreen,
  truncateDescription,
  selectedMediaIndex=-1,
  playerCallback,
  className="",
  cardClassName="",
}) => {
  const info = NFTInfo({
    nft,
    item,
    listing: selectedListing,
    imageWidth,
    showFullMedia,
    showToken: !hideToken,
    selectedMediaIndex
  });

  let sideText;
  if(info.sideText) {
    sideText = (
      <div className="item-card__side-text">
        <div className="item-card__side-text__primary">
          {info.sideText[0]}
        </div>
        {
          info.sideText[1] ?
            <div className="item-card__side-text__secondary">
              { ` / ${info.sideText[1]}`}
            </div> : null
        }
      </div>
    );
  }

  // Listing modal specifies price displayed on card
  const renderedPrice = typeof price !== "undefined" ?
    FormatPriceString(price || {USD: price}, {includeCurrency: !usdcOnly, includeUSDCIcon: usdcAccepted, prependCurrency: true, useCurrencyIcon: false}) :
    info.renderedPrice;

  const description = (
    info.selectedMedia ?
      <RichText richText={info.selectedMedia.description} className="item-card__description markdown-document" /> :
      <ResponsiveEllipsis
        component="div"
        className="item-card__description"
        text={info.nft.metadata.description}
        maxLine={truncateDescription ? 3 : 100}
      />
  );

  return (
    <ItemCard
      link={link}
      name={info.name}
      subtitle1={info.subtitle1}
      subtitle2={info.subtitle2}
      description={description}
      sideText={sideText}
      price={renderedPrice}
      status={info.status}
      variant={info.variant}
      className={className}
      cardClassName={cardClassName}
      badges={badges}
      image={
        <NFTImage
          nft={nft}
          item={item}
          selectedMedia={info.selectedMedia}
          showFullMedia={showFullMedia}
          width={imageWidth}
          allowFullscreen={allowFullscreen}
          playerCallback={playerCallback}
        />
      }
    />
  );
});

export default NFTCard;
