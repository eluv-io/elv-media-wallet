import React from "react";
import {Redirect, withRouter} from "react-router-dom";

@withRouter
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: undefined
    };
  }

  componentDidUpdate(prevProps) {
    if(this.props.location.pathname !== prevProps.location.pathname) {
      this.setState({error: undefined});
    }
  }

  componentDidCatch(error) {
    this.setState({error});
  }

  render() {
    if(this.state.error) {
      if(this.props.redirectOnError) {
        return <Redirect to={this.props.To(this.props.match)} />;
      }

      if(this.props.hideOnError) {
        return null;
      }

      return (
        <div className={`error-section ${this.props.className || ""}`}>
          We're sorry, something went wrong
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorWrapper = Component => (
  props =>
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
);

export {
  ErrorBoundary,
  ErrorWrapper
};
