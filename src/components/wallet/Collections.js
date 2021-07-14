import React from "react";
import {observer} from "mobx-react";

import {rootStore} from "Stores/index";

import {Link, useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";

const NFTCard = observer((nft) => {
  const match = useRouteMatch();

  return (
    <div className="card-container">
      <Link
        to={`${match.url}/${nft.nftInfo.TokenIdStr}`}
        className="card nft-card"
        key={`nft-card-${nft.nftInfo.TokenIdStr}`}
      >
        <NFTImage nft={nft} className="card__image" width={800} />
        <div className="card__overlay">
          { (nft.metadata.nft || {}).name || "" }
        </div>
      </Link>
    </div>
  );
});

const Collections = observer(() => {
  return (
    <div className="card-list collections">
      { rootStore.nfts.map(nft => <NFTCard {...nft} />) }
    </div>
  );
});

export default Collections;
