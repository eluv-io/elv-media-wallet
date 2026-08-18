import MediaCardStyles from "@/assets/stylesheets/media_properties/media-cards.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "@/stores";
import {
  MediaItemImageUrl, MediaItemLivePreviewImageUrl,
  MediaItemScheduleInfo, MediaPropertyLink
} from "@/utils/MediaPropertyUtils";
import {Button, Description, ExpandableDescription, LoaderImage, ScaledText, Modal} from "@/components/properties/Common";
import {useRouteMatch} from "react-router-dom";
import {FormatPriceString, Linkish} from "@/components/common/UIComponents";
import Video from "@/components/properties/Video";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {Popover, Select} from "@mantine/core";
import ImageIcon from "@/components/common/ImageIcon";
import {useIsVisible} from "@/components/common/Hooks";

import ArrowRightIcon from "@/assets/icons/arrow-right.svg";
import PinIcon from "@/assets/icons/pin.svg";
import CaretDownIcon from "@/assets/icons/down-caret.svg";
import XIcon from "@/assets/icons/x.svg";

const S = (...classes) => classes.map(c => MediaCardStyles[c] || "").join(" ");

const MediaItem = observer(({mediaItemId, index}) => {
  const match = useRouteMatch();
  const [hovering, setHovering] = useState(false);
  const mediaItem = mediaPropertyStore.MediaPropertyMediaItem({mediaItemSlugOrId: mediaItemId});

  if(!mediaItem) { return null; }

  const permissions = mediaPropertyStore.ResolvePermission({...match.params, mediaItemSlugOrId: mediaItemId});

  if(permissions.hide) { return null; }

  const linkInfo = MediaPropertyLink({match, mediaItem});
  const imageInfo = MediaItemImageUrl({
    mediaItem,
    display: mediaItem,
    width: 600
  });

  return (
    <Linkish
      disabled={permissions.disable}
      to={linkInfo.linkPath}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={S("media-list-item")}
    >
      <div className={S("media-list-item__info")}>
        <div className={S("media-list-item__index")}>
          { index + 1 }
        </div>
        <div className={S("styled-card", `styled-card--${imageInfo.imageAspectRatio}`, "media-list-item__card", hovering ? "styled-card--transition-active" : "")}>
          <div className={S("styled-card__image-container", "media-list-item__image-container")}>
            <LoaderImage
              src={imageInfo.imageUrl}
              hash={imageInfo.imageHash}
              className={S("styled-card__image", "media-list-item__image")}
            />
          </div>
        </div>
        <div className={S("media-list-item__text")}>
          {
            (mediaItem.headers || []).length === 0 ? null :
              <div className={S("media-list-item__headers")}>
                {mediaItem.headers?.join?.("     ")}
              </div>
          }
          {
            !mediaItem.title ? null :
              <div title={mediaItem.title} className={[S("media-list-item__title"), "_title"].join(" ")}>
                {mediaItem.title}
              </div>
          }
          {
            !mediaItem.subtitle ? null :
              <div className={S("media-list-item__subtitle")}>
                {mediaItem.subtitle}
              </div>
          }
        </div>
      </div>
      {
        !mediaItem.description ? null :
          <ExpandableDescription
            onClick={event => {
              event.stopPropagation();
              event.preventDefault();
              return false;
            }}
            description={mediaItem.description}
            maxLines={2}
            className={S("media-list-item__description")}
            indicatorClassName={S("media-list-item__description-expand")}
          />
      }
    </Linkish>
  );
});

const MediaDetailsModal = observer(({
  display,
  url,
  linkPath,
  onClick,
  imageUrl,
  livePreviewUrl,
  lazy,
  aspectRatio,
  scheduleInfo,
  progress,
  style,
  Close
}) => {
  const [selectedMediaListId, setSelectedMediaListId] = useState(
    display?.type === "collection" ? display.media_lists?.[0] :
      display.type === "list" ? display.id : undefined
  );

  const selectedMediaList = !selectedMediaListId ? undefined :
    mediaPropertyStore.MediaPropertyMediaItem({mediaItemSlugOrId: selectedMediaListId});

  return (
    <Modal
      noBackground
      width={800}
      opened
      centered
      withCloseButton={false}
      onClose={Close}
    >
      <div
        style={{...(style || {})}}
        className={S("details-modal", `details-modal--${aspectRatio}`)}
      >
        <div className={S("details-modal__close-header")}>
          <Linkish title="Close" onClick={Close} aria-label="Close Details" className={S("details-modal__close")}>
            <ImageIcon icon={XIcon} />
          </Linkish>
        </div>
        <div className={S("details-modal__top")}>
          <div className={S("styled-card", "styled-card--active", `styled-card--${aspectRatio}`, "details-modal__card")}>
            <div className={S("styled-card__image-container", "details-modal__image-container")}>
              <LoaderImage
                lazy={lazy}
                src={livePreviewUrl || imageUrl}
                alternateSrc={livePreviewUrl ? imageUrl : undefined}
                alt={display.thumbnail_alt_text || display.title}
                width={600}
                showWithoutSource
                className={S("styled-card__image", "details-modal__image")}
              />
              {
                // Schedule indicator
                !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
                  scheduleInfo.currentlyLive ?
                    <div className={S("styled-card__indicator", "styled-card__live-indicator")}>
                      {mediaPropertyStore.rootStore.l10n.media_properties.media.live}
                    </div> :
                    <div className={S("styled-card__indicator", "styled-card__upcoming-indicator")}>
                      <div>{scheduleInfo.displayStartDate} at {scheduleInfo.displayStartTime}</div>
                    </div>
              }
              {
                // Progress indicator
                !progress || isNaN(progress) || progress ? null :
                  <div className={S("styled-card__progress-container")}>
                    <div
                      style={{width: `${progress * 100}%`}}
                      className={S("styled-card__progress-indicator")}
                    />
                  </div>
              }
            </div>
          </div>
          <div className={S("details-modal__top-content")}>
            <div className={S("details-modal__top-text")}>
              {
                (display.headers || []).length === 0 ? null :
                  <div className={S("details-modal__headers")}>
                    {display.headers?.join?.("     ")}
                  </div>
              }
              {
                !display.title ? null :
                  <div title={display.title} className={[S("details-modal__title"), "_title"].join(" ")}>
                    {display.title}
                  </div>
              }
              {
                !display.subtitle ? null :
                  <div className={S("details-modal__subtitle")}>
                    {display.subtitle}
                  </div>
              }
            </div>
            <div className={S("details-modal__actions")}>
              {
                display.type !== "media" ? null :
                  <Linkish
                    title="Go to Content"
                    to={linkPath}
                    href={url}
                    onClick={
                      !onClick ? null :
                        event => {
                          event.preventDefault();
                          event.stopPropagation();
                          onClick?.();
                        }
                    }
                    className={S("details-modal__action")}
                  >
                    <ImageIcon icon={ArrowRightIcon}/>
                  </Linkish>
              }
              <Linkish
                title="Add to My List"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                className={S("details-modal__action")}
              >
                <ImageIcon icon={PinIcon} />
              </Linkish>
            </div>
          </div>
        </div>
        <div className={S("details-modal__content")}>
          {
            !display.description ? null :
              <ExpandableDescription
                description={display.description}
                descriptionRichText={display.description_rich_text}
                maxLines={5}
                className={S("details-modal__description")}
              />
          }
        </div>
        {
          !selectedMediaListId ? null :
            <>
              {
                display.type !== "collection" || display.media_lists.length <= 1 ? null :
                  <div className={S("details-modal__list-header")}>
                    <div className={S("details-modal__list-header-text")}>
                      {display.media_lists_label || "Lists"}
                    </div>
                    <Select
                      value={selectedMediaListId}
                      onChange={value => setSelectedMediaListId(value)}
                      maw={225}
                      fz={20}
                      data={
                        display.media_lists
                          .map(mediaListId => ({
                            value: mediaListId,
                            label: mediaPropertyStore.MediaPropertyMediaItem({
                              mediaItemSlugOrId: mediaListId
                            })?.title
                          }))
                      }
                    />
                  </div>
              }
              {
                !selectedMediaList ? null :
                  <div key={selectedMediaListId} className={S("media-list")}>
                    {
                      selectedMediaList.media?.map((mediaItemId, index) =>
                        <MediaItem
                          key={mediaItemId}
                          index={index}
                          mediaItemId={mediaItemId}
                        />
                      )
                    }
                  </div>
              }
            </>
        }
      </div>
    </Modal>
  );
});


let hoverCardTimeout;
let hoverCardOpenDelay = 1000;
let hoverCloseDelay = 100;
const MediaHoverCard = observer(({
                                   width,
                                   display,
                                   url,
  linkPath,
  onClick,
  imageUrl,
  imageHash,
  livePreviewUrl,
  lazy,
  aspectRatio,
  scheduleInfo,
  progress,
  children,
  style,
  ShowDetailsModal
}) => {
  const [closeTimeout, setCloseTimeout] = useState(undefined);
  const [opened, setOpened] = useState(false);
  const [targetRef, setTargetRef] = useState(undefined);
  const visible = useIsVisible(targetRef);

  useEffect(() => {
    if(!visible) {
      setOpened(false);
    }
  }, [visible]);

  const overscale = 60;
  const hoverCardWidth = Math.max((width || 0) + overscale, 250);
  const extension = (hoverCardWidth - (width || 0)) / 2;

  style = {...(style || {})};
  style["--scale"] = 1;

  if(width) {
    style["--width"] = `${hoverCardWidth}px`;
  }

  if(parseInt(style["--border-radius"]) <= 5) {
    // Square out subtle border radius in hover card
    style["--border-radius"] = "0px";
  }

  return (
    <Popover
      opened={opened}
      position="center"
      offset={{mainAxis: -(extension), crossAxis: -(extension)}}
      transitionProps={{
        transition: "pop",
        duration: 350,
        exitDuration: 250
      }}
    >
      <Popover.Target>
        <div
          ref={setTargetRef}
          onMouseEnter={() => {
            clearTimeout(hoverCardTimeout);
            hoverCardTimeout = setTimeout(() => setOpened(true), hoverCardOpenDelay);
          }}
          onMouseLeave={() => clearTimeout(hoverCardTimeout)}
          className={S("hover-card-target", opened ? "hover-card-target--delay-transition" : "")}
        >
          { children }
        </div>
      </Popover.Target>
      <Popover.Dropdown
        style={style}
        className={S("hover-card-container")}
      >
        <Linkish
          to={linkPath}
          href={url}
          onClick={onClick}
          onMouseEnter={() => clearTimeout(closeTimeout)}
          onMouseLeave={() => {
            clearTimeout(closeTimeout);
            setCloseTimeout(setTimeout(() => setOpened(false), hoverCloseDelay));
          }}
          className={S("styled-card", `styled-card--${aspectRatio}`, "styled-card--active", "hover-card")}
        >
          <div className={S("styled-card__image-container", "hover-card__image-container")}>
            <LoaderImage
              lazy={lazy}
              src={livePreviewUrl || imageUrl}
              hash={imageHash}
              alternateSrc={livePreviewUrl ? imageUrl : undefined}
              alt={display.thumbnail_alt_text || display.title}
              width={600}
              showWithoutSource
              className={S("styled-card__image", "hover-card__image")}
            />
            {
              // Schedule indicator
              !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
                scheduleInfo.currentlyLive ?
                  <div className={S("styled-card__indicator", "styled-card__live-indicator")}>
                    {mediaPropertyStore.rootStore.l10n.media_properties.media.live}
                  </div> :
                  <div className={S("styled-card__indicator", "styled-card__upcoming-indicator")}>
                    <div>{scheduleInfo.displayStartDate} at {scheduleInfo.displayStartTime}</div>
                  </div>
            }
            {
              // Progress indicator
              !progress || isNaN(progress) ? null :
                <div className={S("styled-card__progress-container")}>
                  <div
                    style={{width: `${progress * 100}%`}}
                    className={S("styled-card__progress-indicator")}
                  />
                </div>
            }
          </div>
          <div className={S("hover-card__content")}>
            <div className={S("hover-card__actions")}>
              <Linkish title="Go to Content" className={S("hover-card__action")}>
                <ImageIcon icon={ArrowRightIcon}/>
              </Linkish>
              <Linkish
                title="Add to My List"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                className={S("hover-card__action")}
              >
                <ImageIcon icon={PinIcon} />
              </Linkish>
              <div className={S("hover-card__separator")} />
              <Linkish
                title="More Info"
                to={linkPath}
                href={url}
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  ShowDetailsModal();
                  setOpened(false);
                }}
                className={S("hover-card__action")}
              >
                <ImageIcon icon={CaretDownIcon} />
              </Linkish>
            </div>
            <div className={S("hover-card__text")}>
              {
                (display.headers || []).length === 0 ? null :
                  <div className={S("hover-card__headers")}>
                    {display.headers?.join?.("     ")}
                  </div>
              }
              {
                !display.title ? null :
                  <div title={display.title} className={[S("hover-card__title"), "_title"].join(" ")}>
                    {display.title}
                  </div>
              }
              {
                !display.subtitle ? null :
                  <div className={S("hover-card__subtitle")}>
                    {display.subtitle}
                  </div>
              }
              {
                !display.description ? null :
                  <ExpandableDescription
                    description={display.description}
                    maxLines={3}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      ShowDetailsModal();
                      setOpened(false);
                      return true;
                    }}
                    className={S("hover-card__description")}
                  />
              }
            </div>
          </div>
        </Linkish>
      </Popover.Dropdown>
    </Popover>
  );
});

export const MediaCardWithButtonVertical = observer(({
  display,
  price,
  imageContainerRef,
  imageUrl,
  imageHash,
  livePreviewUrl,
  scheduleInfo={},
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
          size === "mixed" ? "media-card-button-vertical--size-mixed" : ""
        ),
        className
      ].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-button-vertical__image-container")}>
        <LoaderImage
          lazy={lazy}
          src={livePreviewUrl || imageUrl}
          hash={imageHash}
          alternateSrc={livePreviewUrl ? imageUrl : undefined}
          alt={display.thumbnail_alt_text || display.title}
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
            { display.headers?.join?.("     ") }
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
        {
          !price ? null :
            <div className={S("media-card-button-vertical__price")}>
              {price}
            </div>
        }
        <ExpandableDescription
          description={display.description}
          descriptionRichText={display.description_rich_text}
          maxLines={isModal ? 1000 : 6}
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
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
});

const MediaCardWithButtonHorizontal = observer(({
  display,
  price,
  imageContainerRef,
  imageUrl,
  imageHash,
  livePreviewUrl,
  scheduleInfo={},
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
          hash={imageHash}
          loaderAspectRatio={aspectRatio}
          alternateSrc={livePreviewUrl ? imageUrl : undefined}
          alt={display.thumbnail_alt_text || display.title}
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
            { display.headers?.join?.("     ") }
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
        {
          !price ? null :
            <div className={S("media-card-button-horizontal__price")}>
              {price}
            </div>
        }
        <ExpandableDescription
          description={display.description}
          descriptionRichText={display.description_rich_text}
          maxLines={3}
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
              return onClick && await onClick(event);
            }}
            to={linkPath}
            href={url}
            className={[S("media-card-button-horizontal__action"), className].join(" ")}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
});

export const ButtonCard = observer(({orientation="vertical", ...args}) => {
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
              <div className={S("button-card-modal-wrapper")}>
                <MediaCardWithButtonVertical {...args} isModal setShowModal={setShowModal} />
              </div>
            </div>
          </Modal>
      }
    </>
  );
});

const MediaCardBanner = observer(({
  sectionItem,
  display,
  imageContainerRef,
  imageUrl,
  imageHash,
  scheduleInfo,
  textDisplay,
  linkPath="",
  url,
  lazy=true,
  fullBleed,
  onClick,
  className=""
}) => {
  const [animationState, setAnimationState] = useState("loading");
  const animation = rootStore.pageWidth < 800 ?
    sectionItem.banner_animation_mobile :
    sectionItem.banner_animation;

  const hasText = textDisplay !== "none" &&
    display?.title?.trim() ||
    display?.subtitle?.trim() ||
    display?.description?.trim() ||
    display?.title?.trim() ||
    display?.headers?.length > 0;

  return (
    <Linkish
      aria-label={display.title}
      onClick={onClick}
      to={linkPath}
      href={url}
      className={[S("media-card-banner"), className].join(" ")}
    >
      <div
        ref={imageContainerRef}
        className={S(
          "media-card-banner__image-container",
          fullBleed ? "media-card-banner__image-container--full-bleed" : ""
        )}
      >
        {
          animation && animationState !== "error" ?
            <>
              <Video
                link={animation}
                mute
                hideControls
                posterImage={imageUrl}
                readyCallback={() => setAnimationState("ready")}
                errorCallback={() => setAnimationState("error")}
                playerOptions={{
                  loop: EluvioPlayerParameters.loop.ON,
                  autoplay: EluvioPlayerParameters.autoplay.WHEN_VISIBLE,
                  backgroundColor: "transparent",
                  showLoader: EluvioPlayerParameters.showLoader.OFF,
                  capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize.ON,
                  keyboardControls: EluvioPlayerParameters.keyboardControls.OFF
                }}
                className={S("media-card-banner__video", animationState === "loading" ? "media-card-banner__video--loading" : "media-card-banner__video")}
              />
              {
                animationState !== "loading" ? null :
                  <LoaderImage
                    showWithoutSource
                    lazy={false}
                    loaderDelay={0}
                    className={S("media-card-banner__video-loader")}
                  />
              }
              <div onClick={event => event.stopPropagation()} className={S("media-card-banner__video-cover")} />
            </> :
            imageUrl ?
              <LoaderImage
                lazy={lazy}
                showWithoutSource
                src={imageUrl}
                hash={imageHash}
                alt={display.banner_alt_text || display.title}
                className={S("media-card-banner__image")}
              /> : null
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
        !hasText ? null :
          <div
            className={S(
              "media-card-banner__text",
              fullBleed ? "media-card-banner__text--full-bleed" : ""
            )}
          >
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
  imageHash,
  livePreviewUrl,
  scheduleInfo,
  textDisplay,
  textJustification,
  aspectRatio,
  linkPath="",
  url,
  size,
  lazy = true,
  wrapTitle = false,
  progress,
  authorized,
  onClick,
  style,
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
      style={{...(style || {})}}
      className={[
        S(
          "media-card",
          "media-card-vertical",
          "styled-card",
          `styled-card--${aspectRatio}`,
          `media-card-vertical--${aspectRatio}`,
          `media-card-vertical--${textJustification || "left"}`,
          `media-card-vertical--text-${textDisplay || "left"}`,
          size === "fixed" ? "styled-card--size-fixed" : "",
          size === "mixed" ? "styled-card--size-mixed" : "",
          size === "carousel-mixed" ? "styled-card--size-carousel-mixed" : "",
        ),
        className
      ].join(" ")}
    >
      <div ref={imageContainerRef} className={S("media-card-vertical__image-container", "styled-card__image-container")}>
        <LoaderImage
          lazy={lazy}
          src={livePreviewUrl || imageUrl}
          hash={imageHash}
          alternateSrc={livePreviewUrl ? imageUrl : undefined}
          alt={display.thumbnail_alt_text || display.title}
          loaderWidth={size ? undefined : `var(--max-card-width-${aspectRatio?.toLowerCase()})`}
          width={600}
          showWithoutSource
          className={S("media-card-vertical__image", "styled-card__image")}
        />
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("styled-card__indicator", "styled-card__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("styled-card__indicator", "styled-card__upcoming-indicator")}>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
        {
          authorized || !rootStore.loggedIn ? null :
            <div className={S("media-card__unauthorized-indicator")}>
              { rootStore.l10n.actions.purchase.view_purchase_options }
            </div>
        }
        {
          // Progress indicator
          !progress || isNaN(progress) ? null :
            <div className={S("styled-card__progress-container")}>
              <div
                style={{width: `${progress * 100}%`}}
                className={S("styled-card__progress-indicator")}
              />
            </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("media-card-vertical__text")}>
            { textDisplay !== "all" || (display.headers || []).length === 0 ? null :
              <div className={S("media-card-vertical__headers")}>
                { display.headers?.join?.("     ") }
              </div>
            }
            {
              !display.title ? null :
                wrapTitle ?
                  <ExpandableDescription
                    expandable={false}
                    description={display.title}
                    maxLines={3}
                    className={[S("media-card-vertical__title--wrap"), "_title"].join(" ")}
                  /> :
                  <h3 title={display.title} className={[S("media-card-vertical__title", wrapTitle ? "media-card-vertical__title--wrap" : ""), "_title"].join(" ")}>
                    { display.title }
                  </h3>
            }
            {
              !["all", "titles"].includes(textDisplay) || !display.subtitle ? null :
                <ScaledText title={display.subtitle} maxPx={16 * textScale} minPx={16 * textScale} className={S("media-card-vertical__subtitle")}>
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
            alt={display.thumbnail_alt_text || display.title}
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
              maxLines={textDisplay === "all" ? 2 : 4}
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
  variants=[],
  size,
  fullBleed=false,
  lazy=true,
  wrapTitle=false,
  onClick,
  className="",
  centered,
  style={},
  ...props
}) => {
  const match = useRouteMatch();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const display = sectionItem?.display || mediaItem;
  const imageContainerRef = useRef();
  const [livePreviewUrl, setLivePreviewUrl] = useState(undefined);

  if(size === "carousel-mixed" && format !== "vertical") {
    size = "mixed";
  }

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

  const permissions = (sectionItem || mediaItem)?.resolvedPermissions || {};
  if(permissions.hide) {
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
  let {imageUrl, imageHash, imageAspectRatio} = MediaItemImageUrl({
    mediaItem: mediaItem || sectionItem?.mediaItem || sectionItem,
    display,
    aspectRatio,
    width: 600
  });

  if(format === "banner") {
    imageUrl =
      (mediaPropertyStore.rootStore.pageWidth < 850 && sectionItem?.banner_image_mobile_hash) ||
      sectionItem?.banner_image?.url ||
      imageUrl;

    imageHash =
      (mediaPropertyStore.rootStore.pageWidth < 850 && sectionItem?.banner_image_mobile_hash) ||
      sectionItem?.banner_image_hash ||
      imageHash;
  }

  const scheduleInfo = MediaItemScheduleInfo(mediaItem || sectionItem.mediaItem);

  const cardMediaItem = mediaItem || sectionItem?.mediaItem;
  const progress =
    cardMediaItem &&
    !cardMediaItem.isSearchResult &&
    !scheduleInfo.isLiveContent &&
    mediaPropertyStore.GetMediaProgress({mediaItemId: cardMediaItem.id});

  disabled = disabled || permissions.disable;

  let linkPath, url, authorized, price;
  if(!disabled) {
    const linkInfo = MediaPropertyLink({match, sectionItem, mediaItem, navContext}) || "";
    linkPath = linkInfo?.linkPath;
    url = linkInfo?.url;
    authorized = linkInfo?.authorized;

    // For collections and lists, show details modal on click
    if(["collection", "list"].includes(linkInfo.mediaType)) {
      onClick = () => setShowDetailsModal(true);
    }

    if(sectionItem?.display?.show_price && linkInfo.purchaseItems && linkInfo.purchaseItems.length > 0) {
      const prices = linkInfo.purchaseItems
        .map(item => {
          if(!item.marketplaceItem) { return; }

          return {
            string: FormatPriceString(item.marketplaceItem.price, {stringOnly: true}),
            value: FormatPriceString(item.marketplaceItem.price, {numberOnly: true})
          };
        })
        .filter(price => price)
        .sort((a, b) => a.value < b.value ? -1 : 1);

      const minPrice = prices?.[0]?.string;
      const maxPrice = prices?.slice(-1)?.[0]?.string;

      if(minPrice === maxPrice) {
        price = minPrice;
      } else {
        price = `${minPrice} - ${maxPrice}`;
      }
    }
  } else if(!rootStore.loggedIn) {
    // Disabled but not logged in - prompt login
    disabled = false;
    const linkInfo = MediaPropertyLink({match, sectionItem, mediaItem, navContext}) || "";
    linkPath = linkInfo?.linkPath;
    onClick = () => rootStore.ShowLogin({backPath: window.location.pathname});
  }

  let args = {
    ...props,
    display,
    price,
    imageUrl,
    imageHash,
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
    wrapTitle,
    buttonText,
    authorized,
    fullBleed,
    progress,
    style,
    aspectRatio: !aspectRatio || aspectRatio === "mixed" ? imageAspectRatio : aspectRatio,
    className: [
      disabled ?
        S("media-card--disabled") :
        !authorized ?
          S("media-card--unauthorized") : "",
      centered ? S("media-card--centered") : "",
      ...(variants || []).map(variant => S(`styled-card--${variant}`)),
      className
    ]
      .filter(c => c)
      .join(" ")
  };

  if(args.aspectRatio?.toLowerCase() !== "landscape" || args.progress > 0.95) {
    delete args.progress;
  }

  let card;
  switch(format) {
    case "horizontal":
      card = <MediaCardHorizontal {...args} />;
      break;

    case "button_vertical":
      card = <ButtonCard orientation="vertical" {...args} />;
      break;

    case "button_horizontal":
      card = <ButtonCard orientation={rootStore.pageWidth > 600 ? "horizontal" : "vertical"} {...args} />;
      break;

    case "banner":
      card = <MediaCardBanner sectionItem={sectionItem} {...args} />;
      break;

    default:
      card = (
        <MediaHoverCard
          {...args}
          width={imageContainerRef?.current?.getBoundingClientRect()?.width}
          ShowDetailsModal={() => setShowDetailsModal(true)}
        >
          <MediaCardVertical {...args}/>
        </MediaHoverCard>
      );
  }

  return (
    <>
      {card}
      {
        !showDetailsModal ? null :
          <MediaDetailsModal
            {...args}
            onClick={undefined}
            Close={() => setShowDetailsModal(false)}
          />
      }
    </>
  );
});

export default MediaCard;
