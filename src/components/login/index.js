import React, { useState, useEffect } from "react";
import { Loader } from "Components/common/Loaders";
import { rootStore } from "Stores/index";
import { observer } from "mobx-react";
import { useAuth0 } from "@auth0/auth0-react";
import ImageIcon from "Components/common/ImageIcon";

import Logo from "../../static/images/logo.svg";

const Login = observer(() => {
  const auth0 = useAuth0();

  const [loading, setLoading] = useState(false);
  const [showPrivateKeyForm, setShowPrivateKeyForm] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

  const SignIn = async () => {
    if(loading) { return; }
    console.log("SIGN IN");

    try {
      let idToken = rootStore.IdToken("auth0");
      let userData = {
        SignOut: async () => {
          auth0.logout({
            federated: true,
            returnTo: window.location.origin + window.location.pathname
          });
        }
      };

      if(!idToken && auth0.isAuthenticated) {
        idToken = (await auth0.getIdTokenClaims()).__raw;

        userData = {
          name: auth0.user.name,
          email: auth0.user.email,
          SignOut: async () => {
            auth0.logout({returnTo: window.location.origin + window.location.pathname});
          }
        };
      }

      if(!idToken) { return; }

      setLoading(true);
      await rootStore.InitializeClient({
        authService: "auth0",
        idToken,
        user: userData
      });

      rootStore.SetIdToken("auth0", idToken);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    SignIn();
  }, [auth0.isAuthenticated]);

  if(auth0.isLoading || loading) {
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
              <input name="privateKey" value={privateKey} onChange={event => setPrivateKey(event.target.value)}/>
            </div>

            <div className="login-page__private-key-form__actions">
              <button
                onClick={() => setShowPrivateKeyForm(false)}
                className="login-page__private-key-form__button login-page__private-key-form__button-cancel"
              >
                Cancel
              </button>
              <button type="submit" className="login-page__private-key-form__button">
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
          className="login-page__login-button login-page__login-button-auth0"
          onClick={() => auth0.loginWithRedirect({})}
        >
          Sign In
        </button>
        <button className="login-page__login-button" onClick={() => setShowPrivateKeyForm(true)}>
          Or Sign In With Private Key
        </button>
      </div>
    </div>
  );
});

export default Login;
