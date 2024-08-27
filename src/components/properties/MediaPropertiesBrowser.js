import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "Stores";
import UrlJoin from "url-join";
import {PageLoader} from "Components/common/Loaders";
import {Linkish} from "Components/common/UIComponents";
import {LoaderImage} from "Components/properties/Common";
import {SetImageUrlDimensions} from "../../utils/Utils";
import Video from "Components/properties/Video";
import {EluvioPlayerParameters} from "@eluvio/elv-player-js/lib/index";

const PropertyVideo = observer(({video}) => {
  const [loaded, setLoaded] = useState(false);

  if(!rootStore.loaded || !video || Object.keys(video).length === 0) {
    return null;
  }

  return (
    <Video
      readyCallback={() => setLoaded(true)}
      link={video}
      hideControls
      mute
      playerOptions={{
        loop: EluvioPlayerParameters.loop.ON,
        showLoader: EluvioPlayerParameters.showLoader.OFF,
        capLevelToPlayerSize: EluvioPlayerParameters.capLevelToPlayerSize.ON
      }}
      autoAspectRatio={false}
      className={`media-property-card__video ${!loaded ? "media-property-card__video--loading" : ""}`}
    />
  );
});

export const MediaPropertiesBrowser = observer(() => {
  const [mediaProperties, setMediaProperties] = useState(undefined);

  useEffect(() => {
    mediaPropertyStore.LoadMediaProperties()
      .then(setMediaProperties);
  }, []);

  if(!mediaProperties) {
    return <PageLoader />;
  }

  const filteredProperties = mediaProperties
    .filter(mediaProperty =>
      !rootStore.discoverFilter ||
      mediaProperty.title?.toLowerCase()?.includes(rootStore.discoverFilter.toLowerCase()) ||
      mediaProperty.name?.toLowerCase()?.includes(rootStore.discoverFilter.toLowerCase())
    );

  return (
    <div className="page-block page-block--properties-browser">
      <div className="page-block__content page-block__content--unrestricted">
        <div className="media-property-browser" key={`properties-${filteredProperties.length}`}>
          {
            filteredProperties
              .map(mediaProperty => {
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

                return (
                  <Linkish
                    key={`property-link-${mediaProperty.propertyId}`}
                    className="media-property-card"
                    {...linkParams}
                  >
                    <LoaderImage
                      className="media-property-card__image"
                      src={SetImageUrlDimensions({url: mediaProperty.image?.url, width: 600})}
                      showWithoutSource
                      loaderAspectRatio={2/3}
                      alt={mediaProperty.title || mediaProperty.name || ""}
                    />
                    {
                      !mediaProperty.video ? null :
                        <PropertyVideo video={mediaProperty.video} />
                    }
                  </Linkish>
                );
              })
            }
          </div>
      </div>
    </div>
  );
});

export default MediaPropertiesBrowser;
