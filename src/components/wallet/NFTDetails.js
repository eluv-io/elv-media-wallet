import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import Path from "path";
import UrlJoin from "url-join";

import {Redirect, useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";
import {ExpandableSection, CopyableField, ButtonWithLoader} from "Components/common/UIComponents";

const NFTDetails = observer(() => {
  const [opened, setOpened] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const match = useRouteMatch();

  if(deleted) {
    return <Redirect to={Path.dirname(match.url)}/>;
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
      <div className="details-page__content-container card-container">
        <div className="details-page__content card card-shadow">
          <NFTImage nft={nft} video className="details-page__content__image" />
          <div className="card__subtitle">
            { match.params.tokenId }
          </div>

          <h2 className="card__title">
            { nft.metadata.display_name }
          </h2>
        </div>
      </div>

      <div className="details-page__info">
        <ExpandableSection header="Description">
          { nft.metadata.description }
        </ExpandableSection>

        <ExpandableSection header="Details">
          {
            nft.metadata.token_uri ?
              <CopyableField value={nft.metadata.token_uri}>
                Token URI: { nft.metadata.token_uri }
              </CopyableField>
              : null
          }
          {
            nft.metadata.embed_url ?
              <CopyableField value={nft.metadata.embed_url}>
                Media URL: { nft.metadata.embed_url }
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

        <ExpandableSection header="Contract">
          <CopyableField value={nft.details.ContractAddr}>
            Contract Address: { nft.details.ContractAddr }
          </CopyableField>
          <CopyableField value={nft.details.versionHash}>
            Hash: { nft.details.versionHash }
          </CopyableField>
          <div>
            <a
              className="lookout-url"
              target="_blank"
              href={`https://lookout.qluv.io/address/${nft.details.ContractAddr}/transactions`} rel="noopener"
            >
              See More Info on Eluvio Lookout
            </a>
          </div>
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
          </ButtonWithLoader>
        </ExpandableSection>

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
    </div>
  );
});

export default NFTDetails;
