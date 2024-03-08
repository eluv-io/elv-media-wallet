import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import SectionCard from "Components/properties/MediaPropertySectionCard";

import SwiperCore, {Lazy} from "swiper";
import {Swiper, SwiperSlide} from "swiper/react";
SwiperCore.use([Lazy]);

import RightArrow from "Assets/icons/right-arrow";
import LeftArrow from "Assets/icons/left-arrow";
import ImageIcon from "Components/common/ImageIcon";


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
          <SwiperSlide key={`section-slide-${sectionItem.id}`} className={S("section-card-slide", "section-card")}>
            <SectionCard
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
          <SectionCard
            key={`section-item-${sectionItem.id}`}
            sectionItem={sectionItem}
            textDisplay={section.display.content_display_text}
            aspectRatio={section.display.aspect_ratio}
          />
        )
      }
    </div>
  );
});

const MediaPropertySection = observer(({sectionId}) => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const [sectionContent, setSectionContent] = useState([]);

  useEffect(() => {
    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertyId: mediaProperty.mediaPropertyId,
      sectionId
    })
      .then(content => setSectionContent(content));
  }, [match.params, sectionId]);

  const section = mediaProperty.metadata.sections[sectionId];

  if(!section) {
    return null;
  }

  let ContentComponent;
  switch(section.display.display_format?.toLowerCase()) {
    case "carousel":
      ContentComponent = SectionContentCarousel;
      break;
    default:
      ContentComponent = SectionContentGrid;
      break;
  }

  return (
    <div className={S("section")}>
      {
        !section.display.title ? null :
          <h2 className={S("section__title")}>{section.display.title}</h2>
      }
      <ContentComponent section={section} sectionContent={sectionContent} />
    </div>
  );
});

export default MediaPropertySection;
