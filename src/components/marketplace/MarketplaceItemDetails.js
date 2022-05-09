import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import {CopyableField, ExpandableSection} from "Components/common/UIComponents";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import NFTCard from "Components/common/NFTCard";
import PurchaseModal from "Components/listings/PurchaseModal";
import UrlJoin from "url-join";

import DetailsIcon from "Assets/icons/Details icon";
import ContractIcon from "Assets/icons/Contract icon";
import DescriptionIcon from "Assets/icons/Description icon";

const MarketplaceItemDetails = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const itemIndex = marketplace.items.findIndex(item => item.sku === match.params.sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];
  const itemTemplate = item.nft_template ? item.nft_template.nft || {} : {};

  const stock = checkoutStore.stock[item.sku];
  const outOfStock = stock && stock.max && stock.minted >= stock.max;
  const maxOwned = stock && stock.max_per_user && stock.current_user >= stock.max_per_user;

  const timeToAvailable = item.available_at ? new Date(item.available_at).getTime() - Date.now() : 0;
  const timeToExpired = item.expires_at ? new Date(item.expires_at).getTime() - Date.now() : Infinity;
  const available = timeToAvailable <= 0 && timeToExpired > 0;

  const unauthorized = item.requires_permissions && !item.authorized;

  const marketplacePurchaseAvailable = !outOfStock && available && !unauthorized && !maxOwned;

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseModalType, setPurchaseModalType] = useState("marketplace");

  useEffect(() => {
    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  const itemToNFT = {
    details: {
      ContractAddr: itemTemplate.address,
      TenantId: marketplace.tenant_id
    },
    metadata: itemTemplate
  };

  return (
    <>
      {
        showPurchaseModal ?
          <PurchaseModal
            type={purchaseModalType}
            nft={itemToNFT}
            item={item}
            Close={() => setShowPurchaseModal(false)}
          /> : null
      }
      <div className="details-page">
        <div className="details-page__content-container">
          <NFTCard
            item={item}
            price={item.price}
            stock={stock}
            hideAvailable={item && item.hide_available}
            showVideo={item.video}
          />

          <div className="details-page__actions">
            {
              marketplacePurchaseAvailable ?
                <button
                  className="action action-primary"
                  onClick={() => {
                    setPurchaseModalType("marketplace");
                    setShowPurchaseModal(true);
                  }}
                >
                  Buy Now
                </button> : null
            }
            <Link
              className={`action ${!marketplacePurchaseAvailable ? "action-primary" : ""}`}
              to={
                match.params.marketplaceId ?
                  UrlJoin("/marketplace", match.params.marketplaceId, "listings", `?filter=${encodeURIComponent(item.nftTemplateMetadata.display_name)}`) :
                  UrlJoin("/wallet", "listings", `?addr=${encodeURIComponent(item.nftTemplateMetadata.display_name)}`)
              }
            >
              View Listings
            </Link>
          </div>
        </div>

        <div className="details-page__info">
          <ExpandableSection header="Description" icon={DescriptionIcon}>
            <p className="details-page__description">
              { item.description || itemTemplate.description }
            </p>
            {
              itemTemplate.rich_text ?
                <div
                  className="details-page__rich-text rich-text"
                  ref={element => {
                    if(!element) { return; }

                    render(
                      <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                        { SanitizeHTML(itemTemplate.rich_text) }
                      </ReactMarkdown>,
                      element
                    );
                  }}
                /> : null
            }

          </ExpandableSection>

          <ExpandableSection header="Details" icon={DetailsIcon}>
            {
              itemTemplate.embed_url ?
                <CopyableField value={itemTemplate.embed_url}>
                  Media URL: <a href={itemTemplate.embed_url} target="_blank">{ itemTemplate.embed_url }</a>
                </CopyableField>
                : null
            }
            {
              itemTemplate.image ?
                <CopyableField value={itemTemplate.image}>
                  Image URL: <a href={itemTemplate.image} target="_blank">{ itemTemplate.image }</a>
                </CopyableField>
                : null
            }
            {
              itemTemplate.creator ?
                <div>
                  Creator: { itemTemplate.creator }
                </div>
                : null
            }
            {
              itemTemplate.edition_name ?
                <div>
                  Edition: { itemTemplate.edition_name }
                </div>
                : null
            }
            {
              itemTemplate.total_supply ?
                <div>
                  Total Supply: { itemTemplate.total_supply }
                </div>
                : null
            }
            <br />
            <div>
              { itemTemplate.copyright }
            </div>
          </ExpandableSection>

          {
            itemTemplate.address ?
              <ExpandableSection header="Contract" icon={ContractIcon} className="no-padding">
                <div className="expandable-section__content-row">
                  <CopyableField value={itemTemplate.address}>
                    Contract Address: {itemTemplate.address}
                  </CopyableField>
                </div>
                <div className="expandable-section__actions">
                  <a
                    className="action lookout-url"
                    target="_blank"
                    href={
                      EluvioConfiguration["config-url"].includes("main.net955305") ?
                        `https://explorer.contentfabric.io/address/${itemTemplate.address}/transactions` :
                        `https://lookout.qluv.io/address/${itemTemplate.address}/transactions`
                    }
                    rel="noopener"
                  >
                    See More Info on Eluvio Lookout
                  </a>
                </div>
              </ExpandableSection> : null
          }
        </div>
      </div>
    </>
  );
});

export default MarketplaceItemDetails;
