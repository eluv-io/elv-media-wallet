import React from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
import ImageIcon from "Components/common/ImageIcon";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import UrlJoin from "url-join";

const FeaturedItemCard = observer(({
  link,
  image,
  name,
  searchName,
  edition,
  description,
  price,
  status,
  sideText,
  justification,
  action,
  usdcAccepted,
  onClick,
  className="",
}) => {
  const match = useRouteMatch();

  if(sideText) {
    const [first, second] = sideText.split(/[\/:]/);

    sideText = (
      <div className="featured-item__side-text">
        <div className="featured-item__side-text__secondary">
          { first }{ second ? ":" : "" }
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
    <div className="featured-item__icon">
      { image }
    </div>
  );

  let button;
  if(action === "Claim" || action === "Buy") {
    button = (
      <Link to={link} className="action action-primary">
        { action === "Claim" ? "Claim Now" : "Buy Now" }
      </Link>
    );
  } else if(action === "Listings") {
    button = (
      <Link
        className="action action-primary"
        to={
          match.params.marketplaceId ?
            UrlJoin("/marketplace", match.params.marketplaceId, "listings", `?filter=${encodeURIComponent(searchName)}`) :
            UrlJoin("/wallet", "listings", `?addr=${encodeURIComponent(searchName)}`)
        }
      >
        View Listings
      </Link>
    );
  }

  const cardContents = (
    <>
      { justification === "Left" ? icon : null }
      { sideText ? sideText : null }
      <div className="featured-item__text">
        <h2 className="featured-item__title">
          { name || "" }
        </h2>
        {
          edition ?
            <h2 className="featured-item__edition">
              { edition }
            </h2> : null
        }
        {
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
                {
                  usdcAccepted ?
                    <ImageIcon icon={USDCIcon} label="USDC" title="USDC Accepted" /> : null
                }
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

  /*
  if(link) {
    return (
      <Link
        to={link}
        className={`featured-item ${className}`}
      >
        { cardContents }
      </Link>
    );
  }

   */

  return (
    <div
      onClick={onClick}
      className={`featured-item ${justification === "Right" ? "featured-item--right-just" : ""}${className}`}
    >
      { cardContents }
    </div>
  );
});

export default FeaturedItemCard;
