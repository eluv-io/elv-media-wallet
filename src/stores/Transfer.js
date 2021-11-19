import {flow, makeAutoObservable} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";

let now = Date.now();
class TransferStore {
  transferHistories = {};

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  TransferKey({contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    return tokenId ? `${contractAddress}-${tokenId}` : contractAddress;
  }

  TransferHistory = flow(function * ({contractAddress, contractId, tokenId}) {
    yield new Promise(resolve => setTimeout(resolve, 3000));

    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    const key = this.TransferKey({contractAddress, tokenId});

    this.transferHistories[key] = [
      {
        id: "asd123",
        contractAddress,
        tokenId: "123",
        transactionId: "asd123qweasd123qwe",
        transactionType: "Trade",
        createdAt: now - 10000,
        price: 1.23,
        fee: 0.23,
        buyerAddress: "0x123456789098765431",
        sellerAddress: "0x54321234567890987"
      },
      {
        id: "qwe123",
        contractAddress,
        tokenId: "123",
        transactionId: "qwe123qweqwe123qwe",
        transactionType: "Trade",
        createdAt: now - 200000,
        price: 2.23,
        fee: 0.23,
        buyerAddress: "0x123456789098765431",
        sellerAddress: "0x54321234567890987"
      },
      {
        id: "fhg123",
        contractAddress,
        tokenId: "123",
        transactionId: "fhg123qweqwe123qwe",
        transactionType: "Trade",
        createdAt: now - 500000,
        price: 4.23,
        fee: 0.23,
        buyerAddress: "0x123456789098765431",
        sellerAddress: "0x54321234567890987"
      },
      {
        id: "cvb123",
        contractAddress,
        tokenId: "123",
        transactionId: "cvb123qweqwe123qwe",
        transactionType: "Trade",
        createdAt: now - 1000000,
        price: 3.23,
        fee: 0.23,
        buyerAddress: "0x123456789098765431",
        sellerAddress: "0x54321234567890987"
      },
      {
        id: "vbn123",
        contractAddress,
        tokenId: "123",
        transactionId: "vbn123qweqwe123qwe",
        transactionType: "Trade",
        createdAt: now - (60 * 60 * 24 - 10) * 1000,
        price: 5.23,
        fee: 0.23,
        buyerAddress: "0x123456789098765431",
        sellerAddress: "0x54321234567890987"
      }
    ];

    this.transferHistories[key] = [];

    return this.transferHistories[key];
  });
}

export default TransferStore;
