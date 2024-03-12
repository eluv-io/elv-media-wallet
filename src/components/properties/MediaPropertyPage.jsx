import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";

import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {Description, LoaderImage, PageContainer, ScaledText} from "Components/properties/Common";
import {MediaPropertySection} from "Components/properties/MediaPropertySection";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

const PageHeader = observer(({page}) => {
  const layout = page.layout;

  return (
    <div className={S("page-header")}>
      <div className={S("page-header__content", `page-header__content--${layout.position?.toLowerCase() || "left"}`)}>
        {
          !layout.logo?.url ? null :
            <LoaderImage
              lazy={false}
              loaderHeight={200}
              loaderWidth={400}
              alt={layout.logo_alt || page.title || "Logo"}
              src={SetImageUrlDimensions({url: layout.logo.url, width: 1000})}
              className={PageStyles["page-header__logo"]}
            />
        }
        {
          !layout.title ? null :
            <ScaledText Tag="h1" maxPx={70} minPx={32} maxPxMobile={32} minPxMobile={20} className={S("page-header__title")}>
              { layout.title }
            </ScaledText>
        }
        {
          !layout.description_rich_text && !layout.description ? null :
            <Description
              description={layout.description}
              descriptionRichText={layout.description_rich_text}
              className={S("page-header__description")}
            />
        }
      </div>
    </div>
  );
});

const PageBackground = observer(({page}) => {
  const pageWidth = mediaPropertyStore.rootStore.pageWidth;
  const layout = page.layout;
  const backgroundImage = (pageWidth <= 800 && layout.background_image_mobile?.url) || layout.background_image?.url;
  // Limit size of background image based on screen size
  const [backgroundImageScale] = useState(mediaPropertyStore.rootStore.fullscreenImageWidth);

  useEffect(() => {
    const image = new Image();
    image.src = backgroundImage;
  }, []);

  return (
    !backgroundImage ? null :
      <>
        <LoaderImage
          lazy={false}
          alt="Background Image"
          loaderWidth="100%"
          loaderHeight="100vh"
          src={SetImageUrlDimensions({url: backgroundImage, width: backgroundImageScale})}
          className={S("page-background__image")}
        />
        <div className={S("page-background__gradient")} />
      </>
  );
});

const MediaPropertyPage = observer(() => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty(match.params);
  const pageId = mediaProperty.metadata.slug_map.pages[(match.params.pageSlugOrId || "main")]?.page_id || match.params.pageSlugOrId;
  const page = mediaProperty.metadata.pages[pageId];

  if(!page) {
    return <Redirect to="/" />;
  }

  return (
    <PageContainer>
      <PageBackground page={page} />
      <PageHeader page={page} />
      <div className={S("page-sections")}>
        {
          page.layout.sections.map(sectionId =>
            <MediaPropertySection
              key={`section-${sectionId}`}
              sectionId={sectionId}
            />
          )
        }
      </div>
    </PageContainer>
  );
});

export default MediaPropertyPage;
