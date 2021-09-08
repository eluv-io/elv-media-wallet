import React from "react";
import {observer} from "mobx-react";

import {rootStore} from "Stores/index";
import UrlJoin from "url-join";

import {Link, useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";

export const NFTCard = observer(({nft}) => {
  const match = useRouteMatch();

  return (
    <div className="card-container card-shadow">
      <Link
        to={UrlJoin(match.url, nft.details.ContractId, nft.details.TokenIdStr)}
        className="card nft-card"
      >
        <NFTImage nft={nft} className="card__image" width={400} />
        <h2 className="card__title">
          { nft.metadata.display_name || "" }
        </h2>
        <h2 className="card__subtitle">
          { nft.metadata.display_name || "" }
        </h2>
      </Link>
    </div>
  );
});

const Collections = observer(() => {
  return (
    <div className="card-list collections">
      { rootStore.nfts.map(nft => <NFTCard nft={nft} key={`nft-card-${nft.details.ContractId}-${nft.details.TokenIdStr}`} />) }
    </div>
  );
});

export default Collections;
