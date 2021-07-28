import {makeAutoObservable, configure, flow, runInAction} from "mobx";
import UrlJoin from "url-join";

import {ElvClient} from "@eluvio/elv-client-js";
import Utils from "@eluvio/elv-client-js/src/Utils";

import {SendEvent} from "Components/interface/Listener";
import EVENTS from "../../client/src/Events";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  loginStatus = "Loading Account";
  loggedIn = false;

  authService = undefined;
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

  EVENTS = EVENTS;

  Log(message, error=false) {
    message = `Eluvio Media Wallet | ${message}`;
    error ? console.error(message) : console.log(message);
  }

  constructor() {
    makeAutoObservable(this);
  }

  SendEvent({event, data}) {
    SendEvent({event, data});
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
    return this.nfts.find(nft => nft.details.TokenIdStr === tokenId);
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

    const nfts = this.profileData.NFTs.map(details => {
      const versionHash = (details.TokenUri || "").split("/").find(s => s.startsWith("hq__"));

      if(!versionHash) { return; }

      return {
        ...details,
        versionHash
      };
    }).filter(n => n);

    // TODO: use public/asset_metadata/nft
    this.nfts = yield this.client.utils.LimitedMap(
      10,
      nfts,
      async details => {
        return {
          details,
          metadata: (await this.client.ContentObjectMetadata({
            versionHash: details.versionHash,
            metadataSubtree: "public/asset_metadata/nft"
          })) || {}
        };
      }
    );
  });

  InitializeClient = flow(function * ({user, idToken, authService, privateKey}) {
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
      this.authService = authService;

      if(privateKey) {
        const wallet = client.GenerateWallet();
        const signer = wallet.AddAccount({privateKey});
        client.SetSigner({signer});
      } else if(user || idToken) {
        this.oauthUser = user;

        yield client.SetRemoteSigner({token: idToken || user.id_token});

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

      this.SendEvent({event: EVENTS.LOG_IN, data: { address: client.signer.address }});
    } catch(error) {
      this.Log("Failed to initialize client", true);
      this.Log(error, true);

      throw error;
    }
  });

  SignOut() {
    if(this.authService) {
      localStorage.removeItem(`_${this.authService}-token`);
    }

    this.SendEvent({event: EVENTS.LOG_OUT, data: { address: this.client.signer.address }});

    window.location.href = window.location.origin + window.location.pathname;
  }

  SetIdToken(service, token) {
    localStorage.setItem(
      `_${service}-token`,
      Utils.B64(JSON.stringify({token, expiresAt: Date.now() + 23 * 60 * 60 * 1000}))
    );
  }

  IdToken(service) {
    try {
      const tokenInfo = localStorage.getItem(`_${service}-token`);

      if(tokenInfo) {
        const { token, expiresAt } = JSON.parse(Utils.FromB64(tokenInfo));
        if(Date.now() > expiresAt) {
          localStorage.removeItem(`_${service}-token`);
        } else {
          return token;
        }
      }
    } catch(error) {
      this.Log(`Failed to retrieve ${service} ID token`, true);
      this.Log(error, true);
    }
  }
}

export const rootStore = new RootStore();

window.rootStore = rootStore;

