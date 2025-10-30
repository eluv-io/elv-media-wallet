import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Loader} from "Components/common/Loaders";

import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
import {ValidEmail} from "../../utils/Utils";
import {Redirect} from "react-router-dom";
import {PasswordInput} from "@mantine/core";
import ImageIcon from "Components/common/ImageIcon";

import GoogleLogo from "Assets/icons/google-logo";
import AppleLogo from "Assets/icons/apple-logo";
import MetamaskIcon from "Assets/icons/metamask fox";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));

// Settings form has other stuff in it, build password form manually
const PasswordResetForm = ({OrySubmit, nodes}) => {
  const csrfToken = nodes.find(node => node.attributes.name === "csrf_token").attributes.value;

  return (
    <>
      <input name="csrf_token" type="hidden" required value={csrfToken} />
      <PasswordInput
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Password"
        classNames={{
          root: "login-page__input-container",
          wrapper: "login-page__input-wrapper",
          input: "login-page__input",
          visibilityToggle: "login-page__input-visibility-toggle"
        }}
      />
      <PasswordInput
        name="password_confirmation"
        type="password"
        required
        placeholder="Password Confirmation"
        classNames={{
          root: "login-page__input-container",
          wrapper: "login-page__input-wrapper",
          input: "login-page__input",
          visibilityToggle: "login-page__input-visibility-toggle"
        }}
      />
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

const ForgotPasswordForm = ({OrySubmit, Cancel}) => {
  return (
    <>
      <input
        name="email"
        type="email" required=""
        placeholder="Email"
        autoFocus
      />
      <ButtonWithLoader
        onClick={OrySubmit}
        type="submit"
        action={false}
        className="login-page__button login-page__button--primary"
      >
        Submit
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
};

let submitting = false;
const SubmitRecoveryCode = async ({flows, setFlows, setFlowType, setErrorMessage}) => {
  if(submitting) {
    return;
  }

  submitting = true;

  const RecoveryFailed = async () => {
    if(searchParams.get("code")) {
      setFlowType("login");

      setTimeout(() => setErrorMessage(rootStore.l10n.login.ory.errors.invalid_recovery_email), 250);
      return;
    }

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

        return true;
      } catch(error) {
        rootStore.Log(error, true);
        await RecoveryFailed();
        return false;
      }
    } else {
      // Flow initialized
      setFlowType("recovery");
      setFlows({...flows, recovery: createResponse.data});
      return true;
    }
  } catch(error) {
    // Flow initialization failed
    rootStore.Log(error, true);
    await RecoveryFailed();
    return false;
  } finally {
    submitting = false;
  }
};

const OryLogin = observer(({
  customizationOptions,
  userData,
  codeAuth,
  nonce,
  installId,
  origin,
  requiredOptionsMissing,
  isThirdPartyCallback,
  isThirdPartyConflict,
  loading,
  next
}) => {
  const [flowType, setFlowType] = useState(
    searchParams.has("flow") && !isThirdPartyConflict ? "initializeFlow" :
      isThirdPartyCallback ? "thirdPartyCallback" : "login"
  );
  const [flows, setFlows] = useState({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState(undefined);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [redirect, setRedirect] = useState(undefined);
  const formRef = useRef();

  useEffect(() => {
    if(!rootStore.oryClient) { return; }

    setErrorMessage(undefined);
    setStatusMessage(undefined);

    const existingFlow = flows[flowType];

    if(existingFlow) { return; }

    switch(flowType) {
      case "initializeFlow":
        // Recovery flow - try and submit code
        if(location.pathname.endsWith("/register") && !flows.recovery) {
          SubmitRecoveryCode({flows, setFlows, setFlowType, setErrorMessage})
            .then(success => {
              if(success) {
                setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.set_password), 100);
              } else {
                rootStore.SignOut({reload: false});
              }
            });
        }

        break;
      case "thirdPartyCallback":
        if(rootStore.authenticating) { return; }

        rootStore.AuthenticateOry({
          userData,
          origin,
          nonce,
          installId,
          sendWelcomeEmail: true
        })
          .catch(error => {
            rootStore.Log(error, true);

            if(error.login_limited) {
              setFlows({...flows, login_limited: {}});
              setFlowType("login_limited");
            }
          })
          .then(() => {
            if(rootStore.loggedIn && next) {
              setRedirect(next);
            }
          });

        break;
      case "login":
        const returnUrl = new URL(location.href);
        returnUrl.pathname = "/oidc";

        if(!location.pathname.endsWith("login")) {
          returnUrl.searchParams.set("next", location.pathname);
        }

        const propertySlugOrId = rootStore.routeParams.mediaPropertySlugOrId || rootStore.customDomainPropertyId && searchParams.get("pid");
        if(propertySlugOrId) {
          returnUrl.searchParams.set("pid", propertySlugOrId);
        }

        if(searchParams.has("flow")) {
          rootStore.oryClient.getLoginFlow({id: searchParams.get("flow")})
            .then(({data}) => setFlows({...flows, [flowType]: data}));
        } else {
          rootStore.oryClient.createBrowserLoginFlow({refresh: true, returnTo: returnUrl.toString()})
            .then(({data}) => setFlows({...flows, [flowType]: data}));
        }
        break;
      case "registration":
        rootStore.oryClient.createBrowserRegistrationFlow({returnTo: window.location.origin})
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "settings":
        rootStore.oryClient.createBrowserSettingsFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
    }
  }, [rootStore.oryClient, flowType]);

  if(
    !codeAuth &&
    (rootStore.loggedIn && ["/login"].includes(location.pathname))
  ) {
    return <Redirect to="/" />;
  }

  if(redirect) {
    return <Redirect to={redirect} />;
  }

  const LogOut = async () => {
    try {
      setLoggingOut(true);
      const response = await rootStore.oryClient.createBrowserLogoutFlow();
      await rootStore.oryClient.updateLogoutFlow({token: response.data.logout_token});
      setFlows({});
      setFlowType("reset");
      setTimeout(() => setFlowType("login"), 250);
    } catch(error) {
      rootStore.Log(error);
    } finally {
      setLoggingOut(false);
    }
  };

  const flow = flows[flowType];

  if(!flow || loading || loggingOut) {
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
      if(!isThirdPartyConflict && !customizationOptions?.disable_registration) {
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

      if(!isThirdPartyConflict) {
        additionalContent.push(
          <button
            key="recovery-link"
            onClick={() => {
              setFlows({...flows, recovery_email: {}});
              setFlowType("recovery_email");
              setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.recovery_prompt), 100);
            }}
            className="login-page__button login-page__button--link"
          >
            {rootStore.l10n.login.ory.actions.recovery}
          </button>
        );
      }

      if(isThirdPartyConflict) {
        additionalContent.push(
          <button
            key="recovery-link"
            onClick={() => {
              const returnUrl = new URL(window.location.origin);
              returnUrl.pathname = rootStore.GetSessionStorage("return_to");
              rootStore.RemoveSessionStorage("pid");
              rootStore.SignOut({returnUrl: returnUrl.toString()});
            }}
            className="login-page__button login-page__button--link"
          >
            {rootStore.l10n.login.ory.actions.sign_out}
          </button>
        );
      }
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
      if(additionalData.thirdParty) {
        rootStore.SetSessionStorage("pid", rootStore.routeParams.mediaPropertySlugOrId || rootStore.customDomainPropertyId || searchParams.get("pid"));
        rootStore.SetSessionStorage("return_to", window.location.pathname);

        if(searchParams.get("elvid")) {
          rootStore.SetSessionStorage("elvid", searchParams.get("elvid"));
        }

        try {
          await rootStore.oryClient.updateLoginFlow({
            flow: flow.id,
            updateLoginFlowBody: {
              provider: additionalData.provider,
              redirect_uri: window.location.href,
              return_to: window.location.href
            }
          });
          return;
        } catch(error) {
          if(error.status === 422) {
            // Save user data in session storage
            rootStore.SetSessionStorage("user-data", JSON.stringify(userData || {}));

            // Redirect
            window.location.href = error.response.data.redirect_browser_to;
          } else {
            throw error;
          }
        }

        return;
      }

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

      let next = false;
      let nextPath = searchParams.get("next") || (isThirdPartyConflict && rootStore.GetSessionStorage("return_to"));
      switch(flowType) {
        case "login":
          await rootStore.oryClient.updateLoginFlow({flow: flow.id, updateLoginFlowBody: body});
          await rootStore.AuthenticateOry({userData, nonce, installId, origin});
          next = true;

          break;
        case "login_limited":
          await rootStore.AuthenticateOry({userData, nonce, installId, origin, force: true});
          next = true;

          break;
        case "registration":
          await rootStore.oryClient.updateRegistrationFlow({flow: flow.id, updateRegistrationFlowBody: body});
          await rootStore.AuthenticateOry({userData, nonce, installId, origin, sendWelcomeEmail: true, sendVerificationEmail: true});
          next = true;

          break;

        case "recovery_email":
          const flowInfo = await rootStore.SendLoginEmail({type: "reset_password", email: body.email});
          response = await rootStore.oryClient.getRecoveryFlow({id: flowInfo.flow});
          setFlows({...flows, recovery: response.data});
          setFlowType("recovery");
          setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.recovery_code_prompt), 100);

          break;
        case "recovery":
          response = await rootStore.oryClient.updateRecoveryFlow({flow: flow.id, updateRecoveryFlowBody: body});
          setFlows({...flows, [flowType]: response.data});

          if(response.data.state === "passed_challenge") {
            setFlowType("settings");
          }

          break;
        case "settings":
          response = await rootStore.oryClient.updateSettingsFlow({flow: flow.id, updateSettingsFlowBody: body});

          if(response.data.state === "success") {
            setStatusMessage(rootStore.l10n.login.ory.messages.password_updated);
            await rootStore.AuthenticateOry({userData, nonce, installId, origin, sendVerificationEmail: location.pathname.endsWith("/register")});
          }

          setFlows({...flows, [flowType]: response.data});
          next = true;
          break;
      }

      if(next && nextPath) {
        setRedirect(nextPath);
      }
    } catch(error) {
      if(error.login_limited) {
        setFlows({...flows, login_limited: {}});
        setFlowType("login_limited");
        return;
      }

      rootStore.Log(error, true);

      const errors = error?.response?.data?.ui?.messages
        ?.map(message => message.text)
        ?.filter(message => message)
        ?.join("\n");

      if(errors) {
        setErrorMessage(errors);
        return;
      }

      const fieldErrors = error.response?.data?.ui?.nodes
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

      if(error?.response?.status === 400) {
        switch(flowType) {
          case "login":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_credentials);
            break;
          case "registration":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_credentials);
            break;
          case "recovery":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_verification_code);
            break;
        }
      }
    }
  };

  const messages = [
    ...(flow?.ui?.messages || [])
      .map(message => {
        switch(message.id) {
          case 1010016:
            const email = flow.ui.nodes.find(node => node.attributes.name === "identifier")?.attributes.value;
            message.text = LocalizeString(rootStore.l10n.login.ory.messages.third_party_conflict, {email});
            break;
        }

        return message;
      }),
    statusMessage
  ].filter(m => m);

  const showGoogleLogin = !isThirdPartyConflict && !customizationOptions.disable_third_party_login && !!flow?.ui?.nodes?.find(node => node.group === "oidc" && node.attributes?.value === "google");
  const showAppleLogin = !isThirdPartyConflict && !customizationOptions.disable_third_party_login && !!flow?.ui?.nodes?.find(node => node.group === "oidc" && node.attributes?.value === "apple");
  const showMetamaskLogin = !isThirdPartyConflict && customizationOptions.enable_metamask;

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
            <LoginLimitedForm Submit={OrySubmit} Cancel={LogOut} /> :
            flowType === "recovery_email" ?
              <ForgotPasswordForm OrySubmit={OrySubmit} Cancel={() => setFlowType("login")} /> :
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

                // 'Send sign in code' buttons?
                if([1040006, 1010015].includes(node?.meta?.label?.id)) {
                  return null;
                }

                if(node.group === "oidc") {
                  // Third party sign in button
                  return null;
                }

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
                    if(attributes.type === "password") {
                      return (
                        <PasswordInput
                          key={`input-${key}`}
                          {...attributes}
                          classNames={{
                            root: "login-page__input-container",
                            wrapper: "login-page__input-wrapper",
                            input: "login-page__input",
                            visibilityToggle: "login-page__input-visibility-toggle"
                          }}
                        />
                      );
                    }

                    return (
                      <input key={`inputs-${key}`} {...attributes} />
                    );
                }
              })
        }
        { additionalContent }
        {
          flowType !== "login" || !(showGoogleLogin || showAppleLogin) ? null :
            <div className="login-page__third-party-login-container">
              {
                !showGoogleLogin ? null :
                  <ButtonWithLoader
                    disabled={requiredOptionsMissing}
                    action={false}
                    onClick={async event => await OrySubmit(event, {thirdParty: true, provider: "google"})}
                    title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
                    className="login-page__third-party-login login-page__third-party-login--google"
                  >
                    <ImageIcon icon={GoogleLogo} className="login-page__third-party-login__logo" />
                    Sign In with Google
                  </ButtonWithLoader>
              }
                {
                !showAppleLogin ? null :
                  <ButtonWithLoader
                    disabled={requiredOptionsMissing}
                    action={false}
                    onClick={async event => await OrySubmit(event, {thirdParty: true, provider: "apple"})}
                    title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
                    className="login-page__third-party-login login-page__third-party-login--apple"
                  >
                    <ImageIcon icon={AppleLogo} className="login-page__third-party-login__logo" />
                    Sign In with Apple
                  </ButtonWithLoader>
              }
            </div>
        }
        {
          flowType !== "login" || !showMetamaskLogin ? null :
            <div className="login-page__third-party-login-container">
              <ButtonWithLoader
                className="login-page__third-party-login login-page__third-party-login--metamask"
                onClick={async event => {
                  try {
                    event.preventDefault();
                    await rootStore.Authenticate({externalWallet: "Metamask"});

                    if(searchParams.get("next")) {
                      setRedirect(searchParams.get("next"));
                    }
                  } catch(error) {
                    rootStore.Log(error, true);
                  }
                }}
                action={false}
                disabled={requiredOptionsMissing}
                title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
              >
                <ImageIcon icon={MetamaskIcon} className="login-page__third-party-login__logo" />
                { rootStore.l10n.login.connect_metamask }
              </ButtonWithLoader>
            </div>
        }
      </form>
      { errorMessage ? <div className="ory-login__error-message">{ errorMessage }</div> : null }
    </div>
  );
});

export default OryLogin;
