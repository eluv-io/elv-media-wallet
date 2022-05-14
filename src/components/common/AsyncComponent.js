import React from "react";
import {observer} from "mobx-react";
import {Loader} from "./Loaders";
import {ErrorBoundary} from "./ErrorBoundary";

let loaded = {};

class AsyncComponent extends React.Component {
  constructor(props) {
    super(props);

    const cache = (props.cacheSeconds || 0) * 1000;

    this.state = {
      loading: !props.loadKey || !loaded[props.loadKey] || (Date.now() - loaded[props.loadKey]) > cache
    };
  }

  async componentDidMount() {
    if(!this.state.loading) { return; }

    this.mounted = true;

    // Wait a bit to avoid react mount-unmount bounce
    await new Promise(resolve => setTimeout(resolve, 50));
    if(!this.mounted) {
      return;
    }

    this.setState({
      loading: true
    });

    await this.props.Load();

    if(this.props.loadKey) {
      loaded[this.props.loadKey] = Date.now();
    }

    if(this.mounted) {
      this.setState({
        loading: false
      });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    if(this.state.loading) {
      return <Loader className={this.props.loadingClassName} />;
    }

    return this.props.render ? this.props.render() : this.props.children;
  }
}

const AsyncComponentEB = observer((props) => {
  return (
    <ErrorBoundary>
      <AsyncComponent {...props} />
    </ErrorBoundary>
  );
});

export default AsyncComponentEB;
