import MediaCardStyles from "Assets/stylesheets/media_properties/media-cards.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "Stores";
import {
  MediaItemImageUrl, MediaItemLivePreviewImageUrl,
  MediaItemScheduleInfo, MediaPropertyLink
} from "../../utils/MediaPropertyUtils";
import {Button, Description, ExpandableDescription, LoaderImage, ScaledText, Modal} from "Components/properties/Common";
import {useRouteMatch} from "react-router-dom";
import {Linkish} from "Components/common/UIComponents";

const S = (...classes) => classes.map(c => MediaCardStyles[c] || "").join(" ");

const MediaCardWithButtonVertical = observer(({
  display,
  imageContainerRef,
  imageUrl,
  livePreviewUrl,
  scheduleInfo,
  textDisplay,
  textJustification,
  aspectRatio,
  linkPath="",
  url,
  size,
  lazy=true,
  buttonText,
  onClick,
  className="",
  setShowModal,
  isModal
}) => {
  return (
    <div
      className={[
        S(
          "media-card-button-vertical",
          `media-card-button-vertical--${aspectRatio}`,
          `media-card-button-vertical--${textJustification || "left"}`,
          isModal ? "media-card-button-vertical--modal" : "",
          size === "fixed" ? "media-card-button-vertical--size-fixed" : "",
          size === "mixed" ? "media-card-button-vertical--size-mixed" : "",
        ),
        className
      ].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-button-vertical__image-container")}>
        <LoaderImage
          lazy={lazy}
          src={livePreviewUrl || imageUrl}
          alternateSrc={livePreviewUrl ? imageUrl : undefined}
          alt={display.title}
          width={600}
          showWithoutSource
          className={S("media-card-button-vertical__image")}
        />
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-button-vertical__indicator", "media-card-button-vertical__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-button-vertical__indicator", "media-card-button-vertical__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      <div className={S("media-card-button-vertical__text")}>
        { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
          <div className={S("media-card-button-vertical__headers")}>
            { display.headers.join("     ") }
          </div>
        }
        {
          !display.title ? null :
            <h3 className={[S("media-card-button-vertical__title"), "_title"].join(" ")}>
              { display.title }
            </h3>
        }
        {
          !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
            <div className={S("media-card-button-vertical__subtitle")}>
              { display.subtitle }
            </div>
        }
          <ExpandableDescription
            description={display.description}
            descriptionRichText={display.description_rich_text}
            maxLines={isModal ? 1000 : undefined}
            onClick={
              isModal ? undefined :
                () => {
                  setShowModal(true);

                  return true;
                }
            }
            togglePosition={textJustification || "left"}
            className={S("media-card-button-vertical__description")}
          />
        <div className={S("media-card-button-vertical__actions")}>
          <Button
            aria-label={display.title}
            onClick={async event => {
              setShowModal && setShowModal(false);

              return onclick && await onClick(event);
            }}
            to={linkPath}
            href={url}
            className={[S("media-card-button-vertical__action"), className].join(" ")}
          >
            <ScaledText maxPx={22} minPx={18}>
              {buttonText}
            </ScaledText>
          </Button>
        </div>
      </div>
    </div>
  );
});

const MediaCardWithButtonHorizontal = observer(({
  display,
  imageContainerRef,
  imageUrl,
  livePreviewUrl,
  scheduleInfo,
  textDisplay,
  textJustification,
  aspectRatio,
  linkPath="",
  url,
  size,
  lazy=true,
  buttonText,
  onClick,
  className="",
  setShowModal
}) => {
  return (
    <div
      className={[
        S(
          "media-card-button-horizontal",
          `media-card-button-horizontal--${aspectRatio}`,
          `media-card-button-horizontal--${textJustification}`,
          size === "fixed" ? "media-card-button-horizontal--size-fixed" : "",
          size === "mixed" ? "media-card-button-horizontal--size-mixed" : "",
        ),
        className
      ].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-button-horizontal__image-container")}>
        <LoaderImage
          lazy={lazy}
          src={livePreviewUrl || imageUrl}
          loaderAspectRatio={aspectRatio}
          alternateSrc={livePreviewUrl ? imageUrl : undefined}
          alt={display.title}
          width={600}
          showWithoutSource
          className={S("media-card-button-horizontal__image")}
        />
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("media-card-button-horizontal__indicator", "media-card-button-horizontal__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("media-card-button-horizontal__indicator", "media-card-button-horizontal__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      <div className={S("media-card-button-horizontal__text")}>
        { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
          <div className={S("media-card-button-horizontal__headers")}>
            { display.headers.join("     ") }
          </div>
        }
        {
          !display.title ? null :
            <h3 className={[S("media-card-button-horizontal__title"), "_title"].join(" ")}>
              { display.title }
            </h3>
        }
        {
          !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
            <div className={S("media-card-button-horizontal__subtitle")}>
              { display.subtitle }
            </div>
        }
        <ExpandableDescription
          description={display.description}
          descriptionRichText={display.description_rich_text}
          onClick={() => {
            setShowModal(true);

            return true;
          }}
          togglePosition={textJustification || "left"}
          className={S("media-card-button-horizontal__description")}
        />
        <div className={S("media-card-button-horizontal__actions")}>
          <Button
            aria-label={display.title}
            onClick={async event => {
              setShowModal && setShowModal(false);
              return await onClick(event);
            }}
            to={linkPath}
            href={url}
            className={[S("media-card-button-horizontal__action"), className].join(" ")}
          >
            <ScaledText maxPx={22} minPx={18}>
              {buttonText}
            </ScaledText>
          </Button>
        </div>
      </div>
    </div>
  );
});

const ButtonCard = observer(({orientation="vertical", ...args}) => {
  const [showModal, setShowModal] = useState(false);

  const Component = orientation === "vertical" ?
    MediaCardWithButtonVertical :
    MediaCardWithButtonHorizontal;

  return (
    <>
      <Component {...args} setShowModal={setShowModal} />
      {
        !showModal ? null :
          <Modal noBackground opened centered fullScreen onClose={() => setShowModal(false)}>
            <div
              onClick={function(event) {
                if(event.target === event.currentTarget) {
                  setShowModal(false);
                }
              }}
              className={S("button-card-modal-container")}
            >
              <MediaCardWithButtonVertical {...args} isModal setShowModal={setShowModal} />
            </div>
          </Modal>
      }
    </>
  );
});

const MediaCardBanner = observer(({
  display,
  imageContainerRef,
  imageUrl,
  scheduleInfo,
  textDisplay,
  linkPath="",
  url,
  lazy=true,
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
            lazy={lazy}
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
                <h3 className={[S("media-card-banner__title"), "_title"].join(" ")}>
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
  textJustification,
  aspectRatio,
  linkPath="",
  url,
  size,
  lazy=true,
  authorized,
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
          `media-card-vertical--${textJustification || "left"}`,
          size === "fixed" ? "media-card-vertical--size-fixed" : "",
          size === "mixed" ? "media-card-vertical--size-mixed" : "",
        ),
        className
      ].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-vertical__image-container")}>
        <LoaderImage
          lazy={lazy}
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
        {
          authorized || !rootStore.loggedIn ? null :
            <div className={S("media-card__unauthorized-indicator")}>
              View Purchase Options
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
                <ScaledText Tag="h3" maxPx={20 * textScale} minPx={20 * textScale} className={[S("media-card-vertical__title"), "_title"].join(" ")}>
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
  lazy=true,
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
            lazy={lazy}
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
                <h3 className={[S("media-card-horizontal__title"), "_title"].join(" ")}>
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
              maxLines={textDisplay === "all" ? 3 : 4}
              onClick={event => event.stopImmediatePropagation()}
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
  textJustification="left",
  setImageDimensions,
  buttonText,
  navContext,
  size,
  lazy=true,
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

  if((sectionItem || mediaItem)?.resolvedPermissions?.hide) {
    rootStore.Log("Warning: Media card with 'hide' permissions - should be truncated earlier", "warn");
    rootStore.Log(sectionItem || mediaItem, "warn");
    return null;
  }

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

  disabled = disabled || (sectionItem || mediaItem)?.resolvedPermissions?.disable;

  let linkPath, url, authorized;
  if(!disabled) {
    const linkInfo = MediaPropertyLink({match, sectionItem, mediaItem, navContext}) || "";
    linkPath = linkInfo?.linkPath;
    url = linkInfo?.url;
    authorized = linkInfo?.authorized;
  }

  let args = {
    display,
    imageUrl,
    livePreviewUrl,
    textDisplay,
    textJustification,
    linkPath,
    url,
    onClick,
    scheduleInfo,
    imageContainerRef,
    size,
    disabled,
    lazy,
    buttonText,
    authorized,
    aspectRatio: !aspectRatio || aspectRatio === "mixed" ? imageAspectRatio : aspectRatio,
    className: [
      disabled ?
        S("media-card--disabled") :
        !authorized ?
          S("media-card--unauthorized") : "",
      className
    ].join(" ")
  };

  switch(format) {
    case "horizontal":
      return <MediaCardHorizontal {...args} />;
    case "button_vertical":
      return <ButtonCard orientation="vertical" {...args} />;
    case "button_horizontal":
      return <ButtonCard orientation={rootStore.pageWidth > 600 ? "horizontal" : "vertical"} {...args} />;
    case "banner":
      return <MediaCardBanner {...args} />;
    default:
      return <MediaCardVertical {...args} />;
  }
});

export default MediaCard;
