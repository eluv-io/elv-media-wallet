import ItemCardStyles from "Assets/stylesheets/item-card.module.scss";

const S = (...classes) => classes.map(c => ItemCardStyles[c] || "").join(" ");

import React from "react";
import {NFTImage} from "Components/common/Images";
import {observer} from "mobx-react";
import {NFTInfo} from "../../utils/Utils";
import {FormatPriceString, Linkish} from "Components/common/UIComponents";
import ItemCard from "Components/common/ItemCard";
import UrlJoin from "url-join";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import {rootStore} from "Stores";


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
  subscription,
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
    FormatPriceString(price, {includeCurrency: !usdcOnly, includeUSDCIcon: usdcAccepted, prependCurrency: true, useCurrencyIcon: false}) :
    info.renderedPrice;

  const basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});

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
      hoverButton={
        !subscription ? null :
          <Linkish
            onClick={event => event.stopPropagation()}
            to={UrlJoin(basePath, "/users/me/items/subscriptions", subscription.sub_id)}
            className={S("item-card__hover-button")}
          >
            { rootStore.l10n.profile.subscriptions.manage_your_subscription }
          </Linkish>
      }
      className={className}
    />
  );
});

export default NFTCard;
