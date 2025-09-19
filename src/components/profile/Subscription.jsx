import SubscriptionStyles from "Assets/stylesheets/media_properties/subscription.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {checkoutStore, rootStore} from "Stores";
import {MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import UrlJoin from "url-join";
import {useParams} from "react-router-dom";
import {Loader, PageLoader} from "Components/common/Loaders";
import {LoaderImage} from "Components/properties/Common";
import {Linkish, LocalizeString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import CaretRightIcon from "Assets/icons/right-caret";
import Confirm from "Components/common/Confirm";

const S = (...classes) => classes.map(c => SubscriptionStyles[c] || "").join(" ");

const FormatDate = date => new Date(date)
  .toLocaleDateString(rootStore.preferredLocale, {year: "numeric", "month": "long", day: "numeric"});

const SubscriptionCancel = observer(({subscription, Close}) => {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState(undefined);

  return (
    <div className={S("subscription-container")}>
      <div className={S("subscription")}>
        <Linkish
          onClick={Close}
          className={S("subscription__back")}
        >
          {rootStore.l10n.actions.done}
        </Linkish>
        <div className={S("subscription__text")}>
          <div className={S("subscription__header")}>{rootStore.l10n.profile.subscriptions.cancel_confirm}</div>
          <div className={S("subscription__name")}>{subscription.item.name}</div>
          <div className={S("subscription__message")}>
            {
              LocalizeString(
                cancelling || cancelled ?
                  rootStore.l10n.profile.subscriptions.cancelled_message :
                  rootStore.l10n.profile.subscriptions.cancel_message,
                {date: FormatDate(subscription.paid_to)}
              )
            }
          </div>
          {
            !error ? null :
              <div className={S("subscription__error")}>
                { rootStore.l10n.errors.general }
              </div>
          }
        </div>
      </div>
      <div className={S("subscription__cancel")}>
        {
          cancelled ?
            <div className={S("subscription__cancelled-message")}>
              {rootStore.l10n.profile.subscriptions.subscription_cancelled}
            </div> :
            <>
              <Linkish
                onClick={() => {
                  Confirm({
                    message: rootStore.l10n.profile.subscriptions.confirm_cancel,
                    Confirm: () => {
                      setCancelling(true);

                      checkoutStore.CancelSubscription({
                        subscriptionId: subscription.sub_id
                      })
                        .then(() => setCancelled(true))
                        .catch(error => {
                          rootStore.Log(error, true);
                          setError(error);
                          setCancelling(false);
                        });
                    }
                  });
                }}
                disabled={cancelling}
                className={S("cancel-section__button")}
              >
                {rootStore.l10n.profile.subscriptions.cancel}
              </Linkish>
              {
                cancelling ?
                  <Loader className={S("subscription__cancel-loader")} /> :
                  <ImageIcon icon={CaretRightIcon}/>
              }
            </>
        }
      </div>
    </div>
  );
});

const Subscription = observer(() => {
  const {subscriptionId} = useParams();

  const [subscription, setSubscription] = useState(undefined);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    checkoutStore.LoadSubscriptions({tenantId: rootStore.currentPropertyTenantId})
      .then(subscriptions => subscriptions.forEach(s =>
        s.sub_id === subscriptionId && setSubscription(s)
      ));
  }, [cancelling]);

  if(!subscription) {
    return <PageLoader/>;
  }

  let basePath = "/wallet";
  if(rootStore.routeParams.mediaPropertySlugOrId) {
    basePath = MediaPropertyBasePath(rootStore.routeParams, {includePage: true});
  }

  if(cancelling) {
    return <SubscriptionCancel subscription={subscription} Close={() => setCancelling(false)} />;
  }

  const cancelled = subscription.canceled_at;

  return (
    <div className={S("subscription-container")}>
      <div className={S("subscription")}>
        <Linkish
          to={UrlJoin(basePath, "users", "me", "details")}
          className={S("subscription__back")}
        >
          { rootStore.l10n.actions.back }
        </Linkish>

        <LoaderImage
          loaderAspectRatio={1}
          src={subscription.item.mediaInfo?.imageUrl}
          className={S("subscription__image")}
        />
        <div className={S("subscription__text")}>
          <div className={S("subscription__header")}>{rootStore.l10n.profile.subscriptions.subscription}</div>
          <div className={S("subscription__name")}>{subscription.item.name}</div>
          <div className={S("subscription__subtitle")}>{subscription.item.subtitle1}</div>
          {
            cancelled ?
              <div className={S("subscription__next-payment")}>
                {rootStore.l10n.profile.subscriptions.cancelled_on}:&nbsp;
                {FormatDate(subscription.canceled_at)}
              </div> :
              <div className={S("subscription__next-payment")}>
                {rootStore.l10n.profile.subscriptions.next_payment_date}:&nbsp;
                {FormatDate(subscription.next_payment_date)}
              </div>
          }
          {
            cancelled ? null :
              <Linkish
                onClick={() => checkoutStore.UpdateSubscriptionPayment({subscriptionId})}
                className={S("subscription__action")}
              >
                {rootStore.l10n.profile.subscriptions.manage_payment}
              </Linkish>
          }
        </div>
      </div>
      <div className={S("info")}>
        <div className={S("info__item")}>
          <label className={S("info__item-label")}>
            {rootStore.l10n.profile.subscriptions.purchase_date}
          </label>
          <div className={S("info__item-value")}>
            {FormatDate(subscription.start_time)}
          </div>
        </div>
        <div className={S("info__item")}>
          <label className={S("info__item-label")}>
            {rootStore.l10n.profile.subscriptions.period}
          </label>
          <div className={S("info__item-value")}>
            {FormatDate(subscription.start_time)}
            &nbsp;-&nbsp;
            {FormatDate(subscription.paid_to)}
          </div>
        </div>
        <div className={S("info__item")}>
          <label className={S("info__item-label")}>
            {rootStore.l10n.profile.subscriptions.paid_to}
          </label>
          <div className={S("info__item-value")}>
            {FormatDate(subscription.paid_to)}{!subscription.canceled_at ? ` (${rootStore.l10n.profile.subscriptions.auto_renewing})` : null}
          </div>
          {
            subscription.canceled_at ? null :
              <div className={S("info__item-note")}>
                {rootStore.l10n.profile.subscriptions.renew_note}
              </div>
          }
        </div>
      </div>
      {
        cancelled ? null :
          <div className={S("cancel-section")}>
            <Linkish
              onClick={() => setCancelling(true)}
              className={S("cancel-section__button")}
            >
              {rootStore.l10n.profile.subscriptions.cancel}
              <ImageIcon icon={CaretRightIcon}/>
            </Linkish>
          </div>
      }
    </div>
  );
});

export default Subscription;
