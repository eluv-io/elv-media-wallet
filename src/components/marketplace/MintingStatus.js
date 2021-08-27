import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {Loader} from "Components/common/Loaders";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";

const MintingStatus = observer(() => {
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setFinished(true);
    }, 30000);
  }, []);

  if(finished) {
    let match = useRouteMatch();

    if(match.params.marketplaceId) {
      return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, "store")} />;
    }

    return <Redirect to="/wallet/collections" />;
  }

  return (
    <div className="page-container minting-status">
      <div className="minting-status__text">
        <h1 className="page-header">
          Your item(s) are being minted
        </h1>
        <h2 className="page-subheader">
          This may take several minutes
        </h2>
      </div>
      <Loader />
    </div>
  );
});

export default MintingStatus;
