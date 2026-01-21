import FAQStyles from "Assets/stylesheets/media_properties/faq.module.scss";

import React, {useState} from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import {LoaderImage, PageContainer, RichText} from "Components/properties/Common";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import {Accordion} from "@mantine/core";
import {SetImageUrlDimensions} from "../../utils/Utils";
import ImageIcon from "Components/common/ImageIcon";
import Video from "Components/properties/Video";
import {Linkish} from "Components/common/UIComponents";

import PlusIcon from "Assets/icons/plus";
import MinusIcon from "Assets/icons/minus";

const S = (...classes) => classes.map(c => FAQStyles[c] || "").join(" ");

const QuestionImages = observer(({images=[], center=false}) => {
  if(images.length === 0) {
    return null;
  }

  return (
    <div className={S("images", center ? "images--centered" : "")}>
      {
        images.map(({image, image_mobile, image_alt, link}, imageIndex) =>
          <Linkish href={link} className={S("image-container")} key={`image-${imageIndex}`}>
            <LoaderImage
              loaderAspectRatio={2}
              src={
                rootStore.pageWidth < 800 && image_mobile?.url ?
                  image_mobile.url :
                  image?.url
              }
              alt={image_alt}
              width={rootStore.fullscreenImageWidth}
              className={S("image")}
            />
          </Linkish>
        )
      }
    </div>
  );
});

const FAQPage = observer(() => {
  const [openedItem, setOpenedItem] = useState(undefined);
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty({...match.params});

  if(!mediaProperty) { return null; }

  let faq = mediaProperty.metadata?.faq || {};
  if(match.params.slug) {
    faq = mediaProperty.metadata.faq.additional
      ?.find(other => other.slug === match.params.slug) || faq;
  }

  if((faq.questions || []).length === 0) {
    return <Redirect to={MediaPropertyBasePath(match.params)} />;
  }

  const backgroundImageUrl = SetImageUrlDimensions({
    url: rootStore.pageWidth <= 800 ? faq.header_image_mobile?.url : faq.header_image?.url,
    width: rootStore.fullscreenImageWidth
  });

  return (
    <PageContainer className={S("page", "faq-page")}>
      {
        !backgroundImageUrl ? null :
          <LoaderImage
            src={backgroundImageUrl}
            alt={faq.header_image_alt}
            loaderAspectRatio={3}
            className={S("header-image")}
          />
      }
      <div
        style={
          !faq.header_text_color ? null :
            { "--header-text-color": faq.header_text_color }
        }
        className={S("container")}
      >
        {
          !faq.title ? null :
            <h1 className={S("title")}>{faq.title}</h1>
        }
        {
          !faq.title ? null :
            <p className={S("description")}>{faq.description}</p>
        }

        {
          <Accordion
            variant="unstyled"
            value={openedItem}
            onChange={setOpenedItem}
            className={S("questions")}
            classNames={{
              item: S("question"),
              label: S("question__label")
            }}
          >
            {
              faq.questions.map(({question, answer, video, images}, index) => {
                images = images || [];
                const beforeImages = images.filter(i => i.position === "before");
                const afterImages = images.filter(i => i.position === "after");
                const insideImages = images.filter(i => i.position === "inside" || !i.position);

                return (
                  <>
                    <QuestionImages center images={beforeImages} />
                    <Accordion.Item key={`question-${index}`} value={index.toString()}>
                      <Accordion.Control
                        chevron={
                          <ImageIcon
                            icon={openedItem === index.toString() ? MinusIcon : PlusIcon}
                            className={S("chevron")}
                          />
                        }
                      >
                        <div className={S("question__label")}>{question}</div>
                      </Accordion.Control>
                      <Accordion.Panel>
                        {
                          !video || openedItem !== index.toString() ? null :
                            <Video
                              link={video}
                              playerOptions={{
                                autoplay: false
                              }}
                              className={S("video")}
                            />
                        }
                        {
                          openedItem !== index.toString() ? null :
                            <QuestionImages images={insideImages} />
                        }
                        <RichText richText={answer} className={S("answer")}/>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <QuestionImages center images={afterImages} />
                  </>
                );
              })
            }
          </Accordion>
        }
      </div>
    </PageContainer>
  );
});

export default FAQPage;
