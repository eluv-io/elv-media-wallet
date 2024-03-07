import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {mediaPropertyStore} from "Stores";
import SectionStyles from "Assets/stylesheets/media_properties/property-section.module.scss";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {ScaledText} from "Components/properties/Common";
import {MediaItemScheduleInfo} from "../../utils/MediaPropertyUtils";

const S = (...classes) => classes.map(c => SectionStyles[c] || "").join(" ");

const SectionCard = observer(({sectionItem, aspectRatio, textDisplay="title"}) => {
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
  const imageUrl = SetImageUrlDimensions({url: sectionItem.display[`thumbnail_image_${imageAspectRatio}`]?.url, width: 600});

  const scheduleInfo = MediaItemScheduleInfo(sectionItem.mediaItem);

  return (
    <div className={S("section-card", `section-card--${aspectRatio || imageAspectRatio}`)}>
      <div className={S("section-card__image-container")}>
        { !imageUrl ? null : <img src={imageUrl} alt={sectionItem.display.title} className={S("section-card__image")} /> }
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
                { sectionItem.display.headers?.map(header =>
                  <div className={S("section-card__header")}>
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
    </div>
  );
});

const MediaPropertySection = observer(({sectionId}) => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const [sectionContent, setSectionContent] = useState([]);

  useEffect(() => {
    mediaPropertyStore.MediaPropertySectionContent({
      mediaPropertyId: mediaProperty.mediaPropertyId,
      sectionId
    })
      .then(content => setSectionContent(content));
  }, [match.params, sectionId]);

  const section = mediaProperty.metadata.sections[sectionId];

  if(!section) {
    return null;
  }

  return (
    <div className={S("section")}>
      {
        !section.display.title ? null :
          <h2 className={S("section__title")}>{section.display.title}</h2>
      }
      <div className={S("section__content", "section__content--grid", `section__content--${section.display.aspect_ratio?.toLowerCase()}`)}>
        {
          sectionContent.map(sectionItem =>
            <SectionCard
              key={`section-item-${sectionItem.id}`}
              sectionItem={sectionItem}
              textDisplay={section.display.content_display_text}
              aspectRatio={section.display.aspect_ratio}
            />
          )
        }
      </div>
    </div>
  );
});

export default MediaPropertySection;
