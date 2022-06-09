import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage} from "Components/common/Images";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ImageIcon from "Components/common/ImageIcon";

import {PageLoader} from "Components/common/Loaders";
import BackIcon from "Assets/icons/arrow-left";
import NFTCard from "Components/common/NFTCard";
import {ButtonWithLoader} from "Components/common/UIComponents";

const MarketplaceCollection = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [collectionItems, setCollectionItems] = useState(undefined);
  const [selectedCards, setSelectedCards] = useState({});

  if(!marketplace) { return null; }

  const collection = (marketplace.collections || []).find(collection =>
    match.params.collectionSlug === collection.collectionSlug
  );

  useEffect(() => {
    rootStore.MarketplaceCollectionItems({marketplace, collection})
      .then(items => {
        setCollectionItems(items);

        let selected = {};
        items.forEach(slot => {
          const nft = slot.ownedItems[0]?.nft;

          if(!nft) { return; }

          selected[slot.sku] = {
            contractAddress: nft.details.ContractAddr,
            tokenId: nft.details.TokenIdStr
          };
        });

        setSelectedCards(selected);
      });
  }, []);


  const collectionIcon = collection.collection_icon;

  let slots;
  if(collectionItems) {
    slots = collectionItems.map(slot =>
      <div className="collection-redemption__list-container">
        <h2 className="collection-redemption__list-container__header">
          { (slot.ownedItems[0]?.metadata || slot.item.nftTemplateMetadata).display_name }
        </h2>
        <div className={`card-list ${rootStore.centerContent ? "card-list--centered" : ""} collection-redemption__list`} key={`redemption-row-${slot.sku}`}>
          {
            slot.ownedItems.map(({nft}) => {
              const selected = selectedCards[slot.sku]?.tokenId === nft.details.TokenIdStr;
              return (
                <div className={`collection-redemption__option ${selected ? "collection-redemption__option--selected" : ""}`}>
                  <NFTCard
                    nft={nft}
                    truncateDescription
                    showOrdinal
                  />
                  <button
                    className={`action collection-redemption__option__button ${selected ? "action-primary" : ""}`}
                    key={`redemption-option-${nft.details.TokenIdStr}`}
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
      <Link to={UrlJoin("/marketplace", match.params.marketplaceId, "collections", collection.collectionSlug)} className="details-page__back-link">
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
              collection.redeem_items.map(sku => {
                const item = marketplace.items.find(item => item.sku === sku);

                return (
                  <MarketplaceItemCard
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
            onClick={async () => await checkoutStore.RedeemCollection({marketplace, collectionSKU: collection.sku, selectedNFTs: Object.values(selectedCards)})}
          >
            Redeem
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

export default MarketplaceCollection;
