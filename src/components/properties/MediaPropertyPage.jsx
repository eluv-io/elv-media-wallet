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
import MediaPropertyPurchaseModal from "Components/properties/MediaPropertyPurchaseModal";
import {NFTInfo} from "../../utils/Utils";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

const Actions = observer(() => {
  const match = useRouteMatch();

  let actions = [];

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
          key="item-details"
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

const MediaPropertyPage = observer(() => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const pageId = mediaProperty.metadata.slug_map.pages[(match.params.pageSlugOrId || "main")]?.page_id || match.params.pageSlugOrId;
  const page = mediaProperty.metadata.pages[pageId];

  if(!page) {
    return <Redirect to="/" />;
  }

  let backPath;
  if(match.params.parentMediaPropertySlugOrId) {
    backPath = MediaPropertyBasePath({
      ...match.params,
      parentMediaPropertySlugOrId: undefined,
      parentPageSlugOrId: undefined,
      mediaPropertySlugOrId: match.params.parentMediaPropertySlugOrId,
      pageSlugOrId: match.params.parentPageSlugOrId,
    });
  } else if(match.params.contractId) {
    backPath = UrlJoin("/wallet/users/me/items", match.params.contractId, match.params.tokenId);
  }

  return (
    <PageContainer
      backPath={backPath}
      className={S("page")}
    >
      <MediaPropertyPurchaseModal />
      <PageBackground display={page.layout} />
      <PageHeader
        display={page.layout}
        maxHeaderSize={70}
      >
        <Actions />
      </PageHeader>
      <div className={S("page__sections")}>
        {
          page.layout.sections.map(sectionId =>
            <MediaPropertySection
              key={`section-${sectionId}`}
              sectionId={sectionId}
            />
          )
        }
      </div>
    </PageContainer>
  );
});

export default MediaPropertyPage;
