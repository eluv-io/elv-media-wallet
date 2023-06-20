import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import React, {useEffect, useState} from "react";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {rootStore} from "Stores";
import {PageLoader} from "Components/common/Loaders";

import SignaturePopup from "Components/interface/SignaturePopup";
import ConsentPopup from "Components/interface/ConsentPopup";
import PurchaseAction from "Components/interface/PurchaseAction";

// Actions are popups that present UI (signing, accepting permissions, etc.)
const Actions = observer(() => {
  const match = useRouteMatch();

  const [loading, setLoading] = useState(true);

  let parameters = {};
  if(match.params.parameters) {
    parameters = JSON.parse(new TextDecoder().decode(Utils.FromB58(match.params.parameters)));
  }

  // Authenticate with auth parameter, if necessary
  useEffect(() => {
    rootStore.ToggleDarkMode(true);

    if(!rootStore.client) { return; }

    if(rootStore.loggedIn) {
      setLoading(false);
      return;
    } else if(parameters.auth) {
      rootStore.Authenticate({clientAuthToken: parameters.auth, saveAuthInfo: false})
        .then(() => setLoading(false));
    } else if(parameters.logIn) {
      rootStore.Authenticate({...rootStore.AuthInfo(), saveAuthInfo: false})
        .then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [rootStore.client]);

  const Respond = ({response, error}) => {
    window.opener.postMessage({
      type: "FlowResponse",
      flowId: parameters.flowId,
      response,
      error
    }, rootStore.authOrigin || window.location.origin);

    setTimeout(() => window.close(), 5000);
  };

  if(loading) {
    return <PageLoader />;
  }

  // When finished handling authentication, present UI
  switch(match.params.action) {
    case "sign":
      return <SignaturePopup parameters={parameters} Respond={Respond} />;

    case "consent":
      return <ConsentPopup parameters={parameters} Respond={Respond} />;

    case "purchase":
      return <PurchaseAction parameters={parameters} />;
  }
});

export default Actions;
