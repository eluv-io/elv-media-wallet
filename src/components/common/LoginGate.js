import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Redirect} from "react-router-dom";

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

export const LoginRedirectGate = observer(({to, children}) => {
  if(!rootStore.loggedIn) {
    return <Redirect to={to} />;
  }

  return children;
});
