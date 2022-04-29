import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Redirect} from "react-router-dom";

// Show only login page until logged in
export const LoginGate = observer(({children, ignoreCapture, loader}) => {
  useEffect(() => {
    rootStore.ShowLogin({requireLogin: true, ignoreCapture});

    return () => rootStore.HideLogin();
  }, [rootStore.showLogin]);

  if(!rootStore.loggedIn) { return loader || null; }

  return children;
});

// Show login when component is clicked, if not logged in
export const LoginClickGate = observer(({Component, ...props}) => {
  return (
    <Component
      {...props}
      onClick={
        rootStore.loggedIn ?
          props.onClick :
          () => rootStore.ShowLogin()
      }
    />
  );
});

// Redirect away if not logged in
export const LoginRedirectGate = observer(({to, children}) => {
  if(!rootStore.loggedIn) {
    return <Redirect to={to} />;
  }

  return children;
});
