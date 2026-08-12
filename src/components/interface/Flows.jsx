import {observer} from "mobx-react";
import {useHistory, useRouteMatch} from "react-router-dom";
import React, {useEffect, useState} from "react";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {rootStore} from "Stores";
import {LoginGate} from "Components/common/LoginGate";
import {PageLoader} from "Components/common/Loaders";
import {SearchParams} from "../../utils/Utils";


// Flows are popups that do not require UI input (redirecting to purchase, etc)
const Flows = observer(() => {
  const match = useRouteMatch();
  const history = useHistory();

  const [loading, setLoading] = useState(true);

  let parameters = {};
  if(match.params.parameters) {
    parameters = match.params.parameters.split(/[^A-Za-z0-9]/)[0];
    parameters = JSON.parse(new TextDecoder().decode(Utils.FromB58(parameters)));
  }

  // Authenticate with auth parameter, if necessary
  useEffect(() => {
    if(!rootStore.client || rootStore.authenticating) {
      return;
    }

    if(!parameters.auth || rootStore.loggedIn) {
      setLoading(false);
      return;
    }

    rootStore.Authenticate({clientAuthToken: parameters.auth, saveAuthInfo: false})
      .then(() => setLoading(false));
  }, [rootStore.client, rootStore.loggedIn]);

  // When finished handling authentication, handle flow
  useEffect(() => {
    if(loading) { return; }

    rootStore.HandleFlow({
      history,
      flow: match.params.flow,
      parameters: match.params.parameters.split(/[^A-Za-z0-9]/)[0],
      urlParameters: SearchParams()
    });
  }, [loading]);

  if(loading) {
    return <PageLoader />;
  }

  return (
    <LoginGate loader={<PageLoader />}>
      <PageLoader/>
    </LoginGate>
  );
});

export default Flows;
