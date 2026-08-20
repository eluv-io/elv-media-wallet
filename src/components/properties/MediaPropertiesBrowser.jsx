import DiscoverStyles from "@/assets/stylesheets/media_properties/discover.module.scss";

import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "@/stores";
import UrlJoin from "url-join";
import {PageLoader} from "@/components/common/Loaders";
import {Linkish} from "@/components/common/UIComponents";
import {Carousel, LoaderImage} from "@/components/properties/Common";
import Video from "@/components/properties/Video";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";
import {Redirect} from "react-router-dom";
import Header from "../header/Header.jsx";
import {useIsVisible} from "@/components/common/Hooks.jsx";

const S = (...classes) => classes.map(c => DiscoverStyles[c] || "").join(" ");

// TODO: Port to CS, fade in effect on load, splash image
const LinkParams = ({mediaProperties, mediaProperty}) => {
  let linkParams = {};
  if(mediaProperty.main_page_url){
    linkParams = {
      href: mediaProperty.main_page_url,
      target: "_blank",
      rel: "noopener"
    };
  } else if(mediaProperty.parent_property) {
    const parentSlug = mediaProperties.find(otherProperty => otherProperty.propertyId === mediaProperty.parent_property)?.slug || mediaProperty.parent_property;
    linkParams.to = UrlJoin("/", parentSlug, "/p", mediaProperty.slug || mediaProperty.propertyId);
  } else {
    linkParams.to = UrlJoin("/", mediaProperty.slug || mediaProperty.propertyId);
  }

  return linkParams;
};

const CardVideo = observer(({video, videoInfo, className=""}) => {
  const [loaded, setLoaded] = useState(false);

  if(!rootStore.loaded || !video || Object.keys(video).length === 0) {
    return null;
  }

  return (
    <Video
      readyCallback={() => setLoaded(true)}
      link={video}
      linkInfo={videoInfo}
      hideControls
      mute
      playerOptions={{
        backgroundColor: "transparent",
        loop: EluvioPlayerParameters.loop.ON,
        showLoader: EluvioPlayerParameters.showLoader.OFF,
        capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize.ON
      }}
      autoAspectRatio={false}
      className={[S("video", loaded ? "video--loaded" : "video--loading"), className].join(" ")}
    />
  );
});

const DiscoverCard = observer(({mediaProperty, linkParams, featured, active}) => {
  const [hovering, setHovering] = useState(false);
  const ref = useRef(undefined);
  const visible = useIsVisible(ref?.current);

  const showVideo = visible && (hovering || (rootStore.mobile && active));
  
  return (
    <Linkish
      {...linkParams}
      ref={ref}
      onMouseEnter={() => setHovering(true)}
      onFocus={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onBlur={() => setHovering(false)}
      className={
        S(
          "discover-card",
          featured ? "discover-card--featured" : "discover-card--standard",
          rootStore.mobile ? "discover-card--active" : ""
        )
      }
    >
      <div className={S("discover-card__image-container")}>
        <LoaderImage
          alt={mediaProperty.main_page_title || mediaProperty.title}
          src={(featured && mediaProperty.featured_image?.url) || mediaProperty.image?.url}
          hash={(featured && mediaProperty.featured_image_hash) || mediaProperty.image_hash}
          width={1000}
          className={S("discover-card__image")}
        />
        {
          !mediaProperty.main_page_card_video ? null :
            <div className={S("discover-card__video-container", showVideo ? "discover-card__video-container--active" : "")}>
              {
                !showVideo ? null :
                  <CardVideo
                    video={mediaProperty.main_page_card_video}
                    videoInfo={mediaProperty.main_page_card_video_info}
                    className={S("discover-card__video")}
                  />
              }
            </div>
        }
      </div>
      {
        !featured ? null :
          <div className={S("discover-card__content")}>
            {
              !mediaProperty.main_page_logo ? null :
                <div className={S("discover-card__logo-container")}>
                  <LoaderImage
                    width={800}
                    alt={mediaProperty.main_page_title || mediaProperty.title}
                    src={mediaProperty.main_page_logo?.url}
                    hideLoader
                    style={{
                      width: `${mediaProperty.main_page_logo_scale || 100}%`
                    }}
                    className={S("discover-card__logo")}
                  />
                </div>
            }
            <div className={S("discover-card__description")}>
              {mediaProperty.main_page_description || ""}
            </div>
            <button onClick={() => {}} className={S("discover-card__button-container")}>
              <div className={S("discover-card__button")}>
                Launch
              </div>
            </button>
          </div>
      }
    </Linkish>
  );
});

export const MediaPropertiesBrowser = observer(() => {
  const [mediaProperties, setMediaProperties] = useState(undefined);
  const [featuredPropertyLists, setFeaturedPropertyLists] = useState(undefined);

  useEffect(() => {
    mediaPropertyStore.LoadMediaProperties()
      .then(({properties, propertyLists}) => {
        setMediaProperties(properties);
        setFeaturedPropertyLists(propertyLists);
      });

    rootStore.RemoveSessionStorage("pid");

    rootStore.SetShowSplash(true);
  }, []);

  if(rootStore.isCustomDomain) {
    return <Redirect to={rootStore.customDomainPropertySlug || rootStore.customDomainPropertyId} />;
  }

  if(!mediaProperties || !featuredPropertyLists) {
    return <PageLoader force />;
  }

  let filteredProperties = mediaProperties
    .filter(mediaProperty =>
      !rootStore.discoverFilter ||
      mediaProperty.propertyId !== rootStore.discoverFilter
    );

  const filteredPropertyLists = featuredPropertyLists
    .map(({properties, ...rest}) => ({
      ...rest,
      properties: (properties || [])
        .map(propertySlugOrId =>
          filteredProperties.find(property => property.propertyId === propertySlugOrId) ||
          filteredProperties.find(property => property.slug === propertySlugOrId)
        )
        .filter(p => p)
    }))
    .filter(list => list.properties.length > 0);

  return (
    <>
      <Header />
      <div className={S("discover-page")}>
        {
          filteredPropertyLists.map(({title, featured, properties}, index) =>
            <div key={`list-${index}`} className={S("row", featured ? "featured" : "")}>
              {
                !title ? null :
                  <div className={S("row__title")}>{title}</div>
              }
              <Carousel
                content={properties}
                className={S("carousel", "featured-carousel")}
                paginate={featured}
                swiperOptions={{
                  spaceBetween: 20,
                }}
                RenderSlide={({item, index, activeIndex}) =>
                  <DiscoverCard
                    featured={featured}
                    active={index === activeIndex}
                    key={`property-${item.propertyId}`}
                    mediaProperty={item}
                    linkParams={LinkParams({mediaProperties, mediaProperty: item})}
                  />
                }
              />
            </div>
          )
        }
      </div>
    </>
  );
});

export default MediaPropertiesBrowser;
