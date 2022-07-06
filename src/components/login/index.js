import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useAuth0} from "@auth0/auth0-react";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {rootStore} from "Stores";

import ImageIcon from "Components/common/ImageIcon";
import {Loader, PageLoader} from "Components/common/Loaders";

import UpCaretIcon from "Assets/icons/up-caret.svg";
import DownCaretIcon from "Assets/icons/down-caret.svg";
import MetamaskIcon from "Assets/icons/metamask fox.png";
import EluvioLogo from "Assets/icons/logo.svg";

const embedded = window.top !== window.self || new URLSearchParams(window.location.search).has("e");

const searchParams = new URLSearchParams(window.location.search);

const params = {
  source: searchParams.get("source"),
  action: searchParams.get("action"),
  provider: searchParams.get("provider"),
  mode: searchParams.get("mode"),
  response: searchParams.get("response"),
  redirect: searchParams.get("redirect"),
  clearAuth0Login: searchParams.has("clear") || (window.sessionStorageAvailable && localStorage.getItem("signed-out")),
  loginOnly: searchParams.has("lo"),
  userData: searchParams.has("data") ? JSON.parse(atob(searchParams.get("data"))) : { share_email: true }
};

// Automatic login when auth0 is authenticated
export const Auth0Authentication = observer(() => {
  if(!window.sessionStorageAvailable) { return; }

  const auth0 = useAuth0();

  useEffect(() => {
    if(!auth0.isLoading) {
      rootStore.SetLoginLoaded();
    }

    if(params.clearAuth0Login || !rootStore.loaded || rootStore.loggedIn || auth0.isLoading || !auth0.isAuthenticated) { return; }

    auth0.getIdTokenClaims()
      .then(async response => {
        await rootStore.Authenticate({
          idToken: response.__raw,
          tenantId: rootStore.specifiedMarketplace?.tenant_id,
          user: {
            name: auth0?.user?.name,
            email: auth0?.user?.email,
            verified: auth0?.user?.email_verified,
            userData: params.userData
          }
        });
      });
  }, [rootStore.loaded, auth0.isLoading, auth0.isAuthenticated]);

  return null;
});

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

const PoweredBy = ({customizationOptions}) => {
  if(!customizationOptions?.logo) { return null; }

  return (
    <div className="login-page__tagline">
      Powered by <ImageIcon icon={EluvioLogo} className="login-page__tagline__image" title="Eluv.io" />
    </div>
  );
};

const Background = ({customizationOptions, Close}) => {
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
};

const Consent = ({customizationOptions, userData, setUserData}) => {
  if(!customizationOptions?.require_consent) {
    return null;
  }

  return (
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
    </div>
  );
};

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

      <Consent userData={userData} setUserData={setUserData} customizationOptions={customizationOptions} />
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
const Buttons = observer(({customizationOptions, Authenticate}) => {
  const [showWalletOptions, setShowWalletOptions] = useState(searchParams.has("swl"));

  let hasLoggedIn = false;
  try {
    hasLoggedIn = localStorage.getItem("hasLoggedIn");
    // eslint-disable-next-line no-empty
  } catch(error) {}

  const loading = !rootStore.loaded || rootStore.authenticating || !rootStore.loginLoaded || rootStore.loggedIn || params.source === "parent";

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
      onClick={() => Authenticate({provider: "metamask"})}
    >
      <ImageIcon icon={MetamaskIcon} />
      Metamask
    </button>
  );

  return (
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
  );
});

const LoginComponent = observer(({customizationOptions, userData, setUserData, Close}) => {
  const Authenticate = async ({provider, mode}) => {
    if(provider === "metamask") {
      await rootStore.Authenticate({
        externalWallet: "Metamask",
        tenantId: customizationOptions?.tenant_id
      });
    } else if(provider === "oauth") {
      let loginUrl = new URL(window.location.origin);

      loginUrl.searchParams.set("action", "login");
      loginUrl.searchParams.set("provider", "oauth");
      loginUrl.searchParams.set("mode", mode);
      loginUrl.searchParams.set("data", btoa(JSON.stringify(userData)));

      if(customizationOptions?.marketplaceHash) {
        loginUrl.searchParams.set("mid", customizationOptions.marketplaceHash);
      }

      if(rootStore.darkMode) {
        loginUrl.searchParams.set("dk", "");
      }

      if(embedded) {
        loginUrl.hash = "/login";
        loginUrl.searchParams.set("response", "message");
        loginUrl.searchParams.set("source", "parent");

        if(searchParams.has("clear") || (window.sessionStorageAvailable && localStorage.getItem("signed-out"))) {
          loginUrl.searchParams.set("clear", "");
        }

        await new Promise(resolve => {
          const newWindow = window.open(loginUrl.toString());

          const closeCheck = setInterval(function() {
            if(newWindow.closed) {
              clearInterval(closeCheck);
              resolve();
            }
          }, 250);

          window.addEventListener("message", async event => {
            if(!event || !event.data || event.data.type !== "LoginResponse") {
              return;
            }

            await rootStore.Authenticate({
              clientAuthToken: event.data.params.clientAuthToken,
              clientSigningToken: event.data.params.clientSigningToken
            });

            newWindow.close();

            resolve();
          });
        });
      } else {
        loginUrl.hash = window.location.hash;
        loginUrl.searchParams.set("redirect", window.location.href);
        loginUrl.searchParams.set("action", "login");
        loginUrl.searchParams.set("source", "oauth");
        loginUrl.searchParams.set("response", params.response);

        // Not embedded
        let auth0LoginParams = {};

        if(rootStore.darkMode) {
          auth0LoginParams.darkMode = true;
        }

        if(customizationOptions?.disable_third_party) {
          auth0LoginParams.disableThirdParty = true;
        }

        window.auth0.loginWithRedirect({
          redirectUri: loginUrl.toString(),
          initialScreen: mode === "create" ? "signUp" : "login",
          ...auth0LoginParams
        });
      }
    }
  };

  useEffect(() => {
    if(params.clearAuth0Login) {
      const returnURL = new URL(window.location.href);
      returnURL.pathname = returnURL.pathname.replace(/\/$/, "");
      returnURL.hash = window.location.hash;
      returnURL.searchParams.delete("clear");

      rootStore.SignOut(returnURL.toString());
    } else if(params.source === "parent" && params.action === "login" && params.provider === "oauth") {
      Authenticate({provider: "oauth", mode: params.mode});
    } else if(rootStore.loggedIn && params.response === "message") {
      window.opener.postMessage({
        type: "LoginResponse",
        params: {
          clientAuthToken: rootStore.AuthInfo().clientAuthToken,
          clientSigningToken: rootStore.AuthInfo().clientSigningToken
        }
      });

      window.close();
    }
  }, [rootStore.loggedIn]);

  return (
    <div className={`login-page ${rootStore.darkMode ? "login-page--dark" : ""} ${customizationOptions?.large_logo_mode ? "login-page-large-logo-mode" : ""}`}>
      <Background customizationOptions={customizationOptions} Close={Close} />

      <div className="login-page__login-box">
        <Logo customizationOptions={customizationOptions} />
        <Buttons Authenticate={Authenticate} customizationOptions={customizationOptions} />
        <PoweredBy customizationOptions={customizationOptions} />
        <Terms customizationOptions={customizationOptions} userData={userData} setUserData={setUserData}/>
      </div>
    </div>
  );
});

const Login = observer(({darkMode, Close}) => {
  const [customizationOptions, setCustomizationOptions] = useState(undefined);
  const [userData, setUserData] = useState(params.userData || {});

  let auth0;
  if(!embedded) {
    auth0 = useAuth0();
    window.auth0 = auth0;
  }

  // Loading customization options
  useEffect(() => {
    rootStore.LoadLoginCustomization()
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

  if(!rootStore.loaded || !customizationOptions || (!embedded && !rootStore.loginLoaded)) {
    return (
      <div className={`login-page ${darkMode ? "login-page--dark" : ""}`}>
        <Background customizationOptions={customizationOptions} Close={() => Close && Close()} />

        <div className="login-page__login-box">
          <PageLoader />
        </div>
      </div>
    );
  }

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
