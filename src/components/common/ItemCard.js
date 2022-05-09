import React from "react";
import {observer} from "mobx-react";
import {Link} from "react-router-dom";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
import ImageIcon from "Components/common/ImageIcon";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";

const ItemCard = observer(({
  link,
  image,
  badges,
  name,
  edition,
  description,
  price,
  status,
  displayToken,
  usdcAccepted,
  onClick,
  className="",
  cardClassName=""
}) => {
  let sideText;
  if(displayToken) {
    const [first, second] = displayToken.split("/");

    sideText = (
      <div className="item-card__side-text-container">
        <div className="item-card__side-text">
          <div className="item-card__side-text__primary">
            { first } { second ? "/" : "" }
          </div>
          {
            second ?
              <div className="item-card__side-text__secondary">
                { second }
              </div> : null
          }
        </div>
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
          edition ?
            <h2 className="item-card__edition">
              { edition }
            </h2> : null
        }
        {
          description ?
            <ResponsiveEllipsis
              component="h2"
              className="item-card__description"
              text={description}
              maxLine="3"
            /> : null
        }
        {
          price || status ?
            <div className="item-card__status">
              {
                price ?
                  <div className="item-card__status__price">
                    {
                      usdcAccepted ?
                        <ImageIcon icon={USDCIcon} label="USDC" title="USDC Accepted" /> : null
                    }
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
      <div className={`card-container card-shadow ${className}`}>
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
    <div className={`card-container card-shadow ${className}`}>
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
