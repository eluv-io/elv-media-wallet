import React, {useState, useRef, useEffect} from "react";
import {NFTImage} from "Components/common/Images";
import ListingModal from "Components/listings/ListingModal";
import Confirm from "Components/common/Confirm";
import {transferStore} from "Stores";
import {Link} from "react-router-dom";
import {ButtonWithLoader} from "Components/common/UIComponents";

const ListingCard = ({listing, link, Refresh}) => {
  const [showListingModal, setShowListingModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isInCheckout, setIsInCheckout] = useState(listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now());
  const [message, setMessage] = useState(undefined);

  const ref = useRef(null);

  const HandleClick = event => {
    if(ref.current && !ref.current.contains(event.target)) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", HandleClick);

    return () => document.removeEventListener("mousedown", HandleClick);
  });

  useEffect(() => {
    const checkout = listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now();
    setIsInCheckout(checkout);

    if(checkout) {
      setMessage("This listing is currently in the process of being purchased");
    } else {
      setMessage("");
    }
  }, [listing]);

  const Menu = () => {
    return (
      <div className="listing-card__menu">
        <button
          autoFocus
          disabled={isInCheckout}
          onClick={async event => {
            event.stopPropagation();

            const listings = await transferStore.FetchTransferListings({listingId: listing.details.ListingId, forceUpdate: true});
            const currentListing = listings[0];

            let isInCheckout = currentListing && currentListing.details.CheckoutLockedUntil && currentListing.details.CheckoutLockedUntil > Date.now();
            setIsInCheckout(isInCheckout);

            if(isInCheckout) {
              setMessage("This listing is currently in the process of being purchased");
            } else {
              Confirm({
                message: "Are you sure you want to remove this listing?",
                Confirm: async () => {
                  await transferStore.RemoveListing({listingId: listing.details.ListingId});
                  await new Promise(resolve => setTimeout(resolve, 500));
                  Refresh && Refresh();
                }
              });
            }
          }}
          className="listing-card__menu__action"
        >
          Remove Listing
        </button>
      </div>
    );
  };

  return (
    <>
      {
        showListingModal ?
          <ListingModal
            nft={listing}
            Close={(info={}) => {
              setShowListingModal(false);

              if(info.listingId || info.deleted) { Refresh(); }
            }}
          /> : null
      }
      <div className={`listing-card ${message ? "listing-card-with-message" : ""}`} ref={ref}>
        { showMenu ? <Menu /> : null }
        <button
          className="action listing-card__menu-button"
          onClick={() => {
            setShowMenu(!showMenu);
          }}
        >
          ···
        </button>
        <Link to={link} className="listing-card__image-container">
          <NFTImage width={400} className="listing-card__image" nft={listing} />
        </Link>
        <div className="listing-card__content">
          <Link to={link} className="listing-card__header">
            <h3 className="listing-card__header-title ellipsis">
              { listing.metadata.display_name }
            </h3>
            {
              listing.metadata.edition_name ?
                <h2 className="listing-card__header-id">
                  { listing.metadata.edition_name }
                </h2> : null
            }
            <h3 className="listing-card__header-id">
              { typeof listing.details.TokenOrdinal !== "undefined" ? `${parseInt(listing.details.TokenOrdinal) + 1} / ${listing.details.Cap}` : listing.details.TokenIdStr }
            </h3>
          </Link>

          <Link to={link} className="listing-card__details">
            <div className="listing-card__detail">
              <div className="listing-card__detail-label">
                Date Posted
              </div>
              <div className="listing-card__detail-value">
                { new Date(listing.details.UpdatedAt).toLocaleDateString("en-us", {year: "numeric", month: "long", day: "numeric" }) }
              </div>
            </div>
            {
              listing.details.SoldPrice ?
                <div className="listing-card__detail">
                  <div className="listing-card__detail-label">
                    Date Sold
                  </div>
                  <div className="listing-card__detail-value">
                    November 23, 2021
                  </div>
                </div> : null
            }
          </Link>

          <div className="listing-card__price-container">
            <div className="listing-card__price-details">
              <div className="listing-card__price-label">
                Listing Price
              </div>
              <div className="listing-card__price-value">
                ${(listing.details.Price || 0).toFixed(2)}
              </div>
            </div>

            <div className="listing-card__actions">
              <ButtonWithLoader
                className="listing-card__action"
                disabled={isInCheckout}
                onClick={async event => {
                  event.stopPropagation();
                  const listings = await transferStore.FetchTransferListings({listingId: listing.details.ListingId, forceUpdate: true});
                  const currentListing = listings[0];

                  let isInCheckout = currentListing && currentListing.details.CheckoutLockedUntil && currentListing.details.CheckoutLockedUntil > Date.now();
                  setIsInCheckout(isInCheckout);

                  if(isInCheckout) {
                    setMessage("This listing is currently in the process of being purchased");
                  } else {
                    setShowListingModal(true);
                  }
                }}
              >
                Edit Listing
              </ButtonWithLoader>
            </div>
          </div>
          {
            message ?
              <div className="listing-card__message">
                { message }
              </div> : null
          }
        </div>
      </div>
    </>
  );
};

export default ListingCard;
