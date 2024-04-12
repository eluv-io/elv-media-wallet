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
import {ScrollTo} from "../../utils/Utils";
import {MediaPropertyBasePath, MediaPropertyMediaBackPath} from "../../utils/MediaPropertyUtils";
import {LoginGate} from "Components/common/LoginGate";

const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const GridContentColumns = ({contentLength, aspectRatio, pageWidth}) => {
  let columns = 2;
  if(pageWidth >= 1920) {
    columns = 5;
  } else if(pageWidth >= 1600) {
    columns = 4;
  } else if(pageWidth >= 1200) {
    columns = 4;
  } else if(pageWidth >= 800) {
    columns = 3;
  }

  if(pageWidth > 600 && aspectRatio !== "landscape") {
    columns += 1;
  }

  return `repeat(${Math.min(columns, contentLength)}, minmax(0, 1fr))`;
};

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
          size={section.display.aspect_ratio ? "fixed" : "mixed"}
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
  const aspectRatio = section.display.aspect_ratio?.toLowerCase();
  return (
    <div
      style={
        !aspectRatio ? {} :
          { gridTemplateColumns: GridContentColumns({contentLength: sectionContent.length, aspectRatio, pageWidth: rootStore.pageWidth}) }
      }
      className={S(
        "section__content",
        "section__content--grid",
        aspectRatio ?
          `section__content--${aspectRatio}` :
          "section__content--flex",
        `section__content--${section.display.justification || "left"}`
      )}
    >
      {
        sectionContent.map(sectionItem =>
          <MediaCard
            size={!section.display.aspect_ratio ? "mixed" : ""}
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

export const MediaPropertySection = observer(({sectionId, mediaListId, isSectionPage, isMediaPage}) => {
  const match = useRouteMatch();
  let navContext = new URLSearchParams(location.search).get("ctx");

  const mediaListSlugOrId = mediaListId || (isSectionPage && match.params.mediaListSlugOrId);

  const section = mediaPropertyStore.MediaPropertySection({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    sectionSlugOrId: sectionId || match.params.sectionSlugOrId,
    mediaListSlugOrId
  });

  const [sectionContent, setSectionContent] = useState([]);

  useEffect(() => {
    if(!section) { return; }

    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      pageSlugOrId: match.params.pageSlugOrId,
      sectionSlugOrId: !mediaListId && sectionId || match.params.sectionSlugOrId || navContext,
      mediaListSlugOrId
    })
      .then(content => setSectionContent(content));
  }, [match.params, sectionId, mediaListId]);

  if(!section) {
    return null;
  }

  let sectionPermissions = mediaPropertyStore.ResolvePermission({
    ...match.params,
    sectionSlugOrId: !mediaListId && sectionId || match.params.sectionSlugOrId || navContext,
    mediaListSlugOrId
  });

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
      <LoginGate backPath={MediaPropertyBasePath(match.params)} Condition={() => !sectionPermissions.authorized}>
        <div className={S("section", "section--page")}>
          <ContentComponent
            section={section}
            sectionContent={sectionContent}
            navContext={!mediaListId ? "s" : navContext}
          />
        </div>
      </LoginGate>
    );
  }

  if(
    sectionContent.length === 0 ||
    sectionPermissions.authorized === false &&
    sectionPermissions.behavior === mediaPropertyStore.PERMISSION_BEHAVIORS.HIDE
  ) {
    return null;
  }

  const showAllLink = sectionContent.length > parseInt(section.display.display_limit || 5);

  return (
    <div
      ref={element => {
        if(isMediaPage || !element || navContext !== sectionId) { return; }

        // Remove context from url
        const url = new URL(location.href);
        url.searchParams.delete("ctx");
        //history.replaceState(undefined, undefined, url);

        setTimeout(() => {
          // Scroll to section
          ScrollTo(-75, element);
        }, 150);
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
        navContext={sectionId}
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
  const backPath = MediaPropertyMediaBackPath({match, navContext: (section?.isMediaList && navContext) || section?.sectionId || section?.id});

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
    </PageContainer>
  );
});

export default MediaPropertySectionPage;
