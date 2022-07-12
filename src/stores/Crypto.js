import {flow, makeAutoObservable, runInAction} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";
import {ethers} from "ethers";

import MetamaskLogo from "Assets/icons/crypto/metamask fox.png";
import PhantomLogo from "Assets/icons/crypto/phantom.png";
import EthereumLogo from "Assets/icons/ethereum-eth-logo.svg";
import SolanaLogo from "Assets/icons/solana icon.svg";
import {rootStore} from "./index";

class CryptoStore {
  metamaskChainId = undefined;
  metamaskAddress = undefined;

  phantomAddress = undefined;
  phantomBalance = 0;
  phantomUSDCBalance = 0;

  transferredNFTs = {};
  connectedAccounts = {
    eth: {},
    sol: {}
  };

  get usdcConnected() {
    return Object.keys(this.connectedAccounts.sol || {}).length > 0;
  }

  get usdcOnly() {
    const connectedAccount = Object.values(this.connectedAccounts.sol || {})[0];

    return connectedAccount?.preferred;
  }

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);

    this.RegisterMetamaskHandlers();

    if(!this.rootStore.embedded && this.PhantomAvailable()) {
      setInterval(() => runInAction(async () => this.phantomAddress = this.PhantomAddress()), 5000);

      // Attempt eager connection
      window.solana.connect({ onlyIfTrusted: true });
    }
  }

  SolanaConnection = flow(function * () {
    if(!this.solanaConnection) {
      const {Connection, clusterApiUrl} = yield import("@solana/web3.js");

      let network;
      if(this.rootStore.client.networkName === "main") {
        network = "mainnet-beta";
      } else {
        network = "devnet";
      }

      this.solanaConnection = new Connection(clusterApiUrl(network), "confirmed");
    }

    return this.solanaConnection;
  });

  SolanaTransactionLink(signature) {
    const url = new URL("https://explorer.solana.com");

    url.pathname = UrlJoin("tx", signature);

    if(this.rootStore.client.networkName !== "main") {
      url.searchParams.set("cluster", "devnet");
    }

    return url.toString();
  }

  LoadConnectedAccounts = flow(function * () {
    try {
      let { links } = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "mkt", "info"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.rootStore.authToken}`
          }
        })
      );

      links = (links || []).filter(link => link.link_type);

      let connectedAccounts = { eth: {}, sol: {} };
      for(const link of (links || [])) {
        const address = link.link_type === "eth" ? Utils.FormatAddress(link.link_acct) : link.link_acct;

        connectedAccounts[link.link_type][address] = {
          ...link,
          link_acct: address,
          connected_at: new Date(link.created * 1000).toLocaleTimeString(navigator.language || "en-US", {year: "numeric", month: "long", day: "numeric"})
        };
      }

      this.connectedAccounts = connectedAccounts;

      this.PhantomBalance();
    } catch(error) {
      this.rootStore.Log("Failed to load connected accounts:", true);
      this.rootStore.Log(error, true);
    }
  });

  RequestMetamaskAddress = flow(function * () {
    if(window.ethereum?.selectedAddress) {
      return window.ethereum.selectedAddress;
    }

    const accounts = yield window.ethereum.request({ method: "eth_requestAccounts" });

    this.metamaskAddress = accounts[0];

    return this.metamaskAddress;
  });

  ConnectMetamask = flow(function * () {
    yield window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }],
    });

    const address = yield this.RequestMetamaskAddress();

    if(!address) { return; }

    if(this.connectedAccounts.eth[address]) {
      return;
    } else if(Object.keys(this.connectedAccounts.eth).length > 0) {
      throw Error("Incorrect account");
    }

    const message = `Eluvio link account - ${new Date().toISOString()}`;
    let payload = {
      tgt: "eth",
      ace: address,
      msg: message,
      sig: yield this.SignMetamask(message, address)
    };

    if(!payload.sig) {
      return;
    }

    yield this.client.authClient.MakeAuthServiceRequest({
      path: UrlJoin("as", "wlt", "link"),
      method: "POST",
      body: payload,
      headers: {
        Authorization: `Bearer ${this.rootStore.authToken}`
      }
    });

    yield this.LoadConnectedAccounts();
  });

  ConnectPhantom = flow(function * ({setPreferred=false, preferLinkedWalletPayment=false}={}) {
    if(this.rootStore.embedded) {
      this.phantomAddress = yield this.EmbeddedSign({provider: "phantom", connect: true, params: {setPreferred, preferLinkedWalletPayment}});
    } else {
      yield window.solana.connect();

      const address = this.PhantomAddress();

      if(!address) {
        return;
      }

      const connectedAccount = Object.values(this.connectedAccounts.sol)[0];
      if(connectedAccount && (!setPreferred || connectedAccount.preferred === preferLinkedWalletPayment)) {
        return;
      } else if(connectedAccount && connectedAccount.link_acct !== address) {
        throw Error("Incorrect account");
      }

      const message = `Eluvio link account - ${new Date().toISOString()}`;
      let payload = {
        tgt: "sol",
        ace: address,
        msg: message,
        preferred: preferLinkedWalletPayment,
        sig: yield this.SignPhantom(message)
      };

      if(!payload.sig) {
        return;
      }

      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "link"),
        method: "POST",
        body: payload,
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });
    }

    yield this.LoadConnectedAccounts();
  });

  DisconnectPhantom = flow(function * (address) {
    if(!address) { return; }

    const message = `Eluvio link account - ${new Date().toISOString()}`;
    let payload = {
      tgt: "sol",
      ace: address,
      msg: message
    };

    yield this.client.authClient.MakeAuthServiceRequest({
      path: UrlJoin("as", "wlt", "link"),
      method: "DELETE",
      body: payload,
      headers: {
        Authorization: `Bearer ${this.rootStore.authToken}`
      }
    });

    yield this.LoadConnectedAccounts();
  })

  SignMetamask = flow(function * (message, address, popup) {
    try {
      if(this.rootStore.embedded) {
        return yield this.EmbeddedSign({popup, provider: "metamask", message});
      } else if(Array.isArray(message)) {
        let signatures = [];
        for(let i = 0; i < message.length; i++) {
          signatures[i] = yield this.SignMetamask(message[i], address);
        }

        return signatures;
      } else {
        const address = yield this.RequestMetamaskAddress();
        return yield window.ethereum?.request({
          method: "personal_sign",
          params: [message, address, ""],
        });
      }
    } catch(error) {
      this.rootStore.Log("Error signing Metamask message:", true);
      this.rootStore.Log(error, true);

      throw error;
    }
  });

  SignPhantom = flow(function * (message, popup) {
    try {
      if(this.rootStore.embedded) {
        return yield this.EmbeddedSign({popup, provider: "phantom", message});
      } else {
        yield window.solana.connect();

        const data = new TextEncoder().encode(message);

        const {signature} = yield window.solana.signMessage(data);

        return signature.toString("hex");
      }
    } catch(error) {
      this.rootStore.Log("Error signing Phantom message:", true);
      this.rootStore.Log(error, true);

      throw error;
    }
  });

  SignPhantomTransaction = flow(function * (transaction) {
    try {
      if(this.rootStore.embedded) {
        return yield this.EmbeddedSign({provider: "phantom", transaction});
      } else {
        yield window.solana.connect();

        return yield window.solana.signTransaction(transaction);
      }
    } catch(error) {
      this.rootStore.Log("Error signing Phantom message:", true);
      this.rootStore.Log(error, true);

      throw error;
    }
  });

  PurchasePhantom = flow(function * (spec) {
    try {
      if(this.rootStore.embedded) {
        return yield this.EmbeddedSign({provider: "phantom", purchaseSpec: spec});
      } else {
        const SendUSDCPayment = (yield import("../utils/USDCPayment")).default;

        yield this.ConnectPhantom();

        return yield SendUSDCPayment({
          spec,
          payer: this.PhantomAddress(),
          Sign: async transaction => await this.SignPhantomTransaction(transaction)
        });
      }
    } catch(error) {
      this.rootStore.Log("Error signing Phantom message:", true);
      this.rootStore.Log(error, true);

      throw error;
    }
  })

  EmbeddedSign = flow(function * ({provider, connect, purchaseSpec, message, params, popup}) {
    let parameters = {
      provider,
      params
    };

    if(connect) {
      parameters.action = "connect";
    } else if(message) {
      parameters.action = "message";
      parameters.message = message;
    } else if(purchaseSpec) {
      parameters.action = "purchase";
      parameters.purchaseSpec = purchaseSpec;
    }

    const result = yield rootStore.Flow({
      popup,
      type: "action",
      flow: "sign",
      includeAuth: true,
      parameters
    });

    if(result.address) {
      this.phantomAddress = event.data.address;
    }

    if(result.balance) {
      this.phantomBalance = event.data.balance?.sol || 0;
      this.phantomUSDCBalance = event.data.balance?.usdc || 0;
    }

    return result.response;
  });

  MetamaskAvailable() {
    return window.ethereum && window.ethereum.isMetaMask && window.ethereum.chainId;
  }

  MetamaskConnected() {
    if(!this.MetamaskAvailable()) { return false; }

    return !!this.connectedAccounts.eth[window.ethereum?.selectedAddress] && window.ethereum.chainId === "0x1";
  }

  PhantomAvailable() {
    return window.solana && window.solana.isPhantom;
  }

  PhantomConnected() {
    if(this.rootStore.embedded && window.solana && this.PhantomAddress()) {
      return true;
    }

    if(!(this.PhantomAvailable() && window.solana.isConnected)) {
      return false;
    }

    return this.PhantomAddress() && !!this.connectedAccounts.sol[this.PhantomAddress()];
  }

  PhantomAddress() {
    return (
      (window.solana && window.solana._publicKey && window.solana._publicKey.toString()) ||
      (window.solana && this.rootStore.embedded && Object.keys(this.connectedAccounts.sol)[0])
    );
  }

  PhantomBalance = flow(function * () {
    const { PublicKey } = yield import("@solana/web3.js");

    let publicKey = Object.keys(this.connectedAccounts.sol)[0];

    if(!publicKey) {
      this.phantomBalance = 0;
      this.phantomUSDCBalance = 0;
      return;
    }

    publicKey = new PublicKey(publicKey);

    let token;
    if(this.rootStore.client.networkName === "main") {
      token = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    } else {
      token = new PublicKey("8uZyvyKSAxgRLMCxdrcRCppYEgokH2xBLrXshL6wCzJ4");
    }

    const connection = yield this.SolanaConnection();

    this.phantomBalance = yield connection.getBalance(publicKey, "confirmed");

    try {
      const tokenBalances = yield connection.getTokenAccountsByOwner(publicKey, {mint: token}, "confirmed");
      const tokenKey = tokenBalances.value[0].pubkey;
      this.phantomUSDCBalance = (yield connection.getTokenAccountBalance(tokenKey, "confirmed")).value.uiAmount;
    // eslint-disable-next-line no-empty
    } catch(error) {}

    return {
      sol: this.phantomBalance,
      usdc: this.phantomUSDCBalance
    };
  });

  PhantomPurchaseStatus = flow(function * (confirmationId) {
    try {
      const signature = this.rootStore.checkoutStore.solanaSignatures[confirmationId];

      if(!signature) { return { status: "unknown" }; }

      const connection = yield this.SolanaConnection();

      let confirmation = yield connection.getTransaction(signature);
      if(!confirmation) {
        confirmation = yield connection.confirmTransaction(signature);
      }

      return {
        status: "complete",
        confirmation
      };
    } catch(error) {
      this.rootStore.Log("Solana transaction failed", true);
      this.rootStore.Log(error, true);

      return { status: "failed", errorMessage: "Solana transaction failed. Please try again later." };
    }
  });

  UpdateMetamaskInfo() {
    this.metamaskChainId = window.ethereum?.chainId;

    if(window.ethereum?.selectedAddress) {
      this.metamaskAddress = window.ethereum.selectedAddress;
    }
  }

  RegisterMetamaskHandlers() {
    if(!window.ethereum) { return; }

    this.UpdateMetamaskInfo();

    window.ethereum.on("accountsChanged", () => this.UpdateMetamaskInfo());
    window.ethereum.on("chainChanged", () => this.UpdateMetamaskInfo());
  }

  WalletFunctions(type) {
    switch(type.toLowerCase()) {
      case "metamask":
        return {
          name: "Metamask",
          logo: MetamaskLogo,
          networkName: "Ethereum",
          currencyLogo: EthereumLogo,
          currencyName: "ETH",
          link: "https://metamask.io",
          Address: () => window.ethereum?.selectedAddress || this.metamaskAddress,
          RetrieveAddress: async () => await this.RequestMetamaskAddress(),
          Available: () => this.MetamaskAvailable(),
          Connected: () => this.MetamaskConnected(),
          Connect: async params => await this.ConnectMetamask(params),
          Connection: () => this.connectedAccounts.eth[Utils.FormatAddress(window.ethereum?.selectedAddress)],
          ConnectedAccounts: () => Object.values(this.connectedAccounts.eth),
          Sign: async (message, popup) => await this.SignMetamask(message, undefined, popup),
          Disconnect: async () => {}
        };
      case "phantom":
        return {
          name: "Phantom",
          logo: PhantomLogo,
          networkName: "Solana",
          currencyLogo: SolanaLogo,
          currencyName: "SOL",
          link: "https://phantom.app",
          Address: () => this.PhantomAddress(),
          Available: () => this.PhantomAvailable(),
          Connected: () => this.PhantomConnected(),
          Connect: async params => await this.ConnectPhantom(params),
          Connection: () => this.connectedAccounts.sol[this.PhantomAddress()],
          ConnectedAccounts: () => Object.values(this.connectedAccounts.sol),
          Sign: async (message, popup) => await this.SignPhantom(message, popup),
          SignTransaction: async transaction => await this.SignPhantomTransaction(transaction),
          Purchase: async spec => await this.PurchasePhantom(spec),
          Disconnect: async (address) => await this.DisconnectPhantom(address)
        };
    }

    throw Error("Invalid wallet: " + type);
  }

  ExternalChains() {
    if(EluvioConfiguration["enable-testnet-transfer"]) {
      return [
        {name: "Ethereum Mainnet", network: "eth-mainnet", chainId: "0x1"},
        {name: "Ethereum Testnet (Rinkeby)", network: "eth-rinkeby", chainId: "0x4"},
        {name: "Polygon Mainnet", network: "poly-mainnet", chainId: "0x89"},
        {name: "Polygon Testnet (Mumbai)", network: "poly-mumbai", chainId: "0x13881"}
      ];
    }

    return [
      { name: "Ethereum Mainnet", network: "eth-mainnet", chainId: "0x1"},
      { name: "Polygon Mainnet", network: "poly-mainnet", chainId: "0x89"},
    ];
  }

  TransferNFT = flow(function * ({network, nft}) {
    yield window.ethereum.enable();

    const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
    const address = yield this.RequestMetamaskAddress();
    const response = yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", nft.details.TenantId),
        method: "POST",
        body: {
          taddr: address,
          op: "nft-transfer",
          tgt: network,
          adr: nft.details.ContractAddr,
          tok: nft.details.TokenIdStr
        },
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      })
    );

    const abi = [
      {
        "constant": false,
        "inputs": [
          {"name": "to", "type": "address"},
          {"name": "tokenId", "type": "uint256"},
          {"name": "tokenURI", "type": "string"},
          {"name": "v", "type": "uint8"},
          {"name": "r", "type": "bytes32"},
          {"name": "s", "type": "bytes32"}
        ],
        "name": "mintSignedWithTokenURI",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {"name": "to", "type": "address"},
          {"name": "tokenId", "type": "uint256"},
          {"name": "tokenURI", "type": "string"},
          {"name": "v", "type": "uint8"},
          {"name": "r", "type": "bytes32"},
          {"name": "s", "type": "bytes32"}
        ],
        "name": "isMinterSigned",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "exists",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Connect contract and validate:
    const contract = new ethers.Contract(response.caddr, abi, signer);
    if(!(
      yield contract.isMinterSigned(
        response.taddr,
        response.tok,
        response.turi,
        response.v,
        ethers.utils.arrayify("0x" + response.r),
        ethers.utils.arrayify("0x" + response.s)
      ))
    ) {
      throw Error("Minter not signed");
    }

    // Check if token already exists
    if((yield contract.exists(response.tok))) {
      throw Error("Token already exists");
    }

    // Call transfer method
    const minted = yield contract.mintSignedWithTokenURI(
      response.taddr,
      response.tok,
      response.turi,
      response.v,
      ethers.utils.arrayify("0x" + response.r),
      ethers.utils.arrayify("0x" + response.s),
      {gasPrice: ethers.utils.parseUnits("100", "gwei"), gasLimit: 1000000} // TODO: Why is this necessary?
    );

    let openSeaLink;
    switch(network) {
      case "eth-mainnet":
        openSeaLink = `https://opensea.io/assets/${response.caddr}/${response.tok}`;
        break;
      case "eth-rinkeby":
        openSeaLink = `https://testnets.opensea.io/assets/${response.caddr}/${response.tok}`;
        break;
      case "poly-mainnet":
        openSeaLink = `https://opensea.io/assets/matic/${response.caddr}/${response.tok}`;
        break;
      case "poly-mumbai":
        openSeaLink = `https://testnets.opensea.io/assets/mumbai/${response.caddr}/${response.tok}`;
        break;
    }

    this.transferredNFTs[`${nft.details.ContractAddr}:${nft.details.TokenIdStr}`] = {
      network: this.ExternalChains().find(info => info.network === network),
      hash: minted.hash,
      openSeaLink
    };
  });
}

export default CryptoStore;
