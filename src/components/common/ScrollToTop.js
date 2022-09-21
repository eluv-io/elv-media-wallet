import React from "react";
import { withRouter } from "react-router-dom";

class ScrollToTop extends React.Component {
  async componentDidUpdate(prevProps) {
    if(this.props.location !== prevProps.location) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const target = document.querySelector("#top-scroll-target");

      if(target) {
        target?.scrollIntoView({block: "start", inline: "start", behavior: "smooth"});
      } else {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth"
        });
      }
    }
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(ScrollToTop);
