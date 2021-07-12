import React, { useEffect } from "react";
import SignInButtonImage from "Assets/images/btn_google_signin_dark_normal_web@2x.png";
import {rootStore} from "Stores/index";

const GoogleLogin = ({setLoading}) => {
  useEffect(() => {
    gapi.load("auth2", async () => {
      const GoogleAuth = await gapi.auth2.init({clientID: EluvioConfiguration["google-client-id"]});

      const SetUser = async (user) => {
        try {
          setLoading(true);

          const profile = user.getBasicProfile();
          const {id_token, access_token} = user.getAuthResponse(true);
          const userData = {
            id: profile.getId(),
            id_token,
            access_token,
            name: profile.getName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl(),
            SignOut: async () => {
              await user.disconnect();
              await gapi.auth2.getAuthInstance().signOut();
            }
          };

          await rootStore.InitializeClient({user: userData});
        } finally {
          setLoading(false);
        }
      };

      GoogleAuth.currentUser.listen(user => {
        SetUser(user);
      });
    }, []);
  });

  return (
    <button
      className="login-page__login-button login-page__login-button-image login-page__login-button-google"
      onClick={async () => {
        try {
          await gapi.auth2.getAuthInstance().signIn({});
        } catch(error) {
          console.error(error);
        }
      }}
    >
      <img src={SignInButtonImage} alt="Sign in with Google" />
    </button>
  );
};

export default GoogleLogin;
