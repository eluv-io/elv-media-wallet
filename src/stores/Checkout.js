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

  get walletClient() {
    return this.rootStore.walletClient;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;
    this.Log = this.rootStore.Log;

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
      const stock = yield this.walletClient.MarketplaceStock({tenantId});

      // Keep all retrieved stock across marketplaces
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

  PurchaseInitiated({tenantId, confirmationId, marketplaceId, price, quantity=1, sku, successPath}) {
    this.purchaseStatus[confirmationId] = {
      status: "pending",
      confirmationId,
      tenantId,
      marketplaceId,
      price,
      quantity,
      sku,
      successPath
    };

    this.rootStore.SetLocalStorage("purchase-status", JSON.stringify(this.purchaseStatus));
  }

  async PurchaseComplete({confirmationId, success, message}) {
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

  // Note: Synchronize with live
  AnalyticsEvent({marketplace, analytics, eventName}) {
    try {
      if(!this.rootStore.analyticsInitialized || !analytics) {
        return;
      }

      if(analytics.google_conversion_id) {
        this.Log(`Registering Google Tag Manager ${eventName} event`, "warn");

        window.gtag(
          "event",
          "conversion", {
            "allow_custom_scripts": true,
            "send_to": `DC-3461539/${analytics.google_conversion_id}/${analytics.google_conversion_label}`
          }
        );
      }

      if(analytics.facebook_event_id) {
        const analyticsId = marketplace.analytics_ids[0]?.ids.find(id => id.type === "Facebook Pixel ID")?.id;

        if(analyticsId) {
          this.Log(`Registering Facebook Analytics ${eventName} event`, "warn");
          fbq("trackSingle", analyticsId, "InitiateCheckout", {content_id: analytics.facebook_event_id});
        }
      }

      if(analytics.twitter_event_id) {
        const analyticsId = marketplace.analytics_ids[0]?.ids.find(id => id.type === "Twitter Pixel ID")?.id;

        if(analyticsId) {
          this.Log(`Registering Twitter Analytics ${eventName} event`, "warn");
          twq("event", `tw-${analyticsId}-${analytics.twitter_event_id}`);
        }
      }
    } catch(error) {
      this.Log(error, true);
    }
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

      if(this.rootStore.walletClient.UserInfo().walletName.toLowerCase() === "metamask") {
        // Must create signature for burn operation to pass to API

        let popup;
        if(this.rootStore.embedded) {
          // Create popup before calling async config method to avoid popup blocker
          popup = window.open("about:blank");
        }

        const config = yield this.walletClient.TenantConfiguration({contractAddress});

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

        params.sig_hex = yield this.rootStore.cryptoStore.SignMetamask(hash, this.rootStore.CurrentAddress(), popup);
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
    const confirmationId = this.ConfirmationId();
    const tenantId = marketplace?.tenant_id;

    try {
      // Save as purchase so tenant ID is preserved for status
      this.PurchaseInitiated({tenantId, confirmationId});

      let popup;
      if(this.rootStore.embedded && this.rootStore.walletClient.UserInfo().walletName.toLowerCase() === "metamask") {
        // Create popup before calling async config method to avoid popup blocker
        popup = window.open("about:blank");
      }

      const config = yield this.walletClient.TenantConfiguration({tenantId});

      const items = selectedNFTs.map(item => ({addr: item.contractAddress, id: item.tokenId}));

      const mintHelperAddress = Utils.FormatAddress(config["mint-helper"]);
      if(!mintHelperAddress) {
        throw Error(`Mint helper not defined in configuration for NFT ${contractAddress}`);
      }

      if(this.walletClient.UserInfo().walletName === "Metamask") {
        const itemHashes = items.map(({addr, id}) => {
          const nftAddressBytes = ethers.utils.arrayify(addr);
          const mintAddressBytes = ethers.utils.arrayify(mintHelperAddress);
          const tokenIdBigInt = ethers.utils.bigNumberify(id).toHexString();

          return ethers.utils.keccak256(
            ethers.utils.solidityPack(
              ["bytes", "bytes", "uint256"],
              [nftAddressBytes, mintAddressBytes, tokenIdBigInt]
            )
          );
        });

        const signedHashes = yield this.rootStore.cryptoStore.SignMetamask(itemHashes, this.rootStore.CurrentAddress(), popup);

        signedHashes.forEach((signedHash, index) => {
          items[index].sig_hex = signedHash;
        });
      }

      let params = {
        op: "nft-redeem",
        marketplace_hash: marketplace.versionHash,
        collection_sku: collectionSKU,
        items,
        from_addr: mintHelperAddress,
        client_reference_id: `${collectionSKU}:${confirmationId}`
      };

      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", tenantId),
        method: "POST",
        body: params,
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });

      this.PurchaseComplete({confirmationId, success: true});

      return confirmationId;
    } catch(error) {
      this.PurchaseComplete({confirmationId, success: false, message: error.message});
      throw error;
    }
  })

  RedeemOffer = flow(function * ({tenantId, contractAddress, tokenId, offerId}) {
    const confirmationId = this.ConfirmationId();

    try {
      offerId = parseInt(offerId);
      this.PurchaseInitiated({tenantId, confirmationId});

      let popup;
      if(this.rootStore.embedded && this.rootStore.walletClient.UserInfo().walletName.toLowerCase() === "metamask") {
        // Create popup before calling async config method to avoid popup blocker
        popup = window.open("about:blank");
      }

      const config = yield this.walletClient.TenantConfiguration({tenantId});

      const mintHelperAddress = Utils.FormatAddress(config["mint-helper"]);
      if(!mintHelperAddress) {
        throw Error(`Mint helper not defined in configuration for NFT ${contractAddress}`);
      }

      let signedHash;
      if(this.walletClient.UserInfo().walletName === "Metamask") {
        const nftAddressBytes = ethers.utils.arrayify(contractAddress);
        const mintAddressBytes = ethers.utils.arrayify(mintHelperAddress);
        const tokenIdBigInt = ethers.utils.bigNumberify(tokenId).toHexString();

        const offerHash = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["bytes", "bytes", "uint256", "uint8"],
            [nftAddressBytes, mintAddressBytes, tokenIdBigInt, offerId]
          )
        );

        signedHash = yield this.rootStore.cryptoStore.SignMetamask(offerHash, this.rootStore.CurrentAddress(), popup);
      }

      let params = {
        op: "nft-offer-redeem",
        client_reference_id: confirmationId,
        tok_addr: contractAddress,
        tok_id: tokenId,
        offerId: offerId,
      };

      if(signedHash){
        params.sig_hex = signedHash;
      }

      yield this.client.authClient.MakeAuthServiceRequest({
        path: UrlJoin("as", "wlt", "act", tenantId),
        method: "POST",
        body: params,
        headers: {
          Authorization: `Bearer ${this.rootStore.authToken}`
        }
      });
    } catch(error) {
      this.PurchaseComplete({confirmationId, success: false, message: error.message});
      throw error;
    }
  })

  ClaimSubmit = flow(function * ({marketplaceId, sku, email}) {
    try {
      this.submittingOrder = true;

      const tenantId = this.rootStore.marketplaces[marketplaceId].tenant_id;

      this.PurchaseInitiated({confirmationId: sku, tenantId, marketplaceId, sku});

      if(!email) {
        email = this.rootStore.walletClient.UserInfo()?.email;
      }

      yield this.rootStore.walletClient.ClaimItem({
        marketplaceParams: { marketplaceId },
        email,
        sku
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

      email = email || this.rootStore.walletClient.UserInfo().email;

      const successPath =
        marketplaceId ?
          UrlJoin("/marketplace", marketplaceId, "store", listingId, "purchase", confirmationId) :
          UrlJoin("/wallet", "listings", listingId, "purchase", confirmationId);

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

      try {
        // Ensure listing is still available
        yield this.rootStore.walletClient.Listing({listingId});
      } catch(error) {
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

      if(EluvioConfiguration["purchase-mode"]) {
        requestParams.mode = EluvioConfiguration["purchase-mode"];
      }

      yield this.CheckoutRedirect({
        provider,
        requestParams,
        confirmationId
      });

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
      email = email || this.rootStore.walletClient.UserInfo().email;

      const successPath = UrlJoin("/marketplace", marketplaceId, "store", sku, "purchase", confirmationId);
      const cancelPath = UrlJoin("/marketplace", marketplaceId, "store", sku);

      const item = this.rootStore.marketplaces[marketplaceId]?.items?.find(item => item.sku === sku);

      this.PurchaseInitiated({confirmationId, tenantId, marketplaceId, sku, price: item?.price?.USD, quantity, successPath});

      if(requiresPopup) {
        this.AnalyticsEvent({
          marketplace: this.rootStore.marketplaces[marketplaceId],
          analytics: item?.purchase_analytics,
          eventName: "Item Purchase"
        });

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

      if(!address) {
        throw Error("Unable to determine address for current user");
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

      if(EluvioConfiguration["purchase-mode"]) {
        requestParams.mode = EluvioConfiguration["purchase-mode"];
      }

      yield this.CheckoutRedirect({
        provider,
        requestParams,
        confirmationId,
        BeforeRedirect: async () => {
          this.AnalyticsEvent({
            marketplace: this.rootStore.marketplaces[marketplaceId],
            analytics: item?.purchase_analytics,
            eventName: "Item Purchase"
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      });

      this.PurchaseComplete({confirmationId, success: true, successPath});

      return { confirmationId, successPath };
    } catch(error) {
      this.rootStore.Log(error, true);

      const message = error?.uiMessage || "This item is out of stock";

      if([403, 409].includes(error.status)) {
        this.PurchaseComplete({confirmationId, success: false, message});

        throw {
          recoverable: false,
          uiMessage: message
        };
      } else {
        this.PurchaseComplete({confirmationId, success: false, message});
        throw {
          recoverable: !!error?.recoverable,
          uiMessage: message
        };
      }
    } finally {
      this.submittingOrder = false;
    }
  });

  CheckoutRedirect = flow(function * ({provider, requestParams, confirmationId, BeforeRedirect}) {
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

      const stripeKey = EluvioConfiguration["purchase-mode"] && EluvioConfiguration["purchase-mode"] !== "production" ?
        PUBLIC_KEYS.stripe.test :
        PUBLIC_KEYS.stripe.production;

      // Redirect to stripe
      const {loadStripe} = yield import("@stripe/stripe-js/pure");
      const stripe = yield loadStripe(stripeKey);

      yield BeforeRedirect && BeforeRedirect();

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

      yield BeforeRedirect && BeforeRedirect();

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

      yield BeforeRedirect && BeforeRedirect();

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

      yield BeforeRedirect && BeforeRedirect();
    } else {
      throw Error("Invalid provider: " + provider);
    }
  });
}

export default CheckoutStore;
