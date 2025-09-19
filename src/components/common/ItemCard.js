import ItemCardStyles from "Assets/stylesheets/item-card.module.scss";

const S = (...classes) => classes.map(c => ItemCardStyles[c] || "").join(" ");

import React from "react";
import {observer} from "mobx-react";
import {Linkish} from "Components/common/UIComponents";
import {ScaledText} from "Components/properties/Common";

const ItemCard = observer(({
  collectionImage,
  collectionName,
  image,
  badges,
  name,
  subtitle1,
  subtitle2,
  price,
  status,
  sideText,
  link,
  detailsLink,
  onClick,
  disabled,
  hoverButton,
  className=""
}) => {
  if(Array.isArray(sideText)) {
    sideText = sideText[0]?.startsWith("#") ? sideText[0] : `#${sideText[0]}`;
  }

  if(!badges || badges.length === 0) {
    badges = undefined;
  }

  return (
    <Linkish
      to={link}
      onClick={onClick}
      disabled={disabled}
      className={
        [
          S(
            "item-card-container",
            disabled ? "item-card-container--disabled" : "",
            hoverButton ? "item-card-container--with-hover-button" : ""
          ),
          className
        ].join(" ")
    }
    >
      <div className={S("item-card")}>
        <div className={S("item-card__header")}>
          <div className={S("item-card__collection")}>
            {
              !collectionImage ? null :
                <img alt={collectionName} src={collectionImage} className={S("item-card__collection-image")} />
            }
            <div className={S("item-card__collection-name")}>
              { collectionName || "" }
            </div>
          </div>
          <Linkish
            to={detailsLink}
            className={S("item-card__top-right", detailsLink ? "item-card__details-link" : "")}
          >
            {
              price ? <div className={S("item-card__price")}>{price}</div> :
                sideText ? <div className={S("item-card__token")}>{sideText}</div> :
                  null
            }
            {
              !badges ? null :
                <div className={S("item-card__badges")}>{badges}</div>
            }
          </Linkish>
        </div>
        <div className={S("item-card__image")}>
          { image }
        </div>
        <div className={S("item-card__text")}>
          <ScaledText maxPx={24} minPx={18} className={S("item-card__title")}>
            { name }
          </ScaledText>
          {
            !subtitle1 ? null :
              <div className={S("item-card__subtitle")}>
                { subtitle1 }
              </div>
          }
          {
            !subtitle2 ? null :
              <div className={S("item-card__subtitle")}>
                { subtitle2 }
              </div>
          }
          {
            !hoverButton ? null :
              <div className={S("item-card__hover-button-container")}>
                { hoverButton }
              </div>
          }
        </div>
        {
          !status ? null :
            <div className={S("item-card__status")}>
              { status }
            </div>
        }
      </div>
    </Linkish>
  );
});

export default ItemCard;
