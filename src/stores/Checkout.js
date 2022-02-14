import UrlJoin from "url-join";
import {parse as UUIDParse, v4 as UUID} from "uuid";
import {makeAutoObservable, flow, runInAction} from "mobx";
import Utils from "@eluvio/elv-client-js/src/Utils";

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

  pendingPurchases = {};
  completedPurchases = {};

  get client() {
    return this.rootStore.client;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }

  ConfirmationId() {
    return Utils.B58(UUIDParse(UUID()));
  }

  MarketplaceStock = flow(function * ({tenantId}) {
    try {
      this.stock = yield Utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "nft", "info", tenantId),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.client.signer.authToken}`
          }
        })
      );

      return this.stock;
    } catch(error) {
      this.rootStore.Log("Failed to retrieve marketplace stock", true);
      this.rootStore.Log(error, true);
    }
  });

  PurchaseComplete({confirmationId, success, message}) {
    this.submittingOrder = false;

    if(success) {
      this.completedPurchases[confirmationId] = {
        ...(this.pendingPurchases[confirmationId] || {})
      };

      delete this.pendingPurchases[confirmationId];
    } else {
      this.pendingPurchases[confirmationId] = {
        ...(this.pendingPurchases[confirmationId] || {}),
        failed: true,
        message
      };
    }
  }

  ClaimSubmit = flow(function * ({marketplaceId, sku}) {
    try {
      this.submittingOrder = true;

      const tenantId = this.rootStore.marketplaces[marketplaceId].tenant_id;

      yield this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: UrlJoin("as", "wlt", "act", tenantId),
        body: {
          op: "nft-claim",
          sid: marketplaceId,
          sku
        },
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      });

      return true;
    } catch(error) {
      this.rootStore.Log(error, true);

      return false;
    } finally {
      this.submittingOrder = false;
    }
  });

  ListingCheckoutSubmit = flow(function * ({
    provider="stripe",
    marketplaceId,
    listingId,
    confirmationId,
    email
  }) {
    if(this.submittingOrder) { return; }

    const requiresPopup = this.rootStore.embedded && provider !== "wallet-balance";

    let popup;
    try {
      if(requiresPopup) {
        popup = window.open("about:blank");
      }

      this.submittingOrder = true;

      confirmationId = confirmationId || `T-${this.ConfirmationId()}`;

      let authInfo = this.rootStore.AuthInfo();
      if(!authInfo.user) {
        authInfo.user = {};
      }

      email = email || (authInfo.user || {}).email || this.rootStore.userProfile.email;
      authInfo.user.email = email;

      if(!email) {
        throw Error("Unable to determine email address in checkout submit");
      }

      const listing = (yield this.rootStore.transferStore.FetchTransferListings({listingId, forceUpdate: true}))[0];

      if(!listing || (listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now())) {
        throw {status: 409, message: "Listing is no longer available"};
      }

      const basePath =
        marketplaceId ?
          UrlJoin("/marketplace", marketplaceId, "store", listing.details.TenantId, listingId, "purchase", confirmationId) :
          UrlJoin("/wallet", "listings", listing.details.TenantId, listingId, "purchase", confirmationId);

      if(requiresPopup) {
        this.pendingPurchases[confirmationId] = {
          listingId,
          confirmationId
        };

        // Stripe doesn't work in iframe, open new window to initiate purchase
        const url = new URL(window.location.origin);
        url.pathname = window.location.pathname;
        url.hash = basePath;
        url.searchParams.set("embed", "");
        url.searchParams.set("provider", provider);
        url.searchParams.set("marketplaceId", marketplaceId || "");
        url.searchParams.set("listingId", listingId);

        if(this.rootStore.darkMode) {
          url.searchParams.set("d", "");
        }

        url.searchParams.set("auth", Utils.B64(JSON.stringify(authInfo)));

        popup.location.href = url.toString();

        this.MonitorCheckoutWindow({popup, confirmationId});

        return { confirmationId, url: url.toString() };
      }

      const checkoutId = `nft-marketplace:${confirmationId}`;
      const rootUrl = new URL(UrlJoin(window.location.origin, window.location.pathname)).toString();

      this.rootStore.SetSessionStorage("successPath", UrlJoin(basePath, "success"));
      this.rootStore.SetSessionStorage("cancelPath", UrlJoin(basePath, "cancel"));

      let requestParams = {
        currency: this.currency,
        email,
        client_reference_id: checkoutId,
        elv_addr: this.client.CurrentAccountAddress(),
        items: [{sku: listingId, quantity: 1}],
        success_url: UrlJoin(rootUrl.toString(), "/#/", "success"),
        cancel_url: UrlJoin(rootUrl.toString(), "/#/", "cancel")
      };

      if(EluvioConfiguration["mode"]) {
        requestParams.mode = EluvioConfiguration["mode"];
      }

      yield this.CheckoutRedirect({provider, requestParams});

      return { confirmationId, successPath: UrlJoin(basePath, "success") };
    } catch(error) {
      if(popup) { popup.close(); }

      throw error;
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
    email
  }) {
    if(this.submittingOrder) { return; }

    const requiresPopup = this.rootStore.embedded && provider !== "wallet-balance";

    let popup;
    try {
      if(requiresPopup) {
        popup = window.open("about:blank");
      }

      this.submittingOrder = true;

      confirmationId = confirmationId || this.ConfirmationId();

      let authInfo = this.rootStore.AuthInfo();
      if(!authInfo.user) {
        authInfo.user = {};
      }

      email = email || (authInfo.user || {}).email || this.rootStore.userProfile.email;
      authInfo.user.email = email;

      const basePath = UrlJoin("/marketplace", marketplaceId, "store", tenantId, sku, "purchase", confirmationId);

      if(!email) {
        throw Error("Unable to determine email address in checkout submit");
      }

      if(requiresPopup) {
        this.pendingPurchases[confirmationId] = {
          marketplaceId,
          sku,
          confirmationId
        };

        // Stripe doesn't work in iframe, open new window to initiate purchase
        const url = new URL(window.location.origin);
        url.pathname = window.location.pathname;
        url.hash = basePath;
        url.searchParams.set("embed", "");
        url.searchParams.set("provider", provider);
        url.searchParams.set("tenantId", tenantId);
        url.searchParams.set("quantity", quantity);

        if(this.rootStore.darkMode) {
          url.searchParams.set("d", "");
        }

        url.searchParams.set("auth", Utils.B64(JSON.stringify(authInfo)));

        popup.location.href = url.toString();

        this.MonitorCheckoutWindow({popup, confirmationId});

        return { confirmationId, url: url.toString() };
      }

      const checkoutId = `${marketplaceId}:${confirmationId}`;

      const rootUrl = new URL(UrlJoin(window.location.origin, window.location.pathname)).toString();

      this.rootStore.SetSessionStorage("successPath", UrlJoin(basePath.toString(), "success"));
      this.rootStore.SetSessionStorage("cancelPath", UrlJoin(basePath.toString(), "cancel"));

      let requestParams = {
        currency: this.currency,
        email,
        client_reference_id: checkoutId,
        elv_addr: this.client.CurrentAccountAddress(),
        items: [{sku, quantity}],
        success_url: UrlJoin(rootUrl.toString(), "/#/", "success"),
        cancel_url: UrlJoin(rootUrl.toString(), "/#/", "cancel")
      };

      if(EluvioConfiguration["mode"]) {
        requestParams.mode = EluvioConfiguration["mode"];
      }

      const stock = (yield this.MarketplaceStock({tenantId}) || {})[sku];

      if(stock && (stock.max - stock.minted) < quantity) {
        throw {
          status: 409,
          message: `Quantity ${quantity} exceeds stock ${stock.max - stock.minted} for ${sku}`
        };
      }

      yield this.CheckoutRedirect({provider, requestParams});

      return { confirmationId, successPath: UrlJoin(basePath, "success") };
    } catch(error) {
      if(popup) { popup.close(); }

      this.rootStore.Log(error, true);
    } finally {
      this.submittingOrder = false;
    }
  });

  MonitorCheckoutWindow({popup, confirmationId}) {
    const closeCheck = setInterval(() => {
      if(!this.pendingPurchases[confirmationId]) {
        clearInterval(closeCheck);

        return;
      }

      if(!popup || popup.closed) {
        clearInterval(closeCheck);

        // Ensure pending is cleaned up when popup is closed without finishing
        runInAction(() => delete this.pendingPurchases[confirmationId]);
      }
    }, 1000);
  }

  async CheckoutRedirect({provider, requestParams}) {
    if(provider === "stripe") {
      const sessionId = (await this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: UrlJoin("as", "checkout", "stripe"),
          body: requestParams
        })
      )).session_id;

      const stripeKey = EluvioConfiguration.mode && EluvioConfiguration.mode !== "production" ?
        PUBLIC_KEYS.stripe.test :
        PUBLIC_KEYS.stripe.production;

      // Redirect to stripe
      const {loadStripe} = await import("@stripe/stripe-js/pure");
      const stripe = await loadStripe(stripeKey);
      await stripe.redirectToCheckout({sessionId});
    } else if(provider === "coinbase") {
      const chargeCode = (await this.client.utils.ResponseToJson(
        this.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: UrlJoin("as", "checkout", "coinbase"),
          body: requestParams
        })
      )).charge_code;

      window.location.href = UrlJoin("https://commerce.coinbase.com/charges", chargeCode);
    } else if(provider === "wallet-balance") {
      await this.client.authClient.MakeAuthServiceRequest({
        method: "POST",
        path: UrlJoin("as", "wlt", "mkt", "bal", "pay"),
        body: requestParams,
        headers: {
          Authorization: `Bearer ${this.client.signer.authToken}`
        }
      });

      setTimeout(() => this.rootStore.GetWalletBalance(), 1000);
    }
  }
}

export default CheckoutStore;
