import UrlJoin from "url-join";
import {parse as UUIDParse, v4 as UUID} from "uuid";
import {makeAutoObservable, flow} from "mobx";
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

  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }

  ConfirmationId() {
    return Utils.B58(UUIDParse(UUID()));
  }

  StripeSubmit = flow(function * ({marketplaceId, sku}) {
    if(this.submittingOrder) { return; }

    try {
      this.submittingOrder = true;

      const mode = EluvioConfiguration["test-mode"] ? "test" : "production";
      const confirmationId = this.ConfirmationId();
      const checkoutId = `${marketplaceId}:${confirmationId}`;

      const baseUrl = UrlJoin(window.location.origin, "#", "marketplaces", marketplaceId);

      const requestParams = {
        mode,
        currency: this.currency,
        email: this.rootStore.userProfile.email,
        client_reference_id: checkoutId,
        elv_addr: this.rootStore.client.signer.address,
        items: [{sku, quantity: 1}],
        success_url: UrlJoin(baseUrl, "success", confirmationId),
        cancel_url: baseUrl
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
