import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import {PageLoader} from "Components/common/Loaders";
import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
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
                    badges={[
                      nft.details.ListingId ?
                        <ImageIcon
                          key="badge-listed"
                          icon={ListingIcon}
                          title="This NFT is listed for sale"
                          alt="Listing Icon"
                          className="item-card__badge"
                        /> : null
                    ].filter(badge => badge)}
                  />
                  <button
                    className={`action collection-redemption__option__button ${selected ? "action-primary" : ""}`}
                    key={`redemption-option-${nft.details.TokenIdStr}`}
                    disabled={nft.details.ListingId}
                    title={nft.details.ListingId ? rootStore.l10n.collections.errors.listed_nft : undefined}
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
                    { rootStore.l10n.collections[selected ? "selected" : "select_token"] }
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
          { LocalizeString(rootStore.l10n.collections.back_to_collection, { collectionName: collection.name || collection.collection_header || rootStore.l10n.collections.collection }) }
        </div>
      </Link>
      <div className="marketplace__section">
        <div className="page-headers collection-redemption__redeem__headers">
          <div className="page-header collection-redemption__redeem__header">
            { rootStore.l10n.collections.select_nfts_2 }
          </div>
          <div className="page-subheader collection-redemption__redeem__subheader">
            { rootStore.l10n.collections.select_nfts_3 }
          </div>
        </div>
        {
          collectionItems ?
            slots :
            <PageLoader/>
        }

        <div className="collection-redemption__redeem">
          <div className="collection-redemption__redeem__message">
            { rootStore.l10n.collections.redemption_warning }
          </div>
          {
            allTokensSelected ? null :
              <div className="collection-redemption__redeem__message">
                { rootStore.l10n.collections.select_nfts_4 }
              </div>
          }
          {
            rootStore.externalWalletUser && redeeming ?
              <div className="collection-redemption__redeem__external-wallet-message">
                { rootStore.l10n.collections.signature_warning }
              </div> : null
          }

          <ButtonWithLoader
            className="action action-primary collection-redemption__redeem__button"
            disabled={!allTokensSelected}
            onClick={async () => await Confirm({
              message: rootStore.l10n.collections.redemption_confirmation,
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
            { rootStore.l10n.collections.redeem }
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

export default MarketplaceCollection;
