import UrlJoin from "url-join";
import {parse as UUIDParse, v4 as UUID} from "uuid";
import {makeAutoObservable, flow, runInAction} from "mobx";
import {loadStripe} from "@stripe/stripe-js";
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

  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }

  ConfirmationId() {
    return Utils.B58(UUIDParse(UUID()));
  }

  MarketplaceStock = flow(function * (marketplace) {
    try {
      this.stock = yield Utils.ResponseToJson(
        this.rootStore.client.authClient.MakeAuthServiceRequest({
          path: UrlJoin("as", "wlt", "nft", "info", marketplace.tenant_id),
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.rootStore.client.signer.authToken}`
          }
        })
      );

      return this.stock;
    } catch(error) {
      this.rootStore.Log("Failed to retrieve marketplace stock", true);
      this.rootStore.Log(error, true);
    }
  });

  PurchaseComplete({confirmationId, success}) {
    this.submittingOrder = false;

    if(success) {
      this.completedPurchases[confirmationId] = {
        ...(this.pendingPurchases[confirmationId] || {})
      };
    }

    delete this.pendingPurchases[confirmationId];
  }

  StripeSubmit = flow(function * ({marketplaceId, sku, confirmationId, email}) {
    if(this.submittingOrder) { return; }

    try {
      this.submittingOrder = true;

      // If confirmation ID is already set before calling, this method was called as a result of an iframe opening a new window
      const fromEmbed = !!confirmationId;

      confirmationId = confirmationId || this.ConfirmationId();

      if(this.rootStore.embedded) {
        this.pendingPurchases[confirmationId] = {
          marketplaceId,
          sku,
          confirmationId
        };

        // Stripe doesn't work in iframe, open new window to initiate purchase
        const url = new URL(window.location.origin);
        url.pathname = window.location.pathname;
        url.hash = `/marketplaces/${marketplaceId}/${sku}/purchase/${confirmationId}`;
        url.searchParams.set("embed", "");

        if(rootStore.darkMode) {
          url.searchParams.set("d", "");
        }

        const authInfo = this.rootStore.AuthInfo();
        authInfo.user.email = authInfo.user.email || email;
        url.searchParams.set("auth", Utils.B64(JSON.stringify(authInfo)));

        const openedWindow = window.open(url.toString());

        const closeCheck = setInterval(() => {
          if(!this.pendingPurchases[confirmationId]) {
            clearInterval(closeCheck);

            return;
          }

          if(!openedWindow || openedWindow.closed) {
            clearInterval(closeCheck);

            // Ensure pending is cleaned up when popup is closed without finishing
            runInAction(() => delete this.pendingPurchases[confirmationId]);
          }
        }, 1000);

        return confirmationId;
      }

      const mode = EluvioConfiguration["test-mode"] ? "test" : "production";
      const checkoutId = `${marketplaceId}:${confirmationId}`;

      const baseUrl = new URL(UrlJoin(window.location.origin, window.location.pathname, "#", "marketplaces", marketplaceId, sku, "purchase", confirmationId));

      if(fromEmbed) {
        baseUrl.searchParams.set("embed", "true");
      }

      const requestParams = {
        mode,
        currency: this.currency,
        email: email || this.rootStore.userProfile.email,
        client_reference_id: checkoutId,
        elv_addr: this.rootStore.client.signer.address,
        items: [{sku, quantity: 1}],
        success_url: UrlJoin(baseUrl.toString(), "success"),
        cancel_url: UrlJoin(baseUrl.toString(), "cancel")
      };

      const sessionId = (yield this.rootStore.client.utils.ResponseToJson(
        this.rootStore.client.authClient.MakeAuthServiceRequest({
          method: "POST",
          path: UrlJoin("as", "checkout", "stripe"),
          body: requestParams
        })
      )).session_id;

      // Redirect to stripe
      const stripe = yield loadStripe(PUBLIC_KEYS.stripe[mode]);
      yield stripe.redirectToCheckout({sessionId});
    } catch(error) {
      this.rootStore.Log(error, true);
    } finally {
      this.submittingOrder = false;
    }
  });
}

export default CheckoutStore;
