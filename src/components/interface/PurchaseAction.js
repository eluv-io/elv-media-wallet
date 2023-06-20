import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore, transferStore} from "Stores";
import {NFTInfo} from "../../utils/Utils";
import {PageLoader} from "Components/common/Loaders";
import ImageIcon from "Components/common/ImageIcon";
import PurchaseModal from "Components/listings/PurchaseModal";

import EluvioLogo from "Assets/images/EluvioLogo";

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

    if(marketplaceId) {
      rootStore.LoadMarketplace(marketplaceId);
      rootStore.SetMarketplace({marketplaceId});
    } else {
      rootStore.ClearMarketplace();
    }

    if(parameters.listingId) {
      transferStore.CurrentNFTStatus({listingId: parameters.listingId})
        .then(async status => setListingStatus(status))
        .catch(error => {
          rootStore.Log(error, true);
          setListingStatus({error: "Unable to load NFT"});
        });
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

  if(!rootStore.loggedIn) {
    return <PageLoader />;
  }

  let errorMessage;
  if(match.params.marketplace && !marketplace) {
    errorMessage = rootStore.l10n.errors.general;
    rootStore.Log(`Unable to find marketplace with ID ${marketplaceId}`, true);
  } else if(!parameters.listingId && !parameters.sku) {
    errorMessage = rootStore.l10n.errors.general;
    rootStore.Log("Neither SKU nor listing ID provided", true);
  } else if(parameters.sku && marketplace && !item) {
    errorMessage = rootStore.l10n.errors.general;
    rootStore.Log(`Unable to find item with SKU ${parameters.sku}`, true);
  } else if(listingStatus && !listingStatus.listing) {
    errorMessage = rootStore.l10n.purchase.errors.listing_unavailable;
    rootStore.Log(`Unable to find listing with ID ${parameters.listingId}`, true);
  }

  if(errorMessage) {
    return (
      <div className="page-container signature-popup">
        <div className="signature-popup__content">
          <div className="signature-popup__logo-container">
            <ImageIcon icon={EluvioLogo} className="signature-popup__logo" />
          </div>
          <h1>
            { errorMessage }
          </h1>
          <div className="actions">
            <a href={parameters.cancelUrl} rel="noopener" className="action">
              { rootStore.l10n.actions.back }
            </a>
          </div>
        </div>
      </div>
    );
  }

  if(!nftInfo) {
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

export default PurchaseAction;
