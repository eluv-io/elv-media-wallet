import React, {useEffect, useState} from "react";
import {mediaPropertyStore, rootStore} from "Stores/index";
import {Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";
import MediaPropertyHeader from "Components/properties/MediaPropertyHeader";

const PropertyWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const [itemLoaded, setItemLoaded] = useState(!match.params.contractId);

  const mediaPropertySlugOrId = match.params.mediaPropertySlugOrId;

  useEffect(() => {
    rootStore.ClearMarketplace();

    if(match.params.contractId) {
      rootStore.LoadNFTData({
        contractId: match.params.contractId,
        tokenId: match.params.tokenId
      })
        .then(() => setItemLoaded(true));
    }
  }, []);

  if(!rootStore.loaded || !itemLoaded) {
    return <PageLoader />;
  }

  if(mediaPropertySlugOrId) {
    return (
      <AsyncComponent
        // Store info is cleared when logged in
        cacheSeconds={60}
        key={`property-${mediaPropertySlugOrId}-${rootStore.loggedIn}`}
        loadKey={`property-${mediaPropertySlugOrId}-${rootStore.loggedIn}`}
        Load={async () => await mediaPropertyStore.LoadMediaProperty({mediaPropertySlugOrId})}
        loadingClassName="page-loader content"
      >
        { children }
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
  );
});
