import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import Path from "path";
import UrlJoin from "url-join";

import {Redirect, useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";
import {ExpandableSection, CopyableField, ButtonWithLoader} from "Components/common/UIComponents";

import DescriptionIcon from "Assets/icons/Description icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";

const NFTDetails = observer(() => {
  const [opened, setOpened] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const match = useRouteMatch();

  if(deleted) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, "owned")}/> :
      <Redirect to={Path.dirname(Path.dirname(match.url))}/>;
  }

  const nft = rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId});

  let mintDate = nft.metadata.created_at;
  if(mintDate) {
    try {
      const parsedMintDate = new Date(mintDate);
      if(!(parsedMintDate instanceof Date && !isNaN(parsedMintDate))) {
        rootStore.Log(`Invalid date: ${mintDate}`, true);
      } else {
        mintDate = `${parsedMintDate.getFullYear()}/${parsedMintDate.getMonth() + 1}/${parsedMintDate.getDate()}`;
      }
    } catch(error) {
      mintDate = "";
    }
  }

  if(opened) {
    return <Redirect to={UrlJoin(match.url, "open")} />;
  }

  return (
    <div className="details-page">
      <div className="details-page__content-container">
        <div className="details-page__card-padding-container">
          <div className="details-page__card-container card-container">
            <div className="details-page__content card card-shadow">
              <NFTImage nft={nft} video className="details-page__content__image" />
              <div className="details-page__content__info card__text">
                <div className="card__titles">
                  <div className="card__subtitle">
                    { match.params.tokenId }
                  </div>

                  <h2 className="card__title">
                    { nft.metadata.display_name }
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
        {
          nft && nft.metadata && nft.metadata.pack_options && nft.metadata.pack_options.is_openable ?
            <ButtonWithLoader
              className="details-page__open-button"
              onClick={async () => {
                await rootStore.OpenNFT({nft});
                setOpened(true);
              }}
            >
              Open Pack
            </ButtonWithLoader> : null
        }
      </div>

      <div className="details-page__info">
        <ExpandableSection header="Description" icon={DescriptionIcon}>
          {
            nft.metadata.rich_text ?
              <div
                className="details-page__rich-text rich-text"
                ref={element => {
                  if(!element) { return; }

                  render(
                    <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                      { SanitizeHTML(nft.metadata.rich_text) }
                    </ReactMarkdown>,
                    element
                  );
                }}
              /> :
              nft.metadata.description
          }
        </ExpandableSection>

        <ExpandableSection header="Details" icon={DetailsIcon}>
          {
            nft.metadata.token_uri ?
              <CopyableField value={nft.metadata.token_uri}>
                Token URI: <a href={nft.metadata.token_uri} target="_blank">{ nft.metadata.token_uri }</a>
              </CopyableField>
              : null
          }
          {
            nft.metadata.embed_url ?
              <CopyableField value={nft.metadata.embed_url}>
                Media URL: <a href={nft.metadata.embed_url} target="_blank">{ nft.metadata.embed_url }</a>
              </CopyableField>
              : null
          }
          {
            nft.metadata.creator ?
              <div>
                Creator: { nft.metadata.creator }
              </div>
              : null
          }
          {
            nft.metadata.total_supply ?
              <div>
                Total Supply: { nft.metadata.total_supply }
              </div>
              : null
          }
          <br />
          <div>
            { nft.metadata.copyright }
          </div>
          <div>
            { mintDate ? `Minted on the Eluvio Content Fabric on ${mintDate}` : "" }
          </div>
        </ExpandableSection>

        <ExpandableSection header="Contract" icon={ContractIcon} className="no-padding">
          <div className="expandable-section__content-row">
            <CopyableField value={nft.details.ContractAddr}>
              Contract Address: { nft.details.ContractAddr }
            </CopyableField>
          </div>
          <div className="expandable-section__content-row">
            <CopyableField value={nft.details.versionHash}>
              Hash: { nft.details.versionHash }
            </CopyableField>
          </div>
          <div className="expandable-section__actions">
            <a
              className="lookout-url"
              target="_blank"
              href={
                EluvioConfiguration["config-url"].includes("main.net955305") ?
                  `https://explorer.contentfabric.io/address/${nft.details.ContractAddr}/transactions` :
                  `https://lookout.qluv.io/address/${nft.details.ContractAddr}/transactions`
              }
              rel="noopener"
            >
              See More Info on Eluvio Lookout
            </a>
            {
              rootStore.funds ?
                <ButtonWithLoader
                  className="details-page__delete-button"
                  onClick={async () => {
                    if(confirm("Are you sure you want to delete this NFT from your collection?")) {
                      await rootStore.BurnNFT({nft});
                      setDeleted(true);
                      await rootStore.LoadWalletCollection(true);
                    }
                  }}
                >
                  Delete this NFT
                </ButtonWithLoader> : null
            }
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
});

export default NFTDetails;
