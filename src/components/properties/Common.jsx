import CommonStyles from "Assets/stylesheets/media_properties/common.module";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import SanitizeHTML from "sanitize-html";

export const RichText = ({richText, baseFontSize=16, ...props}) => {
  return (
    <div
      {...props}
      style={{
        fontSize: baseFontSize,
        ...(props.style || {})
      }}
      className={[CommonStyles["rich-text"], props.className || ""].join(" ")}
      dangerouslySetInnerHTML={{__html: SanitizeHTML(richText)}}
    />
  );
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
  if(rootStore.pageWidth < 800) {
    minPx = minPxMobile;
    maxPx = maxPxMobile;
  }

  const ref = useRef();
  const [elementWidth, setElementWidth] = useState(100);

  useEffect(() => {
    setElementWidth(ref?.current.getBoundingClientRect().width || 100);
  }, [ref, rootStore.pageWidth]);

  const pxPerChar = elementWidth * 2 / children.length;
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
    <div {...props} className={[CommonStyles.description, props.className || ""].join(" ")}>
      { description }
    </div>
  );
};
