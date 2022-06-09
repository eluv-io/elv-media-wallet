import UrlJoin from "url-join";
import {parse as UUIDParse, v4 as UUID} from "uuid";
import {makeAutoObservable, flow, runInAction} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {ethers} from "ethers";

const PUBLIC_KEYS = {
  stripe: {
    test: "pk_test_51HpRJ7E0yLQ1pYr6m8Di1EfiigEZUSIt3ruOmtXukoEe0goAs7ZMfNoYQO3ormdETjY6FqlkziErPYWVWGnKL5e800UYf7aGp6",
    production: "pk_live_51HpRJ7E0yLQ1pYr6v0HIvWK21VRXiP7sLrEqGJB35wg6Z0kJDorQxl45kc4QBCwkfEAP3A6JJhAg9lHDTOY3hdRx00kYwfA3Ff"
  }
};

class CheckoutStore {
  currency = "USD";

  submittingOrder = false;

  stock = {};

  purchaseStatus = {};

  solanaSignatures = {};

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);

    runInAction(() => {
      this.solanaSignatures = rootStore.GetSessionStorageJSON("solana-signatures") || {};
      this.purchaseStatus = rootStore.GetLocalStorageJSON("purchase-status") || {};
    });
  }

  ConfirmationId(uuid) {
    if(uuid) {
      return UUID();
    } else {
      return Utils.B58(UUIDParse(UUID()));
    }
  }

  MarketplaceStock = flow(function * ({tenantId}) {
    try {
      let stock;
      if(this.rootStore.loggedIn) {
        stock = yield Utils.ResponseToJson(
          this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", "wlt", "nft", "info", tenantId),
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.rootStore.authToken}`
            }
          })
        );
      } else {
        stock = yield Utils.ResponseToJson(
          this.client.authClient.MakeAuthServiceRequest({
            path: UrlJoin("as", "nft", "stock", tenantId),
            method: "GET"
          })
        );
      }

      let updatedStock = {
        ...this.stock
      };

      Object.keys((stock || {})).map(sku =>
        updatedStock[sku] = stock[sku]
      );

      this.stock = updatedStock;

      return this.stock;
    } catch(error) {
      this.rootStore.Log("Failed to retrieve marketplace stock", true);
      this.rootStore.Log(error, true);
    }
  });

  PurchaseInitiated({tenantId, confirmationId, marketplaceId, sku, successPath}) {
    this.purchaseStatus[confirmationId] = {
      status: "pending",
      confirmationId,
      tenantId,
      marketplaceId,
      sku,
      successPath
    };

    this.rootStore.SetLocalStorage("purchase-status", JSON.stringify(this.purchaseStatus));
  }

  PurchaseComplete({confirmationId, success, message}) {
    this.submittingOrder = false;

    this.purchaseStatus[confirmationId] = {
      ...this.purchaseStatus[confirmationId],
      status: "complete",
      success,
      failed: !success,
      message
    };

    this.rootStore.SetLocalStorage("purchase-status", JSON.stringify(this.purchaseStatus));
  }

  OpenPack = flow(function * ({tenantId, contractAddress, tokenId}) {
    contractAddress = Utils.FormatAddress(contractAddress);
    const confirmationId = `${contractAddress}:${tokenId}`;

    try {
      // Save as purchase so tenant ID is preserved for status
      this.PurchaseInitiated({tenantId, confirmationId});

      let params = {
        op: "nft-open",
        tok_addr: contractAddress,
        tok_id: tokenId
      };

      if(this.rootStore.AuthInfo().walletName === "metamask") {
        // Must create signature for burn operation to pass to API

        let popup;
        if(this.rootStore.embedded) {
          // Create popup before calling async config method to avoid popup blocker
          popup = window.open("about:blank");
        }

        const config = yield this.rootStore.TenantConfiguration({contractAddress});

        const mintHelperAddress = config["mint-helper"];

        if(!mintHelperAddress) {
          throw Error(`Mint helper not defined in configuration for NFT ${contractAddress}`);
        }

        const nftAddressBytes = ethers.utils.arrayify(contractAddress);
        const mintAddressBytes = ethers.utils.arrayify(mintHelperAddress);
        const tokenIdBigInt = ethers.utils.bigNumberify(tokenId).toHexString();

        const hash = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["bytes", "bytes", "uint256"],
            [nftAddressBytes, mintAddressBytes, tokenIdBigInt]
          )
        );

        params.sig_hex = yield this.rootStore.cryptoStore.SignMetamask(hash, this.AuthInfo().address, popup);
      }

      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", tenantId),
        method: "POST",
        body: params,
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });

      this.PurchaseComplete({confirmationId, success: true});
    } catch(error) {
      this.PurchaseComplete({confirmationId, success: false, message: error.message});
      throw error;
    }
  });

  RedeemCollection = flow(function * ({marketplace, collectionSKU, selectedNFTs}) {
    const confirmationId = `${collectionSKU}:${this.ConfirmationId()}`;
    const tenantId = marketplace?.tenant_id;

    try {
      // Save as purchase so tenant ID is preserved for status
      this.PurchaseInitiated({tenantId, confirmationId});

      const config = yield this.rootStore.TenantConfiguration({tenantId});

      let params = {
        op: "nft-redeem",
        marketplace_hash: marketplace.versionHash,
        collection_sku: collectionSKU,
        items: selectedNFTs.map(item => ({addr: item.contractAddress, id: item.tokenId})),
        from_addr: config["mint-helper"],
        client_reference_id: confirmationId
      };

      /*
      if(this.rootStore.AuthInfo().walletName === "metamask") {
        // Must create signature for burn operation to pass to API

        let popup;
        if(this.rootStore.embedded) {
          // Create popup before calling async config method to avoid popup blocker
          popup = window.open("about:blank");
        }

        const config = yield this.rootStore.TenantConfiguration({contractAddress});

        const mintHelperAddress = config["mint-helper"];

        if(!mintHelperAddress) {
          throw Error(`Mint helper not defined in configuration for NFT ${contractAddress}`);
        }

        const nftAddressBytes = ethers.utils.arrayify(contractAddress);
        const mintAddressBytes = ethers.utils.arrayify(mintHelperAddress);
        const tokenIdBigInt = ethers.utils.bigNumberify(tokenId).toHexString();

        const hash = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["bytes", "bytes", "uint256"],
            [nftAddressBytes, mintAddressBytes, tokenIdBigInt]
          )
        );

        params.sig_hex = yield this.rootStore.cryptoStore.SignMetamask(hash, this.AuthInfo().address, popup);
      }

       */

      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", tenantId),
        method: "POST",
        body: params,
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });

      this.PurchaseComplete({confirmationId, success: true});
    } catch(error) {
      this.PurchaseComplete({confirmationId, success: false, message: error.message});
      throw error;
    }
  })



  ClaimSubmit = flow(function * ({marketplaceId, sku}) {
    try {
      this.submittingOrder = true;

      const tenantId = this.rootStore.marketplaces[marketplaceId].tenant_id;

      this.PurchaseInitiated({confirmationId: sku, tenantId, marketplaceId, sku});

      yield this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: UrlJoin("as", "wlt", "act", tenantId),
        body: {
          op: "nft-claim",
          sid: marketplaceId,
          sku
        },
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });

      this.PurchaseComplete({confirmationId: sku, success: true});

      return { confirmationId: sku };
    } catch(error) {
      this.rootStore.Log(error, true);

      this.PurchaseComplete({confirmationId: sku, success: false, message: "Claim Failed"});

      throw error;
    } finally {
      this.submittingOrder = false;
    }
  });

  ListingCheckoutSubmit = flow(function * ({
    provider="stripe",
    marketplaceId,
    listingId,
    tenantId,
    confirmationId,
    email,
    address,
    fromEmbed,
    flowId
  }) {
    if(this.submittingOrder) { return; }

    const requiresPopup = this.rootStore.embedded && !["wallet-balance", "linked-wallet"].includes(provider);
    confirmationId = confirmationId || (provider === "linked-wallet" ? this.ConfirmationId(true) : `T-${this.ConfirmationId()}`);

    try {
      this.submittingOrder = true;

      let authInfo = this.rootStore.AuthInfo() || {};
      if(!authInfo.user) {
        authInfo.user = {};
      }

      email = email || (authInfo.user || {}).email || this.rootStore.userProfile.email;
      authInfo.user.email = email;

      const successPath =
        marketplaceId ?
          UrlJoin("/marketplace", marketplaceId, "store", tenantId, listingId, "purchase", confirmationId) :
          UrlJoin("/wallet", "listings", tenantId, listingId, "purchase", confirmationId);

      const cancelPath =
        marketplaceId ?
          UrlJoin("/marketplace", marketplaceId, "listings", listingId) :
          UrlJoin("/wallet", "listings", listingId);


      this.PurchaseInitiated({confirmationId, tenantId, marketplaceId, listingId, successPath});

      if(requiresPopup) {
        // Third party checkout doesn't work in iframe, open new window to initiate purchase
        yield this.rootStore.Flow({
          flow: "listing-purchase",
          includeAuth: true,
          parameters: {
            provider,
            tenantId,
            marketplaceId,
            listingId,
            confirmationId,
            email,
            address: this.rootStore.CurrentAddress()
          },
          OnComplete: () => {
            this.PurchaseComplete({confirmationId, success: true});
          },
          OnCancel: () => {
            this.PurchaseComplete({confirmationId, success: false, message: "Purchase failed"});
          }
        });

        return { confirmationId };
      }

      const listing = (yield this.rootStore.transferStore.FetchTransferListings({listingId, forceUpdate: true}))[0];
      if(!listing || (listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now())) {
        throw {
          status: 409,
          recoverable: false,
          uiMessage: "Listing is no longer available"
        };
      }

      const checkoutId = `nft-marketplace:${confirmationId}`;

      let successUrl, cancelUrl;
      if(fromEmbed) {
        successUrl = this.rootStore.FlowURL({flow: "respond", parameters: {flowId, response: {confirmationId, success: true}}});
        cancelUrl = this.rootStore.FlowURL({flow: "respond", parameters: {flowId, response: {confirmationId, success: false}, error: "User cancelled checkout"}});
      } else {
        successUrl = this.rootStore.FlowURL({flow: "redirect", parameters: {to: successPath}});
        cancelUrl = this.rootStore.FlowURL({flow: "redirect", parameters: {to: cancelPath}});
      }

      address = address || this.rootStore.CurrentAddress();
      if(email && !this.rootStore.AccountEmail(address)) {
        this.rootStore.SetAccountEmail(address, email);
      }

      let requestParams = {
        currency: this.currency,
        email,
        client_reference_id: checkoutId,
        elv_addr: address,
        items: [{sku: listingId, quantity: 1}],
        success_url: successUrl,
        cancel_url: cancelUrl
      };

      if(EluvioConfiguration["mode"]) {
        requestParams.mode = EluvioConfiguration["mode"];
      }

      yield this.CheckoutRedirect({provider, requestParams, confirmationId});

      this.PurchaseComplete({confirmationId, success: true, successPath});

      return { confirmationId, successPath };
    } catch(error) {
      this.rootStore.Log(error, true);

      this.PurchaseComplete({confirmationId, success: false, message: "Purchase failed"});

      if(typeof error.recoverable !== "undefined") {
        throw error;
      } else {
        throw {
          recoverable: true,
          uiMessage: error.uiMessage || "Purchase failed"
        };
      }
    } finally {
      this.submittingOrder = false;
    }
  });

  CheckoutSubmit = flow(function * ({
    provider="stripe",
    tenantId,
    marketplaceId,
    sku,
    quantity=1,
    confirmationId,
    email,
    address,
    fromEmbed,
    flowId
  }) {
    if(this.submittingOrder) { return; }

    const requiresPopup = this.rootStore.embedded && !["wallet-balance", "linked-wallet"].includes(provider);
    confirmationId = confirmationId || `M-${this.ConfirmationId()}`;

    try {
      this.submittingOrder = true;

      let authInfo = this.rootStore.AuthInfo() || {};
      if(!authInfo.user) {
        authInfo.user = {};
      }

      email = email || (authInfo.user || {}).email || this.rootStore.userProfile.email;
      authInfo.user.email = email;

      const successPath = UrlJoin("/marketplace", marketplaceId, "store", tenantId, sku, "purchase", confirmationId);
      const cancelPath = UrlJoin("/marketplace", marketplaceId, "store", sku);

      this.PurchaseInitiated({confirmationId, tenantId, marketplaceId, sku, successPath});

      if(requiresPopup) {
        // Third party checkout doesn't work in iframe, open new window to initiate purchase
        yield this.rootStore.Flow({
          flow: "purchase",
          includeAuth: true,
          parameters: {
            provider,
            tenantId,
            marketplaceId,
            sku,
            quantity,
            confirmationId,
            email,
            address: this.rootStore.CurrentAddress()
          },
          OnComplete: () => {
            this.PurchaseComplete({confirmationId, success: true});
          },
          OnCancel: () => {
            this.PurchaseComplete({confirmationId, success: false, message: "Purchase failed"});
          }
        });

        return { confirmationId };
      }

      const stock = (yield this.MarketplaceStock({tenantId}) || {})[sku];
      if(stock && (stock.max - stock.minted) < quantity) {
        throw {
          recoverable: true,
          message: `Quantity ${quantity} exceeds stock ${stock.max - stock.minted} for ${sku}`,
          uiMessage: "Insufficient stock available for this purchase"
        };
      }

      const checkoutId = `${marketplaceId}:${confirmationId}`;

      let successUrl, cancelUrl;
      if(fromEmbed) {
        successUrl = this.rootStore.FlowURL({flow: "respond", parameters: {flowId, response: {confirmationId, success: true}}});
        cancelUrl = this.rootStore.FlowURL({flow: "respond", parameters: {flowId, response: {confirmationId, success: false}, error: "User cancelled checkout"}});
      } else {
        successUrl = this.rootStore.FlowURL({flow: "redirect", parameters: {to: successPath}});
        cancelUrl = this.rootStore.FlowURL({flow: "redirect", parameters: {to: cancelPath}});
      }

      address = address || this.rootStore.CurrentAddress();
      if(email && !this.rootStore.AccountEmail(address)) {
        this.rootStore.SetAccountEmail(address, email);
      }

      let requestParams = {
        currency: this.currency,
        email,
        client_reference_id: checkoutId,
        elv_addr: address,
        items: [{sku, quantity}],
        success_url: successUrl,
        cancel_url: cancelUrl
      };

      if(EluvioConfiguration["mode"]) {
        requestParams.mode = EluvioConfiguration["mode"];
      }

      yield this.CheckoutRedirect({provider, requestParams, confirmationId});

      this.PurchaseComplete({confirmationId, success: true, successPath});

      return { confirmationId, successPath };
    } catch(error) {
      this.rootStore.Log(error, true);

      this.PurchaseComplete({confirmationId, success: false, message: "Purchase failed"});

      if(typeof error.recoverable !== "undefined") {
        throw error;
      } else {
        throw {
          recoverable: true,
          uiMessage: error.uiMessage || "Purchase failed"
        };
      }
    } finally {
      this.submittingOrder = false;
    }
  });

  CheckoutRedirect = flow(function * ({provider, requestParams, confirmationId}) {
    if(provider === "stripe") {
      const sessionId = (yield this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: UrlJoin("as", "checkout", "stripe"),
          body: requestParams,
          headers: {
            Authorization: `Bearer ${this.rootStore.authToken}`
          }
        })
      )).session_id;

      const stripeKey = EluvioConfiguration.mode && EluvioConfiguration.mode !== "production" ?
        PUBLIC_KEYS.stripe.test :
        PUBLIC_KEYS.stripe.production;

      // Redirect to stripe
      const {loadStripe} = yield import("@stripe/stripe-js/pure");
      const stripe = yield loadStripe(stripeKey);
      yield stripe.redirectToCheckout({sessionId});
    } else if(provider === "coinbase") {
      const chargeCode = (yield this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: UrlJoin("as", "checkout", "coinbase"),
          body: requestParams,
          headers: {
            Authorization: `Bearer ${this.rootStore.authToken}`
          }
        })
      )).charge_code;

      window.location.href = UrlJoin("https://commerce.coinbase.com/charges", chargeCode);
    } else if(provider === "wallet-balance") {
      yield this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: UrlJoin("as", "wlt", "mkt", "bal", "pay"),
        body: requestParams,
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });

      setTimeout(() => this.rootStore.GetWalletBalance(), 1000);
    } else if(provider === "linked-wallet") {
      if(!this.rootStore.embedded) {
        yield this.rootStore.cryptoStore.PhantomBalance();
      }

      if(!(this.rootStore.cryptoStore.phantomBalance > 0)) {
        throw {
          recoverable: false,
          uiMessage: "Solana account has insufficient balance to perform this transaction"
        };
      }

      const response = (yield this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: UrlJoin("as", "checkout", "solana"),
          body: requestParams,
          headers: {
            Authorization: `Bearer ${this.rootStore.authToken}`
          }
        })
      ));

      const signature = yield this.rootStore.cryptoStore.PurchasePhantom(response.params[0]);

      this.solanaSignatures[confirmationId] = signature;

      this.rootStore.SetSessionStorage("solana-signatures", JSON.stringify(this.solanaSignatures));

      this.rootStore.Log("Purchase transaction signature: " + signature);
    } else {
      throw Error("Invalid provider: " + provider);
    }
  });
}

export default CheckoutStore;
