import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import { Redirect, useRouteMatch} from "react-router-dom";
import { rootStore } from "Stores";
import UrlJoin from "url-join";
import {LoginGate} from "Components/common/LoginGate";
import {PageLoader} from "Components/common/Loaders";

const EntitlementClaim = observer(() => {
  const match = useRouteMatch();
  const signature = match.params.signature;
  const [redeemed, setRedeemed] = useState(undefined);
  const [purchaseId, setPurchaseId] = useState(undefined);

  useEffect(() => {
    if(!rootStore.loggedIn) { return; }

    rootStore.checkoutStore.EntitlementClaim({ entitlementSignature: signature })
      .then((resp) => {
        setRedeemed(true);
        setPurchaseId(resp);
      })
      .catch(error => {
        rootStore.Log(`EntitlementClaim error ${error}`, true);
        setRedeemed(false);
      });
  }, [rootStore.loggedIn]);

  if(redeemed && purchaseId) {
    const newPath = location.pathname.replace(signature, "").replace("claim", "entitle");
    return <Redirect to={UrlJoin(newPath, "status", purchaseId)}  />;
  }

  return (
    <LoginGate loader={<PageLoader />}>
      <PageLoader/>
    </LoginGate>
  );
});

export default EntitlementClaim;
