import React, {useEffect, useState, useRef} from "react";
import {observer} from "mobx-react";
import {rootStore, notificationStore} from "Stores";
import HeaderMenu from "Components/header/HeaderMenu";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Ago} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import UrlJoin from "url-join";
import {Link, useRouteMatch} from "react-router-dom";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {createPortal} from "react-dom";
import PreferencesMenu from "Components/header/PreferencesMenu";

import ListingSoldIcon from "Assets/icons/header/listings icon.svg";
import TokenUpdatedIcon from "Assets/icons/plus.svg";
import OfferReceivedIcon from "Assets/icons/header/offer icon.svg";
import OfferDeclinedIcon from "Assets/icons/x.svg";
import OfferExpiredIcon from "Assets/icons/minus.svg";
import OfferAcceptedIcon from "Assets/icons/header/offer icon.svg";
import MenuIcon from "Assets/icons/more-horizontal.svg";
import NotificationDisabledIcon from "Assets/icons/header/bell-off.svg";
import CheckmarkIcon from "Assets/icons/check.svg";

const NotificationMenu = observer(({notification, parent, Hide}) => {
  const [disabling, setDisabling] = useState(false);
  const menuRef = useRef();

  const containerBox = parent?.current?.closest(".notifications")?.getBoundingClientRect() || {};
  const parentBox = parent?.current?.getBoundingClientRect() || {};

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const onClickOutside = event => {
      if(window._showPreferencesMenu) { return; }

      if(!menuRef?.current || !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, [menuRef]);

  useEffect(() => {
    if(!parent.current) { return; }

    const list = parent.current.closest(".notifications__list");

    list?.addEventListener("scroll", Hide);

    return () => list?.removeEventListener("scroll", Hide);
  }, [parent]);

  return (
    createPortal(
      <div
        style={{
          top: parentBox.top - containerBox.top + parentBox.height / 2 - 10,
          left: parentBox.left - containerBox.left + parentBox.width - 200 - 30
        }}
        className="notification-menu"
        ref={menuRef}
      >
        {
          notificationStore.NotificationUnread(notification) ?
            <button
              onClick={() => {
                notificationStore.MarkNotificationRead(notification.id);
                Hide();
              }}
              className="notification-menu__button"
            >
              <ImageIcon icon={CheckmarkIcon} className="notification-menu__button__icon"/>
              <div className="notification-menu__button__text">Mark as read</div>
            </button> : null
        }
        <button
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
          className="notification-menu__button"
        >
          <ImageIcon icon={NotificationDisabledIcon} className="notification-menu__button__icon" />
          <div className="notification-menu__button__text">
            <div className={`notification-menu__button__text-content ${disabling ? "notification-menu__button__text-content--loading" : ""}`}>
              Turn off {notificationStore.supportedNotificationTypes[notification.type]?.label || "these"} notifications
            </div>
            { disabling ? <Loader loader="inline" /> : null }
          </div>
        </button>
      </div>,
      parent?.current?.closest(".notifications")
    )
  );
});

const Notification = observer(({notification, Hide}) => {
  const ref = useRef();
  const [showMenu, setShowMenu] = useState(false);

  let valid = true;

  const marketplace = notification.tenant_id && rootStore.MarketplaceByTenantId({tenantId: notification.tenant_id});

  let header, message, icon, link;
  switch(notification.type) {
    case "__NO_NOTIFICATIONS":
      icon = OfferDeclinedIcon;
      header = "No New Notifications";
      message = "You don't have any new notifications";
      break;

    case "LISTING_SOLD":
      icon = ListingSoldIcon;
      header = "Listing Sold";
      message = `Your '${notification.data.name}' has sold on the marketplace for ${FormatPriceString(notification.data.price, {stringOnly: true})}`;
      if(notification.data.listing) {
        link = UrlJoin("users", "me", "listings", notification.data.listing);
        link = marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, link) : UrlJoin("/wallet", link);
      }

      break;

    case "TOKEN_UPDATED":
      icon = TokenUpdatedIcon;
      header = "Updated Token";
      message = notification.data.message;
      const contractId = `ictr${Utils.AddressToHash(notification.data.contract)}`;
      link = UrlJoin("users", "me", "items", contractId, notification.data.token.toString());
      link = marketplace ? UrlJoin("/marketplace", marketplace.marketplaceId, link) : UrlJoin("/wallet", link);

      break;

    case "OFFER_RECEIVED":
      icon = OfferReceivedIcon;
      header = "Offer Received";
      message = `You have received an offer of ${FormatPriceString(notification.data.price, {stringOnly: true})} on your '${notification.data.name}'.`;

      break;

    case "OFFER_ACCEPTED":
      icon = OfferAcceptedIcon;
      header = "Offer Accepted";
      message = `Your offer on '${notification.data.name}' for ${FormatPriceString(notification.data.price, {stringOnly: true})} has been accepted.`;

      break;

    case "OFFER_DECLINED":
      icon = OfferDeclinedIcon;
      header = "Offer Declined";
      message = `Your offer on '${notification.data.name}' for ${FormatPriceString(notification.data.price, {stringOnly: true})} was declined.`;

      break;

    case "OFFER_EXPIRED":
      icon = OfferExpiredIcon;
      header = "Offer Expired";
      message = `Your offer on '${notification.data.name}' for ${FormatPriceString(notification.data.price, {stringOnly: true})} has expired.`;

      break;

    default:
      valid = false;

      break;
  }

  if(!valid) { return null; }

  let notificationInfo = (
    <>
      <div className="notification__heading">
        <h2 className="notification__header">
          { header }
        </h2>
      </div>
      <div className="notification__message">{ message }</div>
      { notification.created ? <div className="notification__time">{ Ago(notification.created * 1000) } Ago</div> : null }
    </>
  );

  notificationInfo = link ?
    <Link to={link} onClick={Hide} className="notification__info">
      { notificationInfo }
    </Link> :
    <div className="notification__info">
      { notificationInfo }
    </div>;

  return (
    <div className="notification" ref={ref}>
      <div className="notification__icon-container">
        <ImageIcon icon={icon} className="notification__icon" label={header} />
      </div>
      { notificationInfo }
      <div className="notification__actions">
        { notificationStore.NotificationUnread(notification) ? <div className="notification__indicator-container"><div className="notification__indicator" /></div> : null }
        {
          notification.type === "__NO_NOTIFICATIONS" ? null :
            <button
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                setShowMenu(!showMenu);
              }}
              className={`notification__menu-button ${showMenu ? "active" : ""}`}
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


const Notifications = observer(({marketplaceId, headerMenu, Hide}) => {
  const match = useRouteMatch();
  const perPage = 10;
  const [loading, setLoading] = useState(!headerMenu);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(true);
  const [onlyNew, setOnlyNew] = useState(headerMenu);
  const [showPreferences, setShowPreferences] = useState(false);

  const filteredNotifications = notifications.filter(notification => !onlyNew || notificationStore.NotificationUnread(notification));

  useEffect(() => {
    return () => notificationStore.SetNotificationMarker({id: notificationStore.notifications[0]?.id});
  }, []);

  useEffect(() => {
    // Header menu - Only show rootStore.notifications
    if(!headerMenu) { return; }

    setNotifications(notificationStore.notifications);
  }, [notificationStore.notifications]);

  useEffect(() => {
    // Full page - load notifications locally
    if(headerMenu || page < 0) { return; }

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
    if(headerMenu) { return; }

    setNotifications([]);
    setMore(true);
    setPage(-1);
    setTimeout(() => setPage(1), 1);
  }, [notificationStore.activeNotificationTypes]);

  return (
    <>
      <div className={`notifications ${headerMenu ? "notifications--menu" : "notifications--page"}`}>
        <div className="notifications__header">
          { headerMenu ? <div className="notifications__header__text">Notifications</div> : null }
          <div className="notifications__header__filters">
            <button onClick={() => setOnlyNew(true)} className={`action action-selection notifications__header__filter ${onlyNew ? "action-selection--active" : ""}`}>
              New
            </button>
            <button onClick={() => setOnlyNew(false)} className={`action action-selection notifications__header__filter ${onlyNew ? "" : "action-selection--active"}`}>
              All
            </button>
          </div>
          { !headerMenu ? <button onClick={() => setShowPreferences(true)} className="notifications__header__preferences-button">Preferences</button> : null }
        </div>
        <div className="notifications__list">
          {
            !loading && filteredNotifications.length === 0 ?
              <Notification notification={{type: "__NO_NOTIFICATIONS"}} Hide={Hide} /> :
              filteredNotifications.map(notification => <Notification key={notification.created} notification={notification} Hide={Hide} />)
          }
        </div>
        {
          // Header menu - If more notifications, link to full page
          headerMenu ? (
            notificationStore.notifications.length > 0 ?
              <Link
                to={marketplaceId ? UrlJoin("/marketplace", marketplaceId, "users", "me", "notifications") : "/wallet/users/me/notifications"}
                onClick={() => Hide()}
                className="notifications__link"
              >
                View All
              </Link> :
              null
          ) :
            // Full page - show loading indicator / load more button
            (
              loading ?
                <Loader className="notifications__link"/> :
                more && notifications.length === filteredNotifications.length ?
                  <button onClick={() => setPage(page + 1)} className="notifications__link">Load More</button> :
                  null
            )
        }
      </div>
      { showPreferences ? <PreferencesMenu marketplaceId={match.params.marketplaceId} Hide={() => setShowPreferences(false)} /> : null }
    </>
  );
});

export const NotificationsMenu = observer(({marketplaceId, Hide}) => {
  return (
    <HeaderMenu Hide={Hide} className="header__notifications-menu">
      <Notifications headerMenu marketplaceId={marketplaceId} Hide={Hide} />
    </HeaderMenu>
  );
});

export default Notifications;
