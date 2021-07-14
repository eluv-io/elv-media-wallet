import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";

import {useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";
import {ExpandableSection, CopyableField} from "Components/common/UIComponents";

const NFTDetails = observer(() => {
  const match = useRouteMatch();
  const nft = rootStore.NFT(match.params.tokenId);
  const nftData = (nft.metadata.nft || {});
  const nftProperties = nftData.properties || {};

  const Property = (key) => {
    return (nftProperties[key] || {})[key] || (nftProperties[key] || {}).description;
  };

  let copyright = Property("copyright");
  if(!copyright.includes("©")) {
    copyright = `© ${copyright}`;
  }

  let mintDate = Property("created_at");
  if(mintDate) {
    try {
      const parsedMintDate = new Date(mintDate);
      if(!(d instanceof Date && !isNaN(d))) {
        mintDate = `${parsedMintDate.getFullYear()}/${parsedMintDate.getMonth() + 1}/${parsedMintDate.getDate()}`;
      }
    } catch(error) {
      mintDate = "";
      console.error("Invalid date:", mintDate);
    }
  }

  const embedUrl = rootStore.MediaEmbedUrl(nft);
  return (
    <div className="nft-details">
      <div className="nft-details__content card-shadow">
        <h2 className="nft-details__content__header">
          { (nft.metadata.nft || {}).name || "" }
        </h2>
        <NFTImage nft={nft} video />
        <div className="nft-details__content__id ellipsis">
          { match.params.tokenId }
        </div>
      </div>

      <div className="nft-details__info">
        <ExpandableSection header="Description">
          { nftData.description }
        </ExpandableSection>

        <ExpandableSection header="Contract">
          <CopyableField value={nft.nftInfo.ContractAddr}>
            Contract Address: { nft.nftInfo.ContractAddr }
          </CopyableField>
          <CopyableField value={nft.nftInfo.versionHash}>
            Hash: { nft.nftInfo.versionHash }
          </CopyableField>
          <CopyableField value={Property("digital_media_signature")}>
            Signature: { Property("digital_media_signature") }
          </CopyableField>
          <div>
            <a
              className="lookout-url"
              target="_blank"
              href={`https://lookout.qluv.io/address/${nft.nftInfo.ContractAddr}/transactions`} rel="noopener"
            >
              See More Info on Eluvio Lookout
            </a>
          </div>
        </ExpandableSection>

        <ExpandableSection header="Details">
          {
            embedUrl ?
              <CopyableField value={embedUrl}>
                Media URL: { embedUrl }
              </CopyableField>
              : null
          }
          {
            Property("creator") ?
              <div>
                Creator: { Property("creator") }
              </div>
              : null
          }
          {
            Property("total_supply") ?
              <div>
                Total Supply: { Property("total_supply") }
              </div>
              : null
          }
          <br />
          <div>
            { copyright }
          </div>
          <div>
            { mintDate ? `Minted on the Eluvio Content Fabric: ${mintDate}` : "" }
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
});

export default NFTDetails;
