import {makeAutoObservable, flow, runInAction} from "mobx";
import {rootStore} from "./index";

class NotificationStore {
  newNotifications = false;
  notificationListener = undefined;
  notifications = [];
  notificationMarker = { timestamp: 0, id: undefined };
  supportedNotificationTypes = [
    "LISTING_SOLD",
    "TOKEN_UPDATED",
    "OFFER_RECEIVED",
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
    "OFFER_EXPIRED"
  ];
  activeNotificationTypes = [...this.supportedNotificationTypes].sort();
  disabledNotificationTypes = [];
  readNotifications = {};

  constructor(rootStore) {
    makeAutoObservable(this);

    this.rootStore = rootStore;
    this.Log = this.rootStore.Log;
  }

  get appId() {
    return this.rootStore.appId;
  }

  get client() {
    return this.rootStore.client;
  }

  get walletClient() {
    return this.rootStore.walletClient;
  }

  NotificationUnread(notification) {
    return notification.new && !this.readNotifications[notification.id];
  }

  SetNewNotifications() {
    this.newNotifications = !!this.notifications.find(notification => this.NotificationUnread(notification));
  }

  SetNotificationMarker = flow(function * ({id}) {
    this.Log("Setting notification marker - " + id);

    yield this.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: this.appId,
      key: "notification-marker",
      value: JSON.stringify({timestamp: Date.now() / 1000, id})
    });

    this.newNotifications = false;
  });

  FetchNotifications = flow(function * ({tenantId, offsetId, limit=10}) {
    if(this.activeNotificationTypes.length === 0) {
      return [];
    }

    const notifications = yield this.walletClient.Notifications({
      tenantId,
      offsetId,
      limit,
      types: this.activeNotificationTypes
    });

    return notifications.map(notification => ({
      ...notification,
      new: !this.readNotifications[notification.id] && notification.created > this.notificationMarker.timestamp
    }));
  });

  InitializeNotifications = flow(function * (initial=false) {
    if(this.activeNotificationTypes.length === 0) {
      // No supported notifications active
      this.notifications = [];
      return;
    }

    if(initial) {
      // Only reload notification marker and disabled types on first load
      let disabledNotificationTypes = yield this.walletClient.ProfileMetadata({
        type: "app",
        mode: "private",
        appId: this.appId,
        key: "disabled-notification-types"
      });

      if(disabledNotificationTypes) {
        try {
          disabledNotificationTypes = JSON.parse(disabledNotificationTypes);

          this.disabledNotificationTypes = disabledNotificationTypes;
          this.activeNotificationTypes = [...this.supportedNotificationTypes].filter(type => !this.disabledNotificationTypes.includes(type));
          // eslint-disable-next-line no-empty
        } catch(error) {}
      } else {
        this.activeNotificationTypes = [...this.supportedNotificationTypes];
      }

      let notificationMarker = yield this.walletClient.ProfileMetadata({
        type: "app",
        mode: "private",
        appId: this.appId,
        key: "notification-marker"
      });

      if(notificationMarker) {
        try {
          this.notificationMarker = JSON.parse(notificationMarker);
        // eslint-disable-next-line no-empty
        } catch(error) {}
      }
    }

    this.notifications = yield this.FetchNotifications({limit: 10});

    if(this.notifications[0]?.new) {
      this.newNotifications = true;
    }

    if(this.notificationListener) {
      try {
        this.notificationListener.close();
      } catch(error) {
        this.Log(error, true);
      }
    }

    this.notificationListener = yield this.walletClient.AddNotificationListener({
      onMessage: notification => {
        if(!this.activeNotificationTypes.includes(notification.type)) {
          return;
        }

        runInAction(() => {
          this.notifications = [{...notification, new: true}, ...this.notifications];
          this.newNotifications = true;
        });
      }
    });

    this.SetNewNotifications();
  });

  MarkNotificationRead(notificationId) {
    this.readNotifications[notificationId] = true;

    this.SetNewNotifications();
  }

  DisableNotificationType = flow(function * (notificationType) {
    this.disabledNotificationTypes = [ ...this.disabledNotificationTypes, notificationType ];
    this.activeNotificationTypes = this.activeNotificationTypes.filter(type => !this.disabledNotificationTypes.includes(type)).sort();

    yield rootStore.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: rootStore.appId,
      key: "disabled-notification-types",
      value: JSON.stringify(this.disabledNotificationTypes)
    });

    yield this.InitializeNotifications();
  });

  EnableNotificationType = flow(function * (notificationType) {
    this.disabledNotificationTypes = this.disabledNotificationTypes.filter(type => type !== notificationType);
    this.activeNotificationTypes = [ ...this.activeNotificationTypes, notificationType ].sort();

    yield rootStore.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: rootStore.appId,
      key: "disabled-notification-types",
      value: JSON.stringify(this.disabledNotificationTypes)
    });

    yield this.InitializeNotifications();
  });
}

export default NotificationStore;
