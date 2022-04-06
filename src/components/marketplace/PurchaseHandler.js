import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {PageLoader} from "Components/common/Loaders";
import {checkoutStore, rootStore} from "Stores";
import {PurchaseMintingStatus} from "Components/marketplace/MintingStatus";
import UrlJoin from "url-join";

const PurchaseHandler = observer(({cancelPath}) => {
  const match = useRouteMatch();

  const success = match.path.endsWith("/success");
  const cancel = match.path.endsWith("/cancel");

  if(rootStore.fromEmbed && (success || cancel)) {
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
  } else if(rootStore.fromEmbed) {
    // Opened from iframe - Initiate stripe purchase

    rootStore.SetSessionStorage("fromEmbed", true);

    useEffect(() => {
      rootStore.ToggleNavigation(false);

      const params = new URLSearchParams(window.location.search);

      const checkoutProvider = params.get("provider");
      const tenantId = params.get("tenantId") || match.params.tenantId;
      const quantity = parseInt(params.get("quantity") || 1);
      const listingId = params.get("listingId") || match.params.listingId;

      if(listingId) {
        checkoutStore.ListingCheckoutSubmit({
          provider: checkoutProvider,
          marketplaceId: match.params.marketplaceId,
          listingId,
          confirmationId: match.params.confirmationId
        })
          .catch(error => {
            rootStore.Log(error, true);

            window.opener.postMessage({
              type: "ElvMediaWalletClientRequest",
              action: "purchase",
              params: {
                confirmationId: match.params.confirmationId,
                success: false,
                message: error.status === 409 ? "Listing no longer available" : "Purchase failed"
              }
            });

            setTimeout(() => window.close(), 3000);
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
          .catch(error => {
            rootStore.Log(error, true);

            window.opener.postMessage({
              type: "ElvMediaWalletClientRequest",
              action: "purchase",
              params: {
                confirmationId: match.params.confirmationId,
                success: false,
                message: "Purchase failed"
              }
            });

            setTimeout(() => window.close(), 3000);
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
