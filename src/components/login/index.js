import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {LocalizeString, RichText} from "Components/common/UIComponents";

import MetamaskIcon from "Assets/icons/metamask fox.png";
import EluvioLogo from "Assets/icons/ELUVIO logo (updated nov 2).svg";
import EluvioPoweredByLogo from "Assets/icons/EluvioLogo2.svg";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));
const params = {
  // If we've just come back from Auth0
  isAuth0Callback: searchParams.has("code"),

  // Origin URL of the opener
  origin: searchParams.get("origin"),
  // Who opened the page (parent)
  source: searchParams.get("source"),
  // What action should be performed (login)
  action: searchParams.get("action"),
  // Which login provider should be used (oauth, metamask)
  provider: searchParams.get("provider"),
  // What login mode should be used (create, login)
  mode: searchParams.get("mode"),
  // How should the page respond with login credentials (message, redirect)
  response: searchParams.get("response"),
  // Where should the page redirect to with login credentials
  redirect: searchParams.get("redirect"),
  // Should Auth0 credentials be cleared before login?
  clearLogin: searchParams.has("clear"),
  // Marketplace
  marketplace: searchParams.get("marketplace"),
  // User data to pass to custodial sign-in
  userData: searchParams.has("data") ? JSON.parse(Utils.FromB64(searchParams.get("data"))) : { share_email: true }
};

// COMPONENTS

// Top logo
const Logo = ({customizationOptions}) => {
  if(!customizationOptions) { return null; }

  if(customizationOptions.logo) {
    return (
      <div className="login-page__logo-container">
        <ImageIcon
          icon={customizationOptions?.logo?.url}
          alternateIcon={EluvioLogo}
          className="login-page__logo"
          title="Logo"
        />
      </div>
    );
  } else {
    return (
      <div className="login-page__logo-container">
        <ImageIcon icon={EluvioLogo} className="login-page__logo login-page__logo--default" title="Eluv.io" />
      </div>
    );
  }
};

// If custom logo is used, show "Powered by Eluvio" below login form
const PoweredBy = ({customizationOptions}) => {
  if(!customizationOptions?.logo) { return null; }

  return (
    <div className="login-page__tagline">
      <div className="login-page__tagline__text">{ rootStore.l10n.login.powered_by }</div>
      <ImageIcon icon={EluvioPoweredByLogo} className="login-page__tagline__image" title="Eluv.io" />
    </div>
  );
};

// Custom background
const Background = observer(({customizationOptions, Close}) => {
  if(customizationOptions?.background || customizationOptions?.background_mobile) {
    let backgroundUrl = customizationOptions?.background?.url;
    let mobileBackgroundUrl = customizationOptions?.background_mobile?.url;

    if(window.innerWidth > 800) {
      return <div className="login-page__background" style={{backgroundImage: `url("${backgroundUrl || mobileBackgroundUrl}")`}} onClick={Close}/>;
    } else {
      return <div className="login-page__background" style={{backgroundImage: `url("${mobileBackgroundUrl || backgroundUrl}")`}} onClick={Close}/>;
    }
  }

  return <div className="login-page__background login-page__background--default" onClick={Close}/>;
});

// Terms of use. May include custom terms, and may include opt out checkbox for sharing email
const Terms = ({customizationOptions, userData, setUserData}) => {
  if(!customizationOptions) { return null; }

  return (
    <div className="login-page__text-section">
      { customizationOptions.terms ? <RichText richText={customizationOptions.terms} className="login-page__terms" /> : null }

      {
        customizationOptions.terms_document?.terms_document ?
          <div className="login-page__terms login-page__terms-link-container">
            <a
              href={customizationOptions.terms_document.terms_document.url}
              target="_blank"
              rel="noopener"
              className="login-page__terms-link"
            >
              {customizationOptions.terms_document.link_text || rootStore.l10n.login.terms_and_conditions}
            </a>
          </div>: null
      }

      {
        customizationOptions?.custom_consent?.type === "Checkboxes" && customizationOptions.custom_consent.enabled ?
          customizationOptions.custom_consent.options.map((option, index) =>
            <div className={`login-page__consent ${option.required ? "login-page__consent--required" : ""}`} key={`option-${index}`}>
              <input
                name="consent"
                type="checkbox"
                checked={userData && userData[option.key]}
                onChange={event => setUserData({...userData, [option.key]: event.target.checked})}
                className="login-page__consent-checkbox"
              />
              <RichText className={`markdown-document login-page__consent-label ${option.required ? "login-page__consent-label--required" : ""}`} richText={option.message} />
              { option.required ? <div className="login-page__consent-required-indicator">*</div> : null }
            </div>
          ) : null
      }

      <RichText
        className="login-page__terms login-page__eluvio-terms"
        richText={rootStore.l10n.login.terms}
      />

      {
        // Allow the user to opt out of sharing email
        customizationOptions?.require_consent ?
          <div className="login-page__consent">
            <input
              name="consent"
              type="checkbox"
              checked={userData && userData.share_email}
              onChange={event => setUserData({...userData, share_email: event.target.checked})}
              className="login-page__consent-checkbox"
            />
            <label
              htmlFor="consent"
              className="login-page__consent-label"
              onClick={() => setUserData({...userData, share_email: !(userData || {}).share_email})}
            >
              {
                LocalizeString(
                  rootStore.l10n.login.email_consent,
                  { tenantClause: !customizationOptions.tenant_name ? "" : LocalizeString(rootStore.l10n.login.email_consent_tenant_clause, { tenantName: customizationOptions.tenant_name }) }
                )
              }
            </label>
          </div> : null
      }
    </div>
  );
};

// Logo, login buttons, terms and loading indicator
const Form = observer(({authenticating, userData, setUserData, customizationOptions, LogIn}) => {
  let hasLoggedIn = false;
  try {
    hasLoggedIn = localStorage.getItem("hasLoggedIn");
    // eslint-disable-next-line no-empty
  } catch(error) {}

  const loading =
    !rootStore.loaded ||
    !customizationOptions ||
    params.clearLogin ||
    authenticating ||
    rootStore.authenticating ||
    rootStore.loggedIn ||
    (params.source === "parent" && params.provider);

  const requiredOptionsMissing =
    customizationOptions?.custom_consent?.type === "Checkboxes" &&
    customizationOptions.custom_consent.enabled &&
    customizationOptions.custom_consent.options.find(option => option.required && !userData[option.key]);

  const signUpButton = (
    <button
      className={`action ${hasLoggedIn ? "" : "action-primary"} login-page__login-button login-page__login-button-create login-page__login-button-auth0`}
      style={{
        color: customizationOptions?.sign_up_button?.text_color?.color,
        backgroundColor: customizationOptions?.sign_up_button?.background_color?.color,
        border: `0.75px solid ${customizationOptions?.sign_up_button?.border_color?.color}`
      }}
      autoFocus={!hasLoggedIn}
      onClick={() => LogIn({provider: "oauth", mode: "create"})}
      disabled={requiredOptionsMissing}
      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
    >
      { rootStore.l10n.login.sign_up }
    </button>
  );

  const logInButton = (
    <button
      style={{
        color: customizationOptions?.log_in_button?.text_color?.color,
        backgroundColor: customizationOptions?.log_in_button?.background_color?.color,
        border: `0.75px solid ${customizationOptions?.log_in_button?.border_color?.color}`
      }}
      autoFocus={!!hasLoggedIn}
      className={`action ${hasLoggedIn ? "action-primary" : ""} login-page__login-button login-page__login-button-sign-in login-page__login-button-auth0`}
      onClick={() => LogIn({provider: "oauth", mode: "login"})}
      disabled={requiredOptionsMissing}
      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
    >
      { rootStore.l10n.login.sign_in }
    </button>
  );

  const metamaskButton = (
    <button
      style={{
        color: customizationOptions?.wallet_button?.text_color?.color,
        backgroundColor: customizationOptions?.wallet_button?.background_color?.color,
        border: `0.75px solid ${customizationOptions?.wallet_button?.border_color?.color}`
      }}
      className="action login-page__login-button login-page__login-button-wallet"
      onClick={() => LogIn({provider: "metamask", mode: "login"})}
      disabled={requiredOptionsMissing}
      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
    >
      <ImageIcon icon={MetamaskIcon} />
      { rootStore.l10n.login.connect_metamask }
    </button>
  );

  return (
    <>
      <Logo customizationOptions={customizationOptions} />
      <div className={`login-page__actions ${loading ? "login-page__actions--loading" : ""}`}>
        { loading ? <div className="login-page__actions__loader"><Loader /></div> : null }
        {
          hasLoggedIn ?
            <>
              { logInButton }
              { signUpButton }
            </> :
            <>
              { signUpButton }
              { logInButton }
            </>
        }

        <div className="login-page__actions__separator">
          <div className="login-page__actions__separator-line" />
          <div className="login-page__actions__separator-text">Or</div>
          <div className="login-page__actions__separator-line" />
        </div>

        { metamaskButton }
      </div>
      <PoweredBy customizationOptions={customizationOptions}/>
      <Terms customizationOptions={customizationOptions} userData={userData} setUserData={setUserData}/>
    </>
  );
});

// LOGIN HANDLERS

const CustomConsentModal = ({customConsent}) => {
  let initialSelections = {};
  customConsent.options.map(({key, initially_checked}) =>
    initialSelections[key] = !!initially_checked
  );

  return ({Confirm}) => {
    const [selections, setSelections] = useState({...initialSelections});
    const [renderKey, setRenderKey] = useState(0);

    const anyRequired = !!customConsent.options.find(option => option.required);
    const actionRequired = !!customConsent.options.find(option => option.required && !selections[option.key]);
    const allSelected = Object.values(selections).findIndex(selected => !selected) < 0;

    return (
      <Modal className="consent-modal" closable={!anyRequired} Toggle={() => Confirm(initialSelections)}>
        <div className="custom-consent">
          <h1 className="custom-consent__header">{ customConsent.consent_modal_header }</h1>
          <div className="custom-consent__options" key={renderKey}>
            {
              customConsent.options.map(option =>
                <div className="custom-consent__option" key={`option-${option.key}`}>
                  <input
                    type="checkbox"
                    checked={selections[option.key]}
                    className="custom-consent__option__checkbox"
                    onChange={event => setSelections({...selections, [option.key]: event.target.checked})}
                  />
                  { option.required ? <div className="custom-consent__option__required-indicator">*</div> : null }
                  <RichText richText={option.message} className="custom-consent__option__label" />
                </div>
              )
            }
            {
              customConsent.options.length > 1 ?
                <div className="custom-consent__option">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    className="custom-consent__option__checkbox"
                    onChange={event => {
                      let newSelections = selections;
                      customConsent.options.forEach(option => newSelections[option.key] = event.target.checked);
                      setSelections(newSelections);
                      setRenderKey(renderKey + 1);
                    }}
                  />
                  <div
                    onClick={() => {
                      let newSelections = selections;
                      customConsent.options.forEach(option => newSelections[option.key] = !allSelected);
                      setSelections(newSelections);
                      setRenderKey(renderKey + 1);
                    }}
                    className="custom-consent__option__label"
                  >
                    { rootStore.l10n.login.select_all_options }
                  </div>
                </div> : null
            }
          </div>
          <div className="custom-consent__actions">
            <button
              onClick={() => Confirm(selections)}
              className="action action-primary"
              disabled={actionRequired}
            >
              { customConsent.button_text || rootStore.l10n.login.accept }
            </button>
          </div>
        </div>
      </Modal>
    );
  };
};

export const SaveCustomConsent = async (userData) => {
  if(!rootStore.loggedIn || !rootStore.specifiedMarketplaceHash) { return; }

  const customizationMetadata = await rootStore.LoadLoginCustomization(rootStore.specifiedMarketplaceHash);

  if(!customizationMetadata?.custom_consent?.enabled) { return; }

  const useModal = customizationMetadata.custom_consent.type !== "Checkboxes";

  // Login page checkbox options should always be re-saved
  let savedConsentData;
  if(useModal) {
    // Check custom consent
    savedConsentData = await rootStore.walletClient.ProfileMetadata({
      type: "app",
      mode: "private",
      appId: customizationMetadata.tenant_id || rootStore.marketplaces[rootStore.specifiedMarketplaceId]?.tenant_id,
      key: `user-consent-${rootStore.specifiedMarketplaceId}`
    });

    // If any new keys have been added, user should be re-prompted
    if(savedConsentData) {
      try {
        const parsedConsentData = JSON.parse(savedConsentData);

        const consentKeys = customizationMetadata.custom_consent.options.map(option => option.key);

        if(consentKeys.find(key => typeof parsedConsentData[key] === "undefined")) {
          savedConsentData = undefined;
        }
      } catch(error) {
        rootStore.Log(error, true);
        savedConsentData = undefined;
      }
    }
  }

  if(!savedConsentData) {
    let customUserData = userData || params.userData;
    if(customizationMetadata.custom_consent.type !== "Checkboxes") {
      // Prompt for custom consent data
      customUserData = await Confirm({ModalComponent: CustomConsentModal({customConsent: customizationMetadata.custom_consent})});
    }

    await rootStore.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: customizationMetadata.tenant_id,
      key: `user-consent-${rootStore.specifiedMarketplaceId}`,
      value: JSON.stringify(customUserData)
    });
  }
};

const AuthenticateAuth0 = async (userData) => {
  if(rootStore.authenticating || rootStore.loggedIn) { return; }

  try {
    rootStore.Log("Parsing Auth0 parameters");

    // eslint-disable-next-line no-console
    console.time("Auth0 Parameter Parsing");

    await rootStore.auth0.handleRedirectCallback();

    // eslint-disable-next-line no-console
    console.timeEnd("Auth0 Parameter Parsing");

    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);

    await rootStore.AuthenticateAuth0({userData});
  } catch(error){
    rootStore.Log("Auth0 authentication failed:", true);
    rootStore.Log(error, true);
  }
};

const LoginComponent = observer(({customizationOptions, userData, setUserData, Close}) => {
  const [auth0Authenticating, setAuth0Authenticating] = useState(params.isAuth0Callback);
  const [userDataSaved, setUserDataSaved] = useState(false);
  const [savingUserData, setSavingUserData] = useState(false);

  // Handle login button clicked - Initiate popup/login flow
  const LogIn = async ({provider, mode}) => {
    if(rootStore.embedded) {
      const marketplaceHash = params.marketplace || customizationOptions.marketplaceHash;
      await rootStore.walletClient.LogIn({
        method: "tab",
        provider,
        mode,
        callback: async ({clientAuthToken, clientSigningToken}) => await rootStore.Authenticate({clientAuthToken, clientSigningToken}),
        marketplaceParams: marketplaceHash ? { marketplaceHash } : undefined,
        clearLogin: params.clearLogin || rootStore.GetLocalStorage("signed-out")
      });
    } else {
      if(provider === "metamask") {
        // Authenticate with metamask
        await rootStore.Authenticate({externalWallet: "Metamask"});
      } else if(provider === "oauth") {
        let auth0LoginParams = { appState: {} };

        if(rootStore.darkMode) {
          auth0LoginParams.darkMode = true;
        }

        if(customizationOptions?.disable_third_party) {
          auth0LoginParams.disableThirdParty = true;
        }

        const callbackUrl = new URL(window.location.href);
        callbackUrl.pathname = callbackUrl.pathname.replace(/\/$/, "");

        callbackUrl.searchParams.set("source", "oauth");
        callbackUrl.searchParams.set("action", "loginCallback");

        if(rootStore.specifiedMarketplaceHash && !callbackUrl.searchParams.get("mid") && !callbackUrl.searchParams.get("marketplace")) {
          callbackUrl.searchParams.set("marketplace", rootStore.specifiedMarketplaceHash);
        }

        if(userData && !callbackUrl.searchParams.get("data")) {
          callbackUrl.searchParams.set("data", Utils.B64(JSON.stringify(userData)));
        }

        await rootStore.auth0.loginWithRedirect({
          redirect_uri: callbackUrl.toString(),
          initialScreen: mode === "create" ? "signUp" : "login",
          ...auth0LoginParams
        });
      }
    }
  };

  // Handle login event, popup flow, and auth0 logout
  useEffect(() => {
    const Respond = () => {
      const origin = params.origin || window.location.origin;

      let response = { clientAuthToken: rootStore.AuthInfo().clientAuthToken };

      if(origin === window.location.origin) {
        response.clientSigningToken = rootStore.AuthInfo().clientSigningToken;
      }

      window.opener.postMessage({
        type: "LoginResponse",
        params: response
      }, params.origin || window.location.origin);

      setTimeout(() => window.close(), 5000);
    };

    const Redirect = () => {
      // TODO: Verify redirect origin

      let redirectUrl = new URL(params.redirect);
      redirectUrl.searchParams.set("elvToken", rootStore.AuthInfo().clientAuthToken);
      window.location = redirectUrl;
    };

    if(params.clearLogin) {
      const returnURL = new URL(window.location.href);
      returnURL.pathname = returnURL.pathname.replace(/\/$/, "");
      returnURL.hash = window.location.hash;
      returnURL.searchParams.delete("clear");

      setTimeout(() => rootStore.SignOut(returnURL.toString()), 1000);
    } else if(rootStore.loggedIn && !userDataSaved && !savingUserData) {
      setSavingUserData(true);
      SaveCustomConsent(userData)
        .then(() => setUserDataSaved(true))
        .finally(() => setSavingUserData(false));
    } else if(rootStore.loaded && !rootStore.loggedIn && rootStore.auth0 && params.isAuth0Callback) {
      // Returned from Auth0 callback - Authenticate
      AuthenticateAuth0(params.userData)
        .finally(() => setAuth0Authenticating(false));
    } else if(rootStore.loaded && ["parent", "origin"].includes(params.source) && params.action === "login" && params.provider) {
      // Opened from frame - do appropriate login flow
      LogIn({provider: params.provider, mode: params.mode})
        .then(() => {
          if(params.provider !== "oauth") {
            if(params.response === "message") {
              Respond();
            } else if(params.response === "redirect") {
              Redirect();
            }
          }
        });
    } else if(!auth0Authenticating && rootStore.loggedIn && params.response === "message") {
      // Opened from frame and logged in, respond with auth info
      Respond();
    } else if(!auth0Authenticating && rootStore.loggedIn && params.response === "redirect") {
      Redirect();
    }
  }, [rootStore.loaded, rootStore.loggedIn, userDataSaved]);

  return (
    <div className={`login-page ${rootStore.darkMode ? "login-page--dark" : ""} ${customizationOptions?.large_logo_mode ? "login-page-large-logo-mode" : ""}`}>
      <Background customizationOptions={customizationOptions} Close={Close} />

      <div className="login-page__login-box">
        <Form userData={userData} setUserData={setUserData} authenticating={auth0Authenticating} LogIn={LogIn} customizationOptions={customizationOptions} />
      </div>
    </div>
  );
});

const Login = observer(({darkMode, Close}) => {
  const [customizationOptions, setCustomizationOptions] = useState(undefined);
  const [userData, setUserData] = useState(params.userData || {});

  // Loading customization options
  useEffect(() => {
    if(customizationOptions) { return; }

    // Marketplace is specified as something other than hash - wait for it to be resolved to rootStore.specifiedMarketplaceHash
    if(searchParams.get("mid") && !searchParams.get("mid").startsWith("hq__") && !rootStore.specifiedMarketplaceHash) {
      return;
    }

    const marketplaceHash = rootStore.specifiedMarketplaceHash || params.marketplace || searchParams.get("mid");

    rootStore.LoadLoginCustomization(marketplaceHash)
      .then(options => {
        const userDataKey = `login-data-${options?.marketplaceId || "default"}`;

        // Load initial user data from localstorage, if present
        let initialUserData = {
          share_email: options?.require_consent ?
            (typeof options.default_consent === "undefined" ? true : options.default_consent) :
            true
        };

        // Set initial customization options from custom consent if checkbox mode is enabled
        if(options?.custom_consent?.type === "Checkboxes" && options.custom_consent.enabled) {
          options.custom_consent.options.forEach(consentOption => initialUserData[consentOption.key] = consentOption.initially_checked);
        }

        try {
          if(localStorage.getItem(userDataKey)) {
            initialUserData = {
              ...initialUserData,
              ...(JSON.parse(localStorage.getItem(userDataKey)))
            };
          }
          // eslint-disable-next-line no-empty
        } catch(error) {}

        if(typeof options.darkMode !== "undefined") {
          rootStore.ToggleDarkMode(options.darkMode);
        }

        setUserData(initialUserData);
        setCustomizationOptions({...(options || {})});
      });
  }, [rootStore.specifiedMarketplaceHash]);

  darkMode = customizationOptions && typeof customizationOptions.darkMode === "boolean" ? customizationOptions.darkMode : darkMode;

  // User data such as consent - save to localstorage
  const SaveUserData = (data) => {
    setUserData(data);

    try {
      const userDataKey = `login-data-${customizationOptions?.marketplaceId || "default"}`;
      localStorage.setItem(userDataKey, JSON.stringify(data));
      // eslint-disable-next-line no-empty
    } catch(error) {}
  };

  return (
    <LoginComponent
      customizationOptions={customizationOptions}
      userData={userData}
      setUserData={SaveUserData}
      darkMode={darkMode}
      Close={() => Close && Close()}
    />
  );
});

export default Login;
