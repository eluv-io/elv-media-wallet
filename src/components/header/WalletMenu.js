import React, {useEffect, useRef} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {Copy, FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";
import {Link} from "react-router-dom";

import CopyIcon from "Assets/icons/copy";

const WalletMenu = observer(({marketplaceId, Hide}) => {
  const menuRef = useRef();

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const onClickOutside = event => {
      if(!menuRef?.current || !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, [menuRef]);

  return (
    <div className="header__menu header__wallet-menu" ref={menuRef}>
      <h2 className="header__wallet-menu__header">Media Wallet</h2>
      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__section-header">My Eluvio Content Blockchain Address</div>
        <div className="header__wallet-menu__address-container">
          <div className="header__wallet-menu__address ellipsis">
            { rootStore.CurrentAddress() }
          </div>
          <button onClick={() => Copy(rootStore.CurrentAddress())} className="header__wallet-menu__address-copy">
            <ImageIcon alt="Copy Address" icon={CopyIcon} />
          </button>
        </div>
        <div className="header__wallet-menu__message">
          Do not send funds to this address. This is an Eluvio Content Blockchain address and is not a payment address.
        </div>
      </div>

      <div className="header__wallet-menu__section">
        <div className="header__wallet-menu__section-header">My Seller Balance</div>
        <div className="header__wallet-menu__balance">{ FormatPriceString(rootStore.totalWalletBalance, {includeCurrency: true, prependCurrency: true, excludeAlternateCurrency: true}) }</div>
      </div>

      <Link
        to={marketplaceId ? `/marketplace/${marketplaceId}/profile` : "/wallet/profile"}
        onClick={Hide}
        className="header__wallet-menu__link"
      >
        View Details
      </Link>
    </div>
  );
});

export default WalletMenu;
