import React from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {NavLink, useLocation} from "react-router-dom";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import EluvioLogo from "Assets/images/EluvioLogo.png";

export const Navigation = observer(() => {
  const location = useLocation();

  if(rootStore.hideGlobalNavigation || rootStore.hideNavigation || !rootStore.lastMarketplaceId) { return null; }

  const lastMarketplace = rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === rootStore.lastMarketplaceId);

  if(!lastMarketplace) {
    return null;
  }

  const { name, round_logo } = (lastMarketplace || {}).branding || {};

  return (
    <nav className="navigation">
      <NavLink
        isActive={() => location.pathname.startsWith("/marketplace/")}
        className={`navigation__link ${round_logo ? "navigation__link--with-logo" : ""}`}
        to={UrlJoin("/marketplace", rootStore.lastMarketplaceId, "store")}
      >
        { round_logo ? <ImageIcon icon={round_logo.url} title={(name || "") + "Store"} className="navigation__logo" /> : null }
        {`${name || ""} Store`}
      </NavLink>
      <NavLink
        isActive={() => location.pathname.startsWith("/marketplaces") || location.pathname.startsWith("/wallet")}
        className="navigation__link"
        to="/marketplaces"
      >
        <ImageIcon icon={EluvioLogo} title="Eluvio Marketplace" className="navigation__logo" />
        Marketplaces
      </NavLink>
    </nav>
  );
});

