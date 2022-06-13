import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ImageIcon from "Components/common/ImageIcon";

import {PageLoader} from "Components/common/Loaders";
import {ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";
import ItemCard from "Components/common/ItemCard";
import ListingIcon from "Assets/icons/listings icon";
import {NFTDisplayToken} from "../../utils/Utils";

import BackIcon from "Assets/icons/arrow-left";

const MarketplaceCollection = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [collectionItems, setCollectionItems] = useState(undefined);
  const [selectedCards, setSelectedCards] = useState({});
  const [confirmationId, setConfirmationId] = useState(undefined);

  if(!marketplace) { return null; }

  const collection = (marketplace.collections || []).find(collection =>
    match.params.collectionSKU === collection.sku
  );

  useEffect(() => {
    rootStore.MarketplaceCollectionItems({marketplace, collection})
      .then(items => {
        setCollectionItems(items);

        let selected = {};
        items.forEach(slot => {
          const nft = (slot.ownedItems || []).find(nft => !nft.details.ListingId);

          if(!nft) { return; }

          selected[slot.sku] = {
            contractAddress: nft.details.ContractAddr,
            tokenId: nft.details.TokenIdStr
          };
        });

        setSelectedCards(selected);
      });
  }, []);


  if(confirmationId) {
    return <Redirect to={UrlJoin(match.url, confirmationId, "status")} />;
  }

  const collectionIcon = collection.collection_icon;

  let slots;
  if(collectionItems) {
    slots = collectionItems.map((slot, index) =>
      <div className="collection-redemption__list-container" key={`redemption-slot-${index}`}>
        <h2 className="collection-redemption__list-container__header">
          { (slot.ownedItems[0]?.metadata || slot.item.nftTemplateMetadata).display_name }
        </h2>
        <div className={`card-list ${rootStore.centerContent ? "card-list--centered" : ""} collection-redemption__list`}>
          {
            slot.ownedItems.map(({nft}) => {
              const selected = selectedCards[slot.sku]?.tokenId === nft.details.TokenIdStr;
              return (
                <div className={`collection-redemption__option ${selected ? "collection-redemption__option--selected" : ""}`} key={`redemption-option-${nft.details.TokenIdStr}`}>
                  <ItemCard
                    key={`nft-card-${nft.details.ContractId}-${nft.details.TokenIdStr}`}
                    image={<NFTImage nft={nft} width={600} />}
                    badges={
                      nft.details.ListingId ?
                        <ImageIcon
                          icon={ListingIcon}
                          title="This NFT is listed for sale"
                          alt="Listing Icon"
                          className="item-card__badge"
                        /> : null
                    }
                    name={nft.metadata.display_name}
                    edition={nft.metadata.edition_name}
                    sideText={NFTDisplayToken(nft)}
                    description={nft.metadata.description}
                    price={nft.details.ListingId ?
                      FormatPriceString(
                        nft.details.Price,
                        {
                          includeCurrency: !nft.details.USDCOnly,
                          useCurrencyIcon: false,
                          includeUSDCIcon: nft.details.USDCAccepted,
                          prependCurrency: true
                        }
                      ) : null
                    }
                    usdcAccepted={nft.details.USDCAccepted}
                    variant={nft.metadata.style}
                  />
                  <button
                    className={`action collection-redemption__option__button ${selected ? "action-primary" : ""}`}
                    key={`redemption-option-${nft.details.TokenIdStr}`}
                    disabled={nft.details.ListingId}
                    title={nft.details.ListingId ? "You may not redeem a token while it is listed for sale." : undefined}
                    onClick={() => setSelectedCards({
                      ...selectedCards,
                      [slot.sku]: {contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr}
                    })}
                  >
                    { selected ? "Selected" : "Select This Token"}
                  </button>
                </div>
              );
            })
          }
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-listings marketplace__section">
      <Link to={UrlJoin("/marketplace", match.params.marketplaceId, "collections", collection.sku)} className="details-page__back-link">
        <ImageIcon icon={BackIcon} />
        Back to { collection.name || collection.collection_header || "Collection" }
      </Link>
      <div className="marketplace__section">
        <div className="marketplace__collection-header">
          {
            collectionIcon ?
              <MarketplaceImage
                rawImage
                className="marketplace__collection-header__icon"
                marketplaceHash={marketplace.versionHash}
                title={collection.name}
                path={
                  UrlJoin("public", "asset_metadata", "info", "collections", collection.collectionIndex.toString(), "collection_icon")
                }
              /> : null
          }
          <div className="page-headers">
            { collection.collection_header ? <div className="page-header">{ collection.collection_header}</div> : null }
            { collection.collection_subheader ? <div className="page-subheader">{ collection.collection_subheader}</div> : null }
          </div>
        </div>

        <div className="collection-redemption__rewards-container">
          <div className="collection-redemption__rewards-container__header">
            Select tokens to trade in for these rewards
          </div>
          <div className={`card-list ${rootStore.centerContent ? "card-list--centered" : ""} collection-redemption__rewards`}>
            {
              collection.redeem_items.map((sku, index) => {
                const item = marketplace.items.find(item => item.sku === sku);

                return (
                  <MarketplaceItemCard
                    key={`item-card-${index}`}
                    noLink
                    noStock
                    noPrice
                    item={item}
                    index={item.itemIndex}
                    marketplaceHash={marketplace.versionHash}
                  />
                );
              })
            }
          </div>
          <div className="collection-redemption__rewards-container__message">
            Select the NFT you wish to trade for each slot
          </div>
        </div>
        {
          collectionItems ?
            slots :
            <PageLoader/>
        }

        <div className="collection-redemption__redeem">
          <div className="collection-redemption__redeem__message">
            Clicking redeem will permanently burn the selected tokens and mint the reward tokens to your account. Your new NFTs will appear in your wallet when minting is complete. This operation cannot be reversed and burned tokens cannot be recovered.
          </div>
          <ButtonWithLoader
            className="action action-primary collection-redemption__redeem__button"
            disabled={collection.items.find(sku => !selectedCards[sku]?.contractAddress || !selectedCards[sku]?.tokenId)}
            onClick={async () => {
              setConfirmationId(
                await checkoutStore.RedeemCollection({
                  marketplace,
                  collectionSKU: collection.sku,
                  selectedNFTs: Object.values(selectedCards)
                })
              );
            }}
          >
            Redeem
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

export default MarketplaceCollection;
