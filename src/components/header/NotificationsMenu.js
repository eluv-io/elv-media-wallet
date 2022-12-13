import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import HeaderMenu from "Components/header/HeaderMenu";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Ago} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";

import ListingSoldIcon from "Assets/icons/header/listings icon.svg";
import TokenUpdatedIcon from "Assets/icons/plus.svg";
import OfferReceivedIcon from "Assets/icons/header/offer icon.svg";
import OfferDeclinedIcon from "Assets/icons/x.svg";
import OfferExpiredIcon from "Assets/icons/minus.svg";
import OfferAcceptedIcon from "Assets/icons/header/offer icon.svg";
import Utils from "@eluvio/elv-client-js/src/Utils";

const Notification = observer(({notification, Hide}) => {
  let valid = true;

  const marketplace = notification.tenant_id && rootStore.MarketplaceByTenantId({tenantId: notification.tenant_id});

  let header, message, icon, link;
  switch(notification.type) {
    case "__NO_NOTIFICATIONS":
      icon = OfferDeclinedIcon;
      header = "No Notifications";
      message = "You don't have any notifications";
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

  const content = (
    <>
      <div className="notification__icon-container">
        <ImageIcon icon={icon} className="notification__icon" label={header} />
      </div>
      <div className="notification__info">
        <div className="notification__heading">
          <h2 className="notification__header">
            { header }
          </h2>
          <div className="notification__actions">
            { notification.new ? <div className="notification__indicator" /> : null }
          </div>
        </div>
        <div className="notification__message">{ message }</div>
        { notification.created ? <div className="notification__time">{ Ago(notification.created * 1000) } Ago</div> : null }
      </div>
    </>
  );

  return (
    link ?
      <Link to={link} onClick={Hide} className="notification">
        { content }
      </Link> :
      <div className="notification">
        { content }
      </div>
  );
});


const Notifications = observer(({marketplaceId, headerMenu, Hide}) => {
  const perPage = 10;
  const [loading, setLoading] = useState(!headerMenu);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(true);
  const [onlyNew, setOnlyNew] = useState(false);

  const filteredNotifications = notifications.filter(notification => !onlyNew || notification.new);

  useEffect(() => {
    return () => rootStore.SetNotificationMarker({id: rootStore.notifications[0]?.id});
  }, []);

  useEffect(() => {
    // Header menu - Only show rootStore.notifications
    if(!headerMenu) { return; }

    setNotifications(rootStore.notifications);
  }, [rootStore.notifications]);

  useEffect(() => {
    // Full page - load notifications locally
    if(headerMenu) { return; }

    setLoading(true);
    rootStore.FetchNotifications({limit: perPage, offsetId: notifications.slice(-1)[0]?.id})
      .then(newNotifications => {
        setNotifications([...notifications, ...newNotifications]);
        setLoading(false);

        if(newNotifications.length < perPage) {
          setMore(false);
        }
      });
  }, [page]);
  
  return (
    <div className={`notifications ${headerMenu ? "notifications--menu" : "notifications--page"}`}>
      <div className="notifications__header">
        { headerMenu ? <div className="notifications__header__text">Notifications</div> : null }
        <div className="notifications__header__filters">
          <button onClick={() => setOnlyNew(false)} className={`action action-selection notifications__header__filter ${onlyNew ? "" : "action-selection--active"}`}>
            All
          </button>
          <button onClick={() => setOnlyNew(true)} className={`action action-selection notifications__header__filter ${onlyNew ? "action-selection--active" : ""}`}>
            New
          </button>
        </div>
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
          rootStore.notifications.length > 0 ?
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
