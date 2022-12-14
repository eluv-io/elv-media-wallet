import {makeAutoObservable, flow, runInAction} from "mobx";
import {rootStore} from "./index";

class NotificationStore {
  newNotifications = false;
  notifications = [];
  notificationMarker = { timestamp: 0, id: undefined };
  supportedNotificationTypes = {
    "LISTING_SOLD": "Listing Sold",
    "TOKEN_UPDATED": "Token Updated"
  };
  activeNotificationTypes = [Object.keys(this.supportedNotificationTypes)];
  disabledNotificationTypes = [];

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
    const notifications = yield this.walletClient.Notifications({tenantId, offsetId, limit, types: this.activeNotificationTypes});

    return notifications.map(notification => ({
      ...notification,
      new: notification.created > this.notificationMarker.timestamp
    }));
  });

  InitializeNotifications = flow(function * () {
    if(window.notificationSource) {
      window.notificationSource.close();
    }

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
        this.activeNotificationTypes = Object.keys(this.supportedNotificationTypes).filter(type => !this.disabledNotificationTypes.includes(type));
        // eslint-disable-next-line no-empty
      } catch(error) {}
    }

    if(this.activeNotificationTypes.length === 0) {
      // No supported notifications active
      this.notifications = [];
      return;
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

    this.notifications = yield this.FetchNotifications({limit: 10});

    if(this.notifications[0]?.new) {
      this.newNotifications = true;
    }

    window.notificationSource = yield this.walletClient.AddNotificationListener({
      onMessage: notification => {
        runInAction(() => {
          this.notifications = [{...notification, new: true}, ...this.notifications];
          this.newNotifications = true;
        });
      }
    });
  });

  DisableNotificationType = flow(function * (notificationType) {
    this.disabledNotificationTypes = [ ...this.disabledNotificationTypes, notificationType ];
    this.activeNotificationTypes = this.activeNotificationTypes.filter(type => !this.disabledNotificationTypes.includes(type));

    yield rootStore.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: rootStore.appId,
      key: "disabled-notification-types",
      value: JSON.stringify(this.disabledNotificationTypes)
    });

    this.InitializeNotifications();
  });

  EnableNotificationType = flow(function * (notificationType) {
    this.disabledNotificationTypes = this.disabledNotificationTypes.filter(type => type !== notificationType);
    this.activeNotificationTypes = [ ...this.activeNotificationTypes, notificationType ];

    yield rootStore.walletClient.SetProfileMetadata({
      type: "app",
      mode: "private",
      appId: rootStore.appId,
      key: "disabled-notification-types",
      value: JSON.stringify(this.disabledNotificationTypes)
    });

    this.InitializeNotifications();
  });
}

export default NotificationStore;
