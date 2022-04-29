import React, {useState, useEffect} from "react";
import {Loader} from "Components/common/Loaders";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import ImageIcon from "Components/common/ImageIcon";

import EluvioLogo from "Assets/images/logo.svg";
import {ButtonWithLoader} from "Components/common/UIComponents";

const ConsentPopup = observer(({parameters, Respond}) => {
  const [trusted, setTrusted] = useState(
    parameters.origin in rootStore.trustedOrigins ?
      rootStore.trustedOrigins[parameters.origin] :
      true
  );

  useEffect(() => {
    rootStore.ToggleDarkMode(true);
  }, []);

  return (
    <div className="page-container accept-popup">
      <div className="accept-popup__box">
        <ImageIcon icon={EluvioLogo} className="accept-popup__logo" />
        <div className="accept-popup__text">
          <h1 className="accept-popup__requestor">{ parameters.requestor } is requesting the following action:</h1>
          <h2 className="accept-popup__requested-action">{ parameters.action }</h2>
        </div>
        <Loader />
        <div className="accept-popup__trust">
          <input
            type="checkbox"
            checked={trusted}
            name="trust"
            onChange={() => {
              setTrusted(!trusted);
              rootStore.SetTrustedOrigin(parameters.origin, !trusted);
            }}
          />
          <label htmlFor="trust" onClick={() => setTrusted(!trusted)} >
            Trust all requests from { parameters.origin }
          </label>
        </div>
        <div className="accept-popup__actions">
          <ButtonWithLoader
            className="action"
            onClick={async () => {
              await Respond({response: {accept: false}});

              await new Promise(resolve => setTimeout(resolve, 1000));
            }}
          >
            Reject
          </ButtonWithLoader>
          <ButtonWithLoader
            className="action action-primary"
            onClick={async () => {
              rootStore.SetTrustedOrigin(origin, trusted);

              await Respond({response: {accept: true, trust: trusted}});

              await new Promise(resolve => setTimeout(resolve, 1000));
            }}
          >
            Accept
          </ButtonWithLoader>
        </div>
      </div>
    </div>
  );
});

export default ConsentPopup;
