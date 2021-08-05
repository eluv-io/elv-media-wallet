import React, { useState } from "react";
import Auth0Login from "./Auth0";
import { Loader } from "Components/common/Loaders";
import { rootStore } from "Stores/index";
import { observer } from "mobx-react";

const Login = observer(() => {
  const [loading, setLoading] = useState(false);
  const [showPrivateKeyForm, setShowPrivateKeyForm] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

  if(loading) {
    return (
      <div className="page-container login-page">
        <div className="login-page__login-box" key={`login-box-${rootStore.accountLoading}`}>
          <h2 className="login-page__login-box__login-status">
            {rootStore.loginStatus}
          </h2>
          <Loader />
        </div>
      </div>
    );
  }

  if(showPrivateKeyForm) {
    return (
      <div className="page-container login-page">
        <div className="login-page__login-box">
          <h1>Enter your Private Key</h1>

          <form
            className="login-page__private-key-form"
            onSubmit={async event => {
              event.preventDefault();
              try {
                setLoading(true);

                await rootStore.InitializeClient({ privateKey });
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="labelled-field">
              <label htmlFor="privateKey">Private Key</label>
              <input name="privateKey" value={privateKey} onChange={event => setPrivateKey(event.target.value)} />
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
  // useEffect(() => {
  //   id_token = getIDToken().then((token) => {return token;});
  //   return;
  // }, [isAuthenticated]);

  return (
    <div className="page-container login-page">
      <div className="login-page__login-box" key={`login-box-${rootStore.accountLoading}`}>
        <h1>Sign In</h1>
        <Auth0Login setLoading={setLoading}/>
        <button className="login-page__login-button" onClick={() => setShowPrivateKeyForm(true)}>
          Sign In With Private Key
        </button>
      </div>
    </div>
  );
});

export default Login;
