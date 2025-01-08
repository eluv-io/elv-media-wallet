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

import EluvioE from "Assets/images/ELUV.IO-E-Icon.png";
import EluvioLogo from "Assets/images/Eluvio_logo.svg";
import MediaWalletLogo from "Assets/images/Media Wallet Text Linear.svg";
import CheckIcon from "Assets/icons/check.svg";
import OryLogin from "Components/login/OryLogin";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {Redirect} from "react-router-dom";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));
const useOry = searchParams.has("ory") || !!searchParams.has("flow");
const params = {
  // Third party login (Ory) - If flow parameter is present, there was a conflict and the login form needs to be shown
  isThirdPartyCallback: window.location.pathname === "/oidc" && !searchParams.has("flow"),
  // Redirect path
  next: searchParams.get("next"),
  // Property ID
  mediaPropertySlugOrId: searchParams.get("pid") || (!rootStore.routeParams.mediaPropertySlugOrId && rootStore.GetSessionStorage("pid")),

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
  loginCode: searchParams.get("elvid") || rootStore.GetSessionStorage("elvid"),
  // Marketplace
  marketplace: searchParams.get("marketplace"),
  // User data to pass to custodial sign-in
  userData: searchParams.has("data") ? JSON.parse(Utils.FromB64(searchParams.get("data"))) : { share_email: true },
  oryFlow: searchParams.get("flow"),
  useOry
};

window.params = params;

const ParseDomainCustomization = ({styling, terms, consent, settings}={}, font) => {
  let styles = {};
  const SetVars = (prefix, option) => {
    if(!option) {
      return;
    }

    if(CSS.supports("color", option.background_color)) {
      styles[`${prefix}--background`] = option.background_color;
      // If border color is not explicitly set, it should default to background color
      styles[`${prefix}--border-color`] = option.background_color;
    }
    if(CSS.supports("color", option.text_color)) {
      styles[`${prefix}--color`] = option.text_color;
    }
    if(CSS.supports("color", option.border_color)) {
      styles[`${prefix}--border-color`] = option.border_color;
    }
    if(!isNaN(parseInt(option.border_radius))) {
      styles[`${prefix}--border-radius`] = `${option.border_radius}px`;
    }
  };

  SetVars("--login-box", styling?.login_box);
  SetVars("--login-action-primary", styling?.sign_in_button);
  SetVars("--login-action-secondary", styling?.sign_up_button);
  SetVars("--login-input", styling?.inputs);

  if(CSS.supports("color", styling?.primary_text_color)) {
    styles["--login-text-primary--color"] = styling?.primary_text_color;
  }
  if(CSS.supports("color", styling?.secondary_text_color)) {
    styles["--login-text-secondary--color"] = styling?.secondary_text_color;
  }
  if(CSS.supports("color", styling?.link_color)) {
    styles["--login-text-link--color"] = styling?.link_color;
  }

  if(font) {
    styles["--login-font-family"] = `${font}, var(--font-family-primary), Inter, sans-serif`;
  }

  return {
    styles,
    logo: styling?.logo,
    powered_by_logo: styling?.powered_by_logo,
    background: styling?.background_image_desktop,
    background_mobile: styling?.background_image_mobile,
    terms: terms?.terms,
    terms_document:
      !terms?.terms_document ? null :
        {
          terms_document: terms?.terms_document,
          link_text: terms?.terms_document_link_text
        },
    require_consent: consent?.require_consent,
    default_consent: consent?.default_consent,
    custom_consent: {
      type: "Checkboxes",
      enabled: consent?.consent_options?.length > 0,
      options: consent?.consent_options
    },
    use_ory: settings?.provider === "ory",
    enable_metamask: settings?.enable_metamask,
    disable_third_party_login: settings?.disable_third_party_login || false,
    disable_registration: settings?.disable_registration || false
  };
};

// COMPONENTS

// Top logo
const Logo = ({customizationOptions}) => {
  if(!customizationOptions) {
    return null;
  }

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
        className="login-page__background login-page__background--custom"
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
      { customizationOptions.terms ? <RichText richText={customizationOptions.terms} className="login-page__terms" /> : null }

      {
        !customizationOptions.terms_document?.terms_document ? null :
          <div className="login-page__terms login-page__terms-link-container">
            <a
              href={customizationOptions.terms_document.terms_document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="login-page__terms-link"
            >
              {customizationOptions.terms_document.link_text || rootStore.l10n.login.terms_and_conditions}
            </a>
          </div>
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
              <RichText
                onClick={() => setUserData({...userData, [option.key]: !userData[option.key]})}
                className={`login-page__consent-label ${option.required ? "login-page__consent-label--required" : ""}`}
                richText={option.message}
              />
              { option.required ? <div className="login-page__consent-required-indicator">*</div> : null }
            </div>
          ) : null
      }

      {
        rootStore.currentPropertyId ? null :
          <RichText
            className="login-page__terms login-page__eluvio-terms"
            richText={rootStore.l10n.login.terms}
          />
      }

      {
        // Allow the user to opt out of sharing email
        !customizationOptions?.require_consent ? null :
          <div className="login-page__consent">
            <input
              name="consent"
              type="checkbox"
              checked={userData && userData.share_email}
              onChange={event => setUserData({...userData, share_email: event.target.checked})}
              className="login-page__consent-checkbox"
            />
            <RichText
              richText={
                LocalizeString(
                  rootStore.l10n.login.email_consent,
                  { tenantClause: !customizationOptions.tenant_name ? "" : " " + LocalizeString(rootStore.l10n.login.email_consent_tenant_clause, { tenantName: customizationOptions.tenant_name }) },
                  { stringOnly: true }
                )
              }
              className="login-page__consent-label"
              onClick={() => setUserData({...userData, share_email: !(userData || {}).share_email})}
            >

            </RichText>
          </div>
      }
    </div>
  );
};

// Logo, login buttons, terms and loading indicator
const Form = observer(({authenticating, userData, setUserData, customizationOptions, loading, codeAuthSet}) => {
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

  if(params.isThirdPartyCallback) {
    return (
      <div
        style={customizationOptions.styles}
        className={`login-page ${rootStore.darkMode ? "login-page--dark" : ""}`}
      >
        <Background customizationOptions={customizationOptions}/>

        <div className="login-page__login-box">
          <div className="login-page__actions login-page__actions--loading">
            <div className="login-page__actions__loader">
              <Loader />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Logo customizationOptions={customizationOptions} />
      <OryLogin
        codeAuth={params.loginCode}
        customizationOptions={customizationOptions}
        userData={userData}
        requiredOptionsMissing={requiredOptionsMissing}
      />
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

  const customizationMetadata = await rootStore.LoadLoginCustomization(params.mediaPropertySlugOrId);

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

const LoginComponent = observer(({customizationOptions, userData, setUserData, Close}) => {
  const [userDataSaved, setUserDataSaved] = useState(false);
  const [savingUserData, setSavingUserData] = useState(false);
  const [settingCodeAuth, setSettingCodeAuth] = useState(false);
  const [codeAuthSet, setCodeAuthSet] = useState(false);
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    if(!rootStore.GetSessionStorage("user-data")) { return; }

    try {
      setUserData(JSON.parse(rootStore.GetSessionStorage("user-data")) || {});
    } catch(error) {
      rootStore.Log("Failed to parse user data", true);
      rootStore.Log(error, true);
      setUserData({});
    }
  }, []);

  useEffect(() => {
    if(!params.isThirdPartyCallback || !rootStore.oryClient || !rootStore.loaded || !userData) { return; }

    rootStore.AuthenticateOry({userData, sendWelcomeEmail: true})
      .finally(() => {
        if(!params.loginCode) {
          setRedirect(params.next || "/");
        }
      });
  }, [rootStore.loaded, rootStore.oryClient, userData]);

  // Handle login event, popup flow, and auth0 logout
  useEffect(() => {
    const SetCodeAuth = async () => {
      try {
        setSettingCodeAuth(true);

        await rootStore.walletClient.SetCodeAuth({
          code: params.loginCode,
          address: rootStore.walletClient.UserAddress(),
          email: rootStore.walletClient.UserInfo()?.email,
          type: rootStore.AuthInfo()?.provider,
          authToken: rootStore.walletClient.AuthToken(),
          clusterToken: rootStore.walletClient.__authorization?.clusterToken,
          expiresAt: rootStore.AuthInfo().expiresAt
        });

        setCodeAuthSet(true);
        rootStore.RemoveSessionStorage("elvid");
      } finally {
        setSettingCodeAuth(false);
      }
    };

    if(!customizationOptions || !rootStore.loaded) { return; }

    if(rootStore.loggedIn && !userDataSaved && !savingUserData) {
      setSavingUserData(true);
      SaveCustomConsent(userData)
        .finally(() => {
          setUserDataSaved(true);
          setSavingUserData(false);
        });
    } else if(!settingCodeAuth && userDataSaved && rootStore.loggedIn && params.loginCode) {
      SetCodeAuth();
    }
  }, [rootStore.loaded, rootStore.loggedIn, userDataSaved, savingUserData, customizationOptions]);

  if(redirect) {
    return <Redirect to={redirect} />;
  }

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
          loading={settingCodeAuth || savingUserData}
          codeAuthSet={codeAuthSet}
          customizationOptions={customizationOptions}
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

    rootStore.LoadLoginCustomization(params.mediaPropertySlugOrId)
      .then(options => {
        if(!options) {
          setCustomizationOptions({});
          return;
        }

        const userDataKey = `login-data-${options?.marketplaceId || options.mediaPropertyId || "default"}`;

        if(options.mediaPropertyId) {
          options = ParseDomainCustomization(options?.login, options.font);
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
  }, [rootStore.currentPropertyId, rootStore.loaded]);

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
