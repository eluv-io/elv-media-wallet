import React from "react";
import {mediaPropertyStore, rootStore} from "Stores/index";
import {Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";

const PropertyWrapper = observer(({children}) => {
  const match = useRouteMatch();

  const mediaPropertySlugOrId = match.params.mediaPropertySlugOrId;

  if(!rootStore.loaded) {
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

const PropertyRoutes = observer(() => {
  return (
    <div className="page-container property-page">
      <Switch>
        <RenderRoutes
          basePath="/properties"
          routeList="property"
          Wrapper={PropertyWrapper}
        />
      </Switch>
    </div>
  );
});

export default PropertyRoutes;
