import React from "react";
import {observer} from "mobx-react";
import Modal from "Components/common/Modal";
import {Select} from "Components/common/UIComponents";
import {checkoutStore, rootStore} from "Stores";
import CountryCodesList from "country-codes-list";

const currencyMap = CountryCodesList.customList("currencyCode", "{currencyNameEn}");

const PreferencesMenu = observer(({marketplaceId, availableDisplayCurrencies, Hide}) => {
  if(!availableDisplayCurrencies.find(currency => currency.toUpperCase() === "USD")) {
    availableDisplayCurrencies = ["USD", ...availableDisplayCurrencies];
  }

  return (
    <Modal className="header__preferences-menu-modal" Toggle={Hide}>
      <div className="header__preferences-menu">
        <div className="header__preferences-menu__label">
          Set Marketplace Display Currency
        </div>
        <div className="header__preferences-menu__hint">
          This is a conversion computed from USD
        </div>
        <Select
          value={checkoutStore.currency}
          onChange={currency => {
            checkoutStore.SetCurrency({currency});
            rootStore.SetLocalStorage(`preferred-currency-${marketplaceId}`, currency);
          }}
          activeValuePrefix="Display Currency: "
          containerClassName="header__preferences-menu__currency-select"
          options={(availableDisplayCurrencies || []).map(code => [code, currencyMap[code]])}
        />
      </div>
    </Modal>
  );
});

export default PreferencesMenu;
