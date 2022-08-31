/**
 * ClientSignedTokenXco
 *
 * Create a client-signed-token using a cross-chain oracle signed message (xco_msg) and
 * access fabric resources.
 */

const Utils = require("@eluvio/elv-client-js/src/Utils.js");

export class ClientSignedTokenXco {

  constructor(wallet) {
    this.sampleXcMsg = {
      chain: "eip155:955305",
      contract_addr: "0xd4c8153372b0292b364dac40d0ade37da4c4869a",
      id: 1,
      method: "balanceOf",
      params: {
        owner: "0xcd8323da264e9c599af47a0d559dcdcb335d44ab"
      }
    };
    this.walletClient = wallet;
    this.client = this.walletClient.client;

    // Overwrite auth service endpoints (until the cross-chain feture is fully deployed)
    this.client.authServiceURIs = ["http://127.0.0.1:6546"];  // Dev instance
    //this.client.authServiceURIs = ["https://host-216-66-89-94.contentfabric.io/as"];
    this.client.AuthHttpClient.uris = this.client.authServiceURIs;

    window.window.console.log(".AuthHttpClient", this.client.AuthHttpClient);
  }

  /**
   * Make a cross-chain oracle call
   */
  XcoMessage = async ({msg}) => {
    // Create a client-signed-token in order to access the cross-chain oracle API
    const token = await this.client.CreateFabricToken({
      duration: 60 * 60 * 1000, // millisec
    });

    // Call the cross-chain oracle 'view' API
    let res = await Utils.ResponseToFormat(
      "json",
      this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        //path: "/as/xco/view",  // On main/dev net /as/xco/view
        path: "/xco/view",  // On main/dev net /as/xco/view
        body: msg,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    return res;
  };

  /**
   * Retrieve playout URLs
   */
  Play = async ({token}) => {
    const contentHash = "hq__93SK4rgxMarq1ZeDSEu9WJkDoptTKYiA2GmYocK7inMthUssGkG6Q9BREBEhNtVCiCBFsPd4Gd";

    this.client.SetStaticToken({ token });

    // First retrieve title metadata (title, synopsis, cast, ...)
    let meta = await this.client.ContentObjectMetadata({
      versionHash: contentHash,
      metadataSubtree: "/public/asset_metadata"
    });
    window.console.log("META", meta);

    // Retrieve playout info (DASH and HLS URLs)
    let res = await this.client.PlayoutOptions({
      versionHash: contentHash,
      drms: ["clear", "aes-128", "fairplay", "widevine"]
    });

    return res;
  };

  Run = async () => {
    // Call the oracle cross-chain 'view' API 'balanceOf'
    let xcMsg = await this.XcoMessage({msg: this.sampleXcMsg});
    window.console.log("XCO MSG", JSON.stringify(xcMsg));

    // Create a client-signed-token including the 'xco-msg' as context
    const accessToken = await this.client.CreateFabricToken({
      duration: 60 * 60 * 1000, // millisec
      spec: {
        ctx : {
          xco_msg: xcMsg.xco_msg
        }
      }
    });
    window.console.log("TOKEN", accessToken);

    // Play
    let playoutOptions = await this.Play({token: accessToken});
    window.console.log("PLAYOUT", JSON.stringify(playoutOptions, null, 2));
  };

}

//if(!process.env.PRIVATE_KEY) {
//  window.console.log("Must set environment variable PRIVATE_KEY");
//  exit;
//}
//
//Run();