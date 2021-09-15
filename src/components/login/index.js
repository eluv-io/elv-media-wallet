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
  const [auth0Loading, setAuth0Loading] = useState(true);
  const [showPrivateKeyForm, setShowPrivateKeyForm] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

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
        redirectUri: callbackUrl
      });
    } else if(sessionStorage.getItem("pk")) {
      rootStore.InitializeClient({privateKey: sessionStorage.getItem("pk")});
    } else if(!auth0.isLoading) {
      setAuth0Loading(false);
    }
  }, [auth0 && auth0.isAuthenticated, auth0 && auth0.isLoading]);

  if(newWindowLogin || loading || auth0Loading || rootStore.loggingIn) {
    return (
      <div className="page-container login-page">
        <div className="login-page__login-box" key={`login-box-${rootStore.accountLoading}`}>
          <ImageIcon icon={Logo} className="login-page__logo" title="Eluvio" />
          <Loader />
        </div>
      </div>
    );
  }

  if(showPrivateKeyForm) {
    return (
      <div className="page-container login-page">
        <div className="login-page__login-box">
          <ImageIcon icon={Logo} className="login-page__logo" title="Eluvio" />
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
                className="login-page__private-key-form__button login-page__private-key-form__button-cancel"
              >
                Cancel
              </button>
              <button type="submit" className="login-page__private-key-form__button login-page__private-key-form__button-submit">
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container login-page">
      <div className="login-page__login-box" key={`login-box-${rootStore.accountLoading}`}>
        <ImageIcon icon={Logo} className="login-page__logo" title="Eluvio" />
        <button
          className="login-page__login-button login-page__login-button-create login-page__login-button-auth0"
          onClick={() => {
            if(!rootStore.embedded) {
              auth0.loginWithRedirect({
                redirectUri: callbackUrl
              });
            } else {
              window.open(`${window.location.origin}${window.location.pathname}?l${rootStore.darkMode ? "&d=" : ""}`);
            }
          }}
        >
          Create Account
        </button>
        <button
          className="login-page__login-button login-page__login-button-auth0"
          onClick={() => {
            if(!rootStore.embedded) {
              auth0.loginWithRedirect({
                redirectUri: callbackUrl
              });
            } else {
              window.open(`${window.location.origin}${window.location.pathname}?l${rootStore.darkMode ? "&d=" : ""}`);
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
