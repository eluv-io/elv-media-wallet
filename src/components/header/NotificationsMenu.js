import React from "react";
import {observer} from "mobx-react";
import HeaderMenu from "Components/header/HeaderMenu";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Ago} from "../../utils/Utils";

import ListingSoldIcon from "Assets/icons/listing.svg";
import TokenUpdatedIcon from "Assets/icons/plus.svg";
import OfferReceivedIcon from "Assets/icons/Offers icon.svg";
import OfferDeclinedIcon from "Assets/icons/x.svg";
import OfferExpiredIcon from "Assets/icons/minus.svg";
import OfferAcceptedIcon from "Assets/icons/menu.svg";

const Notification = observer(({notification}) => {
  let valid = true;
  let header, message, icon, link;
  switch(notification.type) {
    case "LISTING_SOLD":
      icon = ListingSoldIcon;
      header = "Listing Sold";
      message = `Your '${notification.data.name}' has sold on the marketplace for ${FormatPriceString(notification.data.price, {stringOnly: true})}`;

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

    case "TOKEN_UPDATED":
      icon = TokenUpdatedIcon;
      header = "Updated Token";
      message = notification.data.message;

      break;

    default:
      valid = false;

      break;
  }

  if(!valid) { return null; }

  return (
    <div className="notification">
      <div className="notification__icon-container">
        <ImageIcon icon={icon} className="notification__icon" label={header} />
      </div>
      <div className="notification__info">
        <div className="notification__heading">
          <h2 className="notification__header">
            { header }
          </h2>
          <div className="notification__actions">
            { Date.now() - notification.created_at < 24 * 60 * 60 * 1000  ? <div className="notification__new-indicator" /> : null }
          </div>
        </div>
        <div className="notification__message">{ message }</div>
        <div className="notification__time">{ Ago(notification.created_at) } Ago</div>
      </div>
    </div>
  );
});

const NotificationsMenu = observer(({Hide}) => {
  const notifications = [
    {
      id: "11",
      type: "OFFER_EXPIRED",
      created_at: Date.now() - 0.4 * 60 * 60 * 1000,
      data: {
        name: "Mask Pack",
        contract: "0x123",
        token: "123",
        offer_id: "asd123",
        price: 123.45
      }
    },
    {
      id: "1",
      type: "LISTING_SOLD",
      created_at: Date.now() - 12 * 60 * 60 * 1000,
      data: {
        name: "Miss Masky",
        contract: "0x123",
        token: "123",
        price: 1.25
      }
    },
    {
      id: "10",
      type: "OFFER_DECLINED",
      created_at: Date.now() - 16 * 60 * 60 * 1000,
      data: {
        name: "Mask Pack",
        contract: "0x123",
        token: "123",
        offer_id: "asd123",
        price: 123.45
      }
    },
    {
      id: "2",
      type: "OFFER_ACCEPTED",
      created_at: Date.now() - 24 * 60 * 60 * 1000,
      data: {
        name: "Mask Pack",
        contract: "0x123",
        token: "123",
        offer_id: "asd123",
        price: 123.45
      }
    },
    {
      id: "3",
      type: "OFFER_RECEIVED",
      created_at: Date.now() - 48 * 60 * 60 * 1000,
      data: {
        name: "Miss Masky",
        contract: "0x123",
        token: "123",
        offer_id: "asd123",
        price: 234.56
      }
    },
    {
      id: "4",
      type: "TOKEN_UPDATED",
      created_at: Date.now() - 84 * 60 * 60 * 1000,
      data: {
        name: "Epic Edition",
        contract: "0x123",
        token: "123",
        message: "Your WB Movieverse Epic Edition has new AR objects. Check it out!"
      }
    }
  ];

  return (
    <HeaderMenu Hide={Hide} className="header__notifications-menu">
      <div className="header__notifications-menu__header">
        Notifications
      </div>
      <div className="header__notifications-menu__list">
        { notifications.map(notification => <Notification key={notification.id} notification={notification}/>) }
      </div>
    </HeaderMenu>
  );
});

export default NotificationsMenu;
