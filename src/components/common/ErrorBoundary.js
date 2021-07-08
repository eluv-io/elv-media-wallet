import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: undefined
    };
  }

  componentDidCatch(error) {
    this.setState({error});
  }

  render() {
    if(this.state.error) {
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
    <ErrorBoundary className={props._errorBoundaryClassname}>
      <Component {...props} />
    </ErrorBoundary>
);

export {
  ErrorBoundary,
  ErrorWrapper
};
