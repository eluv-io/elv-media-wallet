import React from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {ProfileImage} from "Components/common/Images";
import {Link, NavLink} from "react-router-dom";

const Header = observer(() => {
  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  return (
    <header className="header">
      <div className="header__breadcrumbs">
        {
          rootStore.navigationBreadcrumbs.map(({name, path}, index) => {
            const last = index === rootStore.navigationBreadcrumbs.length - 1;

            return (
              <>
                <NavLink to={path} isActive={() => last} className="header__breadcrumbs__link">{name}</NavLink>
                { last ? null : <div className="header__breadcrumbs__separator">/</div> }
              </>
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
