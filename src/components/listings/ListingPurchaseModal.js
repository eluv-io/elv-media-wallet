import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import AsyncComponent from "Components/common/AsyncComponent";
import {checkoutStore, rootStore, transferStore} from "Stores";
import {ActiveListings} from "Components/listings/TransferTables";
import {FormatPriceString} from "Components/common/UIComponents";
import {NFTImage} from "Components/common/Images";
import {useRouteMatch} from "react-router-dom";

const ListingPurchaseConfirmation = observer(({nft, listingId}) => {
  const match = useRouteMatch();
  const [paymentType, setPaymentType] = useState("credit");

  const listings = transferStore.TransferListings({contractAddress: nft.details.ContractAddr});
  const selectedListing = listings.find(listing => listing.details.ListingId === listingId);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const marketplaceItem = listingId === "marketplace" && marketplace && rootStore.MarketplaceItemByTemplateId(marketplace, nft.metadata.template_id);
  const stock = marketplaceItem && checkoutStore.stock[marketplaceItem.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  const price = FormatPriceString(listingId === "marketplace" ? marketplaceItem.price : { USD: selectedListing.details.Total });

  useEffect(() => {
    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  return (
    <div className="listing-purchase-confirmation-modal">
      <div className="listing-purchase-confirmation-modal__header">
        Select Payment Method
      </div>
      <div className="listing-purchase-confirmation-modal__content">
        <div className="listing-purchase-confirmation-modal__nft-details card-padding-container">
          <div className="card card-shadow">
            <NFTImage nft={nft} className="listing-purchase-confirmation-modal__image"/>
            <div className="card__titles">
              <h2 className="card__title">
                <div className="card__title__title">
                  { nft.metadata.display_name }
                </div>
                <div className="card__title__price">
                  { price }
                </div>
              </h2>
              {
                nft.metadata.edition_name ?
                  <h2 className="card__title-edition">{ nft.metadata.edition_name }</h2> : null
              }
              {
                selectedListing ?
                  <h2 className="card__subtitle card__title-edition">{ selectedListing.details.TokenIdStr }</h2> : null
              }
              <h2 className="card__subtitle">
                <div className="card__subtitle__title">
                  { nft.metadata.description }
                </div>
              </h2>
            </div>
            {
              stock && stock.max ?
                <div className="card__stock">
                  <div className="header-dot" style={{backgroundColor: outOfStock ? "#a4a4a4" : "#ff0000"}} />
                  { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
                </div> : null
            }
          </div>
        </div>
        <div className="listing-purchase-confirmation-modal__payment-options">
          <div className="listing-purchase-confirmation-modal__payment-message">
            Buy NFT With
          </div>
          <div className="listing-purchase-confirmation-modal__payment-selection-container">
            <button
              onClick={() => setPaymentType("credit")}
              className={`listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-credit-card ${paymentType === "credit" ? "listing-purchase-confirmation-modal__payment-selection-selected" : ""}`}
            >
              Credit Card
            </button>
            <button
              onClick={() => setPaymentType("crypto")}
              className={`listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-crypto ${paymentType === "crypto" ? "listing-purchase-confirmation-modal__payment-selection-selected" : ""}`}
            >
              Crypto
            </button>
            <button
              onClick={() => setPaymentType("wallet")}
              className={`listing-purchase-confirmation-modal__payment-selection listing-purchase-confirmation-modal__payment-selection-credit-card ${paymentType === "wallet" ? "listing-purchase-confirmation-modal__payment-selection-selected" : ""}`}
            >
              Wallet Balance
            </button>
          </div>
          <button
            disabled={outOfStock}
            className="listing-purchase-confirmation-modal__payment-submit"
          >
            Buy Now for { price }
          </button>
        </div>
      </div>
    </div>
  );
});

const ListingPurchaseSelection = observer(({nft, initialListingId, Select}) => {
  const match = useRouteMatch();
  const [selectedListingId, setSelectedListingId] = useState(initialListingId);

  const listings = transferStore.TransferListings({contractAddress: nft.details.ContractAddr});
  const selectedListing = selectedListingId && listings.find(listing => listing.details.ListingId === selectedListingId);
  const prices = listings.map(listing => listing.details.Total).sort((a, b) => a < b ? -1 : 1);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const marketplaceItem = marketplace && rootStore.MarketplaceItemByTemplateId(marketplace, nft.metadata.template_id);
  const stock = marketplaceItem && checkoutStore.stock[marketplaceItem.sku];

  const outOfStock = stock && stock.max && stock.minted >= stock.max;

  return (
    <div className="listing-purchase-modal">
      <div className="listing-purchase-modal__header">
        <div className="listing-purchase-modal__nft-info-container">
          <NFTImage nft={nft} className="listing-purchase-modal__image" />
          <div className="listing-purchase-modal__nft-info">
            <h3 className="listing-purchase-modal__token-id ellipsis">
              { nft.details.TokenIdStr }
            </h3>
            <h2 className="listing-purchase-modal__name ellipsis">
              { nft.metadata.display_name }
            </h2>
          </div>
        </div>
        {
          marketplaceItem ?
            <div className="listing-purchase-modal__buy-container">
              <div className="listing-purchase-modal__price-container">
                <label className="listing-purchase-modal__price-label">
                  Buy from Creator
                </label>
                <div className="listing-purchase-modal__price">
                  { FormatPriceString(marketplaceItem.price) }
                </div>
              </div>
              <button
                onClick={() => Select("marketplace")}
                disabled={outOfStock}
                className="listing-purchase-modal__action listing-purchase-modal__action-primary"
              >
                Buy Now
              </button>
            </div> : null
        }
        {
          marketplaceItem && stock && stock.max ?
            <div className="listing-purchase-modal__stock">
              <div className="header-dot" style={{backgroundColor: outOfStock ? "#a4a4a4" : "#ff0000"}} />
              { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available from Creator` }
            </div> : null
        }
      </div>
      <div className="listing-purchase-modal__listing-info">
        <div className="listing-purchase-modal__listing-count-container">
          <div className="listing-purchase-modal__listing-count-label">
            Select from the list to buy from a collector
          </div>
          <div className="listing-purchase-modal__listing-count">
            <div className="header-dot" style={{backgroundColor: listings.length > 0 ? "#08b908" : "#a4a4a4"}} />
            { listings.length } Available for Trade
          </div>
        </div>
        {
          prices.length > 1 ?
            <div className="listing-purchase-modal__prices-container">
              <div className="listing-purchase-modal__price-container">
                <label className="listing-purchase-modal__price-label">
                  Lowest Price
                </label>
                <div className="listing-purchase-modal__price">
                  {FormatPriceString({USD: prices[0]})}
                </div>
              </div>
              <div className="listing-purchase-modal__price-container">
                <label className="listing-purchase-modal__price-label">
                  Highest Price
                </label>
                <div className="listing-purchase-modal__price">
                  {FormatPriceString({USD: prices.slice(-1)})}
                </div>
              </div>
            </div> : null
        }
      </div>
      <ActiveListings
        initialSelectedListingId={selectedListingId}
        contractAddress={nft.details.ContractAddr}
        Select={listingId => setSelectedListingId(listingId)}
      />
      <div className="listing-purchase-modal__footer">
        <div className="listing-purchase-modal__price-container">
          {
            selectedListing ?
              <>
                <label className="listing-purchase-modal__price-label">
                  Selected Price
                </label>
                <div className="listing-purchase-modal__price">
                  {FormatPriceString({USD: selectedListing.details.Total})}
                </div>
              </> : null
          }
        </div>
        <button
          onClick={() => Select(selectedListingId)}
          disabled={!selectedListing}
          className="listing-purchase-modal__action listing-purchase-modal__action-primary"
        >
          Buy Selection
        </button>
      </div>
    </div>
  );
});

const ListingPurchaseModal = observer(({nft, initialListingId, Close}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [selectedListingId, setSelectedListingId] = useState(undefined);

  return (
    <Modal className="listing-purchase-modal-container" Toggle={() => Close()}>
      <AsyncComponent
        loadingClassName="page-loader"
        Load={async () => {
          await transferStore.FetchTransferListings({
            contractAddress: nft.details.ContractAddr,
            forceUpdate: true
          });

          if(marketplace) {
            await checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});
          }
        }}
      >
        {
          selectedListingId ?
            <ListingPurchaseConfirmation nft={nft} listingId={selectedListingId} /> :
            <ListingPurchaseSelection nft={nft} initialListingId={initialListingId} Select={setSelectedListingId} />
        }
      </AsyncComponent>
    </Modal>
  );
});

export default ListingPurchaseModal;
