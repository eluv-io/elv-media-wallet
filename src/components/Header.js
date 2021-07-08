import React from "react";

import {observer} from "mobx-react";
import SVG from "react-inlinesvg";
import SearchIcon from "Assets/icons/search";
import {rootStore} from "Stores/index";
import {ProfileImage} from "Components/common/Images";
import {Link} from "react-router-dom";

const Header = observer(() => {
  return (
    <header className="header">
      <div className="header__search">
        <SVG className="header__search__icon" src={SearchIcon} alt="Search Icon" />
        <input className="header__search__input" placeholder="Search" />
      </div>
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
