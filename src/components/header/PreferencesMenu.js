/* eslint no-unused-vars: 0 */

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {Select, SwitchButton} from "Components/common/UIComponents";
import {checkoutStore, notificationStore, rootStore} from "Stores";
import CountryCodesList from "country-codes-list";
import LanguageCodes from "Assets/localizations/LanguageCodes";

const currencyMap = CountryCodesList.customList("currencyCode", "{currencyNameEn}");

const PreferencesMenu = observer(({Hide}) => {
  const [originalLanguage] = useState(rootStore.language);

  useEffect(() => {
    return () => {
      if(rootStore.language !== originalLanguage) {
        rootStore.Reload();
      }
    };
  }, []);

  const marketplace = rootStore.marketplaces[rootStore.routeParams.marketplaceId];
  let availableDisplayCurrencies = marketplace?.display_currencies || [];
  if(!availableDisplayCurrencies.find(currency => currency.toUpperCase() === "USD")) {
    availableDisplayCurrencies = ["USD", ...availableDisplayCurrencies];
  }

  let availableLocalizations = [...(marketplace?.localizations || []), ...rootStore.uiLocalizations]
    .filter((x, i, a) => a.indexOf(x) === i)
    .map(key => [key.toLowerCase(), LanguageCodes[key.toLowerCase()]]) || []
    .sort((a, b) => a[1] < b[1] ? -1 : 1);

  if(EluvioConfiguration["show-debug"]) {
    availableLocalizations = [...availableLocalizations, ["test", "Test"]];
  }

  return (
    <Modal className="header__preferences-menu-modal" Toggle={Hide}>
      <div className="header__preferences-menu">
        <h1 className="header__preferences-menu__header">{ rootStore.l10n.preferences.preferences }</h1>

        <div className="header__preferences-menu__section">
          <div className="header__preferences-menu__label">
            { rootStore.l10n.notifications.notifications }
          </div>

          {
            notificationStore.supportedNotificationTypes.map(type => {
              const active = !!notificationStore.activeNotificationTypes.find(activeType => type === activeType);

              return (
                <div key={`notification-option-${type}`} className="header__preferences-menu__option">
                  <div className="header__preferences-menu__option__info">
                    <div className="header__preferences-menu__option__label">
                      { rootStore.l10n.notifications[type.toLowerCase()] }
                    </div>
                    <div className="header__preferences-menu__option__description">
                      { rootStore.l10n.preferences.notifications[type.toLowerCase()] }
                    </div>
                  </div>
                  <div className="header__preferences-menu__option__actions">
                    <SwitchButton
                      value={active}
                      onChange={async () => {
                        if(active) {
                          await notificationStore.DisableNotificationType(type);
                        } else {
                          await notificationStore.EnableNotificationType(type);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })
          }
        </div>

        {

          /*
          <div className="header__preferences-menu__section">
            <div className="header__preferences-menu__label">
              { rootStore.l10n.preferences.marketplace_display_currency }
            </div>
            <div className="header__preferences-menu__hint">
              { rootStore.l10n.preferences.currency_conversion }
            </div>
            <Select
              value={checkoutStore.currency}
              onChange={currency => {
                checkoutStore.SetCurrency({currency});
                rootStore.SetLocalStorage(`preferred-currency-${rootStore.routeParams.marketplaceId}`, currency);
              }}
              activeValuePrefix={`${rootStore.l10n.preferences.display_currency}: `}
              containerClassName="header__preferences-menu__currency-select"
              options={(availableDisplayCurrencies || []).map(code => [code, currencyMap[code]])}
            />
          </div>

          {
            availableLocalizations.length === 0 ? null :
              <div className="header__preferences-menu__section">
                <div className="header__preferences-menu__label">
                  {rootStore.l10n.preferences.language}
                </div>
                <Select
                  value={rootStore.language}
                  onChange={language => rootStore.SetLanguage(language, true)}
                  activeValuePrefix={`${rootStore.l10n.preferences.language}: `}
                  containerClassName="header__preferences-menu__currency-select"
                  options={[
                    ["en", "English"],
                    ...availableLocalizations
                  ]}
                />
              </div>
          }

           */
        }
      </div>
    </Modal>
  );
});

export default PreferencesMenu;
