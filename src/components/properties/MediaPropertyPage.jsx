import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";

import React from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";
import {
  PageContainer,
} from "Components/properties/Common";
import {
  MediaPropertyHeroSection,
  MediaPropertySection,
  MediaPropertySectionContainer
} from "Components/properties/MediaPropertySection";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

export const MediaPropertyPageContent = observer(({isMediaPage, className=""}) => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(!page) { return null; }

  return (
    <div className={[S("page__sections"), className].join(" ")}>
      {
        page.layout.sections.map((sectionId, index) => {
          const section = mediaPropertyStore.MediaPropertySection({
            ...match.params,
            sectionSlugOrId: sectionId
          });

          if(section.type === "container") {
            return (
              <MediaPropertySectionContainer
                key={`section-${sectionId}`}
                section={section}
                sectionClassName={S("page__section")}
                isMediaPage={isMediaPage}
              />
            );
          } else if(section.type === "hero") {
            if(isMediaPage && index === 0) {
              // Exclude hero header on media page
              return null;
            }

            return (
              <MediaPropertyHeroSection
                key={`section-${sectionId}`}
                section={section}
              />
            );
          }

          return (
            <MediaPropertySection
              key={`section-${sectionId}`}
              sectionId={sectionId}
              isMediaPage={isMediaPage}
              className={S("page__section")}
            />
          );
        })
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
      <MediaPropertyPageContent />
    </PageContainer>
  );
});

export default MediaPropertyPage;
