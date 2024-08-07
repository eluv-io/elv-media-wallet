import FooterStyles from "Assets/stylesheets/media_properties/property-footer.module.scss";

import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "Stores";
import {Linkish} from "Components/common/UIComponents";
import {LoaderImage, Modal, RichText} from "Components/properties/Common";

const S = (...classes) => classes.map(c => FooterStyles[c] || "").join(" ");

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

const MediaPropertyFooter = observer(() => {
  const [modalItem, setModalItem] = useState(undefined);
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(!mediaProperty) { return null; }

  const {items, rich_text} = mediaProperty.metadata.footer || {};

  if((!items || items.length === 0) && !rich_text) { return null; }

  return (
    <>
      <footer className={S("footer")}>
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
                    onClick={footerItem.type === "link" ? undefined : () => setModalItem(footerItem)}
                    className={S("footer__item")}
                  >
                    { footerItem.text }
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
