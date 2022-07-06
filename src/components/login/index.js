import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useAuth0} from "@auth0/auth0-react";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {rootStore} from "Stores";
import ImageIcon from "Components/common/ImageIcon";
import {Loader} from "Components/common/Loaders";
import {ActionPopup} from "../../utils/Utils";

import UpCaretIcon from "Assets/icons/up-caret.svg";
import DownCaretIcon from "Assets/icons/down-caret.svg";
import MetamaskIcon from "Assets/icons/metamask fox.png";
import EluvioLogo from "Assets/icons/logo.svg";

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));
const params = {
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
  clearAuth0Login: searchParams.has("clear") || (window.sessionStorageAvailable && localStorage.getItem("signed-out")),
  // Marketplace
  marketplace: searchParams.get("marketplace"),
  // User data to pass to custodial sign-in
  userData: searchParams.has("data") ? JSON.parse(atob(searchParams.get("data"))) : { share_email: true }
};

// COMPONENTS

// Top logo
const Logo = ({customizationOptions}) => {
  if(customizationOptions?.logo) {
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
        <ImageIcon icon={EluvioLogo} className="login-page__logo" title="Eluv.io" />
      </div>
    );
  }
};

// If custom logo is used, show "Powered by Eluvio" below login form
const PoweredBy = ({customizationOptions}) => {
  if(!customizationOptions?.logo) { return null; }

  return (
    <div className="login-page__tagline">
      Powered by <ImageIcon icon={EluvioLogo} className="login-page__tagline__image" title="Eluv.io" />
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
  return (
    <div className="login-page__text-section">
      {
        customizationOptions.terms ?
          <div
            className="login-page__terms"
            ref={element => {
              if(!element) { return; }

              render(
                <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                  { SanitizeHTML(customizationOptions.terms) }
                </ReactMarkdown>,
                element
              );
            }}
          /> : null
      }

      <div className="login-page__terms login-page__eluvio-terms">
        By creating an account or signing in, I agree to the <a href="https://live.eluv.io/privacy" target="_blank">Eluvio Privacy Policy</a> and the <a href="https://live.eluv.io/terms" target="_blank">Eluvio Terms and Conditions</a>.
      </div>

      {
        // Allow the user to opt out of sharing email
        customizationOptions?.require_consent ?
          <div className="login-page__consent">
            <input
              name="consent"
              type="checkbox"
              checked={userData && userData.share_email}
              onChange={event => setUserData({share_email: event.target.checked})}
              className="login-page__consent-checkbox"
            />
            <label
              htmlFor="consent"
              className="login-page__consent-label"
              onClick={() => setUserData({share_email: !(userData || {}).share_email})}
            >
              By checking this box, I give consent for my email address to be stored with my wallet address{ customizationOptions.tenant_name ? ` and shared with ${customizationOptions.tenant_name}` : "" }. Eluvio may also send informational and marketing emails to this address.
            </label>
          </div> : null
      }
    </div>
  );
};

// Logo, login buttons, terms and loading indicator
const Form = observer(({userData, setUserData, customizationOptions, Authenticate}) => {
  const [showWalletOptions, setShowWalletOptions] = useState(searchParams.has("swl"));

  let hasLoggedIn = false;
  try {
    hasLoggedIn = localStorage.getItem("hasLoggedIn");
    // eslint-disable-next-line no-empty
  } catch(error) {}

  const loading = !rootStore.loaded || !customizationOptions || rootStore.authenticating || !rootStore.loginLoaded || rootStore.loggedIn || params.source === "parent";

  const signUpButton = (
    <button
      className={`action ${hasLoggedIn ? "" : "action-primary"} login-page__login-button login-page__login-button-create login-page__login-button-auth0`}
      style={{
        color: customizationOptions?.sign_up_button?.text_color?.color,
        backgroundColor: customizationOptions?.sign_up_button?.background_color?.color,
        border: `0.75px solid ${customizationOptions?.sign_up_button?.border_color?.color}`
      }}
      autoFocus={!hasLoggedIn}
      onClick={() => Authenticate({provider: "oauth", mode: "create"})}
    >
      Sign Up
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
      onClick={() => Authenticate({provider: "oauth", mode: "login"})}
    >
      Log In
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
      onClick={() => Authenticate({provider: "metamask", mode: "login"})}
    >
      <ImageIcon icon={MetamaskIcon} />
      Metamask
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
          <div className="login-page__actions__separator-text">or</div>
          <div className="login-page__actions__separator-line" />
        </div>

        <button className="login-page__wallet-options-toggle" onClick={() => setShowWalletOptions(!showWalletOptions)}>
          Sign In with 3rd Party Wallet <ImageIcon icon={showWalletOptions ? UpCaretIcon : DownCaretIcon} />
        </button>

        {
          showWalletOptions ?
            <div className="login-page__wallet-actions">
              { metamaskButton }
            </div> : null
        }
      </div>
      {
        loading ? null :
          <>
            <PoweredBy customizationOptions={customizationOptions}/>
            <Terms customizationOptions={customizationOptions} userData={userData} setUserData={setUserData}/>
          </>
      }
    </>
  );
});

// LOGIN HANDLERS

// Automatic login when auth0 is authenticated
export const Auth0Authentication = observer(() => {
  if(!window.sessionStorageAvailable) { return; }

  window.auth0 = useAuth0();

  useEffect(() => {
    if(!window.auth0.isLoading) {
      rootStore.SetLoginLoaded();
    }

    if(params.clearAuth0Login || !rootStore.loaded || rootStore.loggedIn || window.auth0.isLoading || !window.auth0.isAuthenticated) { return; }

    window.auth0.getIdTokenClaims()
      .then(async response => {
        await rootStore.Authenticate({
          idToken: response.__raw,
          user: {
            name: auth0?.user?.name,
            email: auth0?.user?.email,
            verified: auth0?.user?.email_verified,
            userData: params.userData
          }
        });
      });
  }, [rootStore.loaded, window.auth0.isLoading, window.auth0.isAuthenticated]);

  return null;
});

// Authenticate and close popup when popup passes login credentials
const HandlePopupResponse = async (event, Close) => {
  if(!event || !event.data || event.data.type !== "LoginResponse") {
    return;
  }

  try {
    await rootStore.Authenticate({
      clientAuthToken: event.data.params.clientAuthToken,
      clientSigningToken: event.data.params.clientSigningToken
    });
  } catch(error) {
    rootStore.Log(error, true);
  } finally {
    Close();
  }
};

const LoginComponent = observer(({customizationOptions, userData, setUserData, Close}) => {
  // Handle login button clicked - Initiate popup/login flow
  const Authenticate = async ({provider, mode}) => {
    let loginUrl = new URL(window.location.origin);

    loginUrl.searchParams.set("action", "login");
    loginUrl.searchParams.set("provider", provider);
    loginUrl.searchParams.set("mode", mode);
    loginUrl.searchParams.set("data", btoa(JSON.stringify(userData)));

    if(params.marketplace || customizationOptions?.marketplaceHash) {
      loginUrl.searchParams.set("marketplace", params.marketplace || customizationOptions.marketplaceHash);
    }

    if(rootStore.darkMode) {
      loginUrl.searchParams.set("dk", "");
    }

    if(rootStore.embedded) {
      // Embedded - open popup to log in and wait for message with auth info

      loginUrl.hash = "/login";
      loginUrl.searchParams.set("response", "message");
      loginUrl.searchParams.set("source", "parent");

      if(provider === "oauth" && (searchParams.has("clear") || (window.sessionStorageAvailable && localStorage.getItem("signed-out")))) {
        // If user has logged out, ensure auth0 session is cleared before logging in
        loginUrl.searchParams.set("clear", "");
      }

      await ActionPopup({
        url: loginUrl.toString(),
        onMessage: HandlePopupResponse
      });
    } else {
      if(provider === "metamask") {
        // Authenticate with metamask
        await rootStore.Authenticate({externalWallet: "Metamask"});
      } else if(provider === "oauth") {
        // Redirect to Auth0

        loginUrl.hash = window.location.hash;
        loginUrl.searchParams.set("action", "login");
        loginUrl.searchParams.set("source", "oauth");
        loginUrl.searchParams.set("response", params.response);

        let auth0LoginParams = {};

        if(rootStore.darkMode) {
          auth0LoginParams.darkMode = true;
        }

        if(customizationOptions?.disable_third_party) {
          auth0LoginParams.disableThirdParty = true;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        window.auth0.loginWithRedirect({
          redirectUri: loginUrl.toString(),
          initialScreen: mode === "create" ? "signUp" : "login",
          ...auth0LoginParams
        });
      }
    }
  };

  // Handle login event, popup flow, and auth0 logout
  useEffect(() => {
    const Respond = () => {
      window.opener.postMessage({
        type: "LoginResponse",
        params: {
          clientAuthToken: rootStore.AuthInfo().clientAuthToken,
          clientSigningToken: rootStore.AuthInfo().clientSigningToken
        }
      });

      window.close();
    };

    if(params.clearAuth0Login) {
      const returnURL = new URL(window.location.href);
      returnURL.pathname = returnURL.pathname.replace(/\/$/, "");
      returnURL.hash = window.location.hash;
      returnURL.searchParams.delete("clear");

      setTimeout(() => rootStore.SignOut(returnURL.toString()), 1000);
    } else if(rootStore.loaded && params.source === "parent" && params.action === "login") {
      // Opened from frame - do appropriate login flow
      Authenticate({provider: params.provider, mode: params.mode})
        .then(() => {
          if(params.provider !== "oauth") {
            Respond();
          }
        });
    } else if(rootStore.loggedIn && params.response === "message") {
      // Opened from frame and logged in, respond with auth info
      Respond();
    }
  }, [rootStore.loaded, rootStore.loggedIn]);

  return (
    <div className={`login-page ${rootStore.darkMode ? "login-page--dark" : ""} ${customizationOptions?.large_logo_mode ? "login-page-large-logo-mode" : ""}`}>
      <Background customizationOptions={customizationOptions} Close={Close} />

      <div className="login-page__login-box">
        <Form userData={userData} setUserData={setUserData} Authenticate={Authenticate} customizationOptions={customizationOptions} />
      </div>
    </div>
  );
});

const Login = observer(({darkMode, Close}) => {
  const [customizationOptions, setCustomizationOptions] = useState(undefined);
  const [userData, setUserData] = useState(params.userData || {});

  // Loading customization options
  useEffect(() => {
    rootStore.LoadLoginCustomization(params.marketplace)
      .then(options => {
        const userDataKey = `login-data-${options?.marketplaceId || "default"}`;

        // Load initial user data from localstorage, if present
        let initialUserData = { share_email: true };
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
  }, []);

  darkMode = customizationOptions && typeof customizationOptions.darkMode === "boolean" ? customizationOptions.darkMode : darkMode;

  /*
  if(!rootStore.loaded || !customizationOptions || (!rootStore.embedded && !rootStore.loginLoaded)) {
    return (
      <div className={`login-page ${darkMode ? "login-page--dark" : ""}`}>
        <Background customizationOptions={customizationOptions} Close={() => Close && Close()} />

        <div className="login-page__login-box">
          <PageLoader />
        </div>
      </div>
    );
  }

   */

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
