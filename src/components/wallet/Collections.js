import React from "react";
import {observer} from "mobx-react";

import {rootStore} from "Stores/index";

import {Link, useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";

const NFTCard = observer(({nft}) => {
  const match = useRouteMatch();

  return (
    <div className="card-container">
      <Link
        to={`${match.url}/${nft.details.TokenIdStr}`}
        className="card nft-card"
      >
        <NFTImage nft={nft} className="card__image" width={800} />
        <div className="card__overlay">
          { nft.metadata.display_name || "" }
        </div>
      </Link>
    </div>
  );
});

const Collections = observer(() => {
  return (
    <div className="card-list collections">
      { rootStore.nfts.map(nft => <NFTCard nft={nft} key={`nft-card-${nft.details.TokenIdStr}`} />) }
    </div>
  );
});

export default Collections;
