import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";

import React from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {
  Button,
  PageBackground,
  PageContainer,
  PageHeader
} from "Components/properties/Common";
import {MediaPropertySection} from "Components/properties/MediaPropertySection";
import {NFTInfo} from "../../utils/Utils";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

const Actions = observer(() => {
  const match = useRouteMatch();

  let actions = [];

  if(!rootStore.loggedIn) {
    actions.push(
      <Button
        key="cta-sign-in"
        onClick={() => rootStore.ShowLogin()}
        className={S("button", "button--sign-in")}
      >
        { rootStore.l10n.login.sign_in }
      </Button>
    );
  }

  if(match.params.contractId) {
    const {nft} = rootStore.NFTData({
      contractId: match.params.contractId,
      tokenId: match.params.tokenId
    });

    if(!nft) { return; }

    const nftInfo = NFTInfo({nft});

    if(nftInfo.isOwned) {
      actions.push(
        <Button
          to={UrlJoin(location.pathname, "/details")}
          key="cta-item-details"
          className={S("button")}
        >
          { rootStore.l10n.media_properties.page.actions.item_details}
        </Button>
      );
    }
  }

  if(actions.length === 0) { return null; }

  return (
    <div className={S("actions")}>
      { actions }
    </div>
  );
});

export const MediaPropertyPageContent = observer(({isMediaPage, className=""}) => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(!page) { return null; }

  return (
    <div className={[S("page__sections"), className].join(" ")}>
      {
        page.layout.sections.map(sectionId =>
          <MediaPropertySection
            key={`section-${sectionId}`}
            sectionId={sectionId}
            isMediaPage={isMediaPage}
          />
        )
      }
    </div>
  );
});

const MediaPropertyPage = observer(() => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(!page) {
    return <Redirect to="/" />;
  }

  return (
    <PageContainer className={S("page", "property-page")}>
      <PageBackground display={page.layout} />
      <PageHeader
        display={page.layout}
        maxHeaderSize={70}
      >
        <Actions />
      </PageHeader>
      <MediaPropertyPageContent />
    </PageContainer>
  );
});

export default MediaPropertyPage;
