import React from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import {
  PageBackground,
  PageContainer,
  PageHeader
} from "Components/properties/Common";
import {MediaPropertySection} from "Components/properties/MediaPropertySection";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

const MediaPropertyPage = observer(() => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const pageId = mediaProperty.metadata.slug_map.pages[(match.params.pageSlugOrId || "main")]?.page_id || match.params.pageSlugOrId;
  const page = mediaProperty.metadata.pages[pageId];

  if(!page) {
    return <Redirect to="/" />;
  }

  return (
    <PageContainer>
      <PageBackground display={page.layout} />
      <PageHeader display={page.layout} maxHeaderSize={70} descriptionBaseFontSize={18} />
      <div className={S("page-sections")}>
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