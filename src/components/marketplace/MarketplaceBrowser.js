import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import AsyncComponent from "Components/common/AsyncComponent";

import SearchIcon from "Assets/icons/search.svg";
import ImageIcon from "Components/common/ImageIcon";

const MarketplaceFilters = observer(({SetFilters}) => {
  const [activeTags, setActiveTags] = useState({});
  const [filter, setFilter] = useState("");

  const marketplaces = rootStore.allMarketplaces;
  let tags = [ ...new Set(marketplaces.map(marketplace => (marketplace.discovery || {}).tags || []).flat()) ];

  useEffect(() => {
    const tags = Object.keys(activeTags).filter(tag => activeTags[tag]);

    SetFilters({activeTags: tags, filter});
  }, [activeTags, filter]);

  return (
    <div className="marketplace-browser__filters">
      <div className="marketplace-browser__filters__content">
        <div className="marketplace-browser__tags">
          {
            tags.map(tag => {
              const active = activeTags[tag] || false;

              return (
                <button
                  key={`marketplace-tags-${tag}`}
                  className={`action ellipsis marketplace-browser__tag ${active ? "marketplace-browser__tag-active" : ""}`}
                  onClick={() => setActiveTags({...activeTags, [tag]: !active})}
                >
                  { tag }
                </button>
              );
            })
          }
        </div>
        <div className="marketplace-browser__filter">
          <ImageIcon
            icon={SearchIcon}
            className="marketplace-browser__filter-icon"
            alt="Search Icon"
          />
          <input
            value={filter}
            placeholder="Search Marketplaces..."
            onChange={event => setFilter(event.target.value)}
            className="action marketplace-browser__filter-input"
          />
        </div>
      </div>
    </div>
  );
});

const MarketplaceCard = observer(({marketplace}) => {
  if(!marketplace.discovery) {
    return null;
  }

  const info = marketplace.discovery || {};

  return (
    <Link to={UrlJoin("/marketplace", marketplace.marketplaceId)} className="card-shadow marketplace-card">
      {
        info.card_banner ?
          <img
            alt={info.name}
            className="marketplace-card__banner"
            src={info.card_banner.url}
          /> : null
      }

      <div className="marketplace-card__details">
        {
          info.round_logo ?
            <div className="marketplace-card__logo-container">
              <img
                alt={info.name}
                className="marketplace-card__logo"
                src={info.round_logo.url}
              />
            </div> : null
        }
        <h2 className="marketplace-card__name">{ info.name }</h2>
        <h3 className="marketplace-card__subheader">{ info.subheader }</h3>
        <ResponsiveEllipsis
          component="div"
          className="marketplace-card__description"
          text={info.description + " " + info.description + " " + info.description + " " + info.description + " " + info.description + " " + info.description + " " + info.description}
          maxLine="5"
        />
      </div>
    </Link>
  );
});

const MarketplaceBrowser = observer(() => {
  const [filters, setFilters] = useState({activeTags: [], filter: ""});

  let marketplaces = rootStore.allMarketplaces;

  if(filters.activeTags && filters.activeTags.length > 0) {
    marketplaces = marketplaces.filter(marketplace =>
      marketplace && marketplace.discovery && (marketplace.discovery.tags || [])
        .find(tag => filters.activeTags.includes(tag))
    );
  }

  if(filters.filter) {
    const filter = (filters.filter || "").toLowerCase();
    marketplaces = marketplaces.filter(marketplace =>
      marketplace && marketplace.discovery &&
      (
        (marketplace.discovery.name || "").toLowerCase().includes(filter) ||
        (marketplace.discovery.description || "").toLowerCase().includes(filter)
      )
    );
  }

  return (
    <AsyncComponent
      loadingClassName="page-loader"
      loadKey="all-marketplaces"
      cacheSeconds={900}
      Load={async () => await rootStore.LoadAvailableMarketplaces({})}
    >
      <div className="marketplace-browser">
        <MarketplaceFilters SetFilters={setFilters} />
        <div className="content">
          <div className="marketplace-browser__marketplaces">
            {
              marketplaces.map(marketplace =>
                <MarketplaceCard
                  key={`${marketplace.tenantSlug}-${marketplace.marketplaceSlug}`}
                  marketplace={marketplace}
                />
              )
            }
          </div>
        </div>
      </div>
    </AsyncComponent>
  );
});

export default MarketplaceBrowser;
