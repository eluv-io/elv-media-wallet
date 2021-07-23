/* AppFrame

This is a sandboxed frame that includes a message passing interface
to allow the contained app to request fabric / blockchain API requests
from the core app, which owns user account information and keys
*/

import React from "react";
import UrlJoin from "url-join";
import {Redirect, withRouter} from "react-router";

import {FrameClient} from "@eluvio/elv-client-js/src/FrameClient";
import {Confirm} from "elv-components-js";
import {inject, observer} from "mobx-react";
import {Debounce} from "elv-components-js";

class IFrameBase extends React.Component {
  SandboxPermissions() {
    return [
      "allow-downloads",
      "allow-scripts",
      "allow-forms",
      "allow-modals",
      "allow-pointer-lock",
      "allow-orientation-lock",
      "allow-popups",
      "allow-presentation",
      "allow-same-origin",
      "allow-downloads-without-user-activation"
    ].join(" ");
  }

  shouldComponentUpdate() { return false; }

  componentDidMount() {
    window.addEventListener("message", this.props.listener);
  }

  componentWillUnmount() {
    window.removeEventListener("message", this.props.listener);
  }

  render() {
    return (
      <iframe
        aria-label={`Eluvio Core Application: ${this.props.appName}`}
        ref={this.props.appRef}
        allow="encrypted-media *"
        src={this.props.appUrl}
        sandbox={this.SandboxPermissions()}
        className={this.props.className}
        allowFullScreen={true}
      />
    );
  }
}

const IFrame = React.forwardRef(
  (props, appRef) => <IFrameBase appRef={appRef} {...props} />
);

@inject("rootStore")
@inject("accountsStore")
@observer
class AppFrame extends React.Component {
  constructor(props) {
    super(props);

    const appName = this.props.match.params.app;
    const basePath = UrlJoin("/apps", appName);
    const appPath = window.location.hash.replace(basePath, "").replace(encodeURI(basePath), "").substr(1) || "";
    const appUrl = UrlJoin(EluvioConfiguration.apps[appName], appPath);

    this.state = {
      appRef: React.createRef(),
      appName,
      appUrl,
      basePath,
      profileAccessAllowed: false,
      confirmPromise: undefined
    };

    // Update account balance when making requests
    this.UpdateBalance = Debounce(
      () => this.props.accountsStore.AccountBalance(this.props.accountsStore.currentAccountAddress),
      5000
    );

    this.ApiRequestListener = this.ApiRequestListener.bind(this);
  }

  // Ensure region is reset if app changed it
  async componentWillUnmount() {
    await this.props.rootStore.client.ResetRegion();
    await this.props.rootStore.client.SetStaticToken({token: undefined});
  }

  async CheckAccess(event) {
    if(FrameClient.PromptedMethods().includes(event.data.calledMethod)) {
      const accessLevel = await this.props.rootStore.client.userProfileClient.AccessLevel();

      // No access to private profiles
      if(accessLevel === "private") { return false; }

      // Prompt for access
      if(accessLevel === "prompt") {
        const requestor = this.state.appName;
        const accessAllowed =
          this.state.profileAccessAllowed ||
          await this.props.rootStore.client.userProfileClient.UserMetadata({
            metadataSubtree: UrlJoin("allowed_accessors", requestor)
          });

        if(!accessAllowed) {
          if(!this.state.confirmPromise) {
            this.setState({
              confirmPromise: Confirm({
                message: `Do you want to allow the application "${requestor}" to access your profile?`,
                onConfirm: async () => {
                  // Record permission
                  await this.props.rootStore.client.userProfileClient.ReplaceUserMetadata({
                    metadataSubtree: UrlJoin("allowed_accessors", requestor),
                    metadata: Date.now()
                  });

                  await new Promise(resolve =>
                    this.setState({
                      profileAccessAllowed: true
                    }, resolve)
                  );
                }
              })
            });
          }

          await this.state.confirmPromise;

          this.setState({confirmPromise: undefined});

          if(!this.state.profileAccessAllowed) {
            return false;
          }
        }
      }

      // Otherwise public access
    }

    // If making a user metadata call, namespace metadata under app subtree
    if(FrameClient.MetadataMethods().includes(event.data.calledMethod)) {
      event.data.args = {
        ...event.data.args,
        metadataSubtree: UrlJoin(this.state.appName, event.data.args.metadataSubtree || "")
      };
    }

    return true;
  }

  Respond(requestId, source, responseMessage) {
    responseMessage = this.props.rootStore.client.utils.MakeClonable({
      ...responseMessage,
      requestId: requestId,
      type: "ElvFrameResponse"
    });

    try {
      source.postMessage(
        responseMessage,
        "*"
      );
    } catch (error) {
      /* eslint-disable no-console */
      console.error("Error responding to message");
      console.error(responseMessage);
      console.error(error);
      /* eslint-enable no-console */
    }

    this.UpdateBalance();
  }

  // Listen for API request messages from frame
  // TODO: Validate origin
  async ApiRequestListener(event) {
    // Ignore unrelated messages
    if(!event || !event.data || event.data.type !== "ElvFrameRequest") { return; }

    const requestId = event.data.requestId;
    const source = event.source;

    switch (event.data.operation) {
      // App requested its app path
      case "GetFramePath":
        // TODO: Replace with match params
        const appLocation = window.location.hash.replace(`#${this.state.basePath}`, "") || "/";

        this.Respond(requestId, source, {response: appLocation});
        break;

      // App requested to push its new app path
      case "SetFramePath":
        let appPath = event.data.path.replace(/^\/+/, "");
        if(appPath.startsWith("#")) {
          // UrlJoin eats leading slash if followed by #
          appPath = UrlJoin(this.state.basePath, "/", appPath);
        } else {
          appPath = UrlJoin(this.state.basePath, appPath);
        }

        history.replaceState(null, null, `#${appPath}`);

        this.Respond(requestId, source, {response: "Set path " + event.data.path});
        break;

      case "ShowAccountsPage":
        this.setState({
          redirectLocation: "/accounts"
        });
        break;

      case "ShowAppsPage":
        this.props.rootStore.ToggleHeader(true);
        this.setState({
          redirectLocation: "/apps"
        });
        break;

      case "ShowHeader":
        this.props.rootStore.ToggleHeader(true);
        break;

      case "HideHeader":
        this.props.rootStore.ToggleHeader(false);
        break;

      // App requested an ElvClient method
      default:
        if(!(await this.CheckAccess(event))) {
          this.Respond(requestId, source, {error: new Error("Access denied")});
          return;
        }

        const responder = (response) => this.Respond(response.requestId, source, response);
        await this.props.rootStore.client.CallFromFrameMessage(event.data, responder);
    }
  }

  render() {
    if(this.state.redirectLocation) {
      return <Redirect push to={this.state.redirectLocation} />;
    }

    if(!this.state.appUrl) {
      return <Redirect to={"/apps"} />;
    }

    if(!this.props.rootStore.client) {
      return null;
    }

    return (
      <IFrame
        ref={this.state.appRef}
        appName={this.state.appName}
        appUrl={this.state.appUrl}
        listener={this.ApiRequestListener}
        className="app-frame"
      />
    );
  }
}

export default withRouter(AppFrame);
