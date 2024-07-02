import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useHistory, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import MediaCard from "Components/properties/MediaCards";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import {AttributeFilter, Carousel, PageBackground, PageContainer, PageHeader} from "Components/properties/Common";

import RightArrow from "Assets/icons/right-arrow";
import {ScrollTo} from "../../utils/Utils";
import {LoginGate} from "Components/common/LoginGate";
import {MediaItemImageUrl, MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const GridContentColumns = ({aspectRatio, pageWidth}) => {
  let columns = 1;
  if(pageWidth >= 1920) {
    columns = 5;
  } else if(pageWidth >= 1600) {
    columns = 4;
  } else if(pageWidth >= 1200) {
    columns = 4;
  } else if(pageWidth >= 900) {
    columns = 3;
  } else if(pageWidth >= 800) {
    columns = 2;
  }

  if(pageWidth > 600 && aspectRatio?.toLowerCase() !== "landscape") {
    columns += 1;
  }

  return columns;
};

export const MediaGrid = observer(({
  content,
  isSectionContent=false,
  aspectRatio,
  textDisplay="all",
  justification="left",
  className="",
  navContext
}) => {
  aspectRatio = aspectRatio?.toLowerCase();

  const columns = GridContentColumns({
    aspectRatio,
    pageWidth: rootStore.pageWidth,
  });

  return (
    <div
      style={
        !aspectRatio ? {} :
          {
            gridTemplateColumns: `repeat(${justification === "center" ? Math.min(columns, content.length) : columns}, minmax(0, 1fr))`
          }
      }
      className={[S(
        "section__content",
        "section__content--grid",
        aspectRatio ?
          `section__content--${aspectRatio}` :
          "section__content--flex",
        `section__content--${justification || "left"}`
      ), className].join(" ")}
    >
      {
        content.map(item =>
          <MediaCard
            size={!aspectRatio ? "mixed" : ""}
            format="vertical"
            key={`section-item-${item.id}`}
            sectionItem={isSectionContent ? item : undefined}
            mediaItem={isSectionContent ? undefined : item}
            textDisplay={textDisplay}
            aspectRatio={aspectRatio}
            navContext={navContext}
          />
        )
      }
    </div>
  );
});

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
    <MediaGrid
      content={sectionContent}
      isSectionContent
      aspectRatio={aspectRatio}
      textDisplay={section.display.content_display_text}
      justification={section.display.justification}
      navContext={navContext}
    />
  );
});

export const SectionResultsGroup = observer(({groupBy, label, results, navContext}) => {
  if(label && groupBy === "__date") {
    const date = new Date(label);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;

    label = new Date(date.getTime() + userTimezoneOffset)
      .toLocaleDateString(rootStore.preferredLocale, { weekday:"long", year: "numeric", month: "long", day: "numeric"});
  }

  let aspectRatio;
  results.forEach(result => {
    if(aspectRatio === "mixed") { return; }

    let {imageAspectRatio} = MediaItemImageUrl({
      mediaItem: result.mediaItem
    });

    if(!aspectRatio) {
      aspectRatio = imageAspectRatio;
    } else if(aspectRatio !== imageAspectRatio) {
      aspectRatio = "mixed";
    } else {
      aspectRatio = imageAspectRatio;
    }
  });

  // Sort results by start time
  if(groupBy === "__date") {
    results = results.sort((a, b) => {
      if(a?.mediaItem?.start_time) {
        if(b?.mediaItem?.start_time) {
          if(a.mediaItem.start_time !== b.mediaItem.start_time) {
            return a.mediaItem.start_time < b.mediaItem.start_time ? -1 : 1;
          } else {
            // Equal start times - sort by catalog title
            return a.catalog_title > b.catalog_title ? -1 : 1;
          }
        } else {
          return -1;
        }
      } else if(b?.mediaItem?.start_time) {
        return 1;
      } else {
        // No start times - sort by catalog title
        return a.catalog_title > b.catalog_title ? 1 : -1;
      }
    });
  }

  return (
    <div className={S("section", "section--page", "section__group")}>
      {
        !label ? null :
          <h2 className={[S("section__group-title"), "_title"].join(" ")}>
            { label }
          </h2>
      }
      <MediaGrid
        content={results.map(result => result.mediaItem)}
        aspectRatio={aspectRatio === "mixed" ? undefined : aspectRatio}
        navContext={navContext}
      />
    </div>
  );
});

export const MediaPropertySection = observer(({sectionId, mediaListId, isMediaPage, filterOptions}) => {
  const match = useRouteMatch();
  let navContext = new URLSearchParams(location.search).get("ctx");
  const [sectionContent, setSectionContent] = useState([]);

  const section = mediaPropertyStore.MediaPropertySection({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    sectionSlugOrId: sectionId,
    mediaListSlugOrId: mediaListId
  });

  useEffect(() => {
    if(!section) { return; }

    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      pageSlugOrId: match.params.pageSlugOrId,
      sectionSlugOrId: mediaListId || sectionId,
      mediaListSlugOrId: mediaListId,
      filterOptions
    })
      .then(content => setSectionContent(content));
  }, [match.params, sectionId, mediaListId, filterOptions]);

  if(!section) {
    return null;
  }

  let sectionPermissions = mediaPropertyStore.ResolvePermission({
    ...match.params,
    sectionSlugOrId: !mediaListId && sectionId,
    mediaListSlugOrId: mediaListId
  });

  let ContentComponent;
  switch(section.display.display_format?.toLowerCase()) {
    case "carousel":
      ContentComponent = SectionContentCarousel;
      break;
    case "banner":
      ContentComponent = SectionContentBanner;
      break;
    default:
      ContentComponent = SectionContentGrid;
      break;
  }

  if(
    sectionContent.length === 0 ||
    sectionPermissions.authorized === false &&
    sectionPermissions.behavior === mediaPropertyStore.PERMISSION_BEHAVIORS.HIDE
  ) {
    return null;
  }

  const showAllLink = sectionContent.length > parseInt(section.display.display_limit || 5);

  let displayLimit = section.display?.display_limit;
  if(ContentComponent === SectionContentGrid && section.display?.aspect_ratio && section.display?.display_limit_type === "rows") {
    // Limit to a certain number of rows - calculate items per row based on page width
    const columns = GridContentColumns({
      aspectRatio: section.display.aspect_ratio,
      pageWidth: rootStore.pageWidth,
    });

    displayLimit = columns * displayLimit;
  }

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
      className={S("section", `section--${section.display?.display_format || "grid"}`, `section--${section.display.justification || "left"}`)}
    >
      {
        !showAllLink && !section.display.title ? null :
          <>
            <div className={S("section__title-container")}>
              {
                !section.display.title ? null :
                  <h2 className={[S("section__title"), "_title"].join(" ")}>
                    {section.display.title}
                  </h2>
              }
              {
                !showAllLink ? null :
                  <Link to={UrlJoin(MediaPropertyBasePath(match.params), "s", section.slug || sectionId)} className={S("section__title-link")}>
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
          displayLimit ?
            sectionContent.slice(0, displayLimit) :
            sectionContent
        }
      />
    </div>
  );
});

const MediaPropertySectionPage = observer(() => {
  const match = useRouteMatch();
  const history = useHistory();

  const [sectionContent, setSectionContent] = useState([]);
  const [groupedSectionContent, setGroupedSectionContent] = useState({});
  const [filterOptions, setFilterOptions] = useState({
    attributes: {},
    mediaType: undefined
  });

  let navContext = new URLSearchParams(location.search).get("ctx");

  const section = mediaPropertyStore.MediaPropertySection({...match.params});

  useEffect(() => {
    if(!section) { return; }

    mediaPropertyStore.MediaPropertySectionContent({
      ...match.params,
      filterOptions
    })
      .then(content => {
        setSectionContent(content);

        if(section.group_by) {
          setGroupedSectionContent(
            mediaPropertyStore.GroupContent({
              content,
              groupBy: section.group_by,
              excludePast: false
            })
          );
        }
      });
  }, [match.params, filterOptions]);

  useEffect(() => {
    // Ensure ctx is set
    if(!match.params.sectionSlugOrId) { return; }

    const params = new URLSearchParams(window.location.query);
    params.set("ctx", match.params.sectionSlugOrId);
    history.replace(location.pathname + "?" + params.toString());
  }, []);

  if(!section) {
    return <Redirect to={backPath} />;
  }

  let sectionPermissions = mediaPropertyStore.ResolvePermission({...match.params});

  let ContentComponent;
  switch(section.display.display_format?.toLowerCase()) {
    case "banner":
      ContentComponent = SectionContentBanner;
      break;
    default:
      ContentComponent = SectionContentGrid;
      break;
  }

  let sectionItems;
  if(section.group_by) {
    let groups = Object.keys(groupedSectionContent || {}).filter(attr => attr !== "__other");
    if(section.group_by === "__date") {
      groups = groups.sort();
    }

    sectionItems = (
      <div className={S("section__groups")}>
        {
          groups.map(attribute =>
            <SectionResultsGroup
              key={`results-${attribute}`}
              groupBy={section.group_by}
              label={Object.keys(groupedSectionContent).length > 1 ? attribute : ""}
              results={groupedSectionContent[attribute]}
              navContext="s"
            />
          )
        }
        {
          !groupedSectionContent.__other ? null :
            <SectionResultsGroup
              label={Object.keys(groupedSectionContent || {}).length > 1 ? "Other" : ""}
              results={groupedSectionContent.__other}
              navContext="s"
            />
        }
      </div>
    );
  } else {
    sectionItems = (
      <div className={S("section", "section--page")}>
        <ContentComponent
          section={section}
          sectionContent={sectionContent}
          navContext={!match.params.mediaListSlugOrId ? "s" : navContext}
          key={`content-${JSON.stringify(filterOptions)}`}
        />
      </div>
    );
  }

  return (
    <PageContainer className={S("page", "section-page")}>
      <PageBackground display={section.display} />
      {
        !section.primary_filter ? null :
          <AttributeFilter
            attributeKey={section.primary_filter}
            variant="primary"
            options={filterOptions}
            setOption={({field, value}) => setFilterOptions({...filterOptions, [field]: value})}
          />
      }
      {
        !section.secondary_filter ? null :
          <AttributeFilter
            attributeKey={section.secondary_filter}
            variant="secondary"
            options={filterOptions}
            setOption={({field, value}) => setFilterOptions({...filterOptions, [field]: value})}
          />
      }
      <PageHeader display={section.display} className={S("section__page-header")} />
      <LoginGate backPath={rootStore.backPath} Condition={() => !sectionPermissions.authorized}>
        {sectionItems}
      </LoginGate>
    </PageContainer>
  );
});

export default MediaPropertySectionPage;
