import React from "react";
import { withRouter } from "react-router-dom";
import {ScrollTo} from "../../utils/Utils";

class ScrollToTop extends React.Component {
  async componentDidUpdate(prevProps) {
    if(window.scrollY === 0) { return; }

    if(this.props.location?.pathname !== prevProps.location?.pathname) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const target = document.querySelector("#top-scroll-target");

      if(target) {
        ScrollTo(Math.max(0, (target.getBoundingClientRect().top + window.scrollY - 50)));
      } else {
        ScrollTo(0);
      }
    }
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(ScrollToTop);
