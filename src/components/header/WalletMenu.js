import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Copy, FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Link} from "react-router-dom";
import HoverMenu from "Components/common/HoverMenu";

import CopyIcon from "Assets/icons/copy";

const WalletMenu = observer(({marketplaceId, Hide}) => {
  return (
    <HoverMenu Hide={Hide} className="header__menu header__wallet-menu">
      <h2 className="header__wallet-menu__header">{ rootStore.l10n.profile.media_wallet }</h2>
      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__section-header">{ rootStore.l10n.profile.address }</div>
        <div className="header__wallet-menu__address-container">
          <div className="header__wallet-menu__address ellipsis">
            { rootStore.CurrentAddress() }
          </div>
          <button onClick={() => Copy(rootStore.CurrentAddress())} className="header__wallet-menu__address-copy">
            <ImageIcon alt="Copy Address" icon={CopyIcon} />
          </button>
        </div>
        <div className="header__wallet-menu__message">
          { rootStore.l10n.profile.do_not_send_funds }
        </div>
      </div>

      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__section-header">{ rootStore.l10n.profile.balance.total }</div>
        <div className="header__wallet-menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true, excludeAlternateCurrency: true}) }</div>
      </div>

      <Link
        to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/wallet/profile"}
        onClick={Hide}
        className="header__wallet-menu__link"
      >
        { rootStore.l10n.profile.view.details }
      </Link>
    </HoverMenu>
  );
});

export default WalletMenu;
