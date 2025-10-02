import FooterStyles from "Assets/stylesheets/media_properties/property-footer.module.scss";

import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore, mediaPropertyStore} from "Stores";
import {Linkish} from "Components/common/UIComponents";
import {LoaderImage, Modal, RichText} from "Components/properties/Common";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import UrlJoin from "url-join";

import BlueskyIcon from "Assets/icons/social/bluesky";
import FacebookIcon from "Assets/icons/social/facebook";
import InstagramIcon from "Assets/icons/social/instagram";
import LinkedInIcon from "Assets/icons/social/linkedin";
import TikTokIcon from "Assets/icons/social/tiktok";
import TwitterIcon from "Assets/icons/social/twitter";
import ImageIcon from "Components/common/ImageIcon";

const icons = {
  bluesky: BlueskyIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  x: TwitterIcon
};

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

const SocialLinks = observer(() => {
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(!mediaProperty) { return null; }

  const socialLinks = mediaProperty.metadata.footer?.social_links || {};

  if(!Object.values(socialLinks).find(l => l)) {
    return null;
  }

  return (
    <div className={S("social-links")}>
      <div className={S("social-links__text")}>
        { rootStore.l10n.media_properties.footer.social_links.text }
      </div>
      <div className={S("social-links__links")}>
        {
          Object.keys(socialLinks).map(key =>
            !socialLinks[key] ? null :
              <Linkish
                alt={key}
                key={`link-${key}`}
                href={socialLinks[key]}
                target="_blank"
                rel="noopener noreferrer"
                className={S("social-links__link")}
              >
                <ImageIcon icon={icons[key]} className={S("social-links__link-icon")} />
              </Linkish>
          )
        }
      </div>
    </div>
  );
});

const MediaPropertyFooter = observer(({withCustomBackgroundColor}) => {
  const [modalItem, setModalItem] = useState(undefined);
  const parentMediaProperty = mediaPropertyStore.MediaProperty({
    mediaPropertySlugOrId: rootStore.parentMediaPropertySlugOrId
  });
  const mediaProperty = mediaPropertyStore.MediaProperty(rootStore.routeParams);

  if(!mediaProperty) { return null; }

  let {items, rich_text} = mediaProperty.metadata.footer || {};
  const supportUrl =
    mediaProperty.metadata.footer?.support_url ||
    parentMediaProperty?.metadata?.footer?.support_url;

  items = [
    ...(items || []),
    {
      type: "link",
      text: "Get Support",
      url: supportUrl || "https://eluviolive.zendesk.com/hc/en-us/requests/new"
    },
    { type: "link", text: "Eluvio Terms", url: "https://eluv.io/terms" },
    { type: "link", text: "Eluvio Privacy Policy", url: "https://eluv.io/privacy" }
  ];

  const availableLocalizations = [
    mediaProperty.metadata.language || "",
    ...(mediaProperty.metadata.localizations || [])
  ]
    .filter(l => l)
    .map(key => ({
      value: key,
      label: new Intl.DisplayNames([key], {type: "language"}).of(key).capitalize()
    }));

  console.log(availableLocalizations);

  return (
    <>
      <footer className={S("footer", withCustomBackgroundColor ? "footer--custom-background" : "")}>
        <SocialLinks />
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
                    to={footerItem.type === "faq" ? UrlJoin(MediaPropertyBasePath(rootStore.routeParams), "faq", footerItem.faq_slug || "") : undefined}
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
              {
                availableLocalizations.length <= 1 ? null :
                  <select
                    value={rootStore.language}
                    onChange={event => mediaPropertyStore.SetPropertyLanguage({
                      mediaPropertyId: rootStore.currentPropertyId,
                      localizationKey: event.target.value,
                      reload: true
                    })}
                    className={S("language-select")}
                  >
                    {
                      availableLocalizations.map(({label, value}) =>
                        <option key={value} value={value}>{label}</option>
                      )
                    }
                  </select>
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
