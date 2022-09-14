/**
 * ClientSignedTokenXco
 *
 * Create a client-signed-token using a cross-chain oracle signed message (xco_msg) and
 * access fabric resources.
 */

const Utils = require("@eluvio/elv-client-js/src/Utils.js");

export class CrossChainOracle {

  constructor(wallet) {
    this.walletClient = wallet;
    this.client = this.walletClient.client;
    this.authServicePath = "/as/xco/view";  // On main/demo net as /as/xco/view

    // FUTURE: migrate hardcoded samples to (i) icon reference material

    this.ethSampleXcMsg = {
      "chain_type": "eip155",
      "chain_id": "955210",
      "asset_type": "erc20",
      "asset_id": "0x43842733179fa1c38560a44f1d9067677461c8ca",
      "method": "balance",
      "params": { "owner": "0x4163a41b433cbF55C5836376c417F676bD4e0DE0" }
    };

    this.flowSampleXcMsg = {
      "chain_type": "flow",
      "chain_id": "mainnet",
      "asset_type": "NonFungibleToken",
      "asset_id": "0x329feb3ab062d289:CNN_NFT",
      "method": "balance",
      "params": { "owner":"0xcbd420284fd5e19b" }
    };

    // caminandes content
    this.ethContents = {
      hash: "hq__93SK4rgxMarq1ZeDSEu9WJkDoptTKYiA2GmYocK7inMthUssGkG6Q9BREBEhNtVCiCBFsPd4Gd"
    };

    // CNN content
    this.flowContents = {
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


    // To use a local authd dev instance:
    //this.client.authServiceURIs = ["http://127.0.0.1:6546"];
    //this.client.AuthHttpClient.uris = this.client.authServiceURIs;
    //this.authServicePath = "/xco/view";   // On local authd as /xco/view instead of /as/xco/view
  }

  GetXcMessage = (type, asset, owner) => {
    let msg = type == "eth" ? this.ethSampleXcMsg : this.flowSampleXcMsg;
    msg.params.owner = !owner ? msg.params.owner : owner;
    msg.asset_id = !asset ? msg.asset_id : asset;
    return msg;
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
        path: this.authServicePath,
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

  Run = async (type, msg) => {
    // this is just for demo convenience -- show the matching content
    if(type == "eth") {
      this.item = this.ethContents;
      this.contentHash = this.ethContents.hash;
    } else {
      this.item = this.flowContents[Math.floor(Math.random() * 3)];
      this.contentHash = this.item.hash;
    }
    window.console.log("using", this.item);

    // Call the oracle cross-chain 'view' API 'balance'
    let xcMsg = await this.XcoMessage({msg: msg});
    const balance = xcMsg?.ctx?.xc_msg?.results?.balance;
    window.console.log("balance", balance);

    if(balance <= 0) {
      return { balance: balance };
    } else {
      // Create a client-signed-token including the 'xco-msg' as context
      const accessToken = await this.client.CreateFabricToken({
        duration: 60 * 60 * 1000,
        spec: {ctx : {xco_msg: xcMsg.xco_msg}}
      });
      let playoutOptions = await this.Play({token: accessToken});
      window.console.log("PLAYOUT", playoutOptions);

      //return { balance: balance, msg: xcMsg, xcContextToken: accessToken };
      return { balance: balance, msg: xcMsg?.msg, xcContextToken: accessToken };
    }
  };
}