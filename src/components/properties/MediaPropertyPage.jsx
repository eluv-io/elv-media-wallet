import React from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import {
  PageBackground,
  PageContainer,
  PageHeader
} from "Components/properties/Common";
import {MediaPropertySection} from "Components/properties/MediaPropertySection";
import MediaPropertyPurchaseModal from "Components/properties/MediaPropertyPurchaseModal";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

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
    backPath = UrlJoin("/p", match.params.parentMediaPropertySlugOrId, match.params.parentPageSlugOrId || "");
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
      <PageHeader display={page.layout} maxHeaderSize={70} descriptionBaseFontSize={18} />
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
