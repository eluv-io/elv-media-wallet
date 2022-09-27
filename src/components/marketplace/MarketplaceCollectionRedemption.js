import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import {PageLoader} from "Components/common/Loaders";
import {ButtonWithLoader} from "Components/common/UIComponents";
import ListingIcon from "Assets/icons/listings icon";

import BackIcon from "Assets/icons/arrow-left";
import Confirm from "Components/common/Confirm";
import NFTCard from "Components/nft/NFTCard";

const MarketplaceCollection = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [collectionItems, setCollectionItems] = useState(undefined);
  const [selectedCards, setSelectedCards] = useState({});
  const [confirmationId, setConfirmationId] = useState(undefined);
  const [redeeming, setRedeeming] = useState(false);

  if(!marketplace) { return null; }

  const collection = (marketplace.collections || []).find(collection =>
    match.params.collectionSKU === collection.sku
  );

  useEffect(() => {
    rootStore.MarketplaceCollectionItems({marketplace, collection})
      .then(items => setCollectionItems(items));
  }, []);


  if(confirmationId) {
    return <Redirect to={UrlJoin(match.url, confirmationId, "status")} />;
  }

  const allTokensSelected = !collection.items.find(sku => !selectedCards[sku]?.contractAddress || !selectedCards[sku]?.tokenId);

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
                  <NFTCard
                    key={`nft-card-${nft.details.ContractId}-${nft.details.TokenIdStr}`}
                    nft={nft}
                    imageWidth={600}
                    badges={
                      nft.details.ListingId ?
                        <ImageIcon
                          icon={ListingIcon}
                          title="This NFT is listed for sale"
                          alt="Listing Icon"
                          className="item-card__badge"
                        /> : null
                    }
                  />
                  <button
                    className={`action collection-redemption__option__button ${selected ? "action-primary" : ""}`}
                    key={`redemption-option-${nft.details.TokenIdStr}`}
                    disabled={nft.details.ListingId}
                    title={nft.details.ListingId ? "You may not redeem a token while it is listed for sale." : undefined}
                    onClick={() => {
                      if(selectedCards[slot.sku]?.contractAddress === nft.details.ContractAddr && selectedCards[slot.sku]?.tokenId === nft.details.TokenIdStr) {
                        setSelectedCards({
                          ...selectedCards,
                          [slot.sku]: undefined
                        });
                      } else {
                        setSelectedCards({
                          ...selectedCards,
                          [slot.sku]: {contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr}
                        });
                      }
                    }}
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
    <div className="marketplace__section">
      <Link to={UrlJoin("/marketplace", match.params.marketplaceId, "collections", collection.sku)} className="details-page__back-link">
        <ImageIcon icon={BackIcon} />
        <div className="details-page__back-link__text ellipsis">
          Back to { collection.name || collection.collection_header || "Collection" }
        </div>
      </Link>
      <div className="marketplace__section">
        <div className="page-headers collection-redemption__redeem__headers">
          <div className="page-header collection-redemption__redeem__header">
            Select the NFTs you wish to trade in
          </div>
          <div className="page-subheader collection-redemption__redeem__subheader">
            Choose one NFT per collection slot
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
          {
            allTokensSelected ? null :
              <div className="collection-redemption__redeem__message">
                Please select one token to redeem for each item in the collection.
              </div>
          }
          {
            rootStore.externalWalletUser && redeeming ?
              <div className="collection-redemption__redeem__external-wallet-message">
                This operation requires one signature per redeemed token.<br />Please check your Metamask browser extension and accept all pending signature requests.
              </div> : null
          }

          <ButtonWithLoader
            className="action action-primary collection-redemption__redeem__button"
            disabled={!allTokensSelected}
            onClick={async () => await Confirm({
              message: "Are you sure you want to redeem this collection with the selected tokens? This action cannot be reversed.",
              Confirm: async () => {
                setRedeeming(true);

                try {
                  setConfirmationId(
                    await checkoutStore.RedeemCollection({
                      marketplace,
                      collectionSKU: collection.sku,
                      selectedNFTs: Object.values(selectedCards)
                    })
                  );
                } catch(error) {
                  rootStore.Log(error, true);
                } finally {
                  setRedeeming(false);
                }
              }
            })}
          >
            Redeem
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

export default MarketplaceCollection;
