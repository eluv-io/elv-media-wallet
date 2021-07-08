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
  mintDate = "2020-10-05";
  if(mintDate) {
    mintDate = new Date(mintDate);
    mintDate = `${mintDate.getFullYear()}/${mintDate.getMonth() + 1}/${mintDate.getDate()}`;
  }

  return (
    <div className="nft-details">
      <div className="nft-details__content card-shadow">
        <h2 className="nft-details__content__header">
          { (nft.metadata.nft || {}).name || "" }
        </h2>
        <NFTImage nft={nft} width={10} />
        <div className="nft-details__content__id ellipsis">
          { match.params.tokenId }
        </div>
      </div>

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
      </ExpandableSection>

      <ExpandableSection header="Details">
        <div>
          { copyright }
        </div>
        <div>
          { mintDate ? `Minted on the Eluvio Content Fabric: ${mintDate}` : "" }
        </div>
      </ExpandableSection>
    </div>
  );
});

export default NFTDetails;
