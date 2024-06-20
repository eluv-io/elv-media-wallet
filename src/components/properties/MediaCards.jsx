import MediaCardStyles from "Assets/stylesheets/media_properties/media-cards.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {
  MediaItemImageUrl, MediaItemLivePreviewImageUrl,
  MediaItemScheduleInfo, MediaPropertyLink
} from "../../utils/MediaPropertyUtils";
import {Description, LoaderImage, ScaledText} from "Components/properties/Common";
import {useRouteMatch} from "react-router-dom";
import {Linkish} from "Components/common/UIComponents";

const S = (...classes) => classes.map(c => MediaCardStyles[c] || "").join(" ");


const MediaCardBanner = observer(({
  display,
  imageContainerRef,
  imageUrl,
  scheduleInfo,
  textDisplay,
  linkPath="",
  url,
  onClick,
  className=""
}) => {
  return (
    <Linkish
      aria-label={display.title}
      onClick={onClick}
      to={linkPath}
      href={url}
      className={[S("media-card-banner"), className].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-banner__image-container")}>
        { !imageUrl ? null :
          <LoaderImage
            showWithoutSource
            src={imageUrl}
            alt={display.title}
            loaderAspectRatio={10}
            width={mediaPropertyStore.rootStore.fullscreenImageWidth}
            className={S("media-card-banner__image")}
          />
        }
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-banner__indicator", "media-card-banner__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-banner__indicator", "media-card-banner__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-banner__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-banner__headers")}>
                { display.headers?.map((header, index) =>
                  <div className={S("media-card-banner__header")} key={`header-${index}`}>
                    <div className={S("media-card-banner__headers")}>
                      {header}
                    </div>
                  </div>
                )}
              </div>
            }
            {
              !display.title ? null :
                <h3 className={S("media-card-banner__title")}>
                  { display.title }
                </h3>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <div className={S("media-card-banner__subtitle")}>
                  { display.subtitle }
                </div>
            }
            <Description
              description={display.description}
              maxLines={textDisplay === "all" ? 2 : 3}
              className={S("media-card-banner__description")}
            />
          </div>
      }
    </Linkish>
  );
});


const MediaCardVertical = observer(({
  display,
  imageContainerRef,
  imageUrl,
  livePreviewUrl,
  scheduleInfo,
  textDisplay,
  aspectRatio,
  linkPath="",
  url,
  size,
  onClick,
  className=""
}) => {
  let textScale = (aspectRatio) === "landscape" ? 1 : 0.9;
  textScale *= mediaPropertyStore.rootStore.pageWidth < 800 ? 0.8 : 1;

  return (
    <Linkish
      aria-label={display.title}
      to={linkPath}
      href={url}
      onClick={onClick}
      className={[
        S(
          "media-card-vertical",
          `media-card-vertical--${aspectRatio}`,
          size === "fixed" ? "media-card-vertical--size-fixed" : "",
          size === "mixed" ? "media-card-vertical--size-mixed" : "",
        ),
        className
      ].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-vertical__image-container")}>
        <LoaderImage
          src={livePreviewUrl || imageUrl}
          alternateSrc={livePreviewUrl ? imageUrl : undefined}
          alt={display.title}
          loaderWidth={size ? undefined : `var(--max-card-width-${aspectRatio?.toLowerCase()})`}
          width={600}
          showWithoutSource
          className={S("media-card-vertical__image")}
        />
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-vertical__indicator", "media-card-vertical__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-vertical__indicator", "media-card-vertical__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-vertical__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-vertical__headers")}>
                { display.headers.join("     ") }
              </div>
            }
            {
              !display.title ? null :
                <ScaledText Tag="h3" maxPx={20 * textScale} minPx={20 * textScale} className={S("media-card-vertical__title")}>
                  { display.title }
                </ScaledText>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <ScaledText maxPx={16 * textScale} minPx={16 * textScale} className={S("media-card-vertical__subtitle")}>
                  { display.subtitle }
                </ScaledText>
            }
          </div>
      }
    </Linkish>
  );
});

const MediaCardHorizontal = observer(({
  display,
  imageContainerRef,
  imageUrl,
  livePreviewUrl,
  scheduleInfo,
  textDisplay,
  aspectRatio,
  linkPath="",
  url,
  onClick,
  className=""
}) => {
  return (
    <Linkish
      aria-label={display.title}
      to={linkPath}
      href={url}
      onClick={onClick}
      className={[S("media-card-horizontal", `media-card-horizontal--${aspectRatio}`), className].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-horizontal__image-container")}>
        { !imageUrl ? null :
          <LoaderImage
            src={livePreviewUrl || imageUrl}
            alternateSrc={livePreviewUrl ? imageUrl : undefined}
            alt={display.title}
            width={600}
            className={S("media-card-horizontal__image")}
          />
        }
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-horizontal__indicator", "media-card-horizontal__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-horizontal__indicator", "media-card-horizontal__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-horizontal__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-horizontal__headers")}>
                { display.headers?.map((header, index) =>
                  <div className={S("media-card-horizontal__header")} key={`header-${index}`}>
                    <div className={S("media-card-horizontal__headers")}>
                      {header}
                    </div>
                  </div>
                )}
              </div>
            }
            {
              !display.title ? null :
                <h3 className={S("media-card-horizontal__title")}>
                  { display.title }
                </h3>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <div className={S("media-card-horizontal__subtitle")}>
                  { display.subtitle }
                </div>
            }
            <Description
              description={display.description}
              maxLines={textDisplay === "all" ? 2 : 3}
              className={S("media-card-horizontal__description")}
            />
          </div>
      }
    </Linkish>
  );
});


const MediaCard = observer(({
  disabled,
  format="vertical",
  sectionItem,
  mediaItem,
  aspectRatio,
  textDisplay="title",
  setImageDimensions,
  navContext,
  size,
  onClick,
  className=""
}) => {
  const match = useRouteMatch();
  const display = sectionItem?.display || mediaItem;
  const imageContainerRef = useRef();
  const [livePreviewUrl, setLivePreviewUrl] = useState(undefined);

  useEffect(() => {
    if(!setImageDimensions || !imageContainerRef?.current) { return; }

    setImageDimensions(imageContainerRef.current.getBoundingClientRect());
  }, [imageContainerRef, mediaPropertyStore.rootStore.pageWidth, mediaPropertyStore.rootStore.pageHeight]);

  // Live Preview URL
  useEffect(() => {
    const UpdateLivePreviewURL = async () => {
      const url = await MediaItemLivePreviewImageUrl({mediaItem:  mediaItem || sectionItem?.mediaItem});

      if(url) {
        // Pre-fetch / verify preview image
        const image = new Image();
        image.src = url;
        image.onload = () => {
          setLivePreviewUrl(url);
        };
      } else {
        setLivePreviewUrl(undefined);
      }
    };

    UpdateLivePreviewURL();
    const previewUpdateInterval = setInterval(() => {
      UpdateLivePreviewURL();
    }, 60000 + Math.random() * 5000);

    return () => clearInterval(previewUpdateInterval);
  }, []);

  if(!display) {
    mediaPropertyStore.Log("Invalid section item", true);
    mediaPropertyStore.Log(sectionItem);
    return null;
  }

  aspectRatio = aspectRatio?.toLowerCase() || "";
  let {imageUrl, imageAspectRatio} = MediaItemImageUrl({
    mediaItem: mediaItem || sectionItem?.mediaItem || sectionItem,
    display,
    aspectRatio,
    width: 600
  });

  if(format === "banner") {
    imageUrl =
      (mediaPropertyStore.rootStore.pageWidth < 800 && sectionItem?.banner_image_mobile?.url) ||
      sectionItem?.banner_image?.url ||
      imageUrl;
  }

  const scheduleInfo = MediaItemScheduleInfo(mediaItem || sectionItem.mediaItem);

  disabled = disabled || sectionItem?.resolvedPermissions?.disable;

  let linkPath, url;
  if(!disabled) {
    const linkInfo = MediaPropertyLink({match, sectionItem, mediaItem, navContext}) || "";
    linkPath = linkInfo.linkPath;
    url = linkInfo.url;
  }

  let args = {
    display,
    imageUrl,
    livePreviewUrl,
    textDisplay,
    linkPath,
    url,
    onClick,
    scheduleInfo,
    imageContainerRef,
    size,
    disabled,
    aspectRatio: aspectRatio || imageAspectRatio,
    className: [disabled ? S("media-card--disabled") : "", className].join(" ")
  };

  let card;
  switch(format) {
    case "horizontal":
      card = <MediaCardHorizontal {...args} />;
      break;
    case "vertical":
      card = <MediaCardVertical {...args} />;
      break;
    case "banner":
      card = <MediaCardBanner {...args} />;
      break;
  }

  return (
    <>
      { card }
    </>
  );
});

export default MediaCard;
