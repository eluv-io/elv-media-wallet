import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {NavLink} from "react-router-dom";

const Navigation = observer(() => {
  if(!rootStore.loggedIn || rootStore.hideNavigation) { return null; }

  return (
    <nav className="navigation">
      {
        rootStore.marketplaceId ?
          <NavLink className="navigation__link" to={`/marketplace/${rootStore.marketplaceId}`}>Marketplace</NavLink> :
          <NavLink className="navigation__link" to={"/marketplaces"}>Marketplaces</NavLink>
      }
      <NavLink className="navigation__link" to="/wallet">Wallet</NavLink>
    </nav>
  );
});

export default Navigation;
