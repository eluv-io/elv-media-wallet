import FooterStyles from "Assets/stylesheets/media_properties/property-footer.module.scss";

import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "Stores";
import {Linkish} from "Components/common/UIComponents";
import {LoaderImage, Modal, RichText} from "Components/properties/Common";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import UrlJoin from "url-join";

const S = (...classes) => classes.map(c => FooterStyles[c] || "").join(" ");

const eluvioFooterItems = [
  { type: "link", text: "Get Support", url: "https://eluviolive.zendesk.com/hc/en-us/requests/new" },
  { type: "link", text: "Eluvio Terms", url: "https://eluv.io/terms" },
  { type: "link", text: "Eluvio Privacy Policy", url: "https://eluv.io/privacy" },
];

const FooterContentModal = observer(({footerItem, Close}) => {
  switch(footerItem.type) {
    case "image":
      return (
        <Modal
          opened
          centered
          size="auto"
          noBackground
          onClose={Close}
        >
          <LoaderImage
            loaderHeight={300}
            loaderWidth={300}
            src={footerItem.image?.url}
            alt={footerItem.image_alt}
            className={S("footer__modal__image")}
          />
        </Modal>
      );
    case "rich_text":
      return (
        <Modal
          opened
          centered
          size="xl"
          padding="xl"
          onClose={Close}
          contentClassName={S("footer__modal--rich-text")}
        >
          <RichText richText={footerItem.content_rich_text} className={S("footer__rich-text")} />
        </Modal>
      );

    case "html":
      return (
        <Modal
          opened
          centered
          noBackground
          size="xl"
          padding="xl"
          onClose={Close}
        >
          <iframe src={footerItem.content_html?.url} className={S("footer__html")} />
        </Modal>
      );

    default:
      Close();
  }

});

const MediaPropertyFooter = observer(({withCustomBackgroundColor}) => {
  const [modalItem, setModalItem] = useState(undefined);
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(!mediaProperty) { return null; }

  let {items, rich_text} = mediaProperty.metadata.footer || {};

  items = [...(items || []), ...eluvioFooterItems];

  return (
    <>
      <footer className={S("footer", withCustomBackgroundColor ? "footer--custom-background" : "")}>
        {
          !items || items.length === 0 ? null :
            <div className={S("footer__items")}>
              {
                items.map((footerItem, index) =>
                  <Linkish
                    key={`footer-item-${index}`}
                    href={footerItem.type === "link" ? footerItem.url : undefined}
                    rel="noopener"
                    target="_blank"
                    to={footerItem.type === "faq" ? UrlJoin(MediaPropertyBasePath(rootStore.routeParams), "faq") : undefined}
                    onClick={footerItem.type === "link" ? undefined : () => setModalItem(footerItem)}
                    className={S("footer__item")}
                  >
                    {
                      footerItem.link_image ?
                        <img src={footerItem.link_image?.url} alt={footerItem.image_alt || footerItem.text} className={S("footer__item-image")} /> :
                        footerItem.text
                    }
                  </Linkish>
                )
              }
            </div>
        }
        {
          (!items || items.length === 0) || !rich_text ? null :
            <div className={S("footer__separator")} />
        }
        {
          !rich_text ? null :
            <RichText richText={rich_text} className={S("footer_text")} />
        }
      </footer>
      {
        !modalItem ? null :
          <FooterContentModal footerItem={modalItem} Close={() => setModalItem(undefined)} />
      }
    </>
  );
});

export default MediaPropertyFooter;
