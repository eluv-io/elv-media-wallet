import React from "react";
import { withRouter } from "react-router-dom";

class ScrollToTop extends React.Component {
  async componentDidUpdate(prevProps) {
    if(this.props.location !== prevProps.location) {
      await new Promise(resolve => setTimeout(resolve, 100));
      window.scrollTo(0, 0);
    }
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(ScrollToTop);
