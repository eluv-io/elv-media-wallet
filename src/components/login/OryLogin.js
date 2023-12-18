import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Loader} from "Components/common/Loaders";

import {ButtonWithLoader} from "Components/common/UIComponents";
import {ValidEmail} from "../../utils/Utils";

const OryLogin = observer(({userData}) => {
  const [flowType, setFlowType] = useState("login");
  const [flows, setFlows] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const formRef = useRef();

  useEffect(() => {
    if(!rootStore.oryClient) { return; }

    setErrorMessage(undefined);

    const existingFlow = flows[flowType];

    if(existingFlow) { return; }

    switch(flowType) {
      case "login":
        rootStore.oryClient.createBrowserLoginFlow({refresh: true})
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "registration":
        rootStore.oryClient.createBrowserRegistrationFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "recovery":
        rootStore.oryClient.createBrowserRecoveryFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "verification":
        rootStore.oryClient.createBrowserVerificationFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
    }
  }, [rootStore.oryClient, flowType, flows]);

  const LogOut = async () => {
    try {
      setLoading(true);
      const response = await rootStore.oryClient.createBrowserLogoutFlow();
      await rootStore.oryClient.updateLogoutFlow({token: response.data.logout_token});
      setFlows({});
      setFlowType("login");
    } catch(error) {
      rootStore.Log(error);
    } finally {
      setLoading(false);
    }
  };

  const flow = flows[flowType];

  if(!flow || loading) {
    return (
      <div className="ory-login">
        <Loader />
      </div>
    );
  }

  let title;
  let additionalContent = [];
  if(flowType === "login") {
    if(flow.refresh) {
      title = rootStore.l10n.login.ory.refresh;
    } else if(flow.requested_aal === "aal2") {
      title = rootStore.l10n.login.ory.aal2;
    } else {
      title = rootStore.l10n.login.sign_in;
    }

    if(!flow.refresh && flow.requested_aal !== "aal2") {
      additionalContent.push(
        <button key="registration-link" onClick={() => setFlowType("registration")} className="action login-page__login-button">
          {rootStore.l10n.login.ory.actions.registration}
        </button>
      );

      additionalContent.push(
        <button key="recovery-link" onClick={() => setFlowType("recovery")} className="ory-login__secondary-button">
          { rootStore.l10n.login.ory.actions.recovery }
        </button>
      );
    } else {
      additionalContent.push(
        <button key="sign-out-link" onClick={LogOut} className="ory-login__secondary-button">
          {rootStore.l10n.login.sign_out}
        </button>
      );
    }
  } else if(flowType === "registration") {
    title = rootStore.l10n.login.ory.registration;

    additionalContent.push(
      <button key="back-link" onClick={() => setFlowType("login")} className="ory-login__secondary-button">
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    );
  } else if(["recovery", "recovery_code"].includes(flowType)) {
    title = rootStore.l10n.login.ory.recovery;

    additionalContent.push(
      <button key="back-link" onClick={() => setFlowType("login")} className="ory-login__secondary-button">
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    );
  } else if(flowType === "verification") {
    title = rootStore.l10n.login.ory.verification;
  }

  const OrySubmit = async event => {
    event.preventDefault();

    try {
      const formData = new FormData(formRef.current);
      const body = Object.fromEntries(formData);
      let response;

      const email = body.email || body.identifier || body["traits.email"];

      if(email && !ValidEmail(email)) {
        setErrorMessage(rootStore.l10n.login.ory.errors.invalid_email);
        return;
      }

      switch(flowType) {
        case "login":
          await rootStore.oryClient.updateLoginFlow({flow: flow.id, updateLoginFlowBody: body});
          await rootStore.AuthenticateOry({userData});
          break;
        case "registration":
          await rootStore.oryClient.updateRegistrationFlow({flow: flow.id, updateRegistrationFlowBody: body});
          await rootStore.AuthenticateOry({userData});
          break;
        case "recovery":
          // Todo: redirect to settings page or something? https://github.com/ory/kratos/discussions/2959
          response = await rootStore.oryClient.updateRecoveryFlow({flow: flow.id, updateRecoveryFlowBody: body});
          setFlows({...flows, [flowType]: response.data});
          break;
        case "verification":
          // Todo: redirect to settings page or something? https://github.com/ory/kratos/discussions/2959
          response = await rootStore.oryClient.updateVerificationFlow({flow: flow.id, updateVerificationFlowBody: body});
          setFlows({...flows, [flowType]: response.data});
          break;
      }
    } catch(error) {
      const fieldErrors = error.response.data?.ui?.nodes
        ?.map(node =>
          node.messages
            ?.filter(message => message.type === "error")
            ?.map(message => message.text)
            ?.join("\n")
        )
        ?.filter(message => message)
        ?.join("\n");

      if(fieldErrors) {
        setErrorMessage(fieldErrors + "\n" + fieldErrors);
        return;
      }

      if(error.response.status === 400) {
        switch(flowType) {
          case "login":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_credentials);
            break;
          case "registration":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_credentials);
            break;
          case "recovery":
          case "verification":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_verification_code);
            break;
        }
      }
    }
  };

  return (
    <div className="ory-login">
      { title ? <h2 className="ory-login__title">{title}</h2> : null }
      {
        (flow.ui.messages || []).map(message =>
          <div key={`message-${message.id}`} className="ory-login__message">{ message.text }</div>
        )
      }
      <form
        key={`form-${flowType}`}
        ref={formRef}
        className="ory-login__form"
      >
        {
          flow.ui.nodes.map(node => {
            let attributes = {
              ...node.attributes
            };
            const nodeType = attributes.type === "submit" ? "submit" : attributes.node_type;
            delete attributes.node_type;

            let label = attributes.title || node.meta?.label?.text || attributes.label || node.attributes.name;
            if(["identifier", "traits.email"].includes(attributes.name) && attributes.type !== "hidden") {
              label = "Email";
              attributes.type = "email";
              delete attributes.value;
            }

            if(attributes.autocomplete) {
              attributes.autoComplete = attributes.autocomplete;
              delete attributes.autocomplete;
            }

            attributes.placeholder = label;

            if(nodeType === "submit" && attributes.value) {
              // recovery code resend button
              if(
                node.meta.label?.id === 1070007 ||
                node.meta.label?.id === 1070008
              ) {
                attributes.formNoValidate = true;

                return [
                  <input key={`input-${attributes.name}`} {...attributes} type="hidden" />,
                  <ButtonWithLoader onClick={OrySubmit} key={`button-${attributes.name}`} formNoValidate type="submit" className="action login-page__login-button">
                    { node.meta.label.text }
                  </ButtonWithLoader>
                ];
              }

              return [
                <input key={`input-${attributes.name}`} {...attributes} type="hidden" />,
                <ButtonWithLoader onClick={OrySubmit} key={`button-${attributes.name}`} type="submit" className="action action-primary login-page__login-button">
                  { node.meta.label.text }
                </ButtonWithLoader>
              ];
            }

            switch(nodeType) {
              case "button":
              case "submit":
                return (
                  <button key={`button-${attributes.name}`} {...attributes}>
                    { node.meta.label.text }
                  </button>
                );
              default:
                return (
                  <input key={`inputs-${attributes.name}`} {...attributes} />
                );
            }
          })
        }
        { additionalContent }

        { errorMessage ? <div className="ory-login__error-message">{ errorMessage }</div> : null }
      </form>
    </div>
  );
});

export default OryLogin;
