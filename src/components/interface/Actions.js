import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import React, {useEffect, useState} from "react";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {rootStore, transferStore} from "Stores";

import SignaturePopup from "Components/interface/SignaturePopup";
import ConsentPopup from "Components/interface/ConsentPopup";
import {PageLoader} from "Components/common/Loaders";
import {NFTInfo} from "../../utils/Utils";
import PurchaseModal from "Components/listings/PurchaseModal";

const PurchaseAction = observer(({parameters}) => {
  const match = useRouteMatch();

  const marketplaceId = match.params.marketplaceId || parameters.marketplaceId;
  const marketplace = rootStore.marketplaces[marketplaceId];
  const item = marketplace?.items?.find(item => item.sku === parameters.sku);

  const [nftInfo, setNFTInfo] = useState(undefined);
  const [listingStatus, setListingStatus] = useState(undefined);

  useEffect(() => {
    rootStore.SetNavigationInfo({
      ...rootStore.navigationInfo,
      navigationKey: marketplaceId ? "marketplace" : "shared",
      locationType: marketplaceId && !parameters.listingId ? "marketplace" : "shared"
    });

    rootStore.LoadMarketplace(marketplaceId);
    rootStore.SetMarketplace({marketplaceId: marketplaceId});

    if(parameters.listingId) {
      transferStore.CurrentNFTStatus({listingId: parameters.listingId})
        .then(async status => setListingStatus(status));

    }
  }, [rootStore.loggedIn]);

  useEffect(() => {
    if(item) {
      setNFTInfo(NFTInfo({item}));
    } else if(listingStatus && listingStatus.listing) {
      // Load full NFT data
      rootStore.LoadNFTData({
        contractAddress: listingStatus.listing.contractAddress,
        tokenId: listingStatus.listing.tokenId
      })
        .then(nft => {
          setNFTInfo(NFTInfo({nft}));
        });
    }
  }, [item, listingStatus]);

  // TODO: If listing is not available, show something and back button

  if(!nftInfo || !rootStore.loggedIn) {
    return <PageLoader />;
  }

  return (
    <PurchaseModal
      Close={() => {
        window.location.href = parameters.cancelUrl;
      }}
      confirmationId={parameters.confirmationId}
      type={parameters.listingId ? "listing" : "marketplace"}
      item={item}
      nft={nftInfo.nft}
      initialListingId={parameters.listingId}
      closeable={false}
      successUrl={parameters.successUrl}
      cancelUrl={parameters.cancelUrl}
    />
  );
});

// Actions are popups that present UI (signing, accepting permissions, etc.)
const Actions = observer(() => {
  const match = useRouteMatch();

  const [loading, setLoading] = useState(true);

  let parameters = {};
  if(match.params.parameters) {
    parameters = JSON.parse(new TextDecoder().decode(Utils.FromB58(match.params.parameters)));
  }

  // Authenticate with auth parameter, if necessary
  useEffect(() => {
    rootStore.ToggleDarkMode(true);

    if(!rootStore.client) { return; }

    if(rootStore.loggedIn) {
      setLoading(false);
      return;
    } else if(parameters.auth) {
      rootStore.Authenticate({clientAuthToken: parameters.auth, saveAuthInfo: false})
        .then(() => setLoading(false));
    } else if(parameters.logIn) {
      rootStore.Authenticate({...rootStore.AuthInfo(), saveAuthInfo: false})
        .then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [rootStore.client]);

  const Respond = ({response, error}) => {
    window.opener.postMessage({
      type: "FlowResponse",
      flowId: parameters.flowId,
      response,
      error
    }, rootStore.authOrigin || window.location.origin);

    setTimeout(() => window.close(), 5000);
  };

  if(loading) {
    return <PageLoader />;
  }

  // When finished handling authentication, present UI
  switch(match.params.action) {
    case "sign":
      return <SignaturePopup parameters={parameters} Respond={Respond} />;

    case "consent":
      return <ConsentPopup parameters={parameters} Respond={Respond} />;

    case "purchase":
      return <PurchaseAction parameters={parameters} />;
  }
});

export default Actions;
