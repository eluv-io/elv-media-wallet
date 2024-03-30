import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import MediaCard from "Components/properties/MediaCards";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import {Carousel, PageBackground, PageContainer, PageHeader} from "Components/properties/Common";

import RightArrow from "Assets/icons/right-arrow";
import MediaPropertyPurchaseModal from "Components/properties/MediaPropertyPurchaseModal";

const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const SectionContentBanner = observer(({section, sectionContent, navContext}) => {
  return (
    <div className={S("section__content", "section__content--banner", `section__content--${section.display.justification || "left"}`)}>
      {
        sectionContent.map(sectionItem =>
          <MediaCard
            format="banner"
            key={`section-item-${sectionItem.id}`}
            sectionItem={sectionItem}
            textDisplay={section.display.content_display_text}
            aspectRatio={section.display.aspect_ratio}
            navContext={navContext}
          />
        )
      }
    </div>
  );
});

const SectionContentCarousel = observer(({section, sectionContent, navContext}) => {
  return (
    <Carousel
      className={S(
        "section__content",
        "section__content--carousel",
        `section__content--${section.display.aspect_ratio?.toLowerCase()}`,
        `section__content--${section.display.justification || "left"}`
      )}
      slidesPerPage={({imageDimensions, swiper}) =>
        // If aspect ratio is consistent, we can have arrows navigate an exact page at a time
        section.display.aspect_ratio ?
          Math.floor((swiper?.width || rootStore.pageWidth - 200) / imageDimensions.width) :
          rootStore.pageWidth > 1400 ? 3 : rootStore.pageWidth > 1000 ? 2 : 1
      }
      swiperOptions={{
        spaceBetween: 10
      }}
      initialImageDimensions={{height: 400, width: 400}}
      content={sectionContent}
      RenderSlide={({item, setImageDimensions}) =>
        <MediaCard
          format="vertical"
          key={`media-card-${item.id}`}
          setImageDimensions={setImageDimensions}
          sectionItem={item}
          textDisplay={section.display.content_display_text}
          aspectRatio={section.display.aspect_ratio}
          navContext={navContext}
        />
      }
    />
  );
});

const SectionContentGrid = observer(({section, sectionContent, navContext}) => {
  return (
    <div
      className={S(
        "section__content",
        "section__content--grid",
        `section__content--${section.display.aspect_ratio?.toLowerCase()}`,
        `section__content--${section.display.justification || "left"}`
      )}
    >
      {
        sectionContent.map(sectionItem =>
          <MediaCard
            format="vertical"
            key={`section-item-${sectionItem.id}`}
            sectionItem={sectionItem}
            textDisplay={section.display.content_display_text}
            aspectRatio={section.display.aspect_ratio}
            navContext={navContext}
          />
        )
      }
    </div>
  );
});

export const MediaPropertySection = observer(({sectionId, mediaListId, isSectionPage}) => {
  const navContext = new URLSearchParams(location.search).get("ctx");
  const match = useRouteMatch();
  const section = mediaPropertyStore.MediaPropertySection({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    sectionSlugOrId: sectionId || match.params.sectionSlugOrId,
    mediaListSlugOrId: mediaListId || match.params.mediaListSlugOrId
  });

  const [sectionContent, setSectionContent] = useState([]);

  useEffect(() => {
    if(!section) { return; }

    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      sectionSlugOrId: sectionId || match.params.sectionSlugOrId,
      mediaListSlugOrId: mediaListId || match.params.mediaListSlugOrId
    })
      .then(content => setSectionContent(content));
  }, [match.params, sectionId, mediaListId]);

  if(!section) {
    return null;
  }

  let ContentComponent;
  switch(section.display.display_format?.toLowerCase()) {
    case "carousel":
      ContentComponent = isSectionPage ? SectionContentGrid : SectionContentCarousel;
      break;
    case "banner":
      ContentComponent = SectionContentBanner;
      break;
    default:
      ContentComponent = SectionContentGrid;
      break;
  }

  if(isSectionPage) {
    return (
      <div className={S("section", "section--page")}>
        <ContentComponent
          section={section}
          sectionContent={sectionContent}
          navContext="s"
        />
      </div>
    );
  }

  const showAllLink = sectionContent.length > parseInt(section.display.display_limit || 10);

  return (
    <div
      ref={element => {
        if(!element || navContext !== sectionId) { return; }

        // Remove context from url
        const url = new URL(location.href);
        url.searchParams.delete("ctx");
        //history.replaceState(undefined, undefined, url);

        setTimeout(() => {
          // Scroll to section
          element.scrollIntoView();
        }, 250);
      }}
      className={S("section", `section--${section.display.justification || "left"}`)}
    >
      {
        !showAllLink && !section.display.title ? null :
          <>
            <div className={S("section__title-container")}>
              {
                !section.display.title ? null :
                  <h2 className={S("section__title")}>
                    {section.display.title}
                  </h2>
              }
              {
                !showAllLink ? null :
                  <Link to={UrlJoin(location.pathname, "s", section.slug || sectionId)} className={S("section__title-link")}>
                    <div>
                      { rootStore.l10n.media_properties.sections.view_all }
                    </div>
                    <ImageIcon icon={RightArrow} />
                  </Link>
              }
            </div>
            {
              !section.display.subtitle ? null :
                <h2 className={S("section__subtitle")}>
                  {section.display.subtitle}
                </h2>
            }
          </>
      }
      <ContentComponent
        section={section}
        sectionContent={
          section.display.display_limit ?
            sectionContent.slice(0, section.display.display_limit) :
            sectionContent
        }
      />
    </div>
  );
});

const MediaPropertySectionPage = observer(() => {
  const match = useRouteMatch();

  const section = mediaPropertyStore.MediaPropertySection(match.params);

  const navContext = new URLSearchParams(location.search).get("ctx");
  const backPath = navContext === "s" && match.params.sectionSlugOrId ?
    UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.pageSlugOrId || "", "s", match.params.sectionSlugOrId) :
    UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.pageSlugOrId || "", `?ctx=${section.sectionId || section.id}`);

  if(!section) {
    return <Redirect to={backPath} />;
  }

  return (
    <PageContainer backPath={backPath}>
      <PageBackground display={section.display} />
      <PageHeader display={section.display} className={S("section__page-header")} />
      <MediaPropertySection
        sectionId={section.sectionId || section.id}
        mediaListId={section.mediaListId}
        isSectionPage
      />
      <MediaPropertyPurchaseModal />
    </PageContainer>
  );
});

export default MediaPropertySectionPage;
