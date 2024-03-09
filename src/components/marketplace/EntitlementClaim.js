import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import {PageLoader} from "Components/common/Loaders";
import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
import ListingIcon from "Assets/icons/listings icon";

import BackIcon from "Assets/icons/arrow-left";
import Confirm from "Components/common/Confirm";
import NFTCard from "Components/nft/NFTCard";
import {LoginGate} from "Components/common/LoginGate";

const EntitlementClaim = observer(() => {
  const match = useRouteMatch();
  const signature = match.params.signature;
  const [redeemed, setRedeemed] = useState(undefined);
  const [purchaseId, setPurchaseId] = useState(undefined);
  rootStore.Log("EntitlementClaim " + match.params.marketplaceId + " " + match.params.sku);

  useEffect(() => {
    if(!rootStore.loggedIn) { return; }

    rootStore.EntitlementClaim({ entitlementSignature: signature, userInfo: "userInfo"})
      .then((resp) => {
        setRedeemed(true);
        rootStore.log("EntitlementClaim resp", resp);
        setPurchaseId(resp);
      })
      .catch(error => {
        rootStore.Log("EntitlementClaim error: " + error);
        rootStore.Log(error, true);
        setRedeemed(false);
      });
  }, [rootStore.loggedIn]);

  rootStore.log("EntitlementClaim", "redeemed", redeemed, "purchaseId", purchaseId);
  if(redeemed && purchaseId) {
    const newPath = location.pathname.replace(signature, "")
      .replace("claim", "entitle");
    return <Redirect to={UrlJoin(newPath, "status", purchaseId)}  />;
  }

  return (
    <LoginGate loader={<PageLoader />}>
      <PageLoader/>
    </LoginGate>
  );
});

export default EntitlementClaim;
