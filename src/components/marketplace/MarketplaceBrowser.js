import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import FilterIcon from "Assets/icons/filter icon.svg";
import SearchIcon from "Assets/icons/search.svg";
import CloseIcon from "Assets/icons/x.svg";
import CheckIcon from "Assets/icons/check.svg";

const MarketplaceTagMenu = ({tags, activeTags, setActiveTags, Hide}) => {
  const menuRef = useRef();

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const onClickOutside = event => {
      if(!menuRef?.current || !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, [menuRef]);

  return (
    <div className="marketplace-browser__tag-menu" ref={menuRef}>
      {
        tags.map(tag =>
          <button
            key={`tag-${tag}`}
            className="marketplace-browser__tag-menu__tag"
            onClick={() => {
              if(activeTags.includes(tag)) {
                setActiveTags(activeTags.filter(activeTag => activeTag !== tag));
              } else {
                setActiveTags([...activeTags, tag]);
              }
            }}
          >
            {
              activeTags.includes(tag) ?
                <ImageIcon icon={CheckIcon} className="marketplace-browser__tag-menu__tag__icon" /> :
                <div className="marketplace-browser__tag-menu__tag__icon marketplace-browser__tag-menu__tag__icon--placeholder" />
            }
            <div className="marketplace-browser__tag-menu__tag__text">
              { tag }
            </div>
          </button>
        )
      }
    </div>
  );
};

const MarketplaceTags = ({tags, activeTags, setActiveTags}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <div className="marketplace-browser__tags">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`marketplace-browser__tags__button ${showMenu ? "active" : ""}`}
        >
          <ImageIcon icon={FilterIcon} />
          <div className="marketplace-browser__tags__button__text">
            All Filters
          </div>
        </button>
        {
          activeTags.map(tag =>
            <button
              key={`filter-button-${tag}`}
              className="marketplace-browser__active-tag"
              onClick={() => setActiveTags(activeTags.filter(activeTag => activeTag !== tag))}
            >
              <div className="marketplace-browser__active-tag__text">{ tag }</div>
              <ImageIcon icon={CloseIcon} className="marketplace-browser__active-tag__icon" />
            </button>
          )
        }
      </div>
      { showMenu ? <MarketplaceTagMenu tags={tags} activeTags={activeTags} setActiveTags={setActiveTags} Hide={() => setShowMenu(false)} /> : null }
    </>
  );
};

const MarketplaceFilters = observer(({marketplaces, SetFilters}) => {
  const [activeTags, setActiveTags] = useState([]);
  const [filter, setFilter] = useState("");

  let tags = [ ...new Set(marketplaces.map(marketplace => marketplace.branding && marketplace.branding.tags || []).flat()) ].sort();

  marketplaces.map(m => m?.branding?.tags);

  useEffect(() => {
    SetFilters({activeTags, filter});
  }, [activeTags, filter]);

  return (
    <div className="marketplace-browser__filters">
      <div className="marketplace-browser__search">
        <ImageIcon
          icon={SearchIcon}
          className="marketplace-browser__search__icon"
          alt="Search Icon"
        />
        <input
          value={filter}
          placeholder={rootStore.pageWidth > 800 ? "Search projects, nft, media, ar experience apps" : "Search Projects"}
          onChange={event => setFilter(event.target.value)}
          className="marketplace-browser__search__input"
        />
      </div>
      <div className="marketplace-browser__separator" />
      <MarketplaceTags tags={tags} activeTags={activeTags} setActiveTags={setActiveTags} />
    </div>
  );
});

const MarketplaceCard = observer(({marketplace, flipped, setFlipped}) => {
  const branding = (marketplace && marketplace.branding) || {};

  if(!branding.name || !branding.show) {
    return null;
  }

  const content = (
    <div className="marketplace-card__content" title={branding.name}>
      <div className="marketplace-card__banner-container marketplace-card__banner-container--front">
        {
          branding.card_banner_front || branding.card_banner ?
            <img
              alt={branding.name}
              className="marketplace-card__banner"
              src={(branding.card_banner_front || branding.card_banner).url}
            /> :
            <div className="marketplace-card__banner-placeholder">
              { branding.name }
            </div>
        }
      </div>

      <div className="marketplace-card__banner-container marketplace-card__banner-container--back">
        {
          branding.card_banner_back ?
            <img
              alt={branding.name}
              className="marketplace-card__banner"
              src={branding.card_banner_back.url}
            /> :
            <div className="marketplace-card__banner-placeholder">
              { branding.name }
            </div>
        }
      </div>
    </div>
  );

  const containerOptions = {
    className: `marketplace-card ${flipped ? "marketplace-card--flipped" : ""}`,
    onClick: event => {
      if(rootStore.pageWidth > 900 || flipped) { return; }

      event.preventDefault();
      event.stopPropagation();

      setFlipped(true);
    }
  };

  if(branding.external_link) {
    return (
      <a rel="noopener" target="_blank" href={branding.external_link} {...containerOptions} >
        { content }
        { branding.preview ? <div className="marketplace-card__notice">PREVIEW</div> : null }
      </a>
    );
  }

  return (
    <Link to={UrlJoin("/marketplace", marketplace.marketplaceId)} {...containerOptions} >
      { content }
      { branding.preview ? <div className="marketplace-card__notice">PREVIEW</div> : null }
    </Link>
  );
});

const MarketplaceBrowser = observer(() => {
  const [flippedIndex, setFlippedIndex] = useState(-1);
  const [filters, setFilters] = useState({activeTags: [], filter: ""});

  if(rootStore.hideGlobalNavigation && rootStore.specifiedMarketplaceId) {
    return <Redirect to={UrlJoin("/marketplace", rootStore.specifiedMarketplaceId, "store")} />;
  }

  let availableMarketplaces = rootStore.allMarketplaces
    .filter(marketplace => marketplace?.branding?.show);

  let filteredMarketplaces = availableMarketplaces;
  if(filters.activeTags && filters.activeTags.length > 0) {
    filteredMarketplaces = filteredMarketplaces.filter(marketplace =>
      marketplace && marketplace.branding && (marketplace.branding.tags || []).find(tag => filters.activeTags.includes(tag))
    );
  }

  if(filters.filter) {
    const filter = (filters.filter || "").toLowerCase();
    filteredMarketplaces = filteredMarketplaces.filter(marketplace =>
      marketplace && marketplace.branding &&
      (
        (marketplace.branding.name || "").toLowerCase().includes(filter) ||
        (marketplace.branding.description || "").toLowerCase().includes(filter)
      )
    );
  }

  useEffect(() => {
    rootStore.ClearMarketplace();
  }, []);

  return (
    <div className="page-block page-block--marketplace-browser">
      <div className="page-block__content">
        <div className="marketplace-browser">
          <div className="content content--no-background">
            <MarketplaceFilters marketplaces={availableMarketplaces} SetFilters={setFilters} />
            <div className="marketplace-browser__marketplaces">
              {
                filteredMarketplaces.map((marketplace, index) =>
                  <MarketplaceCard
                    key={`${marketplace.tenantSlug}-${marketplace.marketplaceSlug}`}
                    marketplace={marketplace}
                    setFlipped={() => setFlippedIndex(index)}
                    flipped={index === flippedIndex}
                  />
                )
              }
              {
                // Fill any empty spaces with dummy elements to keep the grid at 3 columns
                [...new Array(Math.max(0, 3 - filteredMarketplaces.length))]
                  .map((_, i) => <div className="marketplace-browser__dummy-card" key={`dummy-${i}`} /> )
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MarketplaceBrowser;
