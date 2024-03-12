import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import { Redirect, useRouteMatch} from "react-router-dom";
import { rootStore } from "Stores";
import UrlJoin from "url-join";

import {PageLoader} from "Components/common/Loaders";
import {LoginGate} from "Components/common/LoginGate";

const EntitlementClaim = observer(() => {
  const match = useRouteMatch();
  const signature = match.params.signature;
  const [redeemed, setRedeemed] = useState(undefined);
  const [purchaseId, setPurchaseId] = useState(undefined);
  rootStore.Log("EntitlementClaim " + match.params.marketplaceId + " " + match.params.sku);

  useEffect(() => {
    if(!rootStore.loggedIn) { return; }

    rootStore.checkoutStore.EntitlementClaim({ entitlementSignature: signature, userInfo: "userInfo"})
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
