/**
 * ClientSignedTokenXco
 *
 * Create a client-signed-token using a cross-chain oracle signed message (xco_msg) and
 * access fabric resources.
 */

const Utils = require("@eluvio/elv-client-js/src/Utils.js");

export class CrossChainOracle {

  constructor(wallet) {
    this.ethSampleXcMsg = {
      "chain_type": "eip155",
      "chain_id": "955210",
      "asset_type": "erc20",
      "asset_id": "0x43842733179fa1c38560a44f1d9067677461c8ca",
      "method": "balance",
      "params": { "owner": "0x4163a41b433cbF55C5836376c417F676bD4e0DE0" }
    };
    this.sampleXcMsg = {
      "chain_type": "flow",
      "chain_id": "mainnet",
      "asset_type": "NonFungibleToken",
      "asset_id": "0x329feb3ab062d289:CNN_NFT",
      "method": "balance",
      "params": { "owner":"0xcbd420284fd5e19b" }
    };

    const contents = {
      "0": {
        objectId: "iq__SoPtztGZavHUaSnkMRPQ6T138mp",
        hash: "hq__8xLaEZhWVTjFifiCZRKNQ3m1BdBRjJ9Q7EwGd6K73TKbtFruiCFeptWcGF9tNkhqNV6Ho5gqr2",
        filename: "NSilva_wave2.mp4",
        description: "New York in Black and White, 4x4 grid",
      },
      "1": {
        objectId: "iq__28vntkNAao7buCoAHMpSjo7tANE2",
        hash: "hq__3GVpW3oYZteaUGyi3pjnNVDZfn7kdudjnANGRXogTeoZkeG6uCqSk2YfphdwkT7iksGd2Do4Ue",
        filename: "06_CNN_NFT_SE_2020PresCall_1920x1080_V01.mp4",
        description: "Election Day In America",
      },
      "2": {
        objectId: "iq__7Lr8DajdkarPBGTe1fmaefNy8nG",
        hash: "hq__GrQ7G7ZppPSkbfmARrKWv3mA5jx7cw1wAcCp8UcWTxNAoeHKeyGEkXvmRB6G1hDUdcTJbPZtMz",
        filename: "NYSLNFT_CardPack.mp4",
        description: "New York Subliners",
      }
    };

    // original / non-CNN
    //this.contentHash = "hq__93SK4rgxMarq1ZeDSEu9WJkDoptTKYiA2GmYocK7inMthUssGkG6Q9BREBEhNtVCiCBFsPd4Gd";

    // works -- iq__SoPtztGZavHUaSnkMRPQ6T138mp  - black and white    - JNSilva_wave2.mp4
    //this.contentHash = "hq__8xLaEZhWVTjFifiCZRKNQ3m1BdBRjJ9Q7EwGd6K73TKbtFruiCFeptWcGF9tNkhqNV6Ho5gqr2";
    // works -- iq__28vntkNAao7buCoAHMpSjo7tANE2 - election day       - 06_CNN_NFT_SE_2020PresCall_1920x1080_V01.mp4
    //this.contentHash = "hq__3GVpW3oYZteaUGyi3pjnNVDZfn7kdudjnANGRXogTeoZkeG6uCqSk2YfphdwkT7iksGd2Do4Ue";
    // works -- iq__7Lr8DajdkarPBGTe1fmaefNy8nG  - New York subliners - NYSLNFT_CardPack.mp4
    //this.contentHash = "hq__GrQ7G7ZppPSkbfmARrKWv3mA5jx7cw1wAcCp8UcWTxNAoeHKeyGEkXvmRB6G1hDUdcTJbPZtMz";

    this.item = contents[Math.floor(Math.random() * 3)];
    window.console.log("using", this.item);
    this.contentHash = this.item.hash;

    this.walletClient = wallet;
    this.client = this.walletClient.client;

    // Overwrite auth service endpoints (until the cross-chain feature is fully deployed)
    this.client.authServiceURIs = ["http://127.0.0.1:6546"];  // Dev instance
    //this.client.authServiceURIs = ["https://host-216-66-89-94.contentfabric.io/as"];
    this.client.AuthHttpClient.uris = this.client.authServiceURIs;
    window.console.log("client.AuthHttpClient", this.client.AuthHttpClient);
  }

  /**
   * Make a cross-chain oracle call
   */
  XcoMessage = async ({msg}) => {
    // Create a client-signed-token in order to access the cross-chain oracle API
    const token = await this.client.CreateFabricToken({duration: 60 * 60 * 1000});

    // Call the cross-chain oracle 'view' API
    let res = await Utils.ResponseToFormat(
      "json",
      this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        //path: "/as/xco/view",  // On main/dev net /as/xco/view
        path: "/xco/view",  // On local authd as /xco/view
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

    this.client.SetStaticToken({ token });

    // First retrieve title metadata (title, synopsis, cast, ...)
    let meta = await this.client.ContentObjectMetadata({
      versionHash: this.contentHash,
      metadataSubtree: "/public/asset_metadata"
    });
    window.console.log("META", meta);

    // Retrieve playout info (DASH and HLS URLs)
    let res = await this.client.PlayoutOptions({
      versionHash: this.contentHash,
      drms: ["clear", "aes-128", "fairplay", "widevine"]
    });

    return res;
  };

  Run = async () => {
    // Call the oracle cross-chain 'view' API 'balanceOf'
    let xcMsg = await this.XcoMessage({msg: this.sampleXcMsg});
    window.console.log("XCO MSG", xcMsg);

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
    window.console.log("PLAYOUT", playoutOptions);
    window.console.log("PLAYOUT", JSON.stringify(playoutOptions));

    return accessToken;
  };
}