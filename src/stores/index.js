import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";

import {ElvClient} from "@eluvio/elv-client-js";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  loginStatus = "Loading Account";
  loggedIn = false;

  oauthUser = undefined;

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

  MediaEmbedUrl(nft) {
    if((nft.metadata.nft || {}).embed_url) {
      return (nft.metadata.nft || {}).embed_url;
    } else if((nft.metadata.asset_metadata || {}).sources) {
      const versionHash = nft.nftInfo.versionhash;
      const net = EluvioConfiguration["config-url"].includes("demov3") ? "demo" : "main";
      return `https://embed.v3.contentfabric.io?p&net=${net}&ct=h&vid=${versionHash}`;
    }
  }

  FundAccount = async (recipient) => {
    const client = await ElvClient.FromConfigurationUrl({configUrl: EluvioConfiguration["config-url"]});
    const wallet = client.GenerateWallet();
    const signer = wallet.AddAccount({privateKey: EluvioConfiguration.FUNDED_PRIVATE_KEY});
    await client.SetSigner({signer});

    await client.SendFunds({recipient, ether: 0.5});
  };

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

  InitializeClient = flow(function * ({user, privateKey}) {
    try {
      const client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"]
      });

      this.staticToken = client.staticToken;

      const ethUrl = "https://host-216-66-40-19.contentfabric.io/eth";
      const asUrl = "https://host-66-220-3-86.contentfabric.io";

      client.SetNodes({
        ethereumURIs: [
          ethUrl
        ],
        authServiceURIs: [
          asUrl
        ]
      });

      this.client = client;


      this.loginStatus = "Loading Account";

      if(privateKey) {
        const wallet = client.GenerateWallet();
        const signer = wallet.AddAccount({privateKey});
        client.SetSigner({signer});
      } else if(user) {
        this.oauthUser = user;

        yield client.SetRemoteSigner({token: user.id_token});

        if(parseFloat(yield client.GetBalance({address: client.signer.address})) < 0.25) {
          yield this.FundAccount(client.signer.address);
        }
      } else {
        throw Error("Neither user nor private key specified in InitializeClient");
      }

      this.walletAddress = yield client.userProfileClient.WalletAddress(false);

      if(!this.walletAddress) {
        this.loginStatus = "Initializing Account";
        this.walletAddress = yield client.userProfileClient.WalletAddress(true);
      }

      this.walletId = `iusr${client.utils.AddressToHash(client.CurrentAccountAddress())}`;

      this.basePublicUrl = yield client.FabricUrl({
        queryParams: {
          authorization: this.staticToken
        },
        noAuth: true
      });

      // Parallelize load tasks
      let tasks = [];
      tasks.push((async () => {
        let profileMetadata = (await client.userProfileClient.UserMetadata()) || {};

        if(user && !(profileMetadata.public && profileMetadata.public.name)) {

          await client.userProfileClient.ReplaceUserMetadata({
            metadata: {
              public: {
                name: user ? user.name : "user"
              }
            }
          });

          if(user && user.imageUrl) {
            const image = await (await fetch(user.imageUrl)).blob();
            await client.userProfileClient.SetUserProfileImage({image});
          }

          profileMetadata = (await client.userProfileClient.UserMetadata()) || {};
        }

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

      this.walletHash = yield client.LatestVersionHash({objectId: client.utils.AddressToObjectId(this.walletAddress)});

      this.client = client;

      this.initialized = true;
      this.loggedIn = true;
    } catch(error) {
      if(user) {
        yield user.SignOut();
      }
      console.log("ERROR", error);
      throw error;
    }
  });

  SignOut = flow(function * () {
    if(this.oauthUser) {
      yield this.oauthUser.SignOut();
      this.oauthUser = undefined;
    }

    window.location.href = window.location.origin + window.location.pathname;
  });
}

export const rootStore = new RootStore();

window.rootStore = rootStore;

