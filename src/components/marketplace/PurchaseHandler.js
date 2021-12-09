import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {PageLoader} from "Components/common/Loaders";
import {checkoutStore, rootStore} from "Stores";
import {PurchaseMintingStatus} from "Components/marketplace/MintingStatus";
import UrlJoin from "url-join";

const PurchaseHandler = observer(({cancelPath}) => {
  const match = useRouteMatch();

  const fromEmbed = new URLSearchParams(window.location.search).has("embed");
  const success = match.path.endsWith("/success");
  const cancel = match.path.endsWith("/cancel");

  if(fromEmbed && (success || cancel)) {
    useEffect(() => {
      window.opener.postMessage({
        type: "ElvMediaWalletClientRequest",
        action: "purchase",
        params: {
          confirmationId: match.params.confirmationId,
          success
        }
      });

      window.close();
    }, []);

    return <PageLoader />;
  } else if(fromEmbed) {
    // Opened from iframe - Initiate stripe purchase
    useEffect(() => {
      rootStore.ToggleNavigation(false);

      const checkoutProvider = new URLSearchParams(window.location.search).get("provider");
      const tenantId = new URLSearchParams(window.location.search).get("tenantId") || match.params.tenantId;
      const quantity = parseInt(new URLSearchParams(window.location.search).get("quantity") || 1);
      const listingId = new URLSearchParams(window.location.search).get("listingId") || match.params.listingId;

      if(listingId) {
        checkoutStore.ListingCheckoutSubmit({
          provider: checkoutProvider,
          marketplaceId: match.params.marketplaceId,
          listingId,
          confirmationId: match.params.confirmationId
        })
          .catch(error => {
            window.opener.postMessage({
              type: "ElvMediaWalletClientRequest",
              action: "purchase",
              params: {
                confirmationId: match.params.confirmationId,
                success: false,
                message: error.status === 409 ? "Listing no longer available" : "Purchase failed"
              }
            });

            window.close();
          });
      } else {
        checkoutStore.CheckoutSubmit({
          provider: checkoutProvider,
          tenantId,
          marketplaceId: match.params.marketplaceId,
          sku: match.params.sku,
          quantity,
          confirmationId: match.params.confirmationId
        })
          .catch(() => {
            window.opener.postMessage({
              type: "ElvMediaWalletClientRequest",
              action: "purchase",
              params: {
                confirmationId: match.params.confirmationId,
                success: false,
                message: "Purchase failed"
              }
            });

            window.close();
          });
      }
    }, []);

    return <PageLoader/>;
  } else if(success) {
    return <PurchaseMintingStatus />;
  } else if(cancel) {
    return <Redirect to={UrlJoin("/", cancelPath)} />;
  }
});

export default PurchaseHandler;
