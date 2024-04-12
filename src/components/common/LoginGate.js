import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";

// Show only login page until logged in
export const LoginGate = observer(({children, ignoreCapture, loader, backPath, Condition}) => {
  const match = useRouteMatch();
  const skip = Condition && !Condition(match);

  useEffect(() => {
    if(skip) { return; }

    rootStore.ShowLogin({requireLogin: true, backPath, ignoreCapture});

    return () => rootStore.HideLogin();
  }, [rootStore.showLogin, skip]);

  if(!rootStore.loggedIn && !skip) { return loader || null; }

  return children;
});

// Show login when component is clicked, if not logged in
export const LoginClickGate = observer(({Component, onLoginBlocked, ...props}) => {
  return (
    <Component
      {...props}
      onClick={
        rootStore.loggedIn ?
          props.onClick :
          async () => {
            if(onLoginBlocked) {
              await onLoginBlocked();
            }

            rootStore.ShowLogin();
          }
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
