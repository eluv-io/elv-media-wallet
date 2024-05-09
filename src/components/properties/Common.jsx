import CommonStyles from "Assets/stylesheets/media_properties/common.module";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "Stores";
import SanitizeHTML from "sanitize-html";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {useHistory} from "react-router-dom";
import {Modal as MantineModal} from "@mantine/core";
import {CreateMediaPropertyPurchaseParams, MediaPropertyPurchaseParams} from "../../utils/MediaPropertyUtils";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {Swiper, SwiperSlide} from "swiper/react";
import {A11y} from "swiper/modules";
import {Loader} from "Components/common/Loaders";
import {Linkish} from "Components/common/UIComponents";

import LeftArrow from "Assets/icons/left-arrow";
import RightArrow from "Assets/icons/right-arrow";
import XIcon from "Assets/icons/x";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

export const PageContainer = ({children, className}) => {
  return (
    <div className={[S("page-container"), className].join(" ")}>
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

export const PageHeader = observer(({display, maxHeaderSize=36, children, className=""}) => {
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
          className={S("page-header__description")}
        />
      </div>
      { children }
    </div>
  );
});

export const RichText = ({richText, ...props}) => {
  return (
    <div
      {...props}
      className={[S("rich-text"), props.className || ""].join(" ")}
      dangerouslySetInnerHTML={{__html: SanitizeHTML(richText)}}
    />
  );
};

export const LoaderImage = observer(({src, width, loaderHeight, loaderWidth, loaderAspectRatio, lazy=true, showWithoutSource=false, delay=0, ...props}) => {
  const [loaded, setLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setShowLoader(false);

    setTimeout(() => setShowLoader(true), 500);
  }, [src]);

  if(!src && !showWithoutSource) {
    return null;
  }

  if(width) {
    src = SetImageUrlDimensions({url: src, width});
  }

  if(loaded) {
    return <img src={src} {...props} />;
  }

  return (
    <>
      {
        !src ? null :
          <img
            {...props}
            key={`img-${src}-${props.key || ""}`}
            className={S("lazy-image__loader-image") + " " + props.className}
            loading={lazy ? "lazy" : "eager"}
            src={src}
            onLoad={() => setTimeout(() => setLoaded(true), delay)}
          />
      }
      <object
        {...props}
        style={{
          ...(props.style || {}),
          ...(loaderWidth ? {width: loaderWidth} : {}),
          ...(loaderHeight ? {height: loaderHeight} : {}),
          ...(loaderAspectRatio ? {aspectRatio: loaderAspectRatio} : {})
        }}
        key={props.key ? `${props.key}--placeholder` : undefined}
        className={[S("lazy-image__background", showLoader ? "lazy-image__background--visible" : ""), props.className || ""].join(" ")}
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
  maxLines,
  expandable=false,
  ...props
}) => {
  const [expanded, setExpanded] = useState(false);

  if(descriptionRichText) {
    return <RichText richText={descriptionRichText} {...props} />;
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


const SlideVisible = slide => {
  if(!slide) { return; }

  const carouselDimensions = slide.closest(".swiper").getBoundingClientRect();
  const slideDimensions = slide.getBoundingClientRect();
  return (
    slideDimensions.x + 3 >= carouselDimensions.x &&
    slideDimensions.x + slideDimensions.width - 3 <= carouselDimensions.x + carouselDimensions.width
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
  const firstSlide = useRef();
  const lastSlide = useRef();
  const [firstSlideVisible, setFirstSlideVisible] = useState(false);
  const [lastSlideVisible, setLastSlideVisible] = useState(false);

  const SetSlideVisibility = () => {
    setFirstSlideVisible(SlideVisible(firstSlide?.current));
    setLastSlideVisible(SlideVisible(lastSlide?.current));

    setTimeout(() => {
      setFirstSlideVisible(SlideVisible(firstSlide?.current));
      setLastSlideVisible(SlideVisible(lastSlide?.current));
    }, 1000);
  };

  useEffect(() => {
    UpdateActiveIndex && UpdateActiveIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    SetSlideVisibility();
  }, [lastSlide, activeSwiperSlide, rootStore.pageWidth]);

  let slidesPerPage = 1;
  try {
    slidesPerPage = swiper?.slidesPerViewDynamic() - 1 || 1;
  // eslint-disable-next-line no-empty
  } catch(error) {}

  return (
    <Swiper
      className={[S("carousel"), className].join(" ")}
      modules={[A11y]}
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
        disabled={firstSlideVisible}
        style={{height: (imageDimensions?.height + 10) || "100%"}}
        onClick={() => {
          swiper?.slideTo(Math.max(0, swiper.activeIndex - slidesPerPage));
          SetSlideVisibility();
        }}
        className={S("carousel__arrow", "carousel__arrow--previous")}
      >
        <ImageIcon label="Previous Page" icon={LeftArrow} />
      </button>
      {
        content.map((item, index) =>
          <SwiperSlide
            key={`slide-${index}`}
            ref={
              index === 0 ? firstSlide :
                index === content.length - 1 ? lastSlide :
                  undefined
            }
            className={S("carousel__slide", index === content.length - 1 ? "carousel__slide--last" : "")}
          >
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
        disabled={lastSlideVisible || content.length === 1}
        style={{height: (imageDimensions?.height + 10) || "100%"}}
        onClick={() => {
          SetSlideVisibility();
          swiper?.slideTo(Math.min(content.length - 1, swiper.activeIndex + slidesPerPage));
        }}
        className={S("carousel__arrow", "carousel__arrow--next")}
      >
        <ImageIcon label="Next Page" icon={RightArrow} />
      </button>
    </Swiper>
  );
});

export const Modal = observer(({...args}) => {
  const showCloseButton = typeof args.withCloseButton === "undefined" ?
    rootStore.pageWidth < 600 : args.withCloseButton;

  return (
    <MantineModal
      {...args}
      withCloseButton={false}
      transitionProps={args.transitionProps || {duration: 0}}
      classNames={{
        root: S("modal"),
        overlay: S("modal__overlay"),
        inner: S("modal__inner"),
        content: S("modal__container"),
        header: S("modal__header"),
        body: S("modal__content")
      }}
    >
      {
        !showCloseButton ? null :
          <button
            aria-label="Close"
            onClick={() => args.onClose && args.onClose()}
            className={S("modal__close")}
          >
            <ImageIcon icon={XIcon}/>
          </button>
      }
      { args.children }
    </MantineModal>
  );
});

export const Button = ({variant="primary", active, loading, ...props}) => {
  const [isLoading, setIsLoading] = useState(loading);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  return (
    <Linkish
      {...props}
      onClick={
        !props.onClick ? undefined :
          async () => {
            try {
              setIsLoading(true);

              await props.onClick();
            } finally {
              setIsLoading(loading);
            }
          }
      }
      className={[S("button", variant ? `button--${variant}` : "", active ? "button--active" : ""), props.className || ""].join(" ")}
    >
      {
        !isLoading ? props.children :
          <>
            <Loader className={S("button__loader")}/>
            <div className={S("button__loading-content")}>
              { props.children }
            </div>
          </>
      }
    </Linkish>
  );
};

export const PurchaseGate = ({permissions, backPath, children}) => {
  const history = useHistory();
  const url = new URL(location.href);
  const params = MediaPropertyPurchaseParams();

  useEffect(() => {
    if(!permissions) { return; }

    if(!permissions.authorized && permissions.purchaseGate && (!params || !params?.gate)) {
      // Not authorized and purchase gated - set purchase modal parameters
      url.searchParams.set("p", CreateMediaPropertyPurchaseParams({
        gate: true,
        permissionItemIds: permissions.permissionItemIds,
        successPath: location.pathname,
        cancelPath: backPath || rootStore.ResolvedBackPath()
      }));
      history.replace(url.pathname + url.search);
    } else if(params && params.gate && !params.confirmationId && permissions.authorized) {
      // Authorized and not on a purchase confirmation page, make sure purchase modal is hidden
      url.searchParams.delete("p");
      url.searchParams.delete("confirmationId");
      history.replace(url.pathname + url.search);
    }
  }, [permissions]);

  return children;
};
