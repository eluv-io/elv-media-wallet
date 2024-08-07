import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";

import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";
import {
  AttributeFilter,
  Button,
  PageBackground,
  PageContainer,
  PageHeader
} from "Components/properties/Common";
import {MediaPropertySection} from "Components/properties/MediaPropertySection";
import Video from "Components/properties/Video";
import Modal from "Components/common/Modal";
import {CreateMediaPropertyPurchaseParams, MediaPropertyLink} from "../../utils/MediaPropertyUtils";
import ImageIcon from "Components/common/ImageIcon";

import LeftArrow from "Assets/icons/left-arrow";
import RightArrow from "Assets/icons/right-arrow";

const S = (...classes) => classes.map(c => PageStyles[c] || "").join(" ");

const ActionVisible = ({permissions, behavior, visibility}) => {
  if(behavior === "sign_in" && rootStore.loggedIn) {
    return false;
  }

  const hasPermissions = !!permissions?.find(permissionItemId =>
    mediaPropertyStore.permissionItems[permissionItemId].authorized
  );

  switch(visibility) {
    case "always":
      return true;
    case "authorized":
      return hasPermissions;
    case "authenticated":
      return rootStore.loggedIn;
    case "unauthorized":
      return rootStore.loggedIn && !hasPermissions;
    case "unauthenticated":
      return !rootStore.loggedIn;
    case "unauthenticated_or_unauthorized":
      return !rootStore.loggedIn || !hasPermissions;
  }
};

const Action = observer(({sectionId, sectionItemId, action}) => {
  const match = useRouteMatch();
  let buttonParams = {};

  const [showVideoModal, setShowVideoModal] = useState(false);

  switch(action.behavior) {
    case "sign_in":
      buttonParams.onClick = () => rootStore.ShowLogin();
      break;

    case "video":
      buttonParams.onClick = () => setShowVideoModal(true);
      break;

    case "show_purchase":
      const params = new URLSearchParams(location.search);
      params.set("p", CreateMediaPropertyPurchaseParams({
        id: action.id,
        sectionSlugOrId: sectionId,
        sectionItemId,
        actionId: action.id
      }));
      buttonParams.to = location.pathname + "?" + params.toString();
      break;

    case "media_link":
      const mediaItem = mediaPropertyStore.media[action.media_id];
      buttonParams.to = MediaPropertyLink({match, mediaItem}).linkPath;
      break;

    case "link":
      buttonParams = {
        href: action.url,
        rel: "noopener",
        target: "_blank"
      };
      break;
  }

  return (
    <>
      {
        !showVideoModal ? null :
          <Modal className={[S("action__modal"), "modal--no-scroll"].join(" ")} Toggle={() => setShowVideoModal(false)}>
            <Video link={action.video} />
          </Modal>
      }
      <Button
        {...buttonParams}
        icon={action.button.icon?.url}
        className={S("action")}
        styles={action.button}
      >
        { action.button.text }
      </Button>
    </>
  );
});

const Actions = observer(({sectionId, sectionItemId, actions}) => {
  actions = (actions || [])
    .filter(action => ActionVisible({
      visibility: action.visibility,
      behavior: action.behavior,
      permissions: action.permissions
    }));


  if(actions.length === 0) { return null; }

  return (
    <div className={S("actions")}>
      {
        actions.map(action =>
          <Action
            key={action.id}
            action={action}
            sectionId={sectionId}
            sectionItemId={sectionItemId}
          />
        )
      }
    </div>
  );
});

const MediaPropertyHeroSection = observer(({section}) => {
  const [contentRefs, setContentRefs] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = section.hero_items[activeIndex];
  const minHeight = Math.max(...(Object.values(contentRefs).map(element => element?.getBoundingClientRect()?.height || 0) || []));

  return (
    <div style={!section.allow_overlap || !minHeight || !Number.isFinite(minHeight) ? {} : {minHeight: minHeight + 100}} className={S("hero-section")}>
      <PageBackground
        key={`background-${activeIndex}`}
        display={activeItem?.display}
        className={S("hero-section__background")}
        imageClassName={S("hero-section__background-image")}
        videoClassName={S("hero-section__background-video")}
      />
      {
        section.hero_items.map((heroItem, index) =>
          <div
            ref={element => {
              if(!element || contentRefs[heroItem.id] === element) { return; }

              setContentRefs({...contentRefs, [heroItem.id]: element});
            }}
            style={activeIndex === index ? {} : {position: "absolute", opacity: 0, userSelect: "none"}}
            key={`content-${index}`}
            className={S("hero-section__content", activeIndex === index ? "hero-section__content--active" : "")}
          >
            <button
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
              className={S("hero-section__arrow", "hero-section__arrow--previous")}
            >
              <ImageIcon label="Previous Page" icon={LeftArrow} />
            </button>
            <PageHeader
              display={heroItem.display}
              maxHeaderSize={60}
              className={S("page__header")}
            >
              <Actions
                actions={heroItem?.actions}
                sectionId={section.id}
                sectionItemId={heroItem.id}
              />
            </PageHeader>
            <button
              disabled={activeIndex === section.hero_items.length - 1}
              onClick={() => setActiveIndex(Math.min(section.hero_items.length - 1, activeIndex + 1))}
              className={S("hero-section__arrow", "hero-section__arrow--next")}
            >
              <ImageIcon label="Next Page" icon={RightArrow} />
            </button>
          </div>
        )
      }
    </div>
  );
});

const MediaPropertySectionContainer = observer(({section, isMediaPage}) => {
  const match = useRouteMatch();
  const [filter, setFilter] = useState("");

  return (
    <>
      {
        (section.filter_tags || []).length === 0 ? null :
          <AttributeFilter
            className={S("page__container-section-filter")}
            attributeKey="tag"
            filterOptions={
              [
                "",
                ...section.filter_tags
              ].map(value => ({value}))
            }
            variant="text"
            options={{attributes: {tag: filter}}}
            setOption={({value}) => setFilter(value.tag)}
          />
      }

      {
        section.sections.map(sectionId => {
          const subsection = mediaPropertyStore.MediaPropertySection({...match.params, sectionSlugOrId: sectionId});

          if(filter && !subsection?.tags?.includes(filter)) {
            return null;
          }

          return (
            <MediaPropertySection
              key={`section-${sectionId}-${filter}`}
              sectionId={sectionId}
              isMediaPage={isMediaPage}
              className={S("page__section")}
            />
          );
        })
      }
    </>
  );
});

export const MediaPropertyPageContent = observer(({isMediaPage, className=""}) => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(!page) { return null; }

  return (
    <div className={[S("page__sections"), className].join(" ")}>
      {
        page.layout.sections.map((sectionId) => {
          const section = mediaPropertyStore.MediaPropertySection({
            ...match.params,
            sectionSlugOrId: sectionId
          });

          if(section.type === "container") {
            return (
              <MediaPropertySectionContainer
                key={`section-${sectionId}`}
                section={section}
                isMediaPage={isMediaPage}
              />
            );
          } else if(section.type === "hero") {
            return (
              <MediaPropertyHeroSection
                key={`section-${sectionId}`}
                section={section}
              />
            );
          }

          return (
            <MediaPropertySection
              key={`section-${sectionId}`}
              sectionId={sectionId}
              isMediaPage={isMediaPage}
              className={S("page__section")}
            />
          );
        })
      }
    </div>
  );
});

const MediaPropertyPage = observer(() => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(!page) {
    return <Redirect to="/" />;
  }

  return (
    <PageContainer className={S("page", "property-page")}>
      <MediaPropertyPageContent />
    </PageContainer>
  );
});

export default MediaPropertyPage;
