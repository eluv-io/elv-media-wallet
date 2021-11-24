import React, {useState, useRef, useEffect} from "react";
import {NFTImage} from "Components/common/Images";
import ListingModal from "Components/sales/ListingModal";
import Confirm from "Components/common/Confirm";
import {transferStore} from "Stores";

const ListingCard = ({nft, Refresh}) => {
  const [showListingModal, setShowListingModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  const Menu = () => {
    return (
      <div className="listing-card__menu">
        <button className="listing-card__menu__action">
          Share Listing
        </button>
        <button
          onClick={async () => Confirm({
            message: "Are you sure you want to remove this listing?",
            Confirm: async () => {
              await transferStore.RemoveListing({listingId: nft.details.ListingId});
              await new Promise(resolve => setTimeout(resolve, 500));
              Refresh && Refresh();
            }
          })}
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
            nft={nft}
            Close={maybeTokenId => {
              setShowListingModal(false);

              if(maybeTokenId) { Refresh && Refresh(); }
            }}
          /> : null
      }
      <div className="listing-card" ref={ref}>
        { showMenu ? <Menu /> : null }
        <button
          className="listing-card__menu-button"
          onClick={() => {
            setShowMenu(!showMenu);
          }}
        >
          ···
        </button>
        <NFTImage className="listing-card__image" nft={nft} />
        <div className="listing-card__content">
          <div className="listing-card__header">
            <h3 className="listing-card__header-title">
              { nft.metadata.display_name }
            </h3>
            <h3 className="listing-card__header-id">
              { nft.details.TokenIdStr }
            </h3>
          </div>

          <div className="listing-card__details">
            <div className="listing-card__detail">
              <div className="listing-card__detail-label">
                Date Posted
              </div>
              <div className="listing-card__detail-value">
                { new Date(nft.details.UpdatedAt).toLocaleDateString("en-us", {year: "numeric", month: "long", day: "numeric" }) }
              </div>
            </div>
            {
              nft.details.SoldPrice ?
                <div className="listing-card__detail">
                  <div className="listing-card__detail-label">
                    Date Sold
                  </div>
                  <div className="listing-card__detail-value">
                    November 23, 2021
                  </div>
                </div> : null
            }
          </div>

          <div className="listing-card__price-container">
            <div className="listing-card__price-details">
              <div className="listing-card__price-label">
                Listing Price
              </div>
              <div className="listing-card__price-value">
                ${(nft.details.Total || 0).toFixed(2)}
              </div>
            </div>

            <div className="listing-card__actions">
              <button className="listing-card__action" onClick={() => setShowListingModal(true)}>
                Edit Listing
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ListingCard;
