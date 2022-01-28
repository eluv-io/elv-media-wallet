import React, {useEffect} from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink} from "react-router-dom";
import {FormatPriceString} from "Components/common/UIComponents";
import ImageIcon from "Components/common/ImageIcon";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import MarketplacesIcon from "Assets/icons/More from Collection icon.svg";

const Header = observer(() => {
  useEffect(() => {
    rootStore.GetWalletBalance();

    let interval = setInterval(() => rootStore.GetWalletBalance(), 120000);
    return () => clearInterval(interval);
  }, []);

  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  if(rootStore.sidePanelMode) {
    if(rootStore.navigationBreadcrumbs.length <= 2) { return null; }

    return (
      <header className="header">
        <div className="header__content">
          <div className="header__breadcrumbs">
            <NavLink
              className="header__breadcrumbs__back-button"
              to={rootStore.navigationBreadcrumbs[rootStore.navigationBreadcrumbs.length - 2].path}
            >
              <ImageIcon icon={BackIcon} title="Back" />
            </NavLink>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header__content">
        <div className="header__breadcrumbs">
          {
            <NavLink
              className={`header__breadcrumbs__marketplaces-button ${window.location.hash === "#/marketplaces" ? "header__breadcrumbs__marketplaces-button-active" : ""}`}
              to="/marketplaces"
            >
              <ImageIcon icon={MarketplacesIcon} title="All Marketplaces" />
            </NavLink>
          }

          {
            rootStore.navigationBreadcrumbs.length > 1 ?
              <NavLink
                className="header__breadcrumbs__back-button"
                to={rootStore.navigationBreadcrumbs[rootStore.navigationBreadcrumbs.length - 2].path}
              >
                <ImageIcon icon={BackIcon} title="Back" />
              </NavLink> : null
          }
          {
            rootStore.navigationBreadcrumbs.map(({name, path}, index) => {
              const last = index === rootStore.navigationBreadcrumbs.length - 1;

              if(!name) { return null; }

              return (
                <div className="header__breadcrumb" key={`header-breadcrumb-${path}`}>
                  <NavLink to={path} isActive={() => last} className="header__breadcrumb__link">{name}</NavLink>
                  { last ? null : <div className="header__breadcrumb__separator">/</div> }
                </div>
              );
            })
          }
        </div>
        <Link to="/profile" className="header__profile">
          <div className="header__profile__info ellipsis">
            <div className="header__profile__name">
              { rootStore.userProfile.name }
            </div>
            {
              typeof rootStore.totalWalletBalance !== "undefined" ?
                <div
                  className="header__profile__balance"
                  title={`Total balance: ${FormatPriceString({USD: rootStore.totalWalletBalance})}\nAvailable balance: ${FormatPriceString({USD: rootStore.availableWalletBalance}) }\nPending balance: ${FormatPriceString({USD: rootStore.pendingWalletBalance}) }`}
                >
                  { FormatPriceString({USD: rootStore.totalWalletBalance}) }
                  { rootStore.pendingWalletBalance ? <div className="header__profile__pending-indicator">*</div> : null}
                </div> : null
            }
          </div>
          <ProfileImage className="header__profile__image" />
        </Link>
      </div>
    </header>
  );
});

export default Header;
