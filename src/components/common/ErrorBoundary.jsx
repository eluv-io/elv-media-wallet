import React from "react";
import {Redirect, withRouter} from "react-router-dom";
import {rootStore} from "Stores";

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false
    };
  }

  componentDidUpdate(prevProps) {
    if(this.props.location.pathname !== prevProps.location.pathname) {
      this.setState({error: undefined});
      rootStore.SetDebugMessage(undefined);
    }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({hasError: true});

    rootStore.SetDebugMessage(
      "Debug Trace:" + "\n\n" +
      error.toString() + "\n\n" +
      errorInfo.componentStack
    );
  }

  render() {
    if(this.state.hasError) {
      if(this.props.redirectOnError) {
        return <Redirect to={this.props.To(this.props.match)} />;
      }

      if(this.props.hideOnError) {
        return null;
      }

      return (
        <div className={`error-section ${this.props.className || ""}`}>
          { rootStore.l10n.errors.general }
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary = withRouter(ErrorBoundaryClass);

export { ErrorBoundary };
