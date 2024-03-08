import SectionStyles from "Assets/stylesheets/media_properties/property-section.module";

import React, {useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {MediaItemScheduleInfo} from "../../utils/MediaPropertyUtils";
import {LazyImage, ScaledText} from "Components/properties/Common";
import {NavLink} from "react-router-dom";
import UrlJoin from "url-join";

const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const SectionCard = observer(({
  sectionItem,
  aspectRatio,
  textDisplay="title",
  setImageDimensions
}) => {
  const imageContainerRef = useRef();

  useEffect(() => {
    if(!setImageDimensions || !imageContainerRef?.current) { return; }

    setImageDimensions(imageContainerRef.current.getBoundingClientRect());
  }, [imageContainerRef, mediaPropertyStore.rootStore.pageWidth]);

  if(!sectionItem.display) {
    mediaPropertyStore.Log("Invalid section item", true);
    mediaPropertyStore.Log(sectionItem);
    return null;
  }

  aspectRatio = aspectRatio?.toLowerCase() || "";

  const aspectRatioPreference =
    (sectionItem.mediaItem?.type === "media" && sectionItem.mediaItem.media_type === "Video") ?
      ["landscape", "square", "portrait"] :
      ["square", "landscape", "portrait"];

  const imageAspectRatio =
    [aspectRatio, ...aspectRatioPreference].find(ratio => sectionItem.display[`thumbnail_image_${ratio}`]);
  const imageUrl = sectionItem.display[`thumbnail_image_${imageAspectRatio}`]?.url;

  const scheduleInfo = MediaItemScheduleInfo(sectionItem.mediaItem);

  return (
    <NavLink aria-label={sectionItem.display.title} to={UrlJoin(location.pathname, "other-page")} className={S("section-card", `section-card--${aspectRatio || imageAspectRatio}`)}>
      <div ref={imageContainerRef} className={S("section-card__image-container")}>
        { !imageUrl ? null :
          <LazyImage
            src={imageUrl}
            alt={sectionItem.display.title}
            width={600}
            className={S("section-card__image")}
          />
        }
        {
          // Schedule indicator
          !scheduleInfo.isLiveContent || scheduleInfo.ended ? null :
            scheduleInfo.currentlyLive ?
              <div className={S("section-card__indicator", "section-card__live-indicator")}>
                { mediaPropertyStore.rootStore.l10n.media_properties.media.live }
              </div> :
              <div className={S("section-card__indicator", "section-card__upcoming-indicator")}>
                <div>{ mediaPropertyStore.rootStore.l10n.media_properties.media.upcoming}</div>
                <div>{ scheduleInfo.displayStartDate } at { scheduleInfo.displayStartTime }</div>
              </div>
        }
      </div>
      {
        // Text
        textDisplay === "none" ? null :
          <div className={S("section-card__text")}>
            { textDisplay !== "all" || (sectionItem.display.headers || []).length === 0 ? null :
              <div className={S("section-card__headers")}>
                { sectionItem.display.headers?.map((header, index) =>
                  <div className={S("section-card__header")} key={`header-${index}`}>
                    <div className={S("section-card__headers")}>
                      {header}
                    </div>
                  </div>
                )}
              </div>
            }
            {
              !sectionItem.display.title ? null :
                <ScaledText Tag="h3" maxPx={20} minPx={12} className={S("section-card__title")}>
                  { sectionItem.display.title }
                </ScaledText>
            }
            {
              !["all", "titles"].includes(textDisplay) || !sectionItem.display.subtitle ? null :
                <ScaledText maxPx={18} minPx={12} className={S("section-card__subtitle")}>
                  { sectionItem.display.subtitle }
                </ScaledText>
            }
          </div>
      }
    </NavLink>
  );
});

export default SectionCard;
