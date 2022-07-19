import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import {ButtonWithLoader, CopyableField, ExpandableSection, ItemPrice} from "Components/common/UIComponents";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import PurchaseModal from "Components/listings/PurchaseModal";
import UrlJoin from "url-join";
import {LoginClickGate} from "Components/common/LoginGate";

import DetailsIcon from "Assets/icons/Details icon";
import ContractIcon from "Assets/icons/Contract icon";
import DescriptionIcon from "Assets/icons/Description icon";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";
import ImageIcon from "Components/common/ImageIcon";
import BackIcon from "Assets/icons/arrow-left";

const MarketplaceItemDetails = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  if(!marketplace) { return null; }

  const itemIndex = marketplace.items.findIndex(item => item.sku === match.params.sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];
  const itemTemplate = item.nft_template ? item.nft_template.nft || {} : {};

  const directPrice = ItemPrice(item, checkoutStore.currency);
  const free = !directPrice || item.free;

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
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if(!stock) { return; }

    checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id});

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 30000);

    return () => clearInterval(stockCheck);
  }, []);

  const itemToNFT = {
    details: {
      ContractAddr: itemTemplate.address,
      TenantId: marketplace.tenant_id
    },
    metadata: itemTemplate
  };

  if(claimed) {
    return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "store", item.sku, "claim")} />;
  }

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
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
        <Link to={backPage.path} className="details-page__back-link">
          <ImageIcon icon={BackIcon} />
          Back to { marketplace?.branding?.name || "Marketplace" }
        </Link>
        <div className="details-page__content-container">
          <MarketplaceItemCard
            type="Detail"
            marketplaceHash={marketplace.versionHash}
            item={item}
            index={item.itemIndex}
            noLink
            showFullMedia
          />
          <div className="details-page__actions">
            {
              marketplacePurchaseAvailable ?
                <LoginClickGate
                  Component={ButtonWithLoader}
                  onClick={async () => {
                    if(!free) {
                      setPurchaseModalType("marketplace");
                      setShowPurchaseModal(true);
                      return;
                    }

                    try {
                      const status = await rootStore.ClaimStatus({
                        marketplaceId: match.params.marketplaceId,
                        sku: item.sku
                      });

                      if(status && status.status !== "none") {
                        // Already claimed, go to status
                        setClaimed(true);
                      } else if(await checkoutStore.ClaimSubmit({marketplaceId: match.params.marketplaceId, sku: item.sku})) {
                        // Claim successful
                        setClaimed(true);
                      }
                    } catch(error){
                      rootStore.Log("Checkout failed", true);
                      rootStore.Log(error);
                    }
                  }}
                  disabled={outOfStock || maxOwned}
                  className="action action-primary"
                >
                  { free ? "Claim Now" : "Buy Now" }
                </LoginClickGate> : null
            }
            <Link
              className={`action ${!marketplacePurchaseAvailable ? "action-primary" : ""}`}
              to={
                match.params.marketplaceId ?
                  UrlJoin("/marketplace", match.params.marketplaceId, "listings", `?filter=${encodeURIComponent(item.nftTemplateMetadata.display_name)}`) :
                  UrlJoin("/wallet", "listings", `?filter=${encodeURIComponent(item.nftTemplateMetadata.display_name)}`)
              }
            >
              View Listings
            </Link>
          </div>
          {
            item.nftTemplateMetadata.test ?
              <div className="details-page__test-banner">
                This is a test NFT
              </div> : null
          }
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
                      rootStore.walletClient.network === "main" ?
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
