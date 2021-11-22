import {flow, makeAutoObservable} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import UrlJoin from "url-join";

let now = Date.now();
const _transfers = [
  {
    id: "asd123",
    name: "Skunk",
    contractAddress: "0x1234567890987654321",
    tokenId: "823",
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
    name: "Bull",
    contractAddress: "0x1234567890987654321",
    tokenId: "334",
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
    name: "Gold Pack",
    contractAddress: "0x1234567890987654321",
    tokenId: "456",
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
    name: "Beach Ball",
    contractAddress: "0x1234567890987654321",
    tokenId: "234",
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
    name: "Cupcake",
    contractAddress: "0x1234567890987654321",
    tokenId: "012",
    transactionId: "vbn123qweqwe123qwe",
    transactionType: "Trade",
    createdAt: now - (60 * 60 * 24 - 10) * 1000,
    price: 5.23,
    fee: 0.23,
    buyerAddress: "0x123456789098765431",
    sellerAddress: "0x54321234567890987"
  }
];

class TransferStore {
  userPurchases = {};
  userSales = {};
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

  CreateListing = flow(function * ({contractAddress, contractId, tokenId, price}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    const response = yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "mkt"),
        method: "POST",
        body: {
          contract: contractAddress,
          token: tokenId,
          price: parseFloat(price)
        },
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      })
    );

    console.log(JSON.stringify(response, null, 2));
  });

  TransferListings = flow(function * ({tenantId, userId, userAddress, contractId, contractAddress}={}) {
    if(userAddress) {
      userId = `iusr${Utils.AddressToHash(userAddress)}`;
    }

    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    let path = "/mkt";
    if(userId) {
      path = UrlJoin("mkt", "usr", userId);
    } else if(tenantId) {
      path = UrlJoin("mkt", "tnt", tenantId);
    } else if(contractAddress) {
      path = UrlJoin("mkt", "tnt", contractAddress);
    }

    return _transfers;

    const response = yield Utils.ResponseToJson(
      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", path),
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      })
    );

    console.log(JSON.stringify(response, null, 2));
  });

  UserTransferHistory = flow(function * ({userAddress, type="purchases"}) {
    userAddress = Utils.FormatAddress(userAddress);

    if(type === "purchases") {
      this.userPurchases[userAddress] = _transfers;
    } else {
      this.userSales[userAddress] = _transfers;
    }

    return _transfers;
  });

  TransferHistory = flow(function * ({contractAddress, contractId, tokenId}) {
    if(contractId) { contractAddress = Utils.HashToAddress(contractId); }
    contractAddress = Utils.FormatAddress(contractAddress);

    const key = this.TransferKey({contractAddress, tokenId});

    this.transferHistories[key] = _transfers;

    return this.transferHistories[key];
  });
}

export default TransferStore;
