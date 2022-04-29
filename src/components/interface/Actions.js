import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import React, {useEffect} from "react";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {rootStore} from "Stores";

import SignaturePopup from "Components/interface/SignaturePopup";
import ConsentPopup from "Components/interface/ConsentPopup";

// Actions are popups that present UI
const Actions = observer(() => {
  const match = useRouteMatch();

  let parameters = {};
  if(match.params.parameters) {
    parameters = JSON.parse(new TextDecoder().decode(Utils.FromB58(match.params.parameters)));
  }

  useEffect(() => {
    if(parameters.auth && !this.AuthInfo()) {
      // TODO: Test
      rootStore.Authenticate({...parameters.auth});
    }
  }, []);


  const Respond = ({response, error}) => {
    window.opener.postMessage({
      type: "FlowResponse",
      flowId: parameters.flowId,
      response,
      error
    });
  };

  switch(match.params.action) {
    case "sign":
      return <SignaturePopup parameters={parameters} Respond={Respond} />;

    case "consent":
      return <ConsentPopup parameters={parameters} Respond={Respond} />;
  }
});

export default Actions;
