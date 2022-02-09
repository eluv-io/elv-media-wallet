import React, {useState} from "react";
import {observer} from "mobx-react";
import {rootStore} from "Stores";
import {NavLink, useLocation} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";

import MenuIcon from "Assets/icons/menu";
import CloseIcon from "Assets/icons/x.svg";
import UrlJoin from "url-join";

const NavigationLinks = location => {
  const marketplaceId = (location.pathname.match(/\/marketplace\/([^\/]+)/) || [])[1];

  const marketplace = marketplaceId ?
    rootStore.marketplaces[rootStore.marketplaceId] : null;

  if(marketplaceId) {
    return [
      [
        { name: (((marketplace || {}).storefront || {}).tabs || {}).store || "Store", link: `/marketplace/${marketplaceId}/store` },
        { name: "Listings", link: `/marketplace/${marketplaceId}/listings` },
        { name: "Activity", link: `/marketplace/${marketplaceId}/activity` }
      ],
      [
        { name: (((marketplace || {}).storefront || {}).tabs || {}).collection || "My Items", link: `/marketplace/${marketplaceId}/collection` },
        { name: "My Listings", link: `/marketplace/${marketplaceId}/my-listings` },
        { name: "My Profile", link: `/marketplace/${marketplaceId}/profile`, mobileOnly: true }
      ]
    ];
  }

  return [
    [
      { name: "All Listings", link: "/wallet/listings" },
      { name: "Activity", link: "/wallet/activity" }
    ],
    [
      { name: "My Collection", link: "/wallet/collection" },
      { name: "My Listings", link: "/wallet/my-listings" },
      { name: "My Profile", link: "/profile", mobileOnly: true }
    ]
  ];
};

export const HeaderNavigation = observer(() => {
  const location = useLocation();
  const [leftLinks, rightLinks] = NavigationLinks(location);

  return (
    <nav className="header-navigation">
      <div className="header-navigation__left">
        {
          leftLinks.filter(item => !item.mobileOnly).map(({name, link}) =>
            <NavLink className="header-navigation__link" to={link} key={`nav-link-${name}`}>
              { name }
            </NavLink>
          )
        }
      </div>
      <div className="header-navigation__right">
        {
          rightLinks.filter(item => !item.mobileOnly).map(({name, link}) =>
            <NavLink className="header-navigation__link" to={link} key={`nav-link-${name}`}>
              { name }
            </NavLink>
          )
        }
      </div>
    </nav>
  );
});

const MobileNavigationMenu = ({Close}) => {
  const location = useLocation();
  const [topLinks, bottomLinks] = NavigationLinks(location);

  return (
    <nav className="mobile-navigation__menu">
      {
        topLinks.map(({name, link}) =>
          <NavLink
            className="mobile-navigation__link"
            to={link}
            key={`mobile-link-${name}`}
            onClick={Close}
          >
            <span>
              { name }
            </span>
          </NavLink>
        )
      }
      <div className="mobile-navigation__separator" />
      {
        bottomLinks.map(({name, link}) =>
          <NavLink
            className="mobile-navigation__link"
            to={link}
            key={`mobile-link-${name}`}
            onClick={Close}
          >
            <span>
              { name }
            </span>
          </NavLink>
        )
      }
    </nav>
  );
};

export const MobileNavigation = () => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="mobile-navigation">
      <button onClick={() => setShowMenu(!showMenu)} className="mobile-navigation__menu-button">
        <ImageIcon
          icon={showMenu ? CloseIcon : MenuIcon}
          title={showMenu ? "Hide Navigation" : "Show Navigation"}
        />
      </button>
      { showMenu ? <MobileNavigationMenu Close={() => setShowMenu(false)} /> : null }
    </div>
  );
};


export const Navigation = observer(() => {
  const location = useLocation();

  if(!rootStore.loggedIn || rootStore.hideNavigation || !rootStore.lastMarketplaceId) { return null; }

  const lastMarketplace = rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === rootStore.lastMarketplaceId);

  return (
    <nav className="navigation">
      <NavLink
        isActive={() => location.pathname.startsWith("/marketplace/")}
        className="navigation__link"
        to={UrlJoin("/marketplace", rootStore.lastMarketplaceId, "store")}
      >
        {
          lastMarketplace && lastMarketplace.branding && lastMarketplace.branding.name ?
            `${lastMarketplace.branding.name} Store` : "Marketplace"
        }
      </NavLink>
      <NavLink
        isActive={() => location.pathname.startsWith("/marketplaces") || location.pathname.startsWith("/wallet")}
        className="navigation__link"
        to="/marketplaces"
      >
        Eluvio Marketplace
      </NavLink>
    </nav>
  );
});

