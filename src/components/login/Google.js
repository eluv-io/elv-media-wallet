import React, { useEffect } from "react";
import SignInButtonImage from "Assets/images/btn_google_signin_dark_normal_web@2x.png";
import {rootStore} from "Stores/index";

const GoogleLogin = ({setLoading}) => {
  useEffect(() => {
    gapi.load("auth2", async () => {
      const GoogleAuth = await gapi.auth2.init({clientID: EluvioConfiguration["google-client-id"]});

      const SetUser = async (user) => {
        try {
          window.user = user;
          setLoading(true);

          const profile = user.getBasicProfile();
          const {id_token, access_token} = user.getAuthResponse(true);

          const userData = {
            // id: user.getAuthResponse().id_token,
            id: profile.getId(),
            id_token,
            access_token,
            name: profile.getName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl()
          };
          console.log(userData.id);
          console.log(id_token);
          console.log(user.getAuthResponse().id_token);

          await rootStore.InitializeClient({user: userData, authService: "google"});

          rootStore.SetIdToken("google", id_token);
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
          if(rootStore.IdToken("google")) {
            try {
              setLoading(true);
              await rootStore.InitializeClient({idToken: rootStore.IdToken("google"), authService: "google"});
            } finally {
              setLoading(false);
            }
          } else {
            await gapi.auth2.getAuthInstance().signIn({});
          }
        } catch(error) {
          rootStore.Log(error, true);
        }
      }}
    >
      <img src={SignInButtonImage} alt="Sign in with Google" />
    </button>
  );
};

export default GoogleLogin;
