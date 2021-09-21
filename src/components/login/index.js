// Note: Auth0 must not be activated if in an iframe

import React, { useState, useEffect } from "react";
import { Loader } from "Components/common/Loaders";
import { rootStore } from "Stores/index";
import { observer } from "mobx-react";
import { useAuth0 } from "@auth0/auth0-react";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import Logo from "../../static/images/logo.svg";

let newWindowLogin =
  new URLSearchParams(window.location.search).has("l") ||
  !rootStore.embedded && sessionStorage.getItem("new-window-login");

const callbackUrl = UrlJoin(window.location.origin, window.location.pathname).replace(/\/$/, "");

const SignalOpener = () => {
  if(!window.opener || !newWindowLogin || !rootStore.AuthInfo()) { return; }

  window.opener.postMessage({
    type: "ElvMediaWalletClientRequest",
    action: "login",
    params: rootStore.AuthInfo()
  });

  window.close();
};

const Login = observer(() => {
  const [loading, setLoading] = useState(false);
  const [eventInfoLoading, setEventInfoLoading] = useState(!!rootStore.eventId);
  const [auth0Loading, setAuth0Loading] = useState(true);
  const [showPrivateKeyForm, setShowPrivateKeyForm] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

  const url = new URL(window.location.origin);
  url.pathname = window.location.pathname;
  url.searchParams.set("l", "");

  if(rootStore.eventId) {
    url.searchParams.set("eid", rootStore.eventId);
  }

  if(rootStore.darkMode) {
    url.searchParams.set("d", "");
  }

  const signInUrl = url.toString();
  url.searchParams.set("create", "");
  const createUrl = url.toString();

  let auth0;
  const SignIn = async () => {
    if(loading) { return; }

    try {
      const authInfo = rootStore.AuthInfo();

      if(authInfo) {
        setLoading(true);
        await rootStore.InitializeClient({
          authToken: authInfo.token,
          address: authInfo.address,
          user: authInfo.user
        });

        SignalOpener();

        return;
      }

      if(typeof auth0 === "undefined") {
        return;
      }

      let idToken;

      let userData;
      if(auth0.isAuthenticated) {
        idToken = (await auth0.getIdTokenClaims()).__raw;

        userData = {
          name: auth0.user.name,
          email: auth0.user.email,
          SignOut: async () => {
            auth0.logout({returnTo: UrlJoin(window.location.origin, window.location.pathname) + (rootStore.darkMode ? "?d" : "")});
          }
        };
      }

      if(!idToken) {
        return;
      }

      setLoading(true);
      await rootStore.InitializeClient({
        idToken,
        user: userData
      });

      SignalOpener();
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error(error);
      newWindowLogin = false;
    } finally {
      setLoading(false);
    }
  };

  if(!rootStore.embedded) {
    auth0 = useAuth0();
  }

  useEffect(() => {
    rootStore.LoadEventMetadata().then(() =>
      setEventInfoLoading(false)
    );
  }, []);

  useEffect(() => {
    SignalOpener();

    const authInfo = rootStore.AuthInfo();

    if(!loading && authInfo) {
      setLoading(true);
      rootStore.InitializeClient({
        authToken: authInfo.token,
        address: authInfo.address,
        user: authInfo.user
      });

      return;
    }

    if(rootStore.embedded) {
      setAuth0Loading(false);
    } else if(auth0.isAuthenticated) {
      SignIn();
    } else if(!rootStore.loggedIn && newWindowLogin && !sessionStorage.getItem("new-window-login")) {
      sessionStorage.setItem("new-window-login", "true");
      auth0.loginWithRedirect({
        redirectUri: callbackUrl,
        initialScreen: new URLSearchParams(window.location.search).has("create") ? "signUp" : "login"
      });
    } else if(sessionStorage.getItem("pk")) {
      rootStore.InitializeClient({privateKey: sessionStorage.getItem("pk")});
    } else if(!auth0.isLoading) {
      setAuth0Loading(false);
    }
  }, [auth0 && auth0.isAuthenticated, auth0 && auth0.isLoading]);

  useEffect(() => {
    if(!rootStore.navigateToLogIn) { return; }

    if(auth0) {
      auth0.loginWithRedirect({
        redirectUri: callbackUrl,
        initialScreen: rootStore.navigateToLogIn
      });
    } else {
      window.open(rootStore.navigateToLogIn === "signUp" ? window.open(createUrl) : window.open(signInUrl));
    }

    rootStore.SetNavigateToLogIn("");

  }, [rootStore.navigateToLogIn]);

  let logo;
  let customizationOptions = {};
  let background;
  let buttonStyle = {};
  if(!rootStore.eventId) {
    logo = <ImageIcon icon={Logo} className="login-page__logo" title="Eluv.io" />;
  } else if(rootStore.eventMetadata) {
    // Don't show logo if event meta has not yet loaded

    customizationOptions = (rootStore.eventMetadata || {}).login_customization || {};

    if(customizationOptions.logo) {
      logo = (
        <div className="login-page__logo-container">
          <ImageIcon
            icon={rootStore.PublicLink({versionHash: rootStore.eventHash, path: UrlJoin("public", "asset_metadata", "info", "login_customization", "logo")})}
            alternateIcon={Logo}
            className="login-page__logo"
            title="Logo"
          />
          <h2 className="login-page__tagline">
            Powered by <ImageIcon icon={Logo} className="login-page__tagline__image" title="Eluv.io" />
          </h2>
        </div>
      );
    } else {
      logo = <ImageIcon icon={Logo} className="login-page__logo" title="Eluv.io" />;
    }

    if(customizationOptions.background || customizationOptions.background_mobile) {
      let backgroundUrl = customizationOptions.background ? rootStore.PublicLink({versionHash: rootStore.eventHash, path: UrlJoin("public", "asset_metadata", "info", "login_customization", "background")}) : "";
      let mobileBackgroundUrl = customizationOptions.background_mobile ? rootStore.PublicLink({versionHash: rootStore.eventHash, path: UrlJoin("public", "asset_metadata", "info", "login_customization", "background_mobile")}) : "";

      if(rootStore.pageWidth > 900) {
        background = <div className="login-page__background" style={{ backgroundImage: `url("${backgroundUrl || mobileBackgroundUrl}")` }} />;
      } else {
        background = <div className="login-page__background" style={{ backgroundImage: `url("${mobileBackgroundUrl || backgroundUrl}")` }} />;
      }
    }

    if(customizationOptions.sign_in_button) {
      buttonStyle = {
        color: customizationOptions.sign_in_button.text_color.color,
        backgroundColor: customizationOptions.sign_in_button.background_color.color,
        border: `0.75px solid ${customizationOptions.sign_in_button.background_color.color}`
      };
    }
  }

  if(newWindowLogin || loading || eventInfoLoading || auth0Loading || rootStore.loggingIn) {
    return (
      <div className={`page-container login-page ${background ? "login-page-custom-background" : ""}`}>
        { background }
        <div className="login-page__login-box" key={`login-box-${rootStore.accountLoading}`}>
          { logo }
          <Loader />
        </div>
      </div>
    );
  }

  if(showPrivateKeyForm) {
    return (
      <div className={`page-container login-page ${background ? "login-page-custom-background" : ""}`}>
        { background }
        <div className="login-page__login-box">
          { logo }
          <h1>Enter your Private Key</h1>

          <form
            className="login-page__private-key-form"
            onSubmit={async event => {
              event.preventDefault();
              try {
                setLoading(true);

                await rootStore.InitializeClient({privateKey});
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="labelled-field">
              <label htmlFor="privateKey">Private Key</label>
              <input name="privateKey" type="text" value={privateKey} onChange={event => setPrivateKey(event.target.value)}/>
            </div>

            <div className="login-page__private-key-form__actions">
              <button
                onClick={() => setShowPrivateKeyForm(false)}
                className="login-page__private-key-form__button login-page__private-key-form__button-cancel login-page__login-button-cancel"
              >
                Cancel
              </button>
              <button type="submit" className="login-page__private-key-form__button login-page__private-key-form__button-submit" style={buttonStyle}>
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-container login-page ${background ? "login-page-custom-background" : ""}`}>
      { background }
      <div className="login-page__login-box" key={`login-box-${rootStore.accountLoading}`}>
        { logo }
        <button
          className="login-page__login-button login-page__login-button-create login-page__login-button-auth0"
          onClick={() => {
            if(!rootStore.embedded) {
              auth0.loginWithRedirect({
                redirectUri: callbackUrl,
                initialScreen: "signUp"
              });
            } else {
              window.open(createUrl);
            }
          }}
        >
          Create Account
        </button>
        <button
          style={buttonStyle}
          className="login-page__login-button login-page__login-button-auth0"
          onClick={() => {
            if(!rootStore.embedded) {
              auth0.loginWithRedirect({
                redirectUri: callbackUrl
              });
            } else {
              window.open(signInUrl);
            }
          }}
        >
          Sign In
        </button>
        <button className="login-page__login-button login-page__login-button-pk" onClick={() => setShowPrivateKeyForm(true)}>
          Or Sign In With Private Key
        </button>
      </div>
    </div>
  );
});

export default Login;
