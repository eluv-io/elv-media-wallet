import React from "react";
import SignInButtonImage from "Assets/images/appleid_button@4x.png";
import { rootStore } from "Stores/index";

const parseJWT = (token) => {
  let base64Url = token.split(".")[1];
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  let jsonPayload = decodeURIComponent(atob(base64).split("").map(function (c) {
    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(""));

  return JSON.parse(jsonPayload);
};

const AppleLogin = ({ setLoading }) => {

  const SetUser = async (response) => {
    try {
      setLoading(true);
      let id_token = response.authorization.id_token;
      let jwtObject = parseJWT(id_token);
      const userData = {
        id_token,
        name: response.user ? response.user.firstName + " " + response.user.lastName : null,
        email: jwtObject.email,
        SignOut: async () => {}
      };

      await rootStore.InitializeClient({ user: userData });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="login-page__login-button login-page__login-button-image login-page__login-button-google"
      onClick={async () => {
        try {
          SetUser(await AppleID.auth.signIn({}));
        } catch(error) {
          console.error(error);
        }
      }}
    >
      <img src={SignInButtonImage} alt="Sign in with Apple" />
    </button>
  );
};

export default AppleLogin;
