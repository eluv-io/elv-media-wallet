import FAQStyles from "Assets/stylesheets/media_properties/faq.module.scss";

import React from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {mediaPropertyStore} from "Stores";
import {PageContainer, RichText} from "Components/properties/Common";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import {Accordion} from "@mantine/core";

const S = (...classes) => classes.map(c => FAQStyles[c] || "").join(" ");

const FAQPage = observer(() => {
  const match = useRouteMatch();
  const mediaProperty = mediaPropertyStore.MediaProperty({...match.params});

  if(!mediaProperty) { return null; }

  const faq = mediaProperty.metadata?.faq || {};

  if((faq.questions || []).length === 0) {
    return <Redirect to={MediaPropertyBasePath(match.params)} />;
  }

  return (
    <PageContainer className={S("page", "faq-page")}>
      <div className={S("container")}>
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
            variant="separated"
            className={S("questions")}
            classNames={{
              item: S("question"),
              label: S("question__label")
            }}
          >
            {
              faq.questions.map(({question, answer}, index) =>
                <Accordion.Item key={`question-${index}`} value={`question-${index}`}>
                  <Accordion.Control>
                    { question }
                  </Accordion.Control>
                  <Accordion.Panel>
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
