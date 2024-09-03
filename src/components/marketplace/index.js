import React, {useEffect, useState} from "react";
import {rootStore} from "Stores/index";
import {Redirect, Switch, useRouteMatch} from "react-router-dom";
import {observer} from "mobx-react";
import AsyncComponent from "Components/common/AsyncComponent";
import {PageLoader} from "Components/common/Loaders";
import RenderRoutes from "Routes";
import PreviewPasswordPrompt from "Components/login/PreviewPasswordPrompt";
import Modal from "Components/common/Modal";
import {RichText} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import Header from "Components/header/Header";

import EluvioLogo from "Assets/icons/EluvioLogo2.svg";
import {mediaPropertyStore} from "../../stores";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

const Footer = ({footerText, footerLinks=[]}) => {
  const [visibleItem, setVisibleItem] = useState(undefined);

  if(footerLinks.length === 0 && !footerText) {
    return null;
  }

  const links = footerLinks.map((footerItem, index) => {
    if(footerItem.url) {
      return <a target="_blank" key={`footer-link-${index}`} className="footer__item" rel="noopener noreferrer" href={footerItem.url}>{footerItem.text}</a>;
    } else if(footerItem.content_rich_text || footerItem.content_html || footerItem.image) {
      return (
        <button
          key={`footer-link-${index}`}
          className="footer__item"
          onClick={() => setVisibleItem(footerItem)}
        >
          { footerItem.text }
        </button>
      );
    }

    return null;
  });

  return (
    <div className="page-block page-block--footer">
      <div className="page-block__content">
        <div className="footer footer--marketplace">
          {
            links.length > 0 ?
              <div className="footer__links">
                {links}
              </div> : null
          }
          <div className="footer__separator" />
          { footerText ? <RichText className="markdown-document footer__text" richText={footerText}/> : null }
          <div className="footer__tagline">
            <div className="footer__tagline__text">
              { rootStore.l10n.login.powered_by }
            </div>
            <ImageIcon icon={EluvioLogo} className="footer__tagline__image" title="Powered by Eluv.io" />
          </div>
        </div>
      </div>

      {
        visibleItem ?
          <Modal
            className={`footer__modal ${visibleItem.content_rich_text ? "footer__modal-rich-text" : "footer__modal-frame"}`}
            Toggle={() => setVisibleItem(undefined)}
          >
            {
              visibleItem.image ?
                <img
                  src={visibleItem.image?.url}
                  className="footer__modal__content footer__modal__content--image"
                  alt={visibleItem.image_alt_text || visibleItem.image_alt}
                /> :
                visibleItem.content_rich_text ?
                  <div className="footer__modal__content footer__modal__content--rich-text">
                    <RichText richText={visibleItem.content_rich_text} className="markdown-document footer__modal__content__message" />
                  </div> :
                  <iframe
                    className="footer__modal__content footer__modal__content--frame"
                    src={visibleItem.content_html?.url}
                  />
            }
          </Modal> : null
      }
    </div>
  );
};

const MarketplaceWrapper = observer(({children}) => {
  const match = useRouteMatch();
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    if(match.params.marketplaceId) {
      rootStore.SetMarketplace({marketplaceId: match.params.marketplaceId});
    } else {
      rootStore.ClearMarketplace();
    }
  }, [match.url, rootStore.marketplaces[match.params.marketplaceId], rootStore.navigationInfo.locationType]);

  if(!rootStore.loaded) {
    return <PageLoader />;
  }

  if(redirect) {
    return <Redirect to={redirect} />;
  }

  if(match.params.marketplaceId) {
    return (
      <AsyncComponent
        // Store info is cleared when logged in
        key={`marketplace-${match.params.marketplaceId}-${rootStore.loggedIn}`}
        loadKey={`marketplace-${match.params.marketplaceId}-${rootStore.loggedIn}`}
        cacheSeconds={30}
        Load={async () => {
          await rootStore.LoadMarketplace(match.params.marketplaceId);

          const marketplace = rootStore.marketplaces[match.params.marketplaceId];
          if(marketplace?.property_redirect) {
            // Redirect to property
            await mediaPropertyStore.LoadMediaPropertyHashes();

            const propertyHash = mediaPropertyStore.mediaPropertyHashes[marketplace.property_redirect];
            let mediaPropertySlugOrId = marketplace.property_redirect;
            if(propertyHash) {
              mediaPropertySlugOrId = Object.keys(mediaPropertyStore.mediaPropertyHashes).find(key =>
                key !== marketplace.property_redirect &&
                mediaPropertyStore.mediaPropertyHashes[key] === propertyHash
              ) || mediaPropertySlugOrId;
            }

            setRedirect(MediaPropertyBasePath({mediaPropertySlugOrId}));
          }

          const passwordDigest = marketplace?.preview_password_digest;
          if(passwordDigest && (rootStore.walletClient.mode === "staging" || match.params.marketplaceId === rootStore.previewMarketplaceId)) {
            await PreviewPasswordPrompt({
              marketplaceId: match.params.marketplaceId,
              passwordDigest
            });
          }
        }}
        loadingClassName="page-loader content"
      >
        { children }
        <Footer
          footerText={rootStore.marketplaces[match.params.marketplaceId]?.footer_text}
          footerLinks={rootStore.marketplaces[match.params.marketplaceId]?.footer_links}
        />
      </AsyncComponent>
    );
  }

  return children;
});

const Marketplace = observer(() => {
  return (
    <div className="page-container marketplace-page">
      <Header key="marketplace-header" />
      <Switch>
        <RenderRoutes
          basePath="/marketplace/:marketplaceId"
          routeList="marketplace"
          Wrapper={MarketplaceWrapper}
        />
      </Switch>
    </div>
  );
});

export default Marketplace;
