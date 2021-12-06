import React from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink} from "react-router-dom";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import ImageIcon from "Components/common/ImageIcon";
import USDCIcon from "Assets/icons/usd-coin-usdc-logo.svg";

const Header = observer(() => {
  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  if(rootStore.sidePanelMode) {
    if(rootStore.navigationBreadcrumbs.length <= 2) { return null; }

    return (
      <header className="header">
        <div className="header__breadcrumbs">
          <NavLink
            className="header__breadcrumbs__back-button"
            to={rootStore.navigationBreadcrumbs[rootStore.navigationBreadcrumbs.length - 2].path}
          >
            <ImageIcon icon={BackIcon} title="Back" />
          </NavLink>
        </div>
        <div className="header__separator" />
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header__breadcrumbs">
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
        <div className="header__profile__info">
          <div className="header__profile__name">
            { rootStore.userProfile.name }
          </div>
          {
            rootStore.usdcBalance ?
              <div className="header__profile__balance">
                <ImageIcon icon={USDCIcon} title="Balance in USDC"/>
                {rootStore.usdcBalance}
              </div> : null
          }
        </div>
        <ProfileImage className="header__profile__image" />
      </Link>
      <div className="header__separator" />
    </header>
  );
});

export default Header;
