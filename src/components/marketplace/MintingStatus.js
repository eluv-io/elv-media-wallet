import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {Loader} from "Components/common/Loaders";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";

let statusInterval;
const MintingStatus = observer(({Status, redirect}) => {
  const [finished, setFinished] = useState(false);

  const CheckStatus = async () => {
    const status = await Status();

    if(status === "complete") {
      setFinished(true);
      clearInterval(statusInterval);
    }
  };

  useEffect(() => {
    CheckStatus();

    statusInterval = setInterval(CheckStatus, 10000);
  }, []);

  if(finished) {
    return <Redirect to={redirect} />;
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

export const DropMintingStatus = observer(() => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const drop = marketplace.drops.find(drop => drop.uuid === match.params.dropId);

  const Status = async () => (await rootStore.DropStatus({
    eventId: drop.eventId,
    dropId: drop.uuid
  })).status;

  return <MintingStatus Status={Status} redirect={UrlJoin("/marketplaces", match.params.marketplaceId, "store")} />;
});

export const PurchaseMintingStatus = observer(() => {
  const match = useRouteMatch();

  const Status = async () => (await rootStore.PurchaseStatus({
    confirmationId: match.params.confirmationId
  })).status;

  return <MintingStatus Status={Status} redirect={UrlJoin("/marketplaces", match.params.marketplaceId, "store")} />;
});
