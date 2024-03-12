import SectionCardStyles from "Assets/stylesheets/media_properties/property-section-card.module";

import React, {useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {MediaItemImageUrl, MediaItemScheduleInfo} from "../../utils/MediaPropertyUtils";
import {LoaderImage, ScaledText} from "Components/properties/Common";
import {NavLink} from "react-router-dom";
import UrlJoin from "url-join";

const S = (...classes) => classes.map(c => SectionCardStyles[c] || "").join(" ");

const SectionCardLink = sectionItem => {
  switch(sectionItem.type) {
    case "media":
      if(sectionItem.media_type === "list") {
        return UrlJoin("/", location.pathname, "s", sectionItem.media_id);
      } else if(sectionItem.media_type === "media") {
        return UrlJoin("/", location.pathname, "m", sectionItem.media_id);
      }
      break;
  }

  return location.pathname;
};

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

  const {imageUrl, imageAspectRatio} = MediaItemImageUrl({mediaItem: sectionItem.mediaItem || sectionItem, display: sectionItem.display, aspectRatio});
  const scheduleInfo = MediaItemScheduleInfo(sectionItem.mediaItem);

  return (
    <NavLink
      aria-label={sectionItem.display.title}
      to={SectionCardLink(sectionItem) || ""}
      className={S("section-card", `section-card--${aspectRatio || imageAspectRatio}`)}
    >
      <div ref={imageContainerRef} className={S("section-card__image-container")}>
        { !imageUrl ? null :
          <LoaderImage
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
