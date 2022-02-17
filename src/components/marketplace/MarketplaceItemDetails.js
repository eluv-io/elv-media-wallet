import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import {CopyableField, ExpandableSection} from "Components/common/UIComponents";
import MarketplaceCheckout from "Components/marketplace/MarketplaceCheckout";
import DescriptionIcon from "Assets/icons/Description icon";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import DetailsIcon from "Assets/icons/Details icon";
import ContractIcon from "Assets/icons/Contract icon";
import NFTCard from "Components/common/NFTCard";

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

  useEffect(() => {
    if(!stock) { return; }

    // If item has stock, periodically update
    const stockCheck = setInterval(() => checkoutStore.MarketplaceStock({tenantId: marketplace.tenant_id}), 10000);

    return () => clearInterval(stockCheck);
  }, []);

  return (
    <div className="details-page">
      <div className="details-page__content-container">
        <NFTCard
          nft={{metadata: item.nftTemplateMetadata}}
          price={item.price}
          stock={stock}
          hideAvailable={item && item.hide_available}
        />
      </div>

      <div className="details-page__info">
        {
          outOfStock ?
            null :
            <MarketplaceCheckout item={item} />
        }

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
                  className="lookout-url"
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
  );
});

export default MarketplaceItemDetails;
