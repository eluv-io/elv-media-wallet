import CommonStyles from "Assets/stylesheets/media_properties/common.module";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import SanitizeHTML from "sanitize-html";
import {SetImageUrlDimensions} from "../../utils/Utils";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

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

export const LazyImage = observer(({src, width, loaderHeight, loaderWidth, ...props}) => {
  const [loaded, setLoaded] = useState(false);

  if(width) {
    src = SetImageUrlDimensions({url: src, width});
  }

  if(loaded) {
    return <img loading="lazy" src={src} {...props} />;
  }

  return (
    <>
      <div
        {...props}
        style={{...(props.style || {}), width: loaderWidth, height: loaderHeight}}
        key={props.key ? `${props.key}--placeholder` : undefined}
        className={[S("lazy-image__background"), props.className || ""].join(" ")}
      />
      <img
        {...props}
        loading="lazy"
        src={src}
        key={props.key ? `${props.key}--img` : undefined}
        style={{display: "block", width: 0, height: 0, opacity: 0}}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
});

export const ScaledText = observer(({
  Tag="div",
  children,
  minPx=16,
  maxPx=52,
  minPxMobile=16,
  maxPxMobile=32,
  ...props
}) => {
  children = children.toString();
  minPxMobile = Math.min(minPx, minPxMobile);
  maxPxMobile = Math.min(maxPx, maxPxMobile);

  if(rootStore.pageWidth < 800) {
    minPx = minPxMobile;
    maxPx = maxPxMobile;
  }

  const ref = useRef();
  const [elementWidth, setElementWidth] = useState(100);

  useEffect(() => {
    setElementWidth(ref?.current.getBoundingClientRect().width || 100);
  }, [ref, rootStore.pageWidth]);

  const pxPerChar = elementWidth * 1.5 / children.length;
  const fontSize = `${Math.min(maxPx, Math.max(minPx, pxPerChar))}px`;

  return (
    <Tag {...props} ref={ref} style={{fontSize, ...(props.style || {})}}>
      {children}
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
