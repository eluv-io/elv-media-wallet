## [Eluvio Media Wallet](https://wallet.contentfabric.io/#/)

An embeddable crypto wallet and content presentation app for buying, selling and collecting NFTs on the Eluvio Content Fabric.

### Developing on the Eluvio Marketplace

There are two JavaScript clients available for development in the Eluvio marketplace ecosystem.

The Eluvio Wallet Client is a standard client that offers much of the functionality of the Eluvio Media Wallet application.

The Eluvio Wallet Frame Client is a client that allows you to embed the entire Eluvio Media Wallet application into your own application, using an iframe or a popup. The client allows you to control the frame, retrieve information, and register callbacks for events.

Both of these clients allow for retrieving various information about the user and their wallet, signing transactions (via built-in custodial signing or connected non-custodial signing wallets), and operating backend Marketplace objects. The Marketplace object can be populated with items that can be sold via the Content Fabric payment APIs, minted on demand, and listed and sold for secondary sale via the listing APIs.

For information about implementing login using the wallet and/or frame client, please see this [example application](https://core.test.contentfabric.io/elv-media-wallet-client-test/test-login/) (source available in `test/login.js`)

###

### Eluvio Wallet Client

Most functionality of the Eluvio Media Wallet is available in the Eluvio Wallet Client.

### [Eluvio Wallet Client Documentation](https://eluv-io.github.io/elv-client-js/wallet-client/index.html)

###

### Eluvio Wallet Frame Client

The Eluvio Media Wallet application can also be easily embedded into your web application using the Eluvio Wallet Frame Client.

The frame client works by loading the wallet application in either an iframe or a popup and using message passing to send information and commands to and from your application.

You can use the client to retrieve various information about the user and their wallet, navigate the wallet application to various pages, and register event handlers for when the user logs in or out, navigates to a different page, or when the window is closed.

The Eluvio Live site uses this model, embedding the wallet application in an iframe and controlling it with the client. You can see this in action on Eluvio LIVE sites at [https://live.eluv.io](https://live.eluv.io).

Please read the client documentation for more details:
### [Eluvio Wallet Frame Client API Documentation](https://eluv-io.github.io/elv-media-wallet/ElvWalletFrameClient.html)

#### Basic Usage

```
npm install "@eluvio/elv-wallet-frame-client"
```

```javascript
import { ElvWalletFrameClient } from "@eluvio/elv-wallet-frame-client";

// Initialize in iframe at target element
const walletFrameClient = await ElvWalletFrameClient.InitializeFrame({
  requestor: "My App",
  walletAppUrl: "https://wallet.contentfabric.io",
  target: document.getElementById("#wallet-target")
});
    
// Or initialize in a popup
const walletFrameClient = await ElvWalletFrameClient.InitializePopup({
  requestor: "My App",
  walletAppUrl: "https://wallet.contentfabric.io",
});
```



