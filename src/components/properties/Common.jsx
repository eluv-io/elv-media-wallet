import CommonStyles from "@/assets/stylesheets/media_properties/common.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "@/stores";
import SanitizeHTML from "sanitize-html";
import {SetImageUrlDimensions} from "@/utils/Utils";
import {useHistory} from "react-router-dom";
import {Modal as MantineModal} from "@mantine/core";
import {
  CreateMediaPropertyPurchaseParams, MediaPropertyBasePath, MediaPropertyLink,
  MediaPropertyPurchaseParams, PurchaseParamsToItems
} from "@/utils/MediaPropertyUtils";
import ImageIcon from "@/components/common/ImageIcon";
import ResponsiveEllipsis from "@/components/common/ResponsiveEllipsis";
import {Swiper, SwiperSlide} from "swiper/react";
import {A11y, Pagination} from "swiper/modules";
import {Loader} from "@/components/common/Loaders";
import {Linkish} from "@/components/common/UIComponents";
import Video from "@/components/properties/Video";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib";
import {MediaPropertyPurchaseGatePage} from "@/components/properties/MediaPropertySection";
import {LoginGate} from "@/components/common/LoginGate";
import {decodeThumbHash, thumbHashToApproximateAspectRatio, thumbHashToDataURL} from "@/utils/Thumbhash";
import Hash from "@/utils/Hash.js";

import LeftArrow from "@/assets/icons/left-arrow.svg";
import RightArrow from "@/assets/icons/right-arrow.svg";
import XIcon from "@/assets/icons/x.svg";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

export const PageContainer = ({children, className, ...props}) => {
  return (
    <div {...props} className={[S("page-container"), className].join(" ")}>
      { children }
    </div>
  );
};

export const PageBackground = observer(({
  display,
  className="",
  imageClassName="",
  videoClassName="",
  gradientClassName="",
  ...props
}) => {
  const pageWidth = mediaPropertyStore.rootStore.pageWidth;
  const backgroundImage = pageWidth <= 800 ?
    display?.background_image_mobile?.url :
    display?.background_image?.url;
  const backgroundHash = pageWidth <= 800 ?
    display?.background_image_mobile_hash :
    display?.background_image_hash;

  const backgroundVideoKey = pageWidth <= 800 ?
    "background_video_mobile" :
    "background_video";

  if(!backgroundImage && !display?.[backgroundVideoKey]) {
    return null;
  }

  return (
    <>
      {
        !backgroundImage ? null :
          <LoaderImage
            lazy={false}
            alt="Background Image"
            loaderWidth="100%"
            loaderHeight="var(--property-full-content-height"
            src={SetImageUrlDimensions({
              url: backgroundImage,
              width: mediaPropertyStore.rootStore.fullscreenImageWidth
            })}
            hash={backgroundHash}
            className={[S("page-background__image"), className, imageClassName].join(" ")}
            {...props}
          />
      }
      {
        !display[backgroundVideoKey] ? null :
          <Video
            link={display[backgroundVideoKey]}
            linkInfo={display[`${backgroundVideoKey}_info`]}
            mute
            hideControls
            playerOptions={{
              loop: EluvioPlayerParameters.loop.ON,
              showLoader: EluvioPlayerParameters.showLoader.OFF,
              backgroundColor: "transparent"
            }}
            className={[S("page-background__video"), videoClassName].join(" ")}
          />
      }
      <div
        {...props}
        className={[S("page-background__gradient"), className, gradientClassName].join(" ")}
      />
    </>
  );
});

export const PageHeader = observer(({
  display,
  fontSizes={},
  active=true,
  children,
  descriptionMaxLines,
  className=""
}) => {
  // Collapse expanded description if this header becomes inactive, e.g. hero section is scrolled to another header
  const [descriptionKey, setDescriptionKey] = useState(0);

  useEffect(() => {
    if(!active) {
      setDescriptionKey(descriptionKey + 1);
    }
  }, [active]);

  fontSizes = {
    maxPx: 36,
    minPx: 28,
    maxPxMobile: 32,
    minPxMobile: 18,
    ...fontSizes
  };

  return (
    <div className={[S("page-header", `page-header--${display.position?.toLowerCase()}`), className].join(" ")}>
      <div className={S("page-header__content-container")}>
        <div className={S("page-header__content", `page-header__content--${display.position?.toLowerCase() || "left"}`, !children ? "page-header__content--no-children" : "")}>
          {
            !display?.logo?.url ? null :
              <LoaderImage
                lazy={false}
                loaderHeight={200}
                loaderWidth={400}
                alt={display.logo_alt || display.title || "Logo"}
                src={display.logo?.url}
                hash={display.logo_hash}
                className={S("page-header__logo")}
              />
          }
          {
            !display.title && !display.title_icon ? null :
              <div className={S("page-header__title-container")}>
                {
                  !display.title_icon ? null :
                    <img src={display.title_icon.url} alt="Icon" className={S("page-header__title-icon")}/>
                }
                <ScaledText
                  Tag="h1"
                  maxPx={fontSizes.maxPx || 36}
                  minPx={fontSizes.minPx || 28}
                  maxPxMobile={fontSizes.maxPxMobile || 32}
                  minPxMobile={fontSizes.minPxMobile || 18}
                  className={[S("page-header__title"), "_title"].join(" ")}
                >
                  {display.title}
                </ScaledText>
              </div>
          }
          {
            !display.description && !display.description_rich_text ? null :
              <ExpandableDescription
                key={descriptionKey}
                togglePosition={display.position?.toLowerCase() || "left"}
                description={display.description}
                descriptionRichText={display.description_rich_text}
                maxLines={descriptionMaxLines || rootStore.pageWidth < 800 ? 12 : 8}
                className={S("page-header__description")}
              />
          }
        </div>
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

export const LoaderImage = observer(({
  src,
  alternateSrc,
  hash,
  width,
  loaderHeight,
  loaderWidth,
  loaderAspectRatio,
  preferHashRatio,
  lazy=true,
  showWithoutSource=false,
  hideLoader=false,
  delay=25,
  loaderDelay=250,
  onLoad,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [useAlternateSrc, setUseAlternateSrc] = useState(false);
  hash = hash && decodeThumbHash(hash);

  if(preferHashRatio) {
    loaderAspectRatio = (hash && thumbHashToApproximateAspectRatio(hash)) || loaderAspectRatio;
  } else {
    loaderAspectRatio = loaderAspectRatio || (hash && thumbHashToApproximateAspectRatio(hash));
  }

  useEffect(() => {
    setLoaded(false);
    setShowLoader(false);

    setTimeout(() => setShowLoader(true), loaderDelay);
  }, []);

  if(!src && !showWithoutSource) {
    return null;
  }

  if(width) {
    src = SetImageUrlDimensions({url: src, width});
  }

  if(loaded) {
    return <img src={(useAlternateSrc && src) || src} {...props} />;
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
            src={(useAlternateSrc && alternateSrc) || src}
            onLoad={event => {
              onLoad?.(event);
              setTimeout(() => setLoaded(true), delay);
            }}
            onError={() => {
              setUseAlternateSrc(true);
            }}
          />
      }
      {
        loaded || hideLoader ? null :
          hash ?
            <div
              {...props}
              className={[S("lazy-image__hash-container"), props.className].join(" ")}
              style={{aspectRatio: loaderAspectRatio}}
            >
              <div
                style={{background: `center / cover url(${thumbHashToDataURL(hash)})`}}
                className={S("lazy-image__hash")}
              />
            </div>:
            <div
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
      }
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

  return `${fontSize - 1}px`;
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

export const Modal = observer(({
  noBackground=false,
  header,
  rootClassName,
  overlayClassName,
  innerClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  childrenContainerClassName,
  ...args
}) => {
  const showCloseButton = args.fullScreen ||
    (typeof args.withCloseButton === "undefined" ?
      rootStore.pageWidth < 600 : args.withCloseButton);

  let closeButton;
  if(showCloseButton) {
    closeButton = (
      <button
        aria-label="Close"
        onClick={() => args.onClose && args.onClose()}
        className={S("modal__close")}
      >
        <ImageIcon icon={XIcon}/>
      </button>
    );
  }

  return (
    <MantineModal
      {...args}
      shadow="xl"
      withCloseButton={false}
      transitionProps={args.transitionProps || {duration: 0}}
      classNames={{
        root: [S("modal", noBackground ? "modal--no-background" : ""), rootClassName || ""].join(" "),
        overlay: [S("modal__overlay"), overlayClassName || ""].join(" "),
        inner: [S("modal__inner"), innerClassName || ""].join(" "),
        content: [S("modal__container"), contentClassName || ""].join(" "),
        header: [S("modal__header"), headerClassName || ""].join(" "),
        body: [S("modal__content"), bodyClassName || ""].join(" ")
      }}
    >
      {
        !header ? closeButton :
          <div className={[S("modal__top-header"), headerClassName].join(" ")}>
            {header}
            {closeButton}
          </div>
      }

      <div className={[S("modal__children"), childrenContainerClassName].join(" ")}>
        { args.children }
      </div>
    </MantineModal>
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
        ellipsis={!expandable ? "..." : <div style={{color: "gray", marginTop: 20}}>READ MORE</div>}
        className={[S("description", expandable ? "description--expandable" : ""), props.className || ""].join(" ")}
        text={description}
        maxLine={expanded ? "999" : maxLines.toString()}
        {...props}
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

const GetFontHeight = ({element}) => {
  if(!element) { return; }

  return parseInt(window.getComputedStyle(element).fontSize) || 16;
};

export const ExpandableDescription = observer(({
  description,
  descriptionRichText,
  onClick,
  useModal,
  togglePosition="left",
  maxLines,
  expandable=true,
  className="",
  indicatorClassName=""
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descriptionRef = useRef();

  useEffect(() => {
    if(!descriptionRef?.current || expanded) { return; }

    const resizeHandler = new ResizeObserver(() => {
      setShowToggle(
        descriptionRef?.current?.firstChild?.getBoundingClientRect()?.height > descriptionRef?.current?.getBoundingClientRect().height
      );
    });

    resizeHandler.observe(descriptionRef.current);

    return () => {
      resizeHandler.disconnect();
    };
  }, [descriptionRef, expanded]);

  if(!description && !descriptionRichText) {
    return null;
  }

  const Expand = event => {
    if(!showToggle) {
      return;
    }

    if(onClick && onClick(event) === true) {
      return true;
    }

    useModal ?
      setShowModal(true) :
      setExpanded(showToggle && !expanded);
  };

  const fontHeight = GetFontHeight({element: descriptionRef.current}) * 1.5 || 20;

  return (
    <>
      {
        !showModal ? null :
          <Modal
            opened
            centered
            onClose={() => setShowModal(false)}
          >
            <div className={[S("expandable-description__modal"), className].join(" ")}>
              <Description
                description={description}
                descriptionRichText={descriptionRichText}
                className={S("expandable-description__description")}
              />
            </div>
          </Modal>
      }
      <div
        role={expanded ? "" : "button"}
        onClick={event => !expanded && Expand(event)}
        className={[
          S(
            "expandable-description",
            showToggle ? "expandable-description--toggleable" : "",
            `expandable-description--${expanded ? "expanded" : "contracted"}`
          ),
          className
        ].join(" ")}
      >
        <div
          ref={descriptionRef}
          style={maxLines && !expanded ? {maxHeight: `${maxLines * fontHeight}px`} : {}}
          className={S("expandable-description__description-container", showToggle ? "expandable-description__description-container--mask" : "")}
        >
          <Description
            description={description}
            descriptionRichText={descriptionRichText}
            className={S("expandable-description__description")}
          />
        </div>
        { expanded ? null : <div className={S("expandable-description__overlay")} /> }
        {
          !showToggle ? null :
            expandable ?
              <button
                onClick={Expand}
                className={
                  [
                    S(
                      "expandable-description__toggle",
                      `expandable-description__toggle--${togglePosition?.toLowerCase() || "left"}`
                    ),
                    indicatorClassName || ""
                  ].join(" ")
                }
              >
                {mediaPropertyStore.rootStore.l10n.media_properties.media.description[expanded ? "hide" : "show"]}
              </button> :
              <div className={S("expandable-description__ellipsis")}>
                ...
              </div>
        }
      </div>
    </>
  );
});


const SlideVisible = slide => {
  if(!slide) { return; }

  const carouselDimensions = slide.closest(".swiper")?.getBoundingClientRect();

  if(!carouselDimensions) { return; }

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
  UpdateActiveSlideIndex,
  RenderSlide,
  initialImageDimensions,
  paginate=false,
  className="",
  arrowClassName=""
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
  }, [content, activeIndex]);

  useEffect(() => {
    UpdateActiveSlideIndex && UpdateActiveSlideIndex(activeSwiperSlide);
  }, [content, activeSwiperSlide]);

  useEffect(() => {
    SetSlideVisibility();
  }, [content, lastSlide, activeSwiperSlide, rootStore.pageWidth]);

  let slidesPerPage = 1;
  try {
    slidesPerPage = swiper?.slidesPerViewDynamic() - 1 || 1;
  // eslint-disable-next-line no-unused-vars
  } catch(error) {}

  return (
    <Swiper
      className={[S("carousel"), className].join(" ")}
      modules={[A11y, paginate ? Pagination : undefined].filter(m => m)}
      threshold={5}
      slidesPerView="auto"
      observer
      observeParents
      speed={750}
      parallax
      pagination={
        !paginate ? undefined :
        {clickable: true}
      }
      updateOnWindowResize
      onActiveIndexChange={swiper => {
        setActiveSwiperSlide(swiper.activeIndex);
        setActiveIndex(swiper.activeIndex);
      }}
      {...swiperOptions}
      onSwiper={swiper => {
        setSwiper(swiper);
        setActiveSwiperSlide(swiper.activeIndex);
      }}
    >
      <button
        disabled={firstSlideVisible}
        style={{height: (imageDimensions?.height + 10) || "100%"}}
        onClick={event => {
          event.stopPropagation();
          swiper?.slideTo(Math.max(0, swiper.activeIndex - slidesPerPage));
          SetSlideVisibility();
        }}
        className={[S("carousel__arrow", "carousel__arrow--previous"), arrowClassName].join(" ")}
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
        onClick={event => {
          event.stopPropagation();
          SetSlideVisibility();
          swiper?.slideTo(Math.min(content.length - 1, swiper.activeIndex + slidesPerPage));
        }}
        className={[S("carousel__arrow", "carousel__arrow--next"), arrowClassName].join(" ")}
      >
        <ImageIcon label="Next Page" icon={RightArrow} />
      </button>
    </Swiper>
  );
});

export const Button = ({variant="primary", active, loading, icon, rightIcon, styles, defaultStyles=false, ...props}) => {
  const [isLoading, setIsLoading] = useState(loading);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  let componentStyle = {};
  if(styles) {
    if(CSS.supports("color", styles.background_color)) {
      componentStyle["--property-button-background"] = styles.background_color;
      // If border color is not explicitly set, it should default to background color
      componentStyle["--property-button-border-color"] = styles.background_color;
    }
    if(CSS.supports("color", styles.text_color)) {
      componentStyle["--property-button-text"] = styles.text_color;
    }
    if(CSS.supports("color", styles.border_color)) {
      componentStyle["--property-button-border-color"] = styles.border_color;
    }
    if(!isNaN(parseInt(styles.border_radius))) {
      componentStyle["--property-button-border-radius"] = `${styles.border_radius}px`;
    }
  }

  let a11yOptions = { role: "button" };
  if(variant === "option") {
    a11yOptions.role = "option";

    if(active) {
      a11yOptions["aria-selected"] = true;
    }
  }

  return (
    <Linkish
      {...props}
      {...a11yOptions}
      style={componentStyle}
      onClick={
        (props.type === "submit" && !props.onClick) ?
          event => event.preventDefault() :
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
      className={[
        S(
          "button",
          variant ? `button--${variant}` : "",
          variant === "primary" && !defaultStyles && !styles ? "button--primary-custom" : "",
          active ? "button--active" : "",
          props.disabled ? "button--disabled" : ""
        ),
        props.className || ""
      ].join(" ")}
    >
      {
        !isLoading ?
          <>
            {
              !icon ? null:
                <div className={S("button__icon-container")}>
                  <ImageIcon icon={icon} className={S("button__icon")} />
                </div>
            }
            { props.children }
            {
              !rightIcon ? null :
                <div className={S("button__icon-container")}>
                  <ImageIcon icon={rightIcon} className={S("button__icon")} />
                </div>
            }
          </> :
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

export const PurchaseGate = observer(({purchasePageSettings, noPurchaseAvailablePageSettings, id, permissions, backPath, children}) => {
  const history = useHistory();
  const url = new URL(location.href);
  const params = MediaPropertyPurchaseParams();
  const showModal =
    !permissions.authorized &&
    (
      (permissions.purchasable && !purchasePageSettings?.enabled) ||
      (!permissions.purchasable && !noPurchaseAvailablePageSettings?.enabled)
    );

  useEffect(() => {
    if(!permissions) { return; }

    if(showModal && !permissions.authorized && permissions.purchaseGate && (!params || !params?.gate)) {
      // Not authorized and purchase gated - set purchase modal parameters
      url.searchParams.delete("p");

      // Delay the params update to ensure rootStore.backPath has been updated
      setTimeout(() => {
        url.searchParams.set("p", CreateMediaPropertyPurchaseParams({
          id,
          gate: true,
          permissionItemIds: permissions.permissionItemIds,
          secondaryPurchaseOption: permissions.secondaryPurchaseOption,
          successPath: location.pathname,
          cancelPath: backPath || rootStore.backPath
        }));
        history.replace(url.pathname + url.search);
      }, 250);
      history.replace(url.pathname + url.search);
    } else if(params && params.gate && params.id === id && !params.confirmationId && permissions.authorized) {
      // Authorized and not on a purchase confirmation page, make sure purchase modal is hidden
      url.searchParams.delete("p");
      url.searchParams.delete("confirmationId");
      history.replace(url.pathname + url.search);
    }
  }, [permissions]);

  if(!permissions.authorized && permissions.purchaseGate) {
    if(permissions.purchasable && purchasePageSettings?.enabled) {
      return (
        <LoginGate backPath={backPath}>
          <MediaPropertyPurchaseGatePage
            permissions={permissions}
            settings={purchasePageSettings}
          />
        </LoginGate>
      );
    } else if(!permissions.purchasable && noPurchaseAvailablePageSettings?.enabled) {
      return (
        <LoginGate backPath={backPath}>
          <MediaPropertyPurchaseGatePage
            permissions={permissions}
            settings={noPurchaseAvailablePageSettings}
          />
        </LoginGate>
      );
    } else {
      return <PageContainer/>;
    }
  }

  return children;
});

export const SplashScreen = observer(() => {
  const mediaPropertySlugOrId = rootStore.GetPropertySlugOrIdFromPath();
  const [lastPropertySlugOrId, setLastPropertySlugOrId] = useState(undefined);
  const [styling, setStyling] = useState(undefined);

  useEffect(() => {
    // Load and splash details, set init timing for minimum display duration
    (async () => {
      const mediaPropertySlugOrId = rootStore.GetPropertySlugOrIdFromPath();

      if(lastPropertySlugOrId && lastPropertySlugOrId === mediaPropertySlugOrId) {
        return;
      }

      delete window.initSplashRender;

      setStyling(undefined);

      rootStore.LoadPropertyCustomization(mediaPropertySlugOrId)
        .then(settings => {
          window.initSplashRender = Date.now();
          setStyling({
            ...(settings?.styling || {}),
            mediaPropertySlugOrId
          });

          setLastPropertySlugOrId(mediaPropertySlugOrId);
        });
    })();
  }, [rootStore.currentPath]);

  if(!mediaPropertySlugOrId) { return null; }

  const key = rootStore.mobile ?
    "splash_screen_background_mobile" : "splash_screen_background";

  return (
    <div className={S("splash")}>
      {
        !styling?.[key] ? null :
          <LoaderImage
            src={styling[key].url}
            hash={styling[`${key}_hash`]}
            className={S("splash__image")}
          />
      }
      <div className={S("splash__loader")}>
        <Loader/>
      </div>
      {
        !rootStore.isLocal && !window.location.origin.includes("preview") ? null :
          <div className={S("splash__preview")}>
            PREVIEW
          </div>
      }
    </div>
  );
});

export const RenderAction = observer(({
  sectionId,
  sectionItemId,
  sectionItem,
  action,
  Component
}) => {
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
      buttonParams.to = MediaPropertyBasePath({...rootStore.routeParams, pageSlugOrId: action.page_id});
      break;

    case "show_purchase":
      const purchaseParams = CreateMediaPropertyPurchaseParams({
        id: action.id,
        sectionSlugOrId: sectionId,
        sectionItemId,
        actionId: action.id,
        encode: false
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
      params.set("p", mediaPropertyStore.client.utils.B58(JSON.stringify(purchaseParams)));
      buttonParams.to = location.pathname + "?" + params.toString();
      break;

    case "media_link":
      const mediaItem = mediaPropertyStore.MediaPropertyMediaItem({mediaItemSlugOrId: action.media_id});

      if(mediaItem) {
        buttonParams.to = MediaPropertyLink({
          match: {
            params: rootStore.routeParams,
            url: rootStore.currentPath
          },
          mediaItem
        }).linkPath;
      }
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
          <Modal
            withCloseButton
            opened
            centered
            noBackground
            onClose={() => setShowVideoModal(false)}
            bodyClassName={S("action-video-container")}
          >
            <Video
              link={action.video}
              playerOptions={{showLoader: false, backgroundColor: "black"}}
              className={S("action-video")}
            />
          </Modal>
      }
      <Component
        {...buttonParams}
      />
    </>
  );
});

const HSLColor = (str="", s, l) => {
  const hue = Hash(str).reduce((a, v) => a + v, 0) % 360;

  return `hsl(${hue}, ${s}%, ${l}%)`;
};

const canvas = document.createElement("canvas");
let profileImageUrls = {};
export const DefaultProfileImage = ({name, email, address}={}) => {
  name = name || email || "";

  if(!profileImageUrls[address]) {
    const context = canvas.getContext("2d");

    canvas.width = 200;
    canvas.height = 200;

    const gradient = context.createLinearGradient(0, 0, context.canvas.width, 0);
    gradient.addColorStop(0, HSLColor(address, 100, 30));
    gradient.addColorStop(1, HSLColor(address, 100, 20));

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = "400 100px Helvetica";
    context.fillStyle = "#FFFFFF";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(name.toUpperCase().charAt(0), canvas.width / 2, canvas.height / 2 + 5);

    profileImageUrls[name] = canvas.toDataURL("image/png");
  }

  return profileImageUrls[name];
};
