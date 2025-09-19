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

import PlusIcon from "Assets/icons/plus";
import MinusIcon from "Assets/icons/minus";
import Video from "Components/properties/Video";

const S = (...classes) => classes.map(c => FAQStyles[c] || "").join(" ");

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
              faq.questions.map(({question, answer, video}, index) =>
                <Accordion.Item key={`question-${index}`} value={index.toString()}>
                  <Accordion.Control
                    chevron={<ImageIcon icon={openedItem === index.toString() ? MinusIcon : PlusIcon} className={S("chevron")} />}
                  >
                    <div className={S("question__label")}>{ question }</div>
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
                    <RichText richText={answer} className={S("answer")} />
                  </Accordion.Panel>
                </Accordion.Item>
              )
            }
          </Accordion>
        }
      </div>
    </PageContainer>
  );
});

export default FAQPage;
