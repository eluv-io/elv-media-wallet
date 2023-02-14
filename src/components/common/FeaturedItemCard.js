import React from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";

import UrlJoin from "url-join";
import {RichText} from "Components/common/UIComponents";

const FeaturedItemCard = observer(({
  link,
  image,
  badges,
  name,
  searchName,
  subtitle1,
  description,
  descriptionRichText,
  price,
  status,
  sideText,
  justification,
  action,
  onClick,
  variant,
  disabled,
  className="",
}) => {
  const match = useRouteMatch();

  if(sideText) {
    const [first, second] = sideText.toString().split(/[\/:]/);

    sideText = (
      <div className="featured-item__side-text">
        <div className="featured-item__side-text__secondary">
          { first }{ second ? ": " : "" }
        </div>
        {
          second ?
            <div className="featured-item__side-text__primary">
              { second }
            </div> : null
        }
      </div>
    );
  }

  let icon = (
    <div className={`featured-item__icon-container ${variant ? `featured-item__icon-container--variant-${variant}` : ""}`}>
      {
        badges ?
          <div className="featured-item__badges">
            { badges }
          </div> : null
      }
      <div className="featured-item__icon">
        { image }
      </div>
    </div>
  );

  let button;
  if(action === "claim" || action === "buy") {
    button = (
      <Link to={link} className="action action-primary">
        { rootStore.l10n.actions.purchase[action === "claim" ? "claim" : "buy_now"] }
      </Link>
    );
  } else if(action === "listings") {
    button = (
      <Link
        className="action action-primary"
        to={
          match.params.marketplaceId ?
            UrlJoin("/marketplace", match.params.marketplaceId, `listings?filter=${encodeURIComponent(searchName)}`) :
            UrlJoin("/wallet", `listings?filter=${encodeURIComponent(searchName)}`)
        }
      >
        { rootStore.l10n.actions.listings.view }
      </Link>
    );
  }

  const cardContents = (
    <>
      { justification === "Left" ? icon : null }
      <div className="featured-item__text">
        { sideText ? sideText : null }
        <h2 className="featured-item__title">
          { name || "" }
        </h2>
        {
          subtitle1 ?
            <h2 className="featured-item__edition">
              { subtitle1 }
            </h2> : null
        }
        {
          descriptionRichText ?
            <RichText richText={descriptionRichText} className="markdown-document featured-item__description" /> :
            description ?
              <ResponsiveEllipsis
                component="h2"
                className="featured-item__description"
                text={description}
                maxLine="10"
              /> : null
        }
        {
          status ?
            <div className="featured-item__status">
              { status }
            </div> :
            price ?
              <div className="featured-item__price">
                { price }
              </div> : null
        }
        {
          button ?
            <div className="featured-item__actions">
              { button }
            </div> : null
        }
      </div>

      { justification === "Right" ? icon : null }

      <div className="featured-item__background" />
    </>
  );

  return (
    <div
      onClick={onClick}
      className={`featured-item ${disabled ? "featured-item--disabled" : ""} ${justification === "Right" ? "featured-item--right-just" : ""} ${className}`}
    >
      { cardContents }
    </div>
  );
});

export default FeaturedItemCard;
