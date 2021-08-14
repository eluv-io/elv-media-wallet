import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";

import {useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";
import {ExpandableSection, CopyableField} from "Components/common/UIComponents";

const NFTDetails = observer(() => {
  const match = useRouteMatch();
  const nft = rootStore.NFT(match.params.tokenId);

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
        </ExpandableSection>
      </div>
    </div>
  );
});

export default NFTDetails;
