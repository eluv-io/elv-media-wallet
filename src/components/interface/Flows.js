import {observer} from "mobx-react";
import {useHistory, useRouteMatch} from "react-router-dom";
import React, {useEffect, useState} from "react";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {rootStore} from "Stores";
import {LoginGate} from "Components/common/LoginGate";
import {PageLoader} from "Components/common/Loaders";

// Flows are popups that do not require UI input (redirecting to purchase, etc)
const Flows = observer(() => {
  const match = useRouteMatch();
  const history = useHistory();

  const [handled, setHandled] = useState(false);

  let parameters = {};
  if(match.params.parameters) {
    parameters = JSON.parse(new TextDecoder().decode(Utils.FromB58(match.params.parameters)));
  }

  useEffect(() => {
    if(parameters.auth && !rootStore.AuthInfo()) {
      rootStore.Authenticate({...parameters.auth, saveAuthInfo: false});
    }
  }, []);

  useEffect(() => {
    if(!rootStore.client || (parameters.requireAuth && !rootStore.loggedIn) || handled) { return; }

    rootStore.HandleFlow({
      history,
      flow: match.params.flow,
      parameters: match.params.parameters,
    });

    setHandled(true);
  }, [rootStore.client, rootStore.loggedIn]);

  if(parameters.requireAuth) {
    return (
      <LoginGate loader={<PageLoader />}>
        <PageLoader/>
      </LoginGate>
    );
  } else {
    return (
      <PageLoader/>
    );
  }
});

export default Flows;
