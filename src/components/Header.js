import React from "react";

import {observer} from "mobx-react";
import {rootStore} from "Stores/index";
import {ProfileImage} from "Components/common/Images";
import {Link} from "react-router-dom";

const Header = observer(() => {
  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  return (
    <header className="header">
      <Link to="/profile" className="header__profile">
        <div className="header__profile__name">
          { rootStore.profileMetadata.public.name }
        </div>
        <ProfileImage className="header__profile__image" />
      </Link>
    </header>
  );
});

export default Header;
