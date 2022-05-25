import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import React, {useEffect, useState} from "react";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {rootStore} from "Stores";

import SignaturePopup from "Components/interface/SignaturePopup";
import ConsentPopup from "Components/interface/ConsentPopup";
import {PageLoader} from "Components/common/Loaders";

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
    if(!rootStore.client) { return; }

    if(!parameters.auth) {
      setLoading(true);
      return;
    }

    if(rootStore.loggedIn || rootStore.authenticating) {
      return;
    }

    rootStore.Authenticate({...parameters.auth, saveAuthInfo: false})
      .then(() => setLoading(false));
  }, [rootStore.client]);

  const Respond = ({response, error}) => {
    window.opener.postMessage({
      type: "FlowResponse",
      flowId: parameters.flowId,
      response,
      error
    });

    setTimeout(window.close(), 2000);
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
  }
});

export default Actions;
