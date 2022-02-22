import {flow, makeAutoObservable, runInAction} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";
import {ethers} from "ethers";

import MetamaskLogo from "Assets/icons/crypto/metamask fox.png";
import PhantomLogo from "Assets/icons/crypto/phantom.png";
import EthereumLogo from "Assets/icons/ethereum-eth-logo.svg";
import SolanaLogo from "Assets/icons/solana icon.svg";

class CryptoStore {
  metamaskChainId = undefined;
  metamaskAddress = undefined;

  phantomAddress = undefined;

  transferredNFTs = {};
  connectedAccounts = {
    eth: {},
    sol: {}
  };

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);

    this.RegisterMetamaskHandlers();

    if(this.PhantomAvailable()) {
      setInterval(() => runInAction(async () => this.phantomAddress = this.PhantomAddress()), 5000);

      // Attempt eager connection
      window.solana.connect({ onlyIfTrusted: true });
    }
  }

  LoadConnectedAccounts = flow(function * () {
    try {
      const { links } = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "mkt", "info"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );

      if(!links || links.length === 0) {
        return;
      }

      for(const link of links) {
        const address = link.link_type === "eth" ? Utils.FormatAddress(link.link_acct) : link.link_acct;
        this.connectedAccounts[link.link_type][address] = {
          ...link,
          link_acct: address,
          connected_at: new Date(link.created * 1000).toDateString()
        };
      }
    } catch(error) {
      this.rootStore.Log("Failed to load connected accounts:", true);
      this.rootStore.Log(error, true);
    }
  });

  ConnectMetamask = flow(function * () {
    yield window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }],
    });

    const accounts = yield window.ethereum.request({ method: "eth_requestAccounts" });
    const address = Utils.FormatAddress(accounts[0]);

    if(!address) { return; }

    if(this.connectedAccounts.eth[address]) {
      return;
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
        Authorization: `Bearer ${this.client.signer.authToken}`
      }
    });

    yield this.LoadConnectedAccounts();
  });

  ConnectPhantom = flow(function * () {
    yield window.solana.connect();

    const address = this.PhantomAddress();

    if(!address) { return; }

    if(this.connectedAccounts.sol[address]) {
      return;
    }

    const message = `Eluvio link account - ${new Date().toISOString()}`;
    let payload = {
      tgt: "sol",
      ace: address,
      msg: message,
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
        Authorization: `Bearer ${this.client.signer.authToken}`
      }
    });

    yield this.LoadConnectedAccounts();
  });

  SignMetamask = flow(function * (message, address) {
    try {
      const from = address || window.ethereum.selectedAddress;
      return yield window.ethereum.request({
        method: "personal_sign",
        params: [message, from, ""],
      });

    } catch(error) {
      this.rootStore.Log("Error signing Metamask message:", true);
      this.rootStore.Log(error, true);
    }
  });

  SignPhantom = flow(function * (message) {
    try {
      const data = new TextEncoder().encode(message);

      const { signature } = yield window.solana.signMessage(data);

      return signature.toString("hex");
    } catch(error) {
      this.rootStore.Log("Error signing Phantom message:", true);
      this.rootStore.Log(error, true);
    }
  });

  MetamaskAvailable() {
    return window.ethereum && window.ethereum.isMetaMask && window.ethereum.chainId;
  }

  MetamaskConnected() {
    if(!this.MetamaskAvailable()) { return false; }

    return !!this.connectedAccounts.eth[window.ethereum.selectedAddress] && window.ethereum.chainId === "0x1";
  }

  PhantomAvailable() {
    return window.solana && window.solana.isPhantom;
  }

  PhantomConnected() {
    if(!(this.PhantomAvailable() && window.solana.isConnected)) {
      return false;
    }

    return this.PhantomAddress() && !!this.connectedAccounts.sol[this.PhantomAddress()];
  }

  PhantomAddress() {
    return window.solana && window.solana._publicKey && window.solana._publicKey.toString();
  }

  UpdateMetamaskInfo() {
    this.metamaskAddress = window.ethereum.selectedAddress;
    this.metamaskChainId = window.ethereum && window.ethereum.chainId;
  }

  RegisterMetamaskHandlers() {
    if(!window.ethereum) { return; }

    this.UpdateMetamaskInfo();

    window.ethereum.on("accountsChanged", () => this.UpdateMetamaskInfo());
    window.ethereum.on("chainChanged", () => this.UpdateMetamaskInfo());
  }

  WalletFunctions(type) {
    switch(type) {
      case "metamask":
        return {
          name: "Metamask",
          logo: MetamaskLogo,
          networkName: "Ethereum Mainnet",
          currencyLogo: EthereumLogo,
          currencyName: "ETH",
          link: "https://metamask.io",
          Address: () => window.ethereum.selectedAddress,
          Available: () => this.MetamaskAvailable(),
          Connected: () => this.MetamaskConnected(),
          Connect: async () => await this.ConnectMetamask(),
          Connection: () => this.connectedAccounts.eth[Utils.FormatAddress(window.ethereum.selectedAddress)],
          Sign: async message => await this.SignMetamask(message),
        };
      case "phantom":
        return {
          name: "Phantom",
          logo: PhantomLogo,
          networkName: "Solana Mainnet",
          currencyLogo: SolanaLogo,
          currencyName: "SOL",
          link: "https://phantom.app",
          Address: () => this.PhantomAddress(),
          Available: () => this.PhantomAvailable(),
          Connected: () => this.PhantomConnected(),
          Connect: async () => await this.ConnectPhantom(),
          Connection: () => this.connectedAccounts.sol[this.PhantomAddress()],
          Sign: async message => await this.SignPhantom(message)
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
    const address = (yield window.ethereum.request({method: "eth_requestAccounts"}))[0];
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
          Authorization: `Bearer ${this.client.signer.authToken}`
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
