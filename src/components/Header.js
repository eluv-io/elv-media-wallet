import React from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink} from "react-router-dom";

import BackIcon from "Assets/icons/arrow-left-circle.svg";
import ImageIcon from "Components/common/ImageIcon";

const Header = observer(() => {
  if(!rootStore.loggedIn) { return null; }

  if(rootStore.hideNavigation || rootStore.sidePanelMode) {
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
        <div className="header__profile__name">
          { rootStore.userProfile.name }
        </div>
        <ProfileImage className="header__profile__image" />
      </Link>
    </header>
  );
});

export default Header;
