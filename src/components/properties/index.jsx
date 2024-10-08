import PropertyStyles from "Assets/stylesheets/media_properties/property-page.module.scss";

import React, {useEffect, useState} from "react";
import {mediaPropertyStore, rootStore} from "Stores/index";
import {Redirect, Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";
import MediaPropertyHeader from "Components/properties/MediaPropertyHeader";
import {LoginGate} from "Components/common/LoginGate";
import {PurchaseGate} from "Components/properties/Common";
import MediaPropertyFooter from "Components/properties/MediaPropertyFooter";
import {SetHTMLMetaTags} from "../../utils/Utils";

const PropertyWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const [itemLoaded, setItemLoaded] = useState(!match.params.propertyItemContractId);
  const [redirect, setRedirect] = useState(false);

  const { mediaPropertySlugOrId, pageSlugOrId } = match.params;
  const mediaProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});

  useEffect(() => {
    if(match.params.propertyItemContractId) {
      rootStore.LoadNFTData({
        contractId: match.params.propertyItemContractId,
        tokenId: match.params.propertyItemTokenId
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

  useEffect(() => {
    // Property not loaded or acutally on custom domain
    if(!mediaProperty || rootStore.isCustomDomain) {
      return;
    }

    rootStore.SetDomainCustomization(mediaProperty.mediaPropertyId);

    return () => {
      setTimeout(() => {
        if(!rootStore.routeParams.mediaPropertySlugOrId) {
          rootStore.ClearDomainCustomization();
          SetHTMLMetaTags();
        }
      }, 500);
    };
  }, [mediaProperty]);

  if(!rootStore.loaded  || !itemLoaded) {
    return <PageLoader />;
  }

  if(redirect) {
    return <Redirect to="/wallet/users/me/items" />;
  }

  if(mediaPropertySlugOrId) {
    const mediaProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});
    const page = mediaPropertyStore.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId});

    return (
      <AsyncComponent
        // Store info is cleared when logged in
        cacheSeconds={20}
        key={`property-${mediaPropertySlugOrId}-${rootStore.CurrentAddress()}`}
        loadKey={`property-${mediaPropertySlugOrId}-${rootStore.CurrentAddress()}`}
        Load={async () => {
          await mediaPropertyStore.LoadMediaProperty({mediaPropertySlugOrId});

          const property = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});

          if(!property) { return; }

          SetHTMLMetaTags({
            metaTags: property.metadata?.meta_tags
          });

          const provider = rootStore.AuthInfo()?.provider || "external";
          const propertyProvider = property?.metadata?.login?.settings?.provider || "auth0";
          if(
            rootStore.loggedIn &&
            provider !== propertyProvider &&
            // Only allow metamask for auth0
            !(provider === "external" && propertyProvider === "auth0")
          ) {
            rootStore.Log("Signing out due to mismatched login provider with property");
            await rootStore.SignOut({reload: false});
          }
        }}
        loadingClassName="page-loader content"
      >
        <LoginGate Condition={() => mediaProperty?.metadata?.require_login}>
          <PurchaseGate id={mediaProperty?.mediaPropertyId} permissions={mediaProperty?.permissions}>
            <PurchaseGate id={page?.id} permissions={page?.permissions}>
              <div className={PropertyStyles["property"]}>
                { children }
              </div>
            </PurchaseGate>
          </PurchaseGate>
        </LoginGate>
      </AsyncComponent>
    );
  }

  return children;
});

export const PropertyRoutes = observer(({basePath}) => {
  return (
    <div className="page-container property-page">
      <MediaPropertyHeader />
      <Switch>
        <RenderRoutes
          basePath={basePath}
          routeList="property"
          Wrapper={PropertyWrapper}
        />
      </Switch>
      <MediaPropertyFooter />
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
            basePath="/"
            routeList="bundledProperty"
            Wrapper={PropertyWrapper}
          />
        </Switch>
        <MediaPropertyFooter />
      </div>
    </LoginGate>
  );
});
