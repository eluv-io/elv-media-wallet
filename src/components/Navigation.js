import React from "react";
import {observer} from "mobx-react";
import {NavLink} from "react-router-dom";

const Navigation = observer(() => {
  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  return (
    <nav className="navigation">
      <NavLink className="navigation__link" to="/wallet">Wallet</NavLink>
      {
        rootStore.marketplaceId ?
          <NavLink className="navigation__link" to={`/marketplaces/${rootStore.marketplaceId}`}>Marketplace</NavLink> :
          <NavLink className="navigation__link" to="/marketplaces">Discover</NavLink>
      }
    </nav>
  );
});

export default Navigation;
