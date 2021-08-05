import React from "react";
import { rootStore } from "Stores/index";
import { useAuth0 } from "@auth0/auth0-react";


const Auth0Login = ({ setLoading }) => {
  const { loginWithRedirect, user, getIdTokenClaims, logout } = useAuth0();

  const getIDToken = async () => {
    const claims = await getIdTokenClaims();
    // if you need the raw id_token, you can access it
    // using the __raw property
    return claims.__raw;
  };

  const SignIn = async () => {
    await loginWithRedirect();
    try {
      setLoading(true);
      let id_token = await getIDToken();
      // let jwtObject = parseJWT(id_token);
      const userData = {
        id_token,
        name: user.name,
        email: user.email,
        SignOut: async () => {
          logout();
        }
      };

      await rootStore.InitializeClient({ user: userData });
    } finally {
      console.log("failed");
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => { SignIn(); }}>Log In</button>
    </div>
  );
};

export default Auth0Login;
