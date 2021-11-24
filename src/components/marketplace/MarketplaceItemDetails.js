import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import UrlJoin from "url-join";
import {CopyableField, ExpandableSection, FormatPriceString} from "Components/common/UIComponents";
import MarketplaceCheckout from "Components/marketplace/MarketplaceCheckout";
import DescriptionIcon from "Assets/icons/Description icon";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import DetailsIcon from "Assets/icons/Details icon";
import ContractIcon from "Assets/icons/Contract icon";

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
        <div className="card-padding-container">
          <div className="details-page__card-container card-container">
            <div className="details-page__content card card-shadow">
              {
                item.image ?
                  <MarketplaceImage
                    marketplaceHash={marketplace.versionHash}
                    item={item}
                    path={UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image")}
                    className="details-page__content__image"
                  /> :
                  <NFTImage nft={{metadata: item.nftTemplateMetadata}} video className="details-page__content__image"/>
              }
              <div className="details-page__content__info card__text">
                <div className="card__titles">
                  <h2 className="card__title">
                    <div className="card__title__title">
                      { item.name }
                    </div>
                    <div className="card__title__price">
                      { FormatPriceString(item.price) }
                    </div>
                  </h2>
                  {
                    item.nftTemplateMetadata.edition_name ?
                      <h2 className="card__title-edition">{ item.nftTemplateMetadata.edition_name }</h2> : null
                  }
                  <h2 className="card__subtitle">
                    <div className="card__subtitle__title">
                      { item.description || item.nftTemplateMetadata.description }
                    </div>
                  </h2>
                </div>
                {
                  stock && stock.max ?
                    <div className="card__stock">
                      <div className={`card__stock__indicator ${outOfStock ? "card__stock__indicator-unavailable" : ""}`} />
                      { outOfStock ? "Sold Out!" : `${stock.max - stock.minted} Available` }
                    </div> : null
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="details-page__info">
        {
          outOfStock ?
            null :
            <MarketplaceCheckout
              marketplaceId={match.params.marketplaceId}
              item={item}
              maxQuantity={stock && (stock.max_per_user || stock.max - stock.minted)}
            />
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
