import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Link} from "react-router-dom";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

// General card component
const ItemCard = observer(({
  link,
  image,
  badges,
  name,
  subtitle1,
  subtitle2,
  description,
  price,
  status,
  sideText,
  onClick,
  variant="",
  className="",
  cardClassName=""
}) => {
  if(sideText && typeof sideText === "string") {
    sideText = sideText.toString().split("/");
  }

  if(sideText && Array.isArray(sideText)) {
    const [first, second] = sideText;

    sideText = (
      <div className="item-card__side-text">
        <div className="item-card__side-text__primary">
          { first }
        </div>
        {
          second ?
            <div className="item-card__side-text__secondary">
              { ` / ${second}` }
            </div> : null
        }
      </div>
    );
  }

  const cardContents = (
    <>
      { sideText }
      { image }
      {
        badges ?
          <div className="item-card__badges">
            { badges }
          </div> : null
      }
      <div className="item-card__text">
        <h2 className="item-card__title">
          { name || "" }
        </h2>
        {
          subtitle1 ?
            <h2 className="item-card__edition">
              { subtitle1 }
            </h2> : null
        }
        {
          subtitle2 ?
            <h2 className="item-card__edition">
              { subtitle2 }
            </h2> : null
        }
        {
          typeof description === "string" ?
            <ResponsiveEllipsis
              component="h2"
              className="item-card__description"
              text={description || ""}
              maxLine="4"
            /> : description
        }
        {
          price || status ?
            <div className="item-card__status">
              {
                price ?
                  <div className="item-card__status__price">
                    {price}
                  </div> : null
              }
              {
                status ?
                  <div className="item-card__status__text">
                    {status}
                  </div> : null
              }
            </div> : null
        }
      </div>
    </>
  );

  if(link) {
    return (
      <div className={`card-container card-container--link ${rootStore.centerItems ? "card-container--centered" : ""} ${variant ? `card-container--variant-${variant}` : ""} ${className}`}>
        <Link
          to={link}
          className={`item-card ${cardClassName}`}
        >
          { cardContents }
        </Link>
      </div>
    );
  }

  return (
    <div className={`card-container ${rootStore.centerItems ? "card-container--centered" : ""} ${variant ? `card-container--variant-${variant}` : ""} ${className}`}>
      <div
        onClick={onClick}
        className={`item-card ${cardClassName}`}
      >
        { cardContents }
      </div>
    </div>
  );
});

export default ItemCard;
