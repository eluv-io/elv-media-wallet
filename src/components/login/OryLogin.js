import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Loader} from "Components/common/Loaders";

import {ButtonWithLoader} from "Components/common/UIComponents";
import {ValidEmail} from "../../utils/Utils";
import {Redirect} from "react-router-dom";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));

// Settings form has other stuff in it, build password form manually
const PasswordResetForm = ({OrySubmit, nodes}) => {
  const csrfToken = nodes.find(node => node.attributes.name === "csrf_token").attributes.value;

  return (
    <>
      <input name="csrf_token" type="hidden" required value={csrfToken} />
      <input name="password" type="password" required autoComplete="new-password" placeholder="Password" />
      <input name="password_confirmation" type="password" required  placeholder="Password Confirmation" />
      <input name="method" type="hidden" placeholder="Save" value="password" />
      <ButtonWithLoader onClick={OrySubmit} type="submit" action={false} className="login-page__button login-page__button--primary">
        { rootStore.l10n.login.ory.actions.update_password }
      </ButtonWithLoader>
    </>
  );
};

const LoginLimitedForm = observer(({Submit, Cancel}) => {
  return (
    <>
      <div className="ory-login__message">
        { rootStore.l10n.login.ory.messages.login_limited }
      </div>
      <ButtonWithLoader onClick={Submit} type="submit" action={false} className="login-page__button login-page__button--primary">
        { rootStore.l10n.login.ory.actions.proceed }
      </ButtonWithLoader>
      <button
        key="back-link"
        onClick={Cancel}
        className="login-page__button login-page__button--link"
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    </>
  );
});

const SubmitVerificationCode = async ({flows, setFlows, setFlowType, setErrorMessage}) => {
  if(submitting) { return; }

  submitting = true;

  try {
    const createResponse = await rootStore.oryClient.getVerificationFlow({id: searchParams.get("flow")});

    if(searchParams.has("code")) {
      try {
        const updateResponse = await rootStore.oryClient.updateVerificationFlow({
          flow: searchParams.get("flow"),
          updateVerificationFlowBody: {
            code: searchParams.get("code"),
            method: "code"
          }
        });

        // Code redemption succeeded
        setFlowType("verification");
        setFlows({...flows, verification: updateResponse.data});
        return true;
      } catch(error) {
        // Code redemption failed
        rootStore.Log(error, true);
        setFlows({...flows, verification: createResponse.data});
        setFlowType("verification");
        setTimeout(() => setErrorMessage(rootStore.l10n.login.ory.errors.invalid_verification_code), 250);
      }
    } else {
      // Flow initialized
      setFlowType("verification");
      setFlows({...flows, verification: createResponse.data});
    }
  } catch(error) {
    // Flow initialization failed
    rootStore.Log(error, true);
    setFlowType("login");
  } finally {
    submitting = false;
  }
};

const SubmitRecoveryCode = async ({flows, setFlows, setFlowType, setErrorMessage}) => {
  if(submitting) { return; }

  submitting = true;

  const RecoveryFailed = async () => {
    // Code redemption failed
    const newFlow = await rootStore.oryClient.createBrowserRecoveryFlow();

    setFlows({
      ...flows,
      recovery: newFlow.data
    });
    setFlowType("recovery");

    setTimeout(() => setErrorMessage(rootStore.l10n.login.ory.errors.invalid_recovery_email), 250);
  };

  try {
    const createResponse = await rootStore.oryClient.getRecoveryFlow({id: searchParams.get("flow")});

    if(searchParams.has("code")) {
      try {
        const updateResponse = await rootStore.oryClient.updateRecoveryFlow({
          flow: searchParams.get("flow"),
          updateRecoveryFlowBody: {
            code: searchParams.get("code"),
            method: "code"
          }
        });

        // Code redemption succeeded
        setFlowType(updateResponse.data.state === "passed_challenge" ? "settings" : "recovery");
        setFlows({...flows, recovery: updateResponse.data});
      } catch(error) {
        rootStore.Log(error, true);
        await RecoveryFailed();
      }
    } else {
      // Flow initialized
      setFlowType("recovery");
      setFlows({...flows, recovery: createResponse.data});
    }
  } catch(error) {
    // Flow initialization failed
    rootStore.Log(error, true);
    await RecoveryFailed();
  } finally {
    submitting = false;
  }
};

let submitting = false;
const OryLogin = observer(({customizationOptions, userData, requiredOptionsMissing}) => {
  const [flowType, setFlowType] = useState(searchParams.has("flow") ? "initializeFlow" : "login");
  const [flows, setFlows] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(undefined);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [verificationSucceeded, setVerificationSucceeded] = useState(false);
  const formRef = useRef();

  const verificationRequired = location.pathname.endsWith("/verification") && searchParams.has("flow");

  useEffect(() => {
    if(!rootStore.oryClient) { return; }

    setErrorMessage(undefined);
    setStatusMessage(undefined);

    const existingFlow = flows[flowType];

    if(existingFlow) { return; }

    switch(flowType) {
      case "initializeFlow":
        // Recovery flow - try and submit code
        if(location.pathname.endsWith("/login") && !flows.recovery) {
          SubmitRecoveryCode({flows, setFlows, setFlowType, setErrorMessage});
          break;
        } else if(verificationRequired) {
          if(!rootStore.loggedIn) {
            setFlowType("login");
          } else {
            SubmitVerificationCode({flows, setFlows, setFlowType, setErrorMessage})
              .then(result => setVerificationSucceeded(!!result));
          }
          break;
        } else {
          setFlowType("login");
        }

        break;
      case "login":
        rootStore.oryClient.createBrowserLoginFlow({refresh: true})
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "registration":
        rootStore.oryClient.createBrowserRegistrationFlow({returnTo: window.location.origin})
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "recovery":
        rootStore.oryClient.createBrowserRecoveryFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "settings":
        rootStore.oryClient.createBrowserSettingsFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
    }
  }, [rootStore.oryClient, flowType]);

  if(
    (rootStore.loggedIn && ["/login"].includes(location.pathname)) ||
    (verificationRequired && verificationSucceeded)
  ) {
    return <Redirect to="/" />;
  }

  const LogOut = async () => {
    try {
      setLoading(true);
      const response = await rootStore.oryClient.createBrowserLogoutFlow();
      await rootStore.oryClient.updateLogoutFlow({token: response.data.logout_token});
      setFlows({});
      setFlowType("reset");
      setTimeout(() => setFlowType("login"), 250);
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
      // TODO: Remove
      if(!customizationOptions.disable_registration) {
        additionalContent.push(
          <button
            key="registration-link"
            onClick={() => setFlowType("registration")}
            className="login-page__button login-page__button--secondary"
          >
            {rootStore.l10n.login.ory.actions.registration}
          </button>
        );
      }

      additionalContent.push(
        <button
          key="recovery-link"
          onClick={() => {
            setFlowType("recovery");
            setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.recovery_prompt), 250);
          }}
          className="login-page__button login-page__button--link"
        >
          { rootStore.l10n.login.ory.actions.recovery }
        </button>
      );
    } else {
      additionalContent.push(
        <button key="sign-out-link" onClick={LogOut} className="login-page__button login-page__button--link">
          {rootStore.l10n.login.sign_out}
        </button>
      );
    }
  } else if(flowType === "registration") {
    title = rootStore.l10n.login.ory.registration;

    additionalContent.push(
      <button
        key="back-link"
        onClick={() => {
          setFlowType("login");
        }}
        className="login-page__button login-page__button--link"
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    );
  } else if(["recovery", "recovery_code"].includes(flowType)) {
    title = rootStore.l10n.login.ory.recovery;

    additionalContent.push(
      <button
        key="back-link"
        onClick={() => {
          setFlowType("login");
          setFlows({
            ...flows,
            recovery: undefined
          });
        }}
        className="login-page__button login-page__button--link"
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    );
  } else if(flowType === "verification") {
    title = rootStore.l10n.login.ory.verification;
  } else if(flowType === "settings") {
    title = rootStore.l10n.login.ory.update_password;
  }

  const OrySubmit = async (event, additionalData={}) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    if(requiredOptionsMissing) {
      setErrorMessage(rootStore.l10n.login.errors.missing_required_options);
      return;
    }

    try {
      const formData = new FormData(formRef.current);
      const body = { ...Object.fromEntries(formData), ...additionalData };

      let response;

      const email = body.email || body.identifier || body["traits.email"];

      if(email && !ValidEmail(email)) {
        setErrorMessage(rootStore.l10n.login.ory.errors.invalid_email);
        return;
      }

      if("password_confirmation" in body && body.password !== body.password_confirmation) {
        setErrorMessage(rootStore.l10n.login.ory.errors.invalid_password_confirmation);
        return;
      }

      switch(flowType) {
        case "login":
          await rootStore.oryClient.updateLoginFlow({flow: flow.id, updateLoginFlowBody: body});
          await rootStore.AuthenticateOry({userData});

          if(verificationRequired) {
            setFlowType("initializeFlow");
          }

          break;
        case "login_limited":
          await rootStore.AuthenticateOry({userData, force: true});

          if(verificationRequired) {
            setFlowType("initializeFlow");
          }

          break;
        case "registration":
          await rootStore.oryClient.updateRegistrationFlow({flow: flow.id, updateRegistrationFlowBody: body});
          await rootStore.AuthenticateOry({userData});
          break;
        case "recovery":
          response = await rootStore.oryClient.updateRecoveryFlow({flow: flow.id, updateRecoveryFlowBody: body});
          setFlows({...flows, [flowType]: response.data});

          if(response.data.state === "passed_challenge") {
            setFlowType("settings");
          }

          break;
        case "verification":
          response = await rootStore.oryClient.updateVerificationFlow({flow: flow.id, updateVerificationFlowBody: body});
          setFlows({...flows, [flowType]: response.data});
          setVerificationSucceeded(response.data.state === "passed_challenge");
          break;
        case "settings":
          response = await rootStore.oryClient.updateSettingsFlow({flow: flow.id, updateSettingsFlowBody: body});

          if(response.data.state === "success") {
            setStatusMessage(rootStore.l10n.login.ory.messages.password_updated);
            await rootStore.AuthenticateOry({userData});
          }

          setFlows({...flows, [flowType]: response.data});
          break;
      }
    } catch(error) {
      if(error.login_limited) {
        setFlows({...flows, login_limited: {}});
        setFlowType("login_limited");
        return;
      }

      rootStore.Log(error, true);

      const errors = error?.response.data?.ui?.messages
        ?.map(message => message.text)
        ?.filter(message => message)
        ?.join("\n");

      if(errors) {
        setErrorMessage(errors);
        return;
      }

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
        setErrorMessage(fieldErrors);
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

  const messages = [
    ...(flow?.ui?.messages || []),
    statusMessage
  ].filter(m => m);

  return (
    <div className="ory-login">
      {
        messages.map(message =>
          <div key={`message-${message.id || message}`} className="ory-login__message">{ message.text || message }</div>
        )
      }
      <form
        title={title}
        key={`form-${flowType}-${flow.state}`}
        ref={formRef}
        className="ory-login__form"
      >
        {
          flowType === "login_limited" ?
            <LoginLimitedForm
              Submit={OrySubmit}
              Cancel={LogOut}
            /> :
            flowType === "settings" ?
              <PasswordResetForm nodes={flow.ui.nodes} OrySubmit={OrySubmit} /> :
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
                const key = node?.meta?.label?.id || attributes.name;

                if(nodeType === "submit" && attributes.value) {
                  // recovery code resend button
                  if(
                    node.meta.label?.id === 1070007 ||
                    node.meta.label?.id === 1070008
                  ) {
                    attributes.formNoValidate = true;

                    return [
                      <ButtonWithLoader
                        onClick={async event => await OrySubmit(event, {email: attributes.value})}
                        key={`button-${key}`}
                        formNoValidate
                        type="submit"
                        action={false}
                        className="login-page__button login-page__button--link"
                      >
                        { node.meta.label.text }
                      </ButtonWithLoader>
                    ];
                  }

                  if(node.meta?.label?.id === 1010022) {
                    node.meta.label.text = rootStore.l10n.login.sign_in;
                  }

                  return [
                    <input key={`input-${key}`} {...attributes} type="hidden" />,
                    <ButtonWithLoader
                      onClick={OrySubmit}
                      key={`button-${attributes.name}`}
                      type="submit"
                      action={false}
                      className="login-page__button login-page__button--primary"
                    >
                      { node.meta.label.text }
                    </ButtonWithLoader>
                  ];
                }

                switch(nodeType) {
                  case "button":
                  case "submit":
                    return (
                      <button key={`button-${key}`} {...attributes}>
                        { node.meta.label.text }
                      </button>
                    );
                  default:
                    return (
                      <input key={`inputs-${key}`} {...attributes} />
                    );
                }
              })
        }
        { additionalContent }
      </form>
      { errorMessage ? <div className="ory-login__error-message">{ errorMessage }</div> : null }
    </div>
  );
});

export default OryLogin;
