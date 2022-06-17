import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useAuth0} from "@auth0/auth0-react";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";

import ImageIcon from "Components/common/ImageIcon";
import {Loader, PageLoader} from "Components/common/Loaders";

import UpCaretIcon from "./static/up-caret.svg";
import DownCaretIcon from "./static/down-caret.svg";

import MetamaskIcon from "./static/metamask fox.png";

import EluvioLogo from "./static/logo.svg";

const embedded = window.top !== window.self || new URLSearchParams(window.location.search).has("e");

const searchParams = new URLSearchParams(window.location.search);

let newWindowAuth0Login = false;
let clearLogin = false;
try {
  newWindowAuth0Login =
    searchParams.has("l") ||
    sessionStorage.getItem("new-window-login");

  if(newWindowAuth0Login) {
    sessionStorage.setItem("new-window-login", "true");
  }

  clearLogin =
    searchParams.has("clear") ||
    (embedded && localStorage.getItem("signed-out"));
// eslint-disable-next-line no-empty
} catch(error) {}


// Methods

// Log in button clicked - either redirect to auth0, or open new window
const LogInRedirect = async ({auth0, callbackUrl, marketplaceHash, userData, darkMode, create=false, customizationOptions, SignIn}) => {
  await new Promise((resolve, reject) => {
    // Embedded
    if(embedded) {
      const url = new URL(window.location.origin);
      url.pathname = window.location.pathname;
      url.searchParams.set("l", "");

      if(marketplaceHash) {
        url.searchParams.set("mid", marketplaceHash);
      }

      if(userData) {
        url.searchParams.set("ld", btoa(JSON.stringify(userData)));
      }

      if(darkMode) {
        url.searchParams.set("dk", "");
      }

      if(create) {
        url.searchParams.set("create", "");
      }

      if(clearLogin) {
        url.searchParams.set("clear", "");
      }

      const newWindow = window.open(url.toString());

      const closeCheck = setInterval(function() {
        if(newWindow.closed) {
          clearInterval(closeCheck);
          reject();
        }
      }, 250);

      window.addEventListener("message", async event => {
        if(!event || !event.data || event.data.type !== "LoginResponse") {
          return;
        }

        await SignIn({idToken: event.data.params.idToken, user: event.data.params.user});

        newWindow.close();

        resolve();
      });
    } else {
      // Not embedded
      let auth0LoginParams = {};

      if(darkMode) {
        auth0LoginParams.darkMode = true;
      }

      if(customizationOptions.disable_third_party) {
        auth0LoginParams.disableThirdParty = true;
      }

      auth0.loginWithRedirect({
        redirectUri: callbackUrl,
        initialScreen: create ? "signUp" : "login",
        ...auth0LoginParams
      });

      resolve();
    }
  });
};

const Authenticate = async ({auth0, idToken, user, userData, tenantId, SignIn}) => {
  if(!auth0?.isAuthenticated && !idToken) {
    throw Error("Not authenticated");
  }

  if(auth0) {
    idToken = (await auth0.getIdTokenClaims()).__raw;

    user = {
      name: auth0?.user?.name,
      email: auth0?.user?.email,
      verified: auth0?.user?.email_verified,
      userData
    };
  }

  if(!idToken) {
    throw Error("ID token not retrievable");
  }

  if(!user.email) {
    throw Error("Email not retrievable");
  }

  if(newWindowAuth0Login) {
    window.opener.postMessage({
      type: "LoginResponse",
      params: {
        idToken,
        user
      }
    });

    window.close();
    return;
  }

  await SignIn({
    idToken,
    tenantId,
    user
  });
};



// Components
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
const Buttons = ({customizationOptions, loading, Auth0LogIn, SignIn}) => {
  const [showWalletOptions, setShowWalletOptions] = useState(searchParams.has("swl"));

  let hasLoggedIn = false;
  try {
    hasLoggedIn = localStorage.getItem("hasLoggedIn");
  // eslint-disable-next-line no-empty
  } catch(error) {}

  const signUpButton = (
    <button
      className={`action ${hasLoggedIn ? "" : "action-primary"} login-page__login-button login-page__login-button-create login-page__login-button-auth0`}
      style={{
        color: customizationOptions?.sign_up_button?.text_color?.color,
        backgroundColor: customizationOptions?.sign_up_button?.background_color?.color,
        border: `0.75px solid ${customizationOptions?.sign_up_button?.border_color?.color}`
      }}
      autoFocus={!hasLoggedIn}
      onClick={() => Auth0LogIn({create: true})}
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
      onClick={() => Auth0LogIn({create: false})}
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
      onClick={() => SignIn({
        tenantId: customizationOptions.tenant_id,
        externalWallet: "Metamask",
        SignIn
      })}
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
};

const LoginComponent = observer(({customizationOptions, darkMode, userData, setUserData, loading, Auth0LogIn, SignIn, Close}) => {
  return (
    <div className={`login-page ${darkMode ? "login-page--dark" : ""} ${customizationOptions?.large_logo_mode ? "login-page-large-logo-mode" : ""}`}>
      <Background customizationOptions={customizationOptions} Close={Close} />

      <div className="login-page__login-box">
        <Logo customizationOptions={customizationOptions} />
        <Buttons loading={loading} customizationOptions={customizationOptions} Auth0LogIn={Auth0LogIn} SignIn={SignIn} />
        <PoweredBy customizationOptions={customizationOptions} />
        <Terms customizationOptions={customizationOptions} userData={userData} setUserData={setUserData}/>
      </div>
    </div>
  );
});

const Login = observer(({silent, darkMode, callbackUrl, authenticating, signedIn, Loaded, SignIn, SignOut, LoadCustomizationOptions, Close}) => {
  const [customizationOptions, setCustomizationOptions] = useState(undefined);
  const [userData, setUserData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [auth0Loading, setAuth0Loading] = useState(!embedded);

  let auth0;
  if(!embedded) {
    auth0 = useAuth0();
    window.auth0 = auth0;
  }

  const Auth0LogIn = ({create=true}) => {
    LogInRedirect({
      auth0,
      callbackUrl,
      marketplaceHash: customizationOptions?.marketplaceHash,
      userData,
      darkMode,
      create,
      customizationOptions,
      SignIn: async ({idToken, user}) => {
        try {
          setLoading(true);

          await Authenticate({idToken, user, userData, tenantId: customizationOptions.tenant_id, SignIn});
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Track auth0 loading status
  useEffect(() => {
    if(auth0) {
      setAuth0Loading(auth0.isLoading);
    }
  }, [auth0 && auth0.isLoading]);

  // Ensure auth0 doesn't get stuck loading forever
  useEffect(() => {
    if(auth0) {
      const auth0LoadTimeout = setTimeout(() => {
        setAuth0Loading(false);
      }, 5000);

      return () => clearTimeout(auth0LoadTimeout);
    }
  }, []);

  // Loading customization options
  useEffect(() => {
    LoadCustomizationOptions()
      .then(options => {
        setCustomizationOptions({...(options || {})});

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
      });
  }, []);

  // Authenticate if possible
  useEffect(() => {
    if(signedIn) {
      setLoading(false);
      return;
    }

    // Must wait for customization to be loaded so we can pass tenant ID
    if((!embedded && auth0Loading) || !customizationOptions || !userData) { return; }

    if(!embedded && auth0?.isAuthenticated) {
      setLoading(true);
      Authenticate({auth0, userData, tenantId: customizationOptions.tenant_id, SignIn})
        .finally(() => {
          Loaded && Loaded();
          setLoading(false);
        });
    } else if(newWindowAuth0Login) {
      if(clearLogin && SignOut) {
        const returnURL = new URL(window.location.href);
        returnURL.pathname = returnURL.pathname.replace(/\/$/, "");
        returnURL.searchParams.delete("clear");

        SignOut(returnURL.toString());

        return;
      }

      Auth0LogIn({create: new URLSearchParams(window.location.search).has("create")});
    } else {
      Loaded && Loaded();
      setLoading(false);
    }
  }, [customizationOptions, auth0Loading, userData]);

  // Do login processes without UI
  if(silent) {
    return null;
  }

  darkMode = customizationOptions && typeof customizationOptions.darkMode === "boolean" ? customizationOptions.darkMode : darkMode;

  if(loading || !customizationOptions || (!embedded && auth0Loading)) {
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
      loading={loading || authenticating}
      Auth0LogIn={Auth0LogIn}
      SignIn={SignIn}
      Close={() => Close && Close()}
    />
  );
});

export default Login;
