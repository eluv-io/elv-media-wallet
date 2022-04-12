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

    try {
      await this.props.Load();

      if(this.props.loadKey) {
        loaded[this.props.loadKey] = Date.now();
      }

      if(this.mounted) {
        this.setState({
          loading: false
        });
      }
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.setState({error});
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error(error, errorInfo);
  }

  render() {
    if(this.state.error) {
      // Throw error synchronously for ErrorHandler to catch
      throw this.state.error;
    }

    if(this.state.loading) {
      return <Loader className={this.props.loadingClassName} />;
    }

    return this.props.render ? this.props.render() : this.props.children;
  }
}

const AsyncComponentErrorBoundary = observer((props) => {
  return (
    <ErrorBoundary>
      <AsyncComponent {...props} />
    </ErrorBoundary>
  );
});

export default AsyncComponentErrorBoundary;
