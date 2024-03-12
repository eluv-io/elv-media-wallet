import CommonStyles from "Assets/stylesheets/media_properties/common.module";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import SanitizeHTML from "sanitize-html";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {NavLink} from "react-router-dom";

import ArrowLeft from "Assets/icons/arrow-left.svg";
import ImageIcon from "Components/common/ImageIcon";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

export const PageContainer = ({backPath, children}) => {
  return (
    <div className={S("page-container")}>
      {
        !backPath ? null :
          <NavLink to={backPath} className={S("page-container__back-link")}>
            <ImageIcon icon={ArrowLeft} />
            <div>Back</div>
          </NavLink>
      }

      { children }
    </div>
  );
};

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

export const LoaderImage = observer(({src, width, loaderHeight, loaderWidth, lazy=true, ...props}) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

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
        className={S("lazy-image__loader-image")}
        loading={lazy ? "lazy" : "eager"}
        src={src}
        key={props.key ? `${props.key}--img` : undefined}
        onLoad={() => setLoaded(true)}
      />
      <div
        {...props}
        style={{...(props.style || {}), width: loaderWidth, height: loaderHeight}}
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
  const text = children.toString();

  if(rootStore.pageWidth < 800) {
    minPx = Math.min(minPx, minPxMobile);
    maxPx = Math.min(maxPx, maxPxMobile);
  }

  const ref = useRef();
  const [fontSize, setFontSize] = useState(maxPx);

  useEffect(() => {
    if(!ref?.current) { return; }

    setFontSize(FitFontSize({element: ref.current, text: children, min: minPx, max: maxPx}));
  }, [ref, text, rootStore.pageWidth]);

  return (
    <Tag {...props} ref={ref} style={{fontSize, ...(props.style || {})}}>
      { text }
    </Tag>
  );
});

export const Description = ({description, descriptionRichText, baseFontSize=18, ...props}) => {
  if(descriptionRichText) {
    return <RichText richText={descriptionRichText} baseFontSize={baseFontSize} {...props} />;
  }

  return (
    <div {...props} className={[S("description"), props.className || ""].join(" ")}>
      { description }
    </div>
  );
};
