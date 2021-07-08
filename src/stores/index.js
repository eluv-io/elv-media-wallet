import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";

import {ElvClient} from "@eluvio/elv-client-js";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  initialized = false;
  client = undefined;

  staticToken = undefined;
  baseWalletUrl = undefined;
  basePublicUrl = undefined;

  walletAddress = undefined;
  walletId = undefined;
  walletHash = undefined;
  profileMetadata = { public: {} };
  profileData = undefined;

  nfts = [];

  constructor() {
    makeAutoObservable(this);
  }

  PublicLink({versionHash, path, queryParams={}}) {
    const url = new URL(this.basePublicUrl);
    url.pathname = UrlJoin("q", versionHash, "meta", path);

    Object.keys(queryParams).map(key => url.searchParams.append(key, queryParams[key]));

    return url.toString();
  }

  ProfileLink({path, queryParams={}}) {
    const url = new URL(this.baseWalletUrl);
    url.pathname = UrlJoin("q", this.walletHash, "meta", path);

    Object.keys(queryParams).map(key => url.searchParams.append(key, queryParams[key]));

    return url.toString();
  }

  NFT(tokenId) {
    return this.nfts.find(nft => nft.nftInfo.TokenIdStr === tokenId);
  }

  LoadCollections = flow(function * () {
    if(!this.profileData || !this.profileData.NFTs || this.nfts.length > 0) { return; }

    const nfts = this.profileData.NFTs.map(nftInfo => {
      const versionHash = (nftInfo.TokenUri || "").split("/").find(s => s.startsWith("hq__"));

      if(!versionHash) { return; }

      return {
        ...nftInfo,
        versionHash
      };
    }).filter(n => n);

    this.nfts = yield this.client.utils.LimitedMap(
      10,
      nfts,
      async nftInfo => {
        return {
          nftInfo,
          metadata: (await this.client.ContentObjectMetadata({
            versionHash: nftInfo.versionHash,
            metadataSubtree: "public"
          })) || {}
        };
      }
    );
  });

  InitializeClient = flow(function * () {
    try {
      const client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"]
      });

      this.staticToken = client.staticToken;

      const wallet = client.GenerateWallet();
      const signer = wallet.AddAccount({
        privateKey: "snip"
      });

      client.SetSigner({signer});

      client.SetNodes({
        ethereumURIs: [
          "https://host-216-66-40-19.contentfabric.io/eth"
        ]
      });

      this.walletAddress = yield client.userProfileClient.WalletAddress();
      this.walletId = `iusr${client.utils.AddressToHash(client.CurrentAccountAddress())}`;
      this.walletHash = yield client.LatestVersionHash({objectId: client.utils.AddressToObjectId(this.walletAddress)});

      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      // Parallelize load tasks
      let tasks = [];
      tasks.push((async () => {
        const profileMetadata = (await client.userProfileClient.UserMetadata()) || {};

        runInAction(() => {
          this.profileMetadata = profileMetadata;
          this.profileMetadata.public = this.profileMetadata.public || {};
        });
      })());

      tasks.push((async () => {
        const baseWalletUrl = await client.FabricUrl({
          versionHash: this.walletHash
        });

        runInAction(() => this.baseWalletUrl = baseWalletUrl);
      })());

      tasks.push((async () => {
        const profileData = await client.ethClient.MakeProviderCall({
          methodName: "send",
          args: [
            "elv_getAccountProfile",
            [client.contentSpaceId, this.walletId]
          ]
        });

        runInAction(() => this.profileData = profileData);
      })());

      yield Promise.all(tasks);

      this.client = client;

      this.initialized = true;
    } catch(error) {
      console.log("ERROR", error);
      throw error;
    }
  });
}

export const rootStore = new RootStore();

window.rootStore = rootStore;

