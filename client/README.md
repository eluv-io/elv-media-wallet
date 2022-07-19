## [Eluvio Media Wallet](https://wallet.contentfabric.io/#/)

An embeddable crypto wallet and content presentation app for buying, selling and collecting NFTs on the Eluvio Content Fabric.


### Embedding the Eluvio Media Wallet

The Media Wallet can be easily embedded into your web application using the wallet client.

The wallet client works by loading the wallet application in either an iframe or a popup and using message passing to send information and commands to and from your application.

You can use the client to retrieve various information about the user and their wallet, navigate the wallet application to various pages, and register event handlers for when the user logs in or out, or the window is closed.

The Wallet operates against a backend Marketplace object hosted in the Content Fabric.  The Marketplace object can be populated with items that can be sold via the Content Fabric payment APIs and listed for secondary sale via the listing APIs. 

The Eluvio Live site uses this model, embedding the wallet application in an iframe and controlling it with the client. You can see this in action on Eluvio LIVE sites at https://live.eluv.io.

Please read the client documentation for more details:
### [Wallet Client API Documentation](https://eluv-io.github.io/elv-media-wallet/ElvWalletFrameClient.html)

#### Basic Usage

```
npm install "@eluvio/elv-wallet-client"
```

```javascript
import { ElvWalletFrameClient } from "@eluvio/elv-wallet-client";

// Initialize in iframe at target element
const walletClient = await ElvWalletFrameClient.InitializeFrame({
  requestor: "My App",
  walletAppUrl: "https://wallet.contentfabric.io",
  target: document.getElementById("#wallet-target")
});
    
// Or initialize in a popup
const walletClient = await ElvWalletFrameClient.InitializePopup({
  requestor: "My App",
  walletAppUrl: "https://wallet.contentfabric.io",
});
```



