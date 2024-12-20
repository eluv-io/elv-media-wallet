import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useHistory, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import MediaCard from "Components/properties/MediaCards";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import {
  AttributeFilter,
  Button,
  Carousel,
  PageBackground,
  PageContainer,
  PageHeader
} from "Components/properties/Common";

import RightArrow from "Assets/icons/right-arrow";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {LoginGate} from "Components/common/LoginGate";
import {
  CreateMediaPropertyPurchaseParams,
  MediaItemImageUrl,
  MediaPropertyBasePath,
  MediaPropertyLink,
  PurchaseParamsToItems
} from "../../utils/MediaPropertyUtils";
import Modal from "Components/common/Modal";
import Video from "Components/properties/Video";
import LeftArrow from "Assets/icons/left-arrow";
import Filters from "Components/properties/Filters";

const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const GridContentColumns = ({aspectRatio, pageWidth, cardFormat}) => {
  if(cardFormat === "button_vertical") {
    return Math.round(pageWidth / 375);
  } else if(cardFormat === "button_horizontal") {
    return Math.floor(pageWidth / 600) || 1;
  } if(aspectRatio?.toLowerCase() === "landscape") {
    return Math.round(pageWidth / 400);
  } else {
    return Math.round(pageWidth / 300);
  }
};

const ActionVisible = ({permissions, behavior, visibility}) => {
  if(behavior === "sign_in" && rootStore.loggedIn) {
    return false;
  }

  const hasPermissions = !!permissions?.find(permissionItemId =>
    mediaPropertyStore.permissionItems[permissionItemId].authorized
  );

  switch(visibility) {
    case "always":
      return true;
    case "authorized":
      return hasPermissions;
    case "authenticated":
      return rootStore.loggedIn;
    case "unauthorized":
      return rootStore.loggedIn && !hasPermissions;
    case "unauthenticated":
      return !rootStore.loggedIn;
    case "unauthenticated_or_unauthorized":
      return !rootStore.loggedIn || !hasPermissions;
  }
};

const Action = observer(({sectionId, sectionItemId, sectionItem, action}) => {
  const match = useRouteMatch();
  let buttonParams = {};

  const [showVideoModal, setShowVideoModal] = useState(false);

  switch(action.behavior) {
    case "sign_in":
      buttonParams.onClick = () => rootStore.ShowLogin();
      break;

    case "video":
      buttonParams.onClick = () => setShowVideoModal(true);
      break;

    case "page_link":
      buttonParams.to = MediaPropertyBasePath({...match.params, pageSlugOrId: action.page_id});
      break;

    case "show_purchase":
      const purchaseParams = CreateMediaPropertyPurchaseParams({
        id: action.id,
        sectionSlugOrId: sectionId,
        sectionItemId,
        actionId: action.id
      });

      if(
        // Purchase action but can't purchase
        PurchaseParamsToItems(
          purchaseParams,
          sectionItem?.permissions?.secondaryPurchaseOption
        ).length === 0
      ) {
        return null;
      }

      const params = new URLSearchParams(location.search);
      params.set("p", purchaseParams);
      buttonParams.to = location.pathname + "?" + params.toString();
      break;

    case "media_link":
      const mediaItem = mediaPropertyStore.media[action.media_id];
      buttonParams.to = MediaPropertyLink({match, mediaItem}).linkPath;
      break;

    case "link":
      buttonParams = {
        href: action.url,
        rel: "noopener",
        target: "_blank"
      };
      break;
  }

  return (
    <>
      {
        !showVideoModal ? null :
          <Modal className={[S("action__modal"), "modal--no-scroll"].join(" ")} Toggle={() => setShowVideoModal(false)}>
            <Video link={action.video} />
          </Modal>
      }
      <Button
        {...buttonParams}
        icon={action.button.icon?.url}
        className={S("action")}
        styles={action.button}
      >
        { action.button.text }
      </Button>
    </>
  );
});

const Actions = observer(({sectionId, sectionItemId, sectionItem, actions}) => {
  actions = (actions || [])
    .filter(action => ActionVisible({
      visibility: action.visibility,
      behavior: action.behavior,
      permissions: action.permissions
    }));


  if(actions.length === 0) { return null; }

  return (
    <div className={S("actions")}>
      {
        actions.map(action =>
          <Action
            key={action.id}
            action={action}
            sectionId={sectionId}
            sectionItemId={sectionItemId}
            sectionItem={sectionItem}
          />
        )
      }
    </div>
  );
});

export const MediaPropertyHeroSection = observer(({section}) => {
  const [contentRefs, setContentRefs] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [minHeight, setMinHeight] = useState(undefined);

  const activeItem = section.hero_items[activeIndex];

  // Monitor size of hero content so min height can be properly set
  useEffect(() => {
    const resizeHandler = new ResizeObserver(elements => {
      if(elements.length !== section.hero_items.length) { return; }

      setMinHeight(
        Math.max(...(Object.values(contentRefs).map(element => element?.getBoundingClientRect()?.height || 0) || []))
      );
    });

    Object.values(contentRefs).forEach(element => element && resizeHandler.observe(element));

    return () => {
      resizeHandler.disconnect();
    };
  }, [contentRefs]);

  return (
    <div
      style={!section.allow_overlap || minHeight === undefined || !Number.isFinite(minHeight) ? {} : {minHeight}}
      className={S("hero-section")}
    >
      <PageBackground
        key={`background-${activeIndex}`}
        display={activeItem?.display}
        className={S("hero-section__background")}
        imageClassName={S("hero-section__background-image")}
        videoClassName={S("hero-section__background-video")}
      />
      {
        section.hero_items.map((heroItem, index) =>
          <div
            ref={element => {
              if(!element || contentRefs[heroItem.id] === element) { return; }

              setContentRefs({...contentRefs, [heroItem.id]: element});
            }}
            style={activeIndex === index ? {} : {position: "absolute", opacity: 0, userSelect: "none"}}
            key={`content-${index}`}
            className={S("hero-section__content", activeIndex === index ? "hero-section__content--active" : "")}
          >
            {
              section.hero_items.length < 2 ? null :
                <button
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                  className={S("hero-section__arrow", "hero-section__arrow--previous")}
                >
                  <ImageIcon label="Previous Page" icon={LeftArrow}/>
                </button>
            }
            <PageHeader
              active={activeIndex === index}
              display={heroItem.display}
              maxHeaderSize={38}
              className={S("hero-section__header")}
            >
              <Actions
                actions={heroItem?.actions}
                sectionId={section.id}
                sectionItemId={heroItem.id}
                sectionItem={heroItem}
              />
            </PageHeader>
            {
              section.hero_items.length < 2 ? null :
                <button
                  disabled={activeIndex === section.hero_items.length - 1}
                  onClick={() => setActiveIndex(Math.min(section.hero_items.length - 1, activeIndex + 1))}
                  className={S("hero-section__arrow", "hero-section__arrow--next")}
                >
                  <ImageIcon label="Next Page" icon={RightArrow}/>
                </button>
            }
          </div>
        )
      }
    </div>
  );
});

export const MediaPropertySectionContainer = observer(({section, isMediaPage, sectionClassName=""}) => {
  const match = useRouteMatch();
  const [filter, setFilter] = useState("");

  return (
    <>
      {
        (section.filter_tags || []).length === 0 ? null :
          <div className={S("container-section__filter-container")}>
            <AttributeFilter
              className={S("container-section__filter")}
              attributeKey="tag"
              filterOptions={
                [
                  "",
                  ...section.filter_tags
                ].map(value => ({value}))
              }
              variant="text"
              activeFilters={{attributes: {tag: filter}}}
              SetActiveFilters={activeFilters => setFilter(activeFilters?.attributes?.tag)}
            />
          </div>
      }

      {
        section.sections.map(sectionId => {
          const subsection = mediaPropertyStore.MediaPropertySection({...match.params, sectionSlugOrId: sectionId});

          if(filter && !subsection?.tags?.includes(filter)) {
            return null;
          }

          return (
            <MediaPropertySection
              key={`section-${sectionId}-${filter}`}
              sectionId={sectionId}
              isMediaPage={isMediaPage}
              className={sectionClassName}
            />
          );
        })
      }
    </>
  );
});

export const MediaGrid = observer(({
  content,
  isSectionContent=false,
  aspectRatio,
  textDisplay="all",
  justification="left",
  textJustification="left",
  cardFormat="vertical",
  defaultButtonText,
  className="",
  navContext,
}) => {
  aspectRatio = aspectRatio?.toLowerCase() || "mixed";

  const columns = GridContentColumns({
    aspectRatio,
    pageWidth: rootStore.pageWidth,
    cardFormat
  });

  return (
    <div
      style={
        columns <= 1 ? {} :
          {
            gridTemplateColumns: `repeat(${justification === "center" ? Math.min(columns, content.length) : columns}, minmax(0, 1fr))`
          }
      }
      className={[S(
        "section__content",
        "section__content--grid",
        aspectRatio && aspectRatio !== "mixed" ?
          `section__content--${aspectRatio}` :
          "section__content--flex",
        `section__content--${justification || "left"}`
      ), className].join(" ")}
    >
      {
        content.map(item =>
          <MediaCard
            size={!aspectRatio || aspectRatio === "mixed" ? "mixed" : ""}
            format={cardFormat || "vertical"}
            key={`section-item-${item.id}`}
            sectionItem={isSectionContent ? item : undefined}
            mediaItem={isSectionContent ? undefined : item}
            textDisplay={textDisplay}
            aspectRatio={aspectRatio}
            textJustification={textJustification}
            buttonText={item?.card_button_text || defaultButtonText}
            navContext={navContext}
          />
        )
      }
    </div>
  );
});

const SectionContentBanner = observer(({section, sectionContent, navContext}) => {
  return (
    <div
      className={S(
        "section__content",
        "section__content--banner",
        `section__content--${section.display.justification || "left"}`,
        `section__content--banner--spacing-${section.display.gap || "md"}`
      )}
    >
      {
        sectionContent.map(sectionItem =>
          <MediaCard
            format="banner"
            key={`section-item-${sectionItem.id}`}
            sectionItem={sectionItem}
            textDisplay={section.display.content_display_text}
            aspectRatio={section.display.aspect_ratio}
            textJustification={section.display.text_justification}
            buttonText={sectionItem?.card_button_text || section.display.card_default_button_text}
            navContext={navContext}
            fullBleed={section.display.full_bleed}
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
        section.display.aspect_ratio && section.display.aspect_ratio !== "Mixed" ?
          Math.floor((swiper?.width || rootStore.pageWidth - 200) / imageDimensions.width) :
          rootStore.pageWidth > 1400 ? 3 : rootStore.pageWidth > 1000 ? 2 : 1
      }
      swiperOptions={{
        spaceBetween: 20
      }}
      initialImageDimensions={{height: 400, width: 400}}
      content={sectionContent}
      RenderSlide={({item, setImageDimensions}) =>
        <MediaCard
          size={!section.display.aspect_ratio || section.display.aspect_ratio === "Mixed" ? "mixed" : "fixed"}
          key={`media-card-${item.id}`}
          setImageDimensions={setImageDimensions}
          sectionItem={item}
          textDisplay={section.display.content_display_text}
          textJustification={section.display.text_justification}
          aspectRatio={section.display.aspect_ratio}
          format={section.display.card_style || "vertical"}
          buttonText={item?.card_button_text || section.display.card_default_button_text}
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
      textJustification={section.display.text_justification}
      defaultButtonText={section.display.card_default_button_text}
      cardStyle={section.display.card_style}
      navContext={navContext}
      cardFormat={section.display.card_style}
    />
  );
});

export const SectionResultsGroup = observer(({groupBy, label, results, isSectionContent=false, navContext}) => {
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
  results = results.sort((a, b) => {
    if(a?.mediaItem?.start_time) {
      if(b?.mediaItem?.start_time) {
        if(a.mediaItem.start_time !== b.mediaItem.start_time) {
          return a.mediaItem.start_time < b.mediaItem.start_time ? -1 : 1;
        } else {
          // Equal start times - sort by catalog title
          return a.catalog_title || a.title > b.catalog_title || b.title ? 1 : -1;
        }
      } else {
        return -1;
      }
    } else if(b?.mediaItem?.start_time) {
      return 1;
    } else {
      // No start times - sort by catalog title
      return a.catalog_title || a.title > b.catalog_title || b.title ? 1 : -1;
    }
  });

  return (
    <div className={S("section", "section--page", "section__group")}>
      {
        !label ? null :
          <h2 className={[S("section__group-title"), "_title"].join(" ")}>
            { label }
          </h2>
      }
      <MediaGrid
        isSectionContent={isSectionContent}
        content={
          isSectionContent ?
            results :
            results.map(result => result.mediaItem || result)
        }
        aspectRatio={aspectRatio === "Mixed" ? undefined : aspectRatio}
        navContext={navContext}
      />
    </div>
  );
});

export const MediaPropertySection = observer(({sectionId, mediaListId, isMediaPage, className=""}) => {
  const match = useRouteMatch();
  let navContext = new URLSearchParams(location.search).get("ctx");
  const [sectionContent, setSectionContent] = useState([]);
  const [allContentLength, setAllContentLength] = useState(0);

  const [activeFilters, setActiveFilters] = useState({
    attributes: {},
    mediaType: undefined
  });

  const section = mediaPropertyStore.MediaPropertySection({
    mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
    sectionSlugOrId: sectionId,
    mediaListSlugOrId: mediaListId
  });

  const filtersActive = activeFilters.mediaType || Object.keys(activeFilters.attributes).length > 0;

  useEffect(() => {
    if(!section) { return; }

    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId,
      pageSlugOrId: match.params.pageSlugOrId,
      sectionSlugOrId: mediaListId || sectionId,
      mediaListSlugOrId: mediaListId,
      filterOptions: activeFilters
    })
      .then(content => {
        setSectionContent(content);

        if(!filtersActive)
          setAllContentLength(content.length);
      });
  }, [match.params, sectionId, mediaListId, activeFilters]);

  if(!section) {
    return null;
  }

  if(
    section.visibility === "authenticated" && !rootStore.loggedIn ||
    section.visibility === "unauthenticated" && rootStore.loggedIn
  ) {
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
    allContentLength === 0 ||
    sectionPermissions.authorized === false &&
    sectionPermissions.behavior === mediaPropertyStore.PERMISSION_BEHAVIORS.HIDE
  ) {
    return null;
  }

  let displayLimit = section.display?.display_limit;
  let showAllLink = false;
  if(section.display.display_format === "grid") {
    showAllLink = allContentLength > parseInt(displayLimit || 1000);
  } else if(section.display.display_format === "carousel") {
    showAllLink = allContentLength > parseInt(displayLimit || 5);
  }

  if(
    displayLimit &&
    ContentComponent === SectionContentGrid &&
    (section.display?.aspect_ratio && section.display.aspect_ratio !== "Mixed")
    && section.display?.display_limit_type === "rows"
  ) {
    // Limit to a certain number of rows - calculate items per row based on page width
    const columns = GridContentColumns({
      aspectRatio: section.display.aspect_ratio,
      pageWidth: rootStore.pageWidth,
      cardFormat: section.display.card_style
    });

    displayLimit = columns * displayLimit;
  }

  const backgroundImage = rootStore.pageWidth <= 800 ?
    section.display.inline_background_image_mobile?.url :
    section.display.inline_background_image?.url;

  let style = {};
  if(backgroundImage) {
    style = {
      backgroundImage: `url(${SetImageUrlDimensions({url: backgroundImage, width: rootStore.fullscreenImageWidth})})`
    };
  } else if(section.display.inline_background_color && CSS.supports("color", section.display.inline_background_color)) {
    style = {
      backgroundColor: section.display.inline_background_color
    };
  }

  return (
    <div
      style={style}
      className={[S(
        "section-container",
        `section-container--${section.display?.display_format || "grid"}`,
        `section-container--${section.display.justification || "left"}`,
        section.display.full_bleed ? "section-container--full-bleed" : ""
      ), className].join(" ")}
    >
      {
        !section.display.logo ? null :
          <div
            className={
              S(
                "section__logo-container",
                section.display.logo_text ? "section__logo-container--with-text" : "",
                section.display.display_format === "grid" ? `section__logo-container--${section?.display?.logo_alignment || "top"}` : ""
              )
            }
          >
            <img src={section.display.logo.url} alt="Icon" className={S("section__logo")} />
            {
              !section.display.logo_text ? null :
                <div className={S("section__logo-text")}>{section.display.logo_text}</div>
            }
          </div>
      }
      <div
        ref={element => {
          if(isMediaPage || !element || navContext !== sectionId) { return; }

          // Remove context from url
          const url = new URL(location.href);
          url.searchParams.delete("ctx");
          //history.replaceState(undefined, undefined, url);

          /*
          setTimeout(() => {
            // Scroll to section
            ScrollTo(-150, element);
          }, 150);

           */
        }}
        className={S(
          "section",
          `section--${section.display?.display_format || "grid"}`,
          `section--${section.display.justification || "left"}`
        )}
      >
        {
          !showAllLink && !section.display.title ? null :
            <>
              <div className={S("section__title-container")}>
                {
                  !section.display.title ? null :
                    <h2 className={[S("section__title"), "_title"].join(" ")}>
                      {
                        !section.display.title_icon ? null :
                          <img src={section.display.title_icon.url} alt="Icon" className={S("section__title-icon")} />
                      }
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
        {
          !section.primary_filter || !section.show_primary_filter_in_page_view ? null :
            <Filters
              filterSettings={section.filters}
              activeFilters={activeFilters}
              primaryOnly
              SetActiveFilters={filters => setActiveFilters({...activeFilters, ...filters})}
              className={S("section__page-filter")}
            />
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
    </div>
  );
});

const MediaPropertySectionPage = observer(() => {
  const match = useRouteMatch();
  const history = useHistory();

  const [sectionContent, setSectionContent] = useState([]);
  const [groupedSectionContent, setGroupedSectionContent] = useState({});
  const [activeFilters, setActiveFilters] = useState({
    attributes: {},
    mediaType: undefined
  });

  let navContext = new URLSearchParams(location.search).get("ctx");

  const section = mediaPropertyStore.MediaPropertySection({...match.params});
  const groupBy = section?.filters?.group_by;

  useEffect(() => {
    if(!section) { return; }

    mediaPropertyStore.MediaPropertySectionContent({
      ...match.params,
      filterOptions: activeFilters
    })
      .then(content => {
        setSectionContent(content);

        if(groupBy) {
          setGroupedSectionContent(
            mediaPropertyStore.GroupContent({
              content,
              groupBy,
              excludePast: false
            })
          );
        }
      });
  }, [match.params, activeFilters]);

  useEffect(() => {
    // Ensure ctx is set
    if(!match.params.sectionSlugOrId) { return; }

    const params = new URLSearchParams(window.location.query);
    params.set("ctx", match.params.sectionSlugOrId);
    history.replace(location.pathname + "?" + params.toString());
  }, []);

  if(!section) {
    return <Redirect to={rootStore.backPath} />;
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
  if(groupBy) {
    let groups = Object.keys(groupedSectionContent || {}).filter(attr => attr !== "__other");
    if(groupBy === "__date") {
      groups = groups.sort();
    } else if(groupBy !== "__media-type") {
      const tags = mediaPropertyStore.GetMediaPropertyAttributes({...match.params})?.[groupBy]?.tags || [];

      groups = groups.sort((a, b) => {
        const indexA = tags.indexOf(a);
        const indexB = tags.indexOf(b);

        if(indexA >= 0) {
          if(indexB >= 0) {
            return indexA < indexB ? -1 : 1;
          }

          return -1;
        } else if(indexB >= 0) {
          return 1;
        }

        return a < b ? -1 : 1;
      });
    }


    sectionItems = (
      <div className={S("section__groups")}>
        {
          groups.map(attribute =>
            <SectionResultsGroup
              key={`results-${attribute}`}
              isSectionContent
              groupBy={groupBy}
              label={Object.keys(groupedSectionContent).length > 1 ? attribute : ""}
              results={groupedSectionContent[attribute]}
              navContext="s"
            />
          )
        }
        {
          !groupedSectionContent.__other ? null :
            <SectionResultsGroup
              isSectionContent
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
          key={`content-${JSON.stringify(activeFilters)}`}
        />
      </div>
    );
  }

  return (
    <PageContainer className={S("page", "section-page")}>
      <PageBackground display={section.display} />
      <Filters
        filterSettings={section.filters || {}}
        activeFilters={activeFilters}
        SetActiveFilters={filters => setActiveFilters({...activeFilters, ...filters})}
      />
      <PageHeader display={section.display} className={S("section__page-header")} />
      <LoginGate backPath={rootStore.backPath} Condition={() => !sectionPermissions.authorized}>
        {sectionItems}
      </LoginGate>
    </PageContainer>
  );
});

export default MediaPropertySectionPage;
