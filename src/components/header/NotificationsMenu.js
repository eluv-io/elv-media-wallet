import HeaderMenuStyles from "Assets/stylesheets/header-menus.module.scss";
import NotificationStyles from "Assets/stylesheets/notifications.module.scss";

import React, {useEffect, useState, useRef} from "react";
import {observer} from "mobx-react";
import {rootStore, notificationStore} from "Stores";
import {ButtonWithLoader, FormatPriceString, Linkish, LocalizeString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Ago} from "../../utils/Utils";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {createPortal} from "react-dom";
import HoverMenu from "Components/common/HoverMenu";
import PreferencesMenu from "Components/header/PreferencesMenu";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";

import ListingSoldIcon from "Assets/icons/header/listings icon.svg";
import TokenUpdatedIcon from "Assets/icons/plus.svg";
import OfferReceivedIcon from "Assets/icons/header/offer icon.svg";
import OfferDeclinedIcon from "Assets/icons/x.svg";
import OfferExpiredIcon from "Assets/icons/minus.svg";
import OfferAcceptedIcon from "Assets/icons/header/offer icon.svg";
import GiftIcon from "Assets/icons/gift.svg";
import MenuIcon from "Assets/icons/more-horizontal.svg";
import NotificationDisabledIcon from "Assets/icons/header/bell-off.svg";
import CheckmarkIcon from "Assets/icons/check.svg";

const S = (...classes) => classes.map(c => HeaderMenuStyles[c] || NotificationStyles[c] || "").join(" ");

const NotificationMenu = observer(({notification, parent, Hide}) => {
  const [disabling, setDisabling] = useState(false);

  const [ref, setRef] = useState(undefined);
  const menuBox = ref?.current?.getBoundingClientRect();
  const parentBox = parent?.current?.getBoundingClientRect();

  useEffect(() => {
    if(!parent.current) { return; }

    document.addEventListener("scroll", Hide);
    parent.current.parentElement.addEventListener("scroll", Hide);

    return () => {
      document.removeEventListener("scroll", Hide);
      parent?.current && parent.current.parentElement.removeEventListener("scroll", Hide);
    };
  }, [parent]);


  return (
    createPortal(
      <HoverMenu
        Hide={Hide}
        setRef={setRef}
        className={S("notification__menu")}
        style={
          !menuBox || !parentBox ? null :
            {
              left: parentBox.left + parentBox.width - menuBox.width - 50,
              top: parentBox.top - document.body.getBoundingClientRect().top + document.body.scrollTop + 55
            }
        }
      >
        {
          !notificationStore.NotificationUnread(notification) ? null :
            <button
              onClick={() => {
                notificationStore.MarkNotificationRead(notification.id);
                Hide();
              }}
              className={S("notification__menu__button")}
            >
              <ImageIcon icon={CheckmarkIcon} className={S("notification__menu__button-icon")}/>
              <div className={S("notification__menu__button-text")}>
                { rootStore.l10n.notifications.mark_as_read }
              </div>
            </button>
        }
        <ButtonWithLoader
          onClick={async () => {
            if(disabling) { return; }

            setDisabling(true);

            try {
              await notificationStore.DisableNotificationType(notification.type);
            } finally {
              setDisabling(false);
              Hide();
            }
          }}
          className={S("notification__menu__button")}
        >
          <ImageIcon icon={NotificationDisabledIcon} className={S("notification__menu__button-icon")}/>

          <div className={S("notification__menu__button-text")}>
            { LocalizeString(rootStore.l10n.notifications.disable, {type: rootStore.l10n.notifications[notification.type.toLowerCase()] || "these"}) }
          </div>
        </ButtonWithLoader>
      </HoverMenu>,
      document.body
    )
  );
});

const Notification = observer(({notification, Hide}) => {
  const ref = useRef();
  const [showMenu, setShowMenu] = useState(false);

  let valid = true;

  let basePath = "/wallet";
  if(rootStore.routeParams.marketplaceId) {
    basePath = UrlJoin("/marketplace", rootStore.routeParams.marketplaceId);
  } else if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

  const contractId = notification?.data?.contract ? `ictr${Utils.AddressToHash(notification.data.contract)}` : "";

  const l10n = rootStore.l10n.notifications;
  let header, message, icon, link;
  switch(notification.type) {
    case "__NO_NOTIFICATIONS":
      icon = OfferDeclinedIcon;
      header = l10n.no_new_notifications;
      message = l10n.no_new_notifications_desc;
      break;

    case "LISTING_SOLD":
      icon = ListingSoldIcon;
      header = l10n.listing_sold;
      message = LocalizeString(l10n.listing_sold_message, {name: notification.data.name, price: FormatPriceString(notification.data.price, {stringOnly: true})});
      if(notification.data.listing) {
        link = UrlJoin(basePath, "users", "me", "items", contractId, notification.data.token.toString());
      }

      break;

    case "TOKEN_UPDATED":
      icon = TokenUpdatedIcon;
      header = l10n.token_updated;
      message = notification.data.message;
      if(notification.data.contract && notification.data.token) {
        const contractId = `ictr${Utils.AddressToHash(notification.data.contract)}`;
        link = UrlJoin(basePath, "users", "me", "items", contractId, notification.data.token.toString());
      }

      break;

    case "OFFER_RECEIVED":
      icon = OfferReceivedIcon;
      header = l10n.offer_received;
      message = LocalizeString(l10n.offer_received_message, {name: notification.data.name, price: FormatPriceString(notification.data.price, {stringOnly: true})});

      link = UrlJoin(basePath, "users", "me", "items", contractId, notification.data.token.toString() + "?tab=offers");

      break;

    case "OFFER_ACCEPTED":
      icon = OfferAcceptedIcon;
      header = l10n.offer_accepted;
      message = LocalizeString(l10n.offer_accepted_message, {name: notification.data.name, price: FormatPriceString(notification.data.price, {stringOnly: true})});

      if(notification.data.contract && notification.data.token) {
        const contractId = `ictr${Utils.AddressToHash(notification.data.contract)}`;
        link = UrlJoin(basePath, "users", "me", "items", contractId, notification.data.token.toString() + "?tab=offers");
      }

      break;

    case "OFFER_DECLINED":
      icon = OfferDeclinedIcon;
      header = l10n.offer_declined;
      message = LocalizeString(l10n.offer_declined_message, {name: notification.data.name, price: FormatPriceString(notification.data.price, {stringOnly: true})});

      const reason = l10n.offer_declined_reasons[notification.data.reason?.replace("-", "_")];
      if(reason) {
        message = (
          <>
            { message } - { reason }
          </>
        );
      }

      link = UrlJoin(basePath, "users", "me", "items", contractId, notification.data.token.toString() + "?tab=offers");
      break;

    case "OFFER_EXPIRED":
      icon = OfferExpiredIcon;
      header = l10n.offer_expired;
      message = LocalizeString(l10n.offer_expired_message, {name: notification.data.name, price: FormatPriceString(notification.data.price, {stringOnly: true})});

      link = UrlJoin(basePath, "users", "me", "items", contractId, notification.data.token.toString() + "?tab=offers");

      break;

    case "GIFT_RECEIVED":
      icon = GiftIcon;
      header = l10n.gift_received;
      message = LocalizeString(l10n.gift_received_message, {sender: notification?.data?.reason?.split("from ")[1] || "Someone"});
      link = UrlJoin(basePath, "users", "me", "gifts");

      break;

    default:
      valid = false;

      break;
  }

  if(!valid) { return null; }

  return (
    <div className={S("notification")} ref={ref}>
      <div className={S("notification__icon-container")}>
        <ImageIcon icon={icon} className={S("notification__icon")} label={header} />
      </div>
      <Linkish to={link} onClick={Hide} className={S("notification__info")}>
        <div className={S("notification__header")}>
          { header }
        </div>
        <div className={S("notification__message")}>{ message }</div>
        {
          !notification.created ? null :
            <div className={S("notification__time")}>{Ago(notification.created * 1000)}</div>
        }
      </Linkish>
      <div className={S("notification__actions")}>
        {
          !notificationStore.NotificationUnread(notification) ? null :
            <div className={S("notification__indicator")}/>
        }
        {
          notification.type === "__NO_NOTIFICATIONS" ? null :
            <button
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                setShowMenu(!showMenu);
              }}
              className={S("notification__menu-button",showMenu ? "notification__menu-button--active" : "")}
            >
              <ImageIcon icon={MenuIcon} label="Options"/>
            </button>
        }
        {
          showMenu ?
            <NotificationMenu
              notification={notification}
              parent={ref}
              Hide={() => setShowMenu(false)}
            /> : null
        }
      </div>
    </div>
  );
});


const Notifications = observer(({Hide}) => {
  const perPage = 10;
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [onlyNew, setOnlyNew] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false || marketplace?.branding?.disable_secondary_market;

  const filteredNotifications = notifications.filter(notification => !onlyNew || notificationStore.NotificationUnread(notification));

  useEffect(() => {
    return () => notificationStore.SetNotificationMarker({id: notificationStore.notifications[0]?.id});
  }, []);

  useEffect(() => {
    if(page < 0) { return; }

    setLoading(true);
    notificationStore.FetchNotifications({limit: perPage, offsetId: notifications.slice(-1)[0]?.id})
      .then(newNotifications => {
        setNotifications([...notifications, ...newNotifications]);
        setLoading(false);

        if(newNotifications.length < perPage) {
          setMore(false);
        }
      });
  }, [page]);

  useEffect(() => {
    // Full page - whenever active notification types change, force reload
    setNotifications([]);
    setMore(true);
    setPage(-1);
    setTimeout(() => setPage(1), 1);
  }, [notificationStore.activeNotificationTypes]);

  return (
    <>
      <div className={S("notifications")}>
        <div className={S("notifications__header")}>
          <div className={S("notifications__actions")}>
            <button
              onClick={() => setOnlyNew(true)}
              className={S("notifications__action", onlyNew ? "notifications__action--active" : "")}
            >
              { rootStore.l10n.notifications.new }
            </button>
            <button
              onClick={() => setOnlyNew(false)}
              className={S("notifications__action", !onlyNew ? "notifications__action--active" : "")}
            >
              { rootStore.l10n.notifications.all }
            </button>
          </div>
          {
            secondaryDisabled ? null :
              <div className={S("notifications__actions")}>
                <button onClick={() => setShowPreferences(true)} className={S("notifications__action")}>
                  { rootStore.l10n.preferences.preferences }
                </button>
              </div>
          }
        </div>
        <div className={S("notifications__list")}>
          {
            filteredNotifications.length === 0 ?
              <Notification notification={{type: "__NO_NOTIFICATIONS"}} Hide={Hide} /> :
              filteredNotifications.map(notification => <Notification key={notification.id} notification={notification} Hide={Hide} />)
          }
        </div>
        <div className={S("notifications__actions", "notifications__actions--centered")}>
          {
            !more || notifications.length === 0 || notifications.length !== filteredNotifications.length ? null :
              <ButtonWithLoader
                disabled={!more || notifications.length !== filteredNotifications.length}
                isLoading={loading}
                onClick={() => setPage(page + 1)}
                className={S("notifications__action")}
              >
                {rootStore.l10n.notifications.load_more}
              </ButtonWithLoader>
          }
        </div>
      </div>
      { showPreferences ? <PreferencesMenu Hide={() => setShowPreferences(false)} /> : null }
    </>
  );
});

export const NotificationsMenu = observer(({Hide}) => {
  const [notifications, setNotifications] = useState([]);
  const [onlyNew, setOnlyNew] = useState(true);

  useEffect(() => {
    setNotifications(notificationStore.notifications);
  }, [notificationStore.notifications]);

  const filteredNotifications = notifications.filter(notification => !onlyNew || notificationStore.NotificationUnread(notification));

  let basePath = "/wallet";
  if(rootStore.routeParams.marketplaceId) {
    basePath = UrlJoin("/marketplace", rootStore.routeParams.marketplaceId);
  } else if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

  useEffect(() => {
    return () => notificationStore.SetNotificationMarker({id: notificationStore.notifications[0]?.id});
  }, []);

  return (
    <HoverMenu Hide={Hide} className={S("header-menu", "notifications-menu")}>
      <div className={S("notifications-menu__header")}>
        <h2 className={S("notifications-menu__header-text")}>
          { rootStore.l10n.notifications.notifications }
        </h2>
        <div className={S("notifications-menu__toggles")}>
          <button
            onClick={() => setOnlyNew(true)}
            className={S("notifications-menu__toggle", onlyNew ? "notifications-menu__toggle--active" : "")}
          >
            { rootStore.l10n.notifications.new }
          </button>
          <button
            onClick={() => setOnlyNew(false)}
            className={S("notifications-menu__toggle", !onlyNew ? "notifications-menu__toggle--active" : "")}
          >
            { rootStore.l10n.notifications.all }
          </button>
        </div>
      </div>
      <div className={S("notifications-menu__notifications")}>
        {
          filteredNotifications.length === 0 ?
            <Notification notification={{type: "__NO_NOTIFICATIONS"}} Hide={Hide} /> :
            filteredNotifications.map(notification => <Notification key={notification.id} notification={notification} Hide={Hide} />)
        }
      </div>
      <div className={S("header-menu__actions", "notifications-menu__actions")}>
        <Link
          to={UrlJoin(basePath, "users", "me", "notifications")}
          onClick={() => Hide()}
          className={S("header-menu__action")}
        >
          { rootStore.l10n.notifications.view_all }
        </Link>
      </div>
    </HoverMenu>
  );
});

export default Notifications;
