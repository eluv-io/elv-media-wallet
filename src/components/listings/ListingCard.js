import React, {useState, useEffect} from "react";
import {NFTImage} from "Components/common/Images";
import ListingModal from "Components/listings/ListingModal";
import {Link} from "react-router-dom";
import {FormatPriceString} from "Components/common/UIComponents";
import {NFTDisplayToken} from "../../utils/Utils";
import ImageIcon from "Components/common/ImageIcon";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);

import EditIcon from "Assets/icons/edit listing icon.svg";

const ListingCard = ({listing, link, Refresh}) => {
  const [showListingModal, setShowListingModal] = useState(false);
  const [isInCheckout, setIsInCheckout] = useState(listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now());

  useEffect(() => {
    const checkout = listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now();
    setIsInCheckout(checkout);
  }, [listing]);

  const [first, second] = NFTDisplayToken(listing).split("/");

  const sideText = (
    <div className="listing-card__side-text">
      <div className="listing-card__side-text__primary">
        { first } { second ? "/" : "" }
      </div>
      {
        second ?
          <div className="listing-card__side-text__secondary">
            { second }
          </div> : null
      }
    </div>
  );

  return (
    <>
      {
        showListingModal ?
          <ListingModal
            nft={listing}
            listingId={listing.details.ListingId}
            Close={(info={}) => {
              setShowListingModal(false);

              if(info.listingId || info.deleted) { Refresh(); }
            }}
          /> : null
      }
      <div className="listing-card-container card-shadow">
        <div className="listing-card">
          <div className="listing-card__left">
            <Link to={link} className="listing-card__image-container">
              <NFTImage width={600} className="listing-card__image" nft={listing} />
            </Link>
            { sideText }
          </div>
          <div className="listing-card__details">
            <button
              onClick={() => setShowListingModal(!showListingModal)}
              aria-label="Edit Listing"
              disabled={isInCheckout}
              className="listing-card__edit-button"
              title={isInCheckout ? "This listing is currently in the process of being purchased" : ""}
            >
              <ImageIcon icon={EditIcon} label="Edit Listing" />
            </button>
            <ResponsiveEllipsis
              component="div"
              className="listing-card__name"
              maxLine="1"
              text={listing.metadata.display_name}
            />
            <div className="listing-card__status">
              <div className="listing-card__status-label">
                Listing Price
              </div>
              <div className="listing-card__price">
                { FormatPriceString({USD: listing.details.Price})}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ListingCard;
