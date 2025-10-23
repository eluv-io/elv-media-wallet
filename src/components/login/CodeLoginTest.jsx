import React, { useState, useEffect } from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Linkish, QRCodeElement} from "Components/common/UIComponents";
import {SHA512} from "../../utils/Utils";
import {Button} from "Components/properties/Common";
import {ElvClient, ElvWalletClient} from "@eluvio/elv-client-js";

const nonce = "TESTNONCE";

const CodeLoginTest = observer(() => {
  const [codeInfo, setCodeInfo] = useState(undefined);
  const [state, setState] = useState(undefined);
  const [client, setClient] = useState(undefined);

  // Generate code
  useEffect(() => {
    rootStore.walletClient.GenerateCodeAuth()
      .then(async response => {
        const url = new URL(response.url);
        url.searchParams.set("pid", rootStore.currentPropertySlug);
        url.searchParams.set("clear", "");
        //url.searchParams.set("nonce", "TESTNONCE");
        url.searchParams.set("installId", await SHA512(nonce));
        url.searchParams.set("origin", "CODE TEST LOGIN");

        setCodeInfo({...response, url: url.toString()});
      });
  }, []);

  // Check code
  useEffect(() => {
    if(!codeInfo) { return; }

    const checkInterval = setInterval(async () => {
      const response = await rootStore.walletClient.GetCodeAuth({
        code: codeInfo.code,
        passcode: codeInfo.passcode
      });

      if(!response) { return; }

      const authInfo = JSON.parse(response.payload);
      setState(authInfo);

      const client = await ElvClient.FromConfigurationUrl({
        configUrl:
          EluvioConfiguration.network === "main" ?
            "https://main.glb.contentfabric.io/s/main/config" :
            "https://demov3.net955210.contentfabric.io/config"
      });

      const walletClient = await ElvWalletClient.Initialize({
        client,
        appId: rootStore.appId,
        network: EluvioConfiguration.network,
        mode: EluvioConfiguration.mode,
        storeAuthToken: false,
        skipMarketplaceLoad: true
      });

      await walletClient.Authenticate({
        token: client.utils.B58(JSON.stringify(authInfo))
      });

      client.walletClient = walletClient;

      setClient(client);

      // eslint-disable-next-line no-console
      console.log(authInfo);

      /*
      authInfo.fabricToken = authInfo.token;

      rootStore.Authenticate({
        provider: authInfo.type,
        user: {
          email: authInfo.email
        },
        clientAuthToken: rootStore.client.utils.B58(JSON.stringify(authInfo))
      });

       */

      clearInterval(checkInterval);
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [codeInfo]);

  if(!codeInfo) {
    return null;
  }

  if(state) {
    return (
      <div className="code-test login-page">
        <div className="code-test__container">
          <div className="code-test__message">Login Successful!</div>
          {
            !state.email ? null :
              <div className="code-test__message">{state.email}</div>
          }
        </div>
        <Button
          onClick={async () => {
            setState(
              await client.signer.RefreshCSAT({
                accessToken: state.token,
                refreshToken: state.refreshToken || state.refresh_token,
                nonce
              })
            );
          }}
          className="code-test__refresh"
        >
          Refresh
        </Button>
        <pre className="code-test__response">
          { JSON.stringify(state, null, 2) }
        </pre>
      </div>
    );
  }

  return (
    <div className="code-test login-page">
      <div className="code-test__container">
        <QRCodeElement content={codeInfo.url} className="code-test__qr" />
        <div className="code-test__code">
          { codeInfo.code }
        </div>
        <Linkish href={codeInfo.url} target="_blank" className="code-test__button">
          Log In
        </Linkish>
      </div>
    </div>
  );
});

export default CodeLoginTest;
