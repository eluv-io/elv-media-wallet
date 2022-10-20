import React from "react";
import { withRouter } from "react-router-dom";
import {ScrollTo} from "../../utils/Utils";

class ScrollToTop extends React.Component {
  async componentDidUpdate(prevProps) {
    if(this.props.location !== prevProps.location) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const target = document.querySelector("#top-scroll-target");

      if(target) {
        ScrollTo(target.getBoundingClientRect().top + window.scrollY);
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
