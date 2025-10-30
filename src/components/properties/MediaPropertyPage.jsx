import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";

import React from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";
import {PageContainer} from "Components/properties/Common";
import {
  MediaPropertyHeroSection,
  MediaPropertySection,
  MediaPropertySectionContainer,
  MediaPropertySpacerSection
} from "Components/properties/MediaPropertySection";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

export const MediaPropertyPageContent = observer(({params, sections, isMediaPage, className=""}) => {
  if(!sections || sections.length === 0) {
    return null;
  }

  return (
    <div className={[S("page__sections"), className].join(" ")}>
      {
        sections.map((sectionId, index) => {
          const section = mediaPropertyStore.MediaPropertySection({
            ...params,
            sectionSlugOrId: sectionId
          });

          if(!section) { return null; }

          if(section.type === "spacer") {
            return (
              <MediaPropertySpacerSection
                key={`section-${sectionId}-${index}`}
                section={section}
                className={S("page__section")}
              />
            );
          } else if(section.type === "container") {
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

const MediaPropertyPage = observer(({pageSlugOrId}) => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage({
    ...match.params,
    pageSlugOrId: pageSlugOrId || match.params.pageSlugOrId
  });

  if(!page) {
    return <Redirect to="/" />;
  }

  return (
    <PageContainer className={S("page", "property-page")}>
      <MediaPropertyPageContent
        params={match.params}
        sections={page.layout?.sections}
      />
    </PageContainer>
  );
});

export default MediaPropertyPage;
