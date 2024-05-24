import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Loader, PageLoader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Modal from "Components/common/Modal";
import Confirm from "Components/common/Confirm";
import {LocalizeString} from "Components/common/UIComponents";
import {RichText} from "Components/properties/Common";

import MetamaskIcon from "Assets/icons/metamask fox.png";
import EluvioE from "Assets/images/ELUV.IO-E-Icon.png";
import EluvioLogo from "Assets/images/Eluvio_logo.svg";
import MediaWalletLogo from "Assets/images/Media Wallet Text Linear.svg";
import CheckIcon from "Assets/icons/check.svg";
import OryLogin from "Components/login/OryLogin";
import {SetImageUrlDimensions} from "../../utils/Utils";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));
const useOry = searchParams.has("ory") || !!searchParams.has("flow");
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
  // How should the page respond with login credentials (message, redirect, code)
  response: searchParams.get("response"),
  // Where should the page redirect to with login credentials
  redirect: searchParams.get("redirect"),
  // Response code to fill out for code login
  loginCode: searchParams.get("elvid"),
  // Should Auth0 credentials be cleared before login?
  clearLogin: !useOry && searchParams.has("clear"),
  // Marketplace
  marketplace: searchParams.get("marketplace"),
  // User data to pass to custodial sign-in
  userData: searchParams.has("data") ? JSON.parse(Utils.FromB64(searchParams.get("data"))) : { share_email: true },
  oryFlow: searchParams.get("flow"),
  useOry
};

window.params = params;

const ParseDomainCustomization = ({styling, terms, consent, settings}) => {
  let styles = {};
  const SetVars = (prefix, option) => {
    if(CSS.supports("color", option.background_color)) {
      styles[`${prefix}--background`] = option.background_color;
    }
    if(CSS.supports("color", option.text_color)) {
      styles[`${prefix}--color`] = option.text_color;
    }
    if(CSS.supports("color", option.border_color)) {
      styles[`${prefix}--border-color`] = option.border_color;
    }
    if(typeof option.border_radius === "number" && option.border_radius >= 0) {
      styles[`${prefix}--border-radius`] = `${option.border_radius}px`;
    }
  };

  SetVars("--login-box", styling.login_box);
  SetVars("--login-action-primary", styling.sign_in_button);
  SetVars("--login-action-secondary", styling.sign_up_button);
  SetVars("--login-input", styling.inputs);

  if(CSS.supports("color", styling.primary_text_color)) {
    styles["--login-text-primary--color"] = styling.primary_text_color;
  }
  if(CSS.supports("color", styling.secondary_text_color)) {
    styles["--login-text-secondary--color"] = styling.secondary_text_color;
  }
  if(CSS.supports("color", styling.link_color)) {
    styles["--login-text-link--color"] = styling.link_color;
  }

  return {
    styles,
    logo: styling.logo,
    powered_by_logo: styling.powered_by_logo,
    background: styling.background_image_desktop,
    background_mobile: styling.background_image_mobile,
    terms: terms?.terms,
    terms_document:
      !terms?.terms_document ? null :
        {
          terms_document: terms.terms_document,
          link_text: terms.terms_document_link_text
        },
    custom_consent: {
      type: "Checkboxes",
      enabled: consent?.consent_options?.length > 0,
      options: consent?.consent_options
    },
    use_ory: settings?.provider !== "ory",
    disable_registration: settings?.disable_registration || false
  };
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
      <div className="login-page__logo-container login-page__logo-container--default">
        <ImageIcon icon={EluvioE} className="login-page__logo login-page__logo--default login-page__logo--icon" title="Eluv.io" />
        <ImageIcon icon={MediaWalletLogo} className="login-page__logo login-page__logo--default login-page__logo--text" title="Eluv.io" />
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
      {
        customizationOptions.powered_by_logo ?
          <ImageIcon icon={customizationOptions.powered_by_logo.url} className="login-page__tagline__image login-page__tagline__image--custom" alt={customizationOptions.powered_by_logo_alt_text || ""} /> :
          <ImageIcon icon={EluvioLogo} className="login-page__tagline__image" title="Eluv.io" />
      }

    </div>
  );
};

// Custom background
const Background = observer(({customizationOptions, Close}) => {
  const backgroundUrl = rootStore.pageWidth < 1000 && customizationOptions?.background_mobile?.url || customizationOptions?.background?.url;
  if(backgroundUrl) {
    return (
      <div
        className="login-page__background"
        style={{backgroundImage: `url("${SetImageUrlDimensions({url: backgroundUrl, width: rootStore.fullscreenImageWidth})}")`}}
        onClick={Close}
      />
    );
  }

  return <div className="login-page__background login-page__background--default" onClick={Close}/>;
});

// Terms of use. May include custom terms, and may include opt out checkbox for sharing email
const Terms = ({customizationOptions, userData, setUserData}) => {
  if(!customizationOptions) { return null; }

  return (
    <div className="login-page__text-section">
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
              <RichText className={`login-page__consent-label ${option.required ? "login-page__consent-label--required" : ""}`} richText={option.message} />
              { option.required ? <div className="login-page__consent-required-indicator">*</div> : null }
            </div>
          ) : null
      }

      { customizationOptions.terms ? <RichText richText={customizationOptions.terms} className="login-page__terms" /> : null }

      {
        customizationOptions.terms_document?.terms_document ?
          <div className="login-page__terms login-page__terms-link-container">
            <a
              href={customizationOptions.terms_document.terms_document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="login-page__terms-link"
            >
              {customizationOptions.terms_document.link_text || rootStore.l10n.login.terms_and_conditions}
            </a>
          </div>: null
      }

      {
        rootStore.domainProperty ? null :
        <RichText
          className="login-page__terms login-page__eluvio-terms"
          richText={rootStore.l10n.login.terms}
        />
      }

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
const Form = observer(({authenticating, userData, setUserData, customizationOptions, loading, codeAuthSet, useOry, errorMessage, LogIn}) => {
  let hasLoggedIn = false;
  try {
    hasLoggedIn = localStorage.getItem("hasLoggedIn");
    // eslint-disable-next-line no-empty
  } catch(error) {}

  loading =
    loading ||
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

  let signUpButton;
  if(!customizationOptions.disable_registration) {
    signUpButton = (
      <button
        className={`login-page__button ${hasLoggedIn ? "login-page__button--secondary" : "login-page__button--primary"} login-page__login-button login-page__login-button-create login-page__login-button-auth0`}
        autoFocus={!hasLoggedIn}
        onClick={() => LogIn({provider: "oauth", mode: "create"})}
        disabled={requiredOptionsMissing}
        title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
      >
        {rootStore.l10n.login.sign_up}
      </button>
    );
  }

  const logInButton = (
    <button
      autoFocus={!!hasLoggedIn}
      className={`login-page__button ${hasLoggedIn || customizationOptions.disable_registration ? "login-page__button--primary" : "login-page__button--secondary"} login-page__login-button login-page__login-button-sign-in login-page__login-button-auth0`}
      onClick={() => LogIn({provider: "oauth", mode: "login"})}
      disabled={requiredOptionsMissing}
      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
    >
      { rootStore.l10n.login.sign_in }
    </button>
  );

  const metamaskButton = (
    <button
      className="login-page__button login-page__button--secondary login-page__button--metamask"
      onClick={() => LogIn({provider: "metamask", mode: "login"})}
      disabled={requiredOptionsMissing}
      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
    >
      <ImageIcon icon={MetamaskIcon} />
      { rootStore.l10n.login.connect_metamask }
    </button>
  );

  if(codeAuthSet) {
    return (
      <>
        <Logo customizationOptions={customizationOptions} />
        <div className="login-page__code-message">
          <ImageIcon icon={CheckIcon} className="login-page__code-message__icon" />
          <div className="login-page__code-message__text">
            { rootStore.l10n.login.code_auth_success }
          </div>
        </div>
        <PoweredBy customizationOptions={customizationOptions}/>
      </>
    );
  }

  if(useOry) {
    return (
      <>
        <Logo customizationOptions={customizationOptions} />
        <OryLogin customizationOptions={customizationOptions} userData={userData} />
        {
          params.loginCode && !loading ?
            <div className="login-page__login-code">
              { LocalizeString(rootStore.l10n.login.login_code, { code: params.loginCode }) }
            </div> : null
        }

        <PoweredBy customizationOptions={customizationOptions}/>
        <Terms customizationOptions={customizationOptions} userData={userData} setUserData={setUserData}/>
      </>
    );
  }

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

        {
          customizationOptions.disable_registration ? null :
            <>
              <div className="login-page__actions__separator">
                <div className="login-page__actions__separator-line"/>
                <div className="login-page__actions__separator-text">Or</div>
                <div className="login-page__actions__separator-line"/>
              </div>

              {metamaskButton}
            </>
        }
      </div>
      {
        params.loginCode && !loading ?
          <div className="login-page__login-code">
            { LocalizeString(rootStore.l10n.login.login_code, { code: params.loginCode }) }
          </div> : null
      }

      {
        !errorMessage ? null :
          <div className="login-page__error-message">{errorMessage}</div>
      }

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

  // eslint-disable-next-line react/display-name
  return ({Confirm}) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [selections, setSelections] = useState({...initialSelections});
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
              className="login-page__button login-page__button--primary"
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

    // Remove login related params from url
    const paramKeys = [
      "code",
      "origin",
      "source",
      "action",
      "provider",
      "mode",
      "response",
      "redirect",
      "elvid",
      "clear",
      "marketplace",
      "mid",
      "data",
      "code",
      "state"
    ];

    const url = new URL(window.location.href);
    paramKeys.forEach(key => url.searchParams.delete(key));

    window.history.replaceState({}, document.title, url.toString());

    await rootStore.AuthenticateAuth0({userData});
  } catch(error){
    rootStore.Log("Auth0 authentication failed:", true);
    rootStore.Log(error, true);

    if(error.uiMessage) {
      throw error;
    }
  }
};

const LoginComponent = observer(({customizationOptions, userData, setUserData, Close}) => {
  const [auth0Authenticating, setAuth0Authenticating] = useState(params.isAuth0Callback);
  const [userDataSaved, setUserDataSaved] = useState(false);
  const [savingUserData, setSavingUserData] = useState(false);
  const [settingCodeAuth, setSettingCodeAuth] = useState(false);
  const [codeAuthSet, setCodeAuthSet] = useState(false);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const useOry = params.useOry || customizationOptions?.use_ory || customizationOptions?.tenantConfig?.["open-id"]?.["issuer-url"];

  // Handle login button clicked - Initiate popup/login flow
  const LogIn = async ({provider, mode}) => {
    setErrorMessage(undefined);

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
        callbackUrl.pathname = "";
        callbackUrl.hash = window.location.pathname;

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
      let redirectUrl = new URL(params.redirect);
      redirectUrl.searchParams.set("elvToken", rootStore.AuthInfo().clientAuthToken);
      window.location = redirectUrl;
    };

    const SetCodeAuth = async () => {
      try {
        setSettingCodeAuth(true);

        await rootStore.walletClient.SetCodeAuth({
          code: params.loginCode,
          address: rootStore.walletClient.UserAddress(),
          type: rootStore.externalWalletUser ? rootStore.walletClient.__authorization.walletName.toLowerCase() : "custodial",
          authToken: rootStore.walletClient.AuthToken()
        });

        setCodeAuthSet(true);
      } finally {
        setSettingCodeAuth(false);
      }
    };

    if(params.clearLogin && !useOry) {
      const returnURL = new URL(window.location.href);
      returnURL.pathname = returnURL.pathname.replace(/\/$/, "");
      returnURL.hash = window.location.hash;
      returnURL.searchParams.delete("clear");

      setTimeout(() => rootStore.SignOut({returnUrl: returnURL.toString()}), 1000);
    } else if(rootStore.loggedIn && !userDataSaved && !savingUserData) {
      setSavingUserData(true);
      SaveCustomConsent(userData)
        .finally(() => {
          setUserDataSaved(true);
          setSavingUserData(false);
        });
    } else if(!useOry && rootStore.loaded && !rootStore.loggedIn && rootStore.auth0 && params.isAuth0Callback) {
      // Returned from Auth0 callback - Authenticate
      AuthenticateAuth0(params.userData)
        .catch(error => {
          if(error?.uiMessage) {
            setErrorMessage(error?.uiMessage);
          }
        })
        .finally(() => setAuth0Authenticating(false));
    } else if(rootStore.loaded && !rootStore.loggedIn && ["parent", "origin", "code"].includes(params.source) && params.action === "login" && params.provider && !settingCodeAuth && !codeAuthSet) {
      // Opened from frame - do appropriate login flow
      LogIn({provider: params.provider, mode: params.mode})
        .then(() => {
          if(params.provider !== "oauth") {
            if(params.response === "message") {
              Respond();
            } else if(params.response === "redirect") {
              Redirect();
            } else if(params.response === "code") {
              SetCodeAuth();
            }
          }
        });
    } else if(userDataSaved && !auth0Authenticating && rootStore.loggedIn && params.response === "message") {
      // Opened from frame and logged in, respond with auth info
      Respond();
    } else if(userDataSaved && !auth0Authenticating && rootStore.loggedIn && params.response === "redirect") {
      Redirect();
    } else if(!settingCodeAuth && userDataSaved && !auth0Authenticating && rootStore.loggedIn && params.response === "code") {
      SetCodeAuth();
    }
  }, [rootStore.loaded, rootStore.loggedIn, userDataSaved, savingUserData, auth0Authenticating]);

  const loading =
    !rootStore.loaded ||
    !customizationOptions ||
    params.clearLogin ||
    (params.source === "parent" && params.provider);

  if(loading) {
    return (
      <div className={`login-page ${rootStore.darkMode ? "login-page--dark" : ""}`}>
        <Background customizationOptions={customizationOptions} Close={Close} />
        <PageLoader />
      </div>
    );
  }

  return (
    <div
      style={customizationOptions.styles}
      className={`login-page ${rootStore.darkMode ? "login-page--dark" : ""}`}
    >
      <Background customizationOptions={customizationOptions} Close={Close} />

      <div className="login-page__login-box">
        <Form
          userData={userData}
          setUserData={setUserData}
          authenticating={auth0Authenticating}
          loading={settingCodeAuth || savingUserData}
          codeAuthSet={codeAuthSet}
          LogIn={LogIn}
          customizationOptions={customizationOptions}
          errorMessage={errorMessage}
          useOry={useOry}
        />
      </div>
    </div>
  );
});

const Login = observer(({Close}) => {
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
        const userDataKey = `login-data-${options?.marketplaceId || options.mediaPropertyId || "default"}`;

        if(options.mediaPropertyId) {
          options = ParseDomainCustomization(options?.login);
        }

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

        setUserData(initialUserData);
        setCustomizationOptions({...(options || {})});
      });
  }, [rootStore.specifiedMarketplaceHash]);

  useEffect(() => {
    if(!rootStore.loaded) { return; }

    // Ensure correct marketplace styling is used when login is visible
    const originalMarketplaceId = rootStore.marketplaceId;
    rootStore.SetMarketplace({marketplaceId: rootStore.specifiedMarketplaceId, disableTenantStyling: true});

    return () => {
      originalMarketplaceId ?
        rootStore.SetMarketplace({marketplaceId: originalMarketplaceId}) :
        rootStore.ClearMarketplace();
    };
  }, [rootStore.loaded]);

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
      Close={() => Close && Close()}
    />
  );
});

export default Login;
