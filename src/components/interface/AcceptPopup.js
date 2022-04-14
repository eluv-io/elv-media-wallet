import React, {useState, useEffect} from "react";
import {Loader} from "Components/common/Loaders";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import ImageIcon from "Components/common/ImageIcon";

import EluvioLogo from "Assets/images/logo.svg";
import {ButtonWithLoader} from "Components/common/UIComponents";

const searchParams = new URLSearchParams(window.location.search);
const requestor = atob(searchParams.get("rq"));
const action = atob(searchParams.get("ac"));

const Respond = async (accept) => {
  window.opener.postMessage({
    type: "ElvMediaWalletAcceptResponse",
    accept,
    requestId: searchParams.get("request")
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  window.close();
};

const AcceptPopup = observer(() => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rootStore.ToggleDarkMode(true);
    rootStore.ToggleNavigation(false);
    setLoading(!rootStore.loggedIn);
  }, [rootStore.loggedIn]);

  return (
    <div className="page-container accept-popup">
      <div className="accept-popup__box">
        <ImageIcon icon={EluvioLogo} className="accept-popup__logo" />
        <div className="accept-popup__text">
          <h1 className="accept-popup__requestor">{ requestor } is requesting the following action:</h1>
          <h2 className="accept-popup__requested-action">{ action }</h2>
        </div>
        <Loader />
        {
          loading ? null :
            <div className="accept-popup__actions">
              <ButtonWithLoader className="action" onClick={async () => await Respond(false)}>
                Reject
              </ButtonWithLoader>
              <ButtonWithLoader className="action action-primary" onClick={async () => await Respond(true)}>
                Accept
              </ButtonWithLoader>
            </div>
        }
      </div>
    </div>
  );
});


export default AcceptPopup;
