import PropertyStyles from "@/assets/stylesheets/media_properties/property-page.module.scss";

import React, {useEffect, useState} from "react";
import {mediaPropertyStore, rootStore} from "@/stores/index";
import {Redirect, Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import RenderRoutes from "@/routes";
import {LoginGate} from "@/components/common/LoginGate";
import MediaPropertyFooter from "@/components/properties/MediaPropertyFooter";
import {SetHTMLMetaTags} from "@/utils/Utils";
import PreviewPasswordGate from "@/components/login/PreviewPasswordGate";
import MediaPropertyPurchaseModal from "@/components/properties/MediaPropertyPurchaseModal";
import {PageLoader} from "@/components/common/Loaders";

const PropertyWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const [itemLoaded, setItemLoaded] = useState(!match.params.propertyItemContractId);
  const [redirect, setRedirect] = useState(false);
  const [loading, setLoading] = useState(true);

  const { parentMediaPropertySlugOrId, mediaPropertySlugOrId, pageSlugOrId } = match.params;
  const mediaProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});

  const isWrongPropertyInCustomDomain = (
    rootStore.isCustomDomain &&
    (
      ![rootStore.customDomainPropertySlug, rootStore.customDomainPropertyId].includes(parentMediaPropertySlugOrId) &&
        ![rootStore.customDomainPropertySlug, rootStore.customDomainPropertyId].includes(mediaPropertySlugOrId)
    )
  );

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
    if(!mediaProperty || isWrongPropertyInCustomDomain) {
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

  useEffect(() => {
    (async () => {
      rootStore.SetShowSplash(true);
      setLoading(true);

      try {
        await mediaPropertyStore.LoadMediaProperty({mediaPropertySlugOrId});

        const property = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});

        if(!property) {
          return;
        }

        if(parentMediaPropertySlugOrId) {
          await mediaPropertyStore.LoadMediaProperty({mediaPropertySlugOrId: parentMediaPropertySlugOrId});
        }

        const parentProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId: parentMediaPropertySlugOrId});

        rootStore.checkoutStore.SetCurrency({
          currency: property?.metadata?.currency || parentProperty?.metadata?.currency || "USD"
        });

        SetHTMLMetaTags({
          metaTags: property.metadata?.meta_tags
        });

        const provider = rootStore.AuthInfo()?.provider || "external";
        const useAuth0 = !!(property?.metadata?.login?.settings?.use_auth0 && property?.metadata?.login?.settings?.auth0_domain);
        const useOpenId = !!(property?.metadata?.login?.settings?.use_openid && property?.metadata?.login?.settings?.openid_endpoint);

        const propertyProvider = useOpenId ? "openId" :
          useAuth0 ? "auth0" : "ory";

        if(
          rootStore.loggedIn &&
          provider !== propertyProvider &&
          !["code", "external"].includes(provider)
        ) {
          rootStore.Log("Signing out due to mismatched login provider with property");
          await rootStore.SignOut({reload: false});
        }
      } finally {
        setLoading(false);

        setTimeout(() => rootStore.SetShowSplash(false), 1000);
      }
    })();
  }, [mediaPropertySlugOrId, rootStore.CurrentAddress()]);

  if(isWrongPropertyInCustomDomain){
    return <Redirect to={rootStore.customDomainPropertySlug || rootStore.customDomainPropertyId} />;
  }

  if(!rootStore.loaded || !itemLoaded || loading) {
    return <PageLoader />;
  }

  if(redirect) {
    return <Redirect to="/wallet/users/me/items"/>;
  }

  if(mediaPropertySlugOrId) {
    const mediaProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId});
    const parentProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId: parentMediaPropertySlugOrId});
    const page = mediaPropertyStore.MediaPropertyPage({mediaPropertySlugOrId, pageSlugOrId});

    let backgroundColor = page?.background_color;
    if(match.path.includes("/faq")) {
      backgroundColor = mediaProperty?.metadata?.faq?.background_color || backgroundColor;
    }

    const useCustomBackgroundColor = backgroundColor && CSS.supports("color", backgroundColor);

    return (
      <>
        <PreviewPasswordGate
          id={parentProperty?.mediaPropertyId}
          name={parentProperty?.metadata?.title || parentProperty?.metadata?.name}
          digest={parentProperty?.metadata?.preview_password_digest}
        >
          <PreviewPasswordGate
            id={mediaProperty?.mediaPropertyId}
            name={mediaProperty?.metadata?.title || mediaProperty?.metadata?.name}
            digest={mediaProperty?.metadata?.preview_password_digest}
          >
            <LoginGate Condition={() => mediaProperty?.metadata?.require_login}>
              <div
                style={
                  useCustomBackgroundColor ?
                    { "--property-background": backgroundColor } : {}
                }
                className={PropertyStyles["property"]}
              >
                { children }
                <MediaPropertyFooter withCustomBackgroundColor={useCustomBackgroundColor} />
                <MediaPropertyPurchaseModal />
              </div>
            </LoginGate>
          </PreviewPasswordGate>
        </PreviewPasswordGate>
      </>
    );
  }

  return children;
});

export const PropertyRoutes = observer(({basePath}) => {
  return (
    <div className="page-container property-page">
      <Switch>
        <RenderRoutes
          basePath={basePath}
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
      <Switch>
        <RenderRoutes
          basePath="/"
          routeList="bundledProperty"
          Wrapper={PropertyWrapper}
        />
      </Switch>
    </div>
  );
});
