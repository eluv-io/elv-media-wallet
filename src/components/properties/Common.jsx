import CommonStyles from "Assets/stylesheets/media_properties/common.module";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "Stores";
import SanitizeHTML from "sanitize-html";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {Link} from "react-router-dom";

import ArrowLeft from "Assets/icons/arrow-left.svg";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {Swiper, SwiperSlide} from "swiper/react";

import LeftArrow from "Assets/icons/left-arrow";
import RightArrow from "Assets/icons/right-arrow";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

export const PageContainer = ({backPath, children, className}) => {
  return (
    <div className={[S("page-container"), className].join(" ")}>
      {
        !backPath ? null :
          <Link to={backPath} className={S("page-container__back-link")}>
            <ImageIcon icon={ArrowLeft} />
            <div>Back</div>
          </Link>
      }

      { children }
    </div>
  );
};

export const PageBackground = observer(({display}) => {
  const pageWidth = mediaPropertyStore.rootStore.pageWidth;
  const backgroundImage = (pageWidth <= 800 && display.background_image_mobile?.url) || display.background_image?.url;
  // Limit size of background image based on screen size
  const [backgroundImageScale] = useState(mediaPropertyStore.rootStore.fullscreenImageWidth);

  useEffect(() => {
    const image = new Image();
    image.src = backgroundImage;
  }, []);

  return (
    !backgroundImage ? null :
      <>
        <LoaderImage
          lazy={false}
          alt="Background Image"
          loaderWidth="100%"
          loaderHeight="var(--property-full-content-height"
          src={SetImageUrlDimensions({url: backgroundImage, width: backgroundImageScale})}
          className={S("page-background__image")}
        />
        <div className={S("page-background__gradient")} />
      </>
  );
});

export const PageHeader = observer(({display, maxHeaderSize=36, descriptionBaseFontSize=16, className=""}) => {
  return (
    <div className={S("page-header")}>
      <div className={[S("page-header__content", `page-header__content--${display.position?.toLowerCase() || "left"}`), className].join(" ")}>
        <LoaderImage
          lazy={false}
          loaderHeight={200}
          loaderWidth={400}
          alt={display.logo_alt || display.title || "Logo"}
          src={SetImageUrlDimensions({url: display.logo?.url, width: 1000})}
          className={S("page-header__logo")}
        />
        <ScaledText Tag="h1" maxPx={maxHeaderSize} minPx={32} maxPxMobile={32} minPxMobile={20} className={S("page-header__title")}>
          { display.title }
        </ScaledText>
        <Description
          description={display.description}
          descriptionRichText={display.description_rich_text}
          baseFontSize={descriptionBaseFontSize}
          className={S("page-header__description")}
        />
      </div>
    </div>
  );
});

export const RichText = ({richText, baseFontSize=16, ...props}) => {
  return (
    <div
      {...props}
      style={{
        fontSize: baseFontSize,
        ...(props.style || {})
      }}
      className={[S("rich-text"), props.className || ""].join(" ")}
      dangerouslySetInnerHTML={{__html: SanitizeHTML(richText)}}
    />
  );
};

export const LoaderImage = observer(({src, width, loaderHeight, loaderWidth, loaderAspectRatio, lazy=true, delay=0, ...props}) => {
  const [loaded, setLoaded] = useState(false);


  useEffect(() => {
    setLoaded(false);
  }, [src]);

  if(!src) { return null; }

  if(width) {
    src = SetImageUrlDimensions({url: src, width});
  }

  if(loaded) {
    return <img src={src} {...props} />;
  }

  return (
    <>
      <img
        {...props}
        key={`img-${src}-${props.key || ""}`}
        className={S("lazy-image__loader-image") + " " + props.className}
        loading={lazy ? "lazy" : "eager"}
        src={src}
        onLoad={() => setTimeout(() => setLoaded(true), delay)}
      />
      <div
        {...props}
        style={{
          ...(props.style || {}),
          ...(loaderWidth ? {width: loaderWidth} : {}),
          ...(loaderHeight ? {height: loaderHeight} : {}),
          ...(loaderAspectRatio ? {aspectRatio: loaderAspectRatio} : {})
        }}
        key={props.key ? `${props.key}--placeholder` : undefined}
        className={[S("lazy-image__background"), props.className || ""].join(" ")}
      />
    </>
  );
});

const textWidthCanvasContext = document.createElement("canvas").getContext("2d");
const FitFontSize = ({element, text, min, max}) => {
  const styles = getComputedStyle(element);
  const elementWidth = element.getBoundingClientRect().width;

  let fontSize = min;
  while(fontSize < max) {
    textWidthCanvasContext.font = `${styles.fontWeight} ${fontSize + 1}px ${styles.fontFamily}`;

    if(textWidthCanvasContext.measureText(text).width >= elementWidth) {
      return `${fontSize}px`;
    }

    fontSize += 1;
  }

  return `${fontSize}px`;
};

export const ScaledText = observer(({
  Tag="div",
  children,
  minPx=16,
  maxPx=52,
  minPxMobile=16,
  maxPxMobile=32,
  ...props
}) => {
  const text = children?.toString() || "";

  if(rootStore.pageWidth < 800) {
    minPx = Math.min(minPx, minPxMobile);
    maxPx = Math.min(maxPx, maxPxMobile);
  }

  const ref = useRef();
  const [fontSize, setFontSize] = useState(maxPx);

  useEffect(() => {
    if(!ref?.current) { return; }

    setFontSize(FitFontSize({element: ref.current, text: children, min: minPx, max: maxPx}));
  }, [ref, text, minPx, maxPx, rootStore.pageWidth]);

  if(!text) { return null; }

  return (
    <Tag {...props} ref={ref} style={{fontSize, wordBreak: "break-word", ...(props.style || {})}}>
      { text }
    </Tag>
  );
});

export const Description = ({
  description,
  descriptionRichText,
  baseFontSize=18,
  maxLines,
  expandable=false,
  ...props
}) => {
  const [expanded, setExpanded] = useState(false);

  if(descriptionRichText) {
    return <RichText richText={descriptionRichText} baseFontSize={baseFontSize} {...props} />;
  }

  if(!description) { return null; }

  if(maxLines) {
    let content = (
      <ResponsiveEllipsis
        className={[S("description", expandable ? "description--expandable" : ""), props.className || ""].join(" ")}
        text={description}
        maxLine={expanded ? "999" : maxLines.toString()}
      />
    );

    if(expandable){
      return (
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          { content }
        </button>
      );
    } else {
      return content;
    }
  }

  return (
    <div {...props} className={[S("description"), props.className || ""].join(" ")}>
      { description }
    </div>
  );
};


export const Carousel = observer(({
  content,
  swiperOptions={},
  UpdateActiveIndex,
  RenderSlide,
  initialImageDimensions,
  className=""
}) => {
  const [swiper, setSwiper] = useState(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSwiperSlide, setActiveSwiperSlide] = useState(0);
  const [imageDimensions, setImageDimensions] = useState(initialImageDimensions);
  // todo: swiper figure out slides per page auto?

  useEffect(() => {
    UpdateActiveIndex && UpdateActiveIndex(activeIndex);
  }, [activeIndex]);

  let slidesPerPage = 1;
  try {
    slidesPerPage = swiper?.slidesPerViewDynamic() - 1 || 1;
  // eslint-disable-next-line no-empty
  } catch(error) {}

  return (
    <Swiper
      className={[S("carousel"), className].join(" ")}
      threshold={5}
      slidesPerView="auto"
      observer
      observeParents
      speed={1000}
      parallax
      updateOnWindowResize
      {...swiperOptions}
      onSwiper={swiper => {
        setSwiper(swiper);
        setActiveSwiperSlide(swiper.activeIndex);
        swiper.on("activeIndexChange", () => setActiveSwiperSlide(swiper.activeIndex));
      }}
    >
      <button
        disabled={activeSwiperSlide === 0}
        style={{height: (imageDimensions?.height + 10) || "100%"}}
        onClick={() => swiper?.slideTo(Math.max(0, swiper.activeIndex - slidesPerPage))}
        className={S("carousel__arrow", "carousel__arrow--previous")}
      >
        <div className={S("carousel__arrow-background")} />
        <ImageIcon label="Previous Page" icon={LeftArrow} />
      </button>
      {
        content.map((item, index) =>
          <SwiperSlide key={`slide-${index}`} className={S("carousel__slide")}>
            {
              RenderSlide({
                item,
                index,
                activeIndex,
                setActiveIndex,
                Select: () => setActiveIndex(index),
                setImageDimensions: index === 0 && setImageDimensions
              })
            }
          </SwiperSlide>
        )
      }
      <button
        disabled={activeSwiperSlide + slidesPerPage >= content.length - 1}
        style={{height: (imageDimensions?.height + 10) || "100%"}}
        onClick={() => swiper?.slideTo(Math.min(content.length - 1, swiper.activeIndex + slidesPerPage))}
        className={S("carousel__arrow", "carousel__arrow--next")}
      >
        <div className={S("carousel__arrow-background")} />
        <ImageIcon label="Next Page" icon={RightArrow} />
      </button>
    </Swiper>
  );
});
