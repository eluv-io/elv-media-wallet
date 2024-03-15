import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {NavLink, Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import {MediaCardVertical} from "Components/properties/MediaCards";
import UrlJoin from "url-join";

import SwiperCore, {Lazy} from "swiper";
import {Swiper, SwiperSlide} from "swiper/react";
SwiperCore.use([Lazy]);

import RightArrow from "Assets/icons/right-arrow";
import LeftArrow from "Assets/icons/left-arrow";
import ImageIcon from "Components/common/ImageIcon";
import {PageBackground, PageContainer, PageHeader} from "Components/properties/Common";


const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const SectionContentCarousel = observer(({section, sectionContent}) => {
  const [swiper, setSwiper] = useState(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({width: 400, height: 400});
  const slidesPerPage =
    // If aspect ratio is consistent, we can have arrows navigate an exact page at a time
    section.display.aspect_ratio ?
      Math.floor((swiper?.width || rootStore.pageWidth - 200) / imageDimensions.width) :
      rootStore.pageWidth > 1400 ? 3 : rootStore.pageWidth > 1000 ? 2 : 1;

  window.swiper = swiper;

  return (
    <Swiper
      className={S("section__content", "section__content--carousel", `section__content--${section.display.aspect_ratio?.toLowerCase()}`)}
      threshold={5}
      navigation={false}
      slidesPerView="auto"
      slidesPerGroup={1}
      lazy={{
        enabled: true,
        loadPrevNext: true,
        loadOnTransitionStart: true
      }}
      observer
      observeParents
      speed={1000}
      parallax
      updateOnWindowResize
      spaceBetween={rootStore.pageWidth > 800 ? 20 : 10}
      onSwiper={swiper => {
        setActiveIndex(swiper.activeIndex);
        setSwiper(swiper);
        swiper.on("activeIndexChange", () => setActiveIndex(swiper.activeIndex));
      }}
    >
      <button
        disabled={activeIndex === 0}
        style={{height: imageDimensions.height + 10}}
        onClick={() => swiper?.slideTo(Math.max(0, swiper.activeIndex - slidesPerPage))}
        className={S("section__carousel-arrow", "section__carousel-arrow--previous")}
      >
        <div className={S("section__carousel-arrow-background")} />
        <ImageIcon label="Previous Page" icon={LeftArrow} />
      </button>
      {
        sectionContent.map((sectionItem, index) =>
          <SwiperSlide key={`section-slide-${sectionItem.id}`} className={S("section-slide")}>
            <MediaCardVertical
              setImageDimensions={index === 0 && setImageDimensions}
              sectionItem={sectionItem}
              textDisplay={section.display.content_display_text}
              aspectRatio={section.display.aspect_ratio}
            />
          </SwiperSlide>
        )
      }
      <button
        disabled={activeIndex + slidesPerPage >= sectionContent.length - 1}
        style={{height: imageDimensions.height + 10}}
        onClick={() => swiper?.slideTo(Math.min(sectionContent.length - 1, swiper.activeIndex + slidesPerPage))}
        className={S("section__carousel-arrow", "section__carousel-arrow--next")}
      >
        <div className={S("section__carousel-arrow-background")} />
        <ImageIcon label="Next Page" icon={RightArrow} />
      </button>
    </Swiper>
  );
});

const SectionContentGrid = observer(({section, sectionContent}) => {
  return (
    <div className={S("section__content", "section__content--grid", `section__content--${section.display.aspect_ratio?.toLowerCase()}`)}>
      {
        sectionContent.map(sectionItem =>
          <MediaCardVertical
            key={`section-item-${sectionItem.id}`}
            sectionItem={sectionItem}
            textDisplay={"all" || section.display.content_display_text}
            aspectRatio={section.display.aspect_ratio}
          />
        )
      }
    </div>
  );
});

export const MediaPropertySection = observer(({sectionId, mediaListId, isSectionPage}) => {
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
  switch((isSectionPage && "grid") || section.display.display_format?.toLowerCase()) {
    case "carousel":
      ContentComponent = SectionContentCarousel;
      break;
    default:
      ContentComponent = SectionContentGrid;
      break;
  }

  if(isSectionPage) {
    return (
      <div className={S("section", "section--page")}>
        <ContentComponent section={section} sectionContent={sectionContent} />
      </div>
    );
  }

  const showAllLink = sectionContent.length > parseInt(section.display.display_limit || 10);

  return (
    <div className={S("section", isSectionPage && "section--page")}>
      {
        !showAllLink && !section.display.title ? null :
          <div className={S("section__title-container")}>
            {
              !section.display.title ? null :
                <h2 className={S("section__title")}>
                  {section.display.title}
                </h2>
            }
            {
              !showAllLink ? null :
                <NavLink to={UrlJoin(location.pathname, "s", section.slug || sectionId)} className={S("section__title-link")}>
                  <div>
                    { rootStore.l10n.media_properties.sections.view_all }
                  </div>
                  <ImageIcon icon={RightArrow} />
                </NavLink>
            }
          </div>
      }
      <ContentComponent section={section} sectionContent={sectionContent} />
    </div>
  );
});

const MediaPropertySectionPage = observer(() => {
  const match = useRouteMatch();

  const section = mediaPropertyStore.MediaPropertySection(match.params);

  const backPath = UrlJoin("/properties", match.params.mediaPropertySlugOrId, match.params.pageSlugOrId || "");

  if(!section) {
    return <Redirect to={backPath} />;
  }

  return (
    <PageContainer backPath={backPath}>
      <PageBackground display={section.display} />
      <PageHeader display={section.display} className={S("section__page-header")} />
      <MediaPropertySection
        sectionId={match.params.sectionSlugOrId ? section.id : undefined}
        mediaListId={match.params.mediaListSlugOrId ? section.id : undefined}
        isSectionPage
      />
    </PageContainer>
  );
});

export default MediaPropertySectionPage;
