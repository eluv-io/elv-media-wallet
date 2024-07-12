import PageStyles from "Assets/stylesheets/media_properties/property-page.module.scss";

import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "Stores";
import {Redirect, useRouteMatch} from "react-router-dom";
import {
  Button,
  PageBackground,
  PageContainer,
  PageHeader
} from "Components/properties/Common";
import {MediaPropertySection} from "Components/properties/MediaPropertySection";
import Video from "Components/properties/Video";
import Modal from "Components/common/Modal";
import {CreateMediaPropertyPurchaseParams, MediaPropertyLink} from "../../utils/MediaPropertyUtils";

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

const PageAction = observer(({action}) => {
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
      params.set("p", CreateMediaPropertyPurchaseParams({actionId: action.id, unlessPermissions: action.permissions}));
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

const Actions = observer(() => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  let actions = (page.actions || [])
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
          <PageAction key={action.id} action={action} />
        )
      }
    </div>
  );
});

export const MediaPropertyPageContent = observer(({isMediaPage, className=""}) => {
  const match = useRouteMatch();
  const page = mediaPropertyStore.MediaPropertyPage(match.params);

  if(!page) { return null; }

  return (
    <div className={[S("page__sections"), className].join(" ")}>
      {
        page.layout.sections.map(sectionId =>
          <MediaPropertySection
            key={`section-${sectionId}`}
            sectionId={sectionId}
            isMediaPage={isMediaPage}
          />
        )
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
      <PageBackground display={page.layout} />
      <PageHeader
        display={page.layout}
        maxHeaderSize={60}
      >
        <Actions />
      </PageHeader>
      <MediaPropertyPageContent />
    </PageContainer>
  );
});

export default MediaPropertyPage;
