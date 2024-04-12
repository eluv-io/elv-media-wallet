import React, {useEffect, useState} from "react";
import {mediaPropertyStore, rootStore} from "Stores/index";
import {Redirect, Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";
import MediaPropertyHeader from "Components/properties/MediaPropertyHeader";
import MediaPropertyPurchaseModal from "Components/properties/MediaPropertyPurchaseModal";
import {LoginGate} from "Components/common/LoginGate";
import {PurchaseGate} from "Components/properties/Common";

const PropertyWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const [itemLoaded, setItemLoaded] = useState(!match.params.contractId);
  const [redirect, setRedirect] = useState(false);

  const mediaPropertySlugOrId = match.params.mediaPropertySlugOrId;

  useEffect(() => {
    if(rootStore.specifiedMarketplaceId) {
      rootStore.SetMarketplace({marketplaceId: rootStore.specifiedMarketplaceId, specified: true});
    } else {
      rootStore.ClearMarketplace();
    }

    if(match.params.contractId) {
      rootStore.LoadNFTData({
        contractId: match.params.contractId,
        tokenId: match.params.tokenId
      })
        .then(data => {
          // Redirect if trying to view a bundle you don't own
          setRedirect(
            !data ||
            !rootStore.client.utils.EqualAddress(data?.details?.TokenOwner, rootStore.CurrentAddress())
          );
          setItemLoaded(true);
        });
    }
  }, []);

  if(!rootStore.loaded || !itemLoaded) {
    return <PageLoader />;
  }

  if(redirect) {
    return <Redirect to="/wallet/users/me/items" />;
  }

  if(mediaPropertySlugOrId) {
    const mediaProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});

    return (
      <AsyncComponent
        // Store info is cleared when logged in
        cacheSeconds={60}
        key={`property-${mediaPropertySlugOrId}-${rootStore.loggedIn}`}
        loadKey={`property-${mediaPropertySlugOrId}-${rootStore.loggedIn}`}
        Load={async () => await mediaPropertyStore.LoadMediaProperty({mediaPropertySlugOrId})}
        loadingClassName="page-loader content"
      >
        <PurchaseGate permissions={mediaProperty?.permissions} backPath="/">
          { children }
        </PurchaseGate>
        <MediaPropertyPurchaseModal />
      </AsyncComponent>
    );
  }

  return children;
});

export const PropertyRoutes = observer(() => {
  return (
    <div className="page-container property-page">
      <MediaPropertyHeader />
      <Switch>
        <RenderRoutes
          basePath="/p"
          routeList="property"
          Wrapper={PropertyWrapper}
        />
      </Switch>
    </div>
  );
});

export const BundledPropertyRoutes = observer(() => {
  return (
    <LoginGate backPath="/">
      <div className="page-container property-page">
        <MediaPropertyHeader />
        <Switch>
          <RenderRoutes
            basePath="/m"
            routeList="bundledProperty"
            Wrapper={PropertyWrapper}
          />
        </Switch>
      </div>
    </LoginGate>
  );
});
