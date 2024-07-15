import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect} from "react-router-dom";
import {mediaPropertyStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import SearchIcon from "Assets/icons/search.svg";

import FilmIcon from "Assets/icons/icon_film.svg";
import MusicIcon from "Assets/icons/icon_music.svg";
import SoftwareIcon from "Assets/icons/icon_software.svg";
import TVIcon from "Assets/icons/icon_tv.svg";
import {PageLoader} from "Components/common/Loaders";
import {Linkish} from "Components/common/UIComponents";
import {SetImageUrlDimensions} from "../../utils/Utils";
import {LoaderImage} from "Components/properties/Common";

const MarketplaceTags = ({activeTag, setActiveTag}) => {
  const tags = [
    [rootStore.l10n.filters.marketplace_tags.all, ""],
    [rootStore.l10n.filters.marketplace_tags.film, "film", FilmIcon],
    [rootStore.l10n.filters.marketplace_tags.music, "music", MusicIcon],
    [rootStore.l10n.filters.marketplace_tags.software, "software", SoftwareIcon],
    [rootStore.l10n.filters.marketplace_tags.tv, "tv", TVIcon],
  ];

  return (
    <div className="marketplace-browser__tags">
      {tags.map(([label, value, icon]) =>
        <button
          key={`tag-${value}`}
          onClick={() => setActiveTag(value)}
          className={`marketplace-browser__tag ${value === (activeTag || "") ? "marketplace-browser__tag--active" : ""}`}
        >
          { icon ? <ImageIcon icon={icon} className="marketplace-browser__tag-icon" /> : null }
          <div className="marketplace-browser__tag-text">
            {label}
          </div>
        </button>
      )}
    </div>
  );
};

const MarketplaceFilters = observer(({SetFilters}) => {
  const [activeTag, setActiveTag] = useState(undefined);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    SetFilters({activeTags: activeTag ? [activeTag] : [], filter});
  }, [activeTag, filter]);

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
          placeholder={rootStore.l10n.filters[rootStore.pageWidth > 800 ? "search_projects_ext" : "search_projects"]}
          onChange={event => setFilter(event.target.value)}
          className="marketplace-browser__search__input"
        />
      </div>
      <div className="marketplace-browser__separator" />
      <MarketplaceTags activeTag={activeTag} setActiveTag={setActiveTag} />
    </div>
  );
});

const MarketplaceCard = observer(({marketplace, flipped, setFlipped}) => {
  const branding = (marketplace && marketplace.branding) || {};

  if(!branding.show) {
    return null;
  }

  const content = (
    <div className="marketplace-card__content">
      <div className="marketplace-card__banner-container marketplace-card__banner-container--front">
        {
          branding.card_banner_front || branding.card_banner ?
            <img
              alt={branding.name || ""}
              className="marketplace-card__banner"
              src={(branding.card_banner_front || branding.card_banner).url}
            /> :
            <div className="marketplace-card__banner-placeholder">
              { branding.name || "" }
            </div>
        }
      </div>

      <div className="marketplace-card__banner-container marketplace-card__banner-container--back">
        {
          branding.card_banner_back ?
            <img
              alt={branding.name || ""}
              className="marketplace-card__banner"
              src={branding.card_banner_back.url}
            /> :
            <div className="marketplace-card__banner-placeholder">
              { branding.name || "" }
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
      <a rel="noreferrer" target="_blank" href={branding.external_link} {...containerOptions} >
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
      marketplace && marketplace.branding && (marketplace.branding.tags || []).find(tag => filters.activeTags.includes(tag.toLowerCase()))
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
            <MarketplaceFilters SetFilters={setFilters} />
            <div className="marketplace-browser__marketplaces">
              {
                rootStore.previewMarketplaceId ?
                  <MarketplaceCard
                    marketplace={rootStore.allMarketplaces.find(({marketplaceId}) => marketplaceId === rootStore.previewMarketplaceId)}
                    setFlipped={() => setFlippedIndex("preview")}
                    flipped={flippedIndex === "preview"}
                  /> : null
              }

              {
                filteredMarketplaces.map((marketplace, index) => {
                  if(marketplace.marketplaceId === rootStore.previewMarketplaceId) { return null; }
                  return (
                    <MarketplaceCard
                      key={`${marketplace.tenantSlug}-${marketplace.marketplaceSlug}`}
                      marketplace={marketplace}
                      setFlipped={() => setFlippedIndex(index)}
                      flipped={index === flippedIndex}
                    />
                  );
                })
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

export const MediaPropertiesBrowser = observer(() => {
  const [mediaProperties, setMediaProperties] = useState(undefined);

  useEffect(() => {
    mediaPropertyStore.LoadMediaProperties()
      .then(setMediaProperties);
  }, []);

  if(!mediaProperties) {
    return <PageLoader />;
  }

  return (
    <div className="page-block page-block--marketplace-browser">
      <div className="page-block__content">
        <div className="media-property-browser">
          {
            mediaProperties.map(mediaProperty => {
              const path = mediaProperty.subPropertyId ?
                UrlJoin("/", mediaProperty.propertyId, "/p", mediaProperty.subPropertyId) :
                UrlJoin("/", mediaProperty.propertyId);

              return (
                <Linkish
                  key={`property-link-${path}`}
                  to={path}
                  onClick={() => rootStore.SetDomainCustomization(mediaProperty.subPropertyId || mediaProperty.propertyId)}
                  className="media-property-card"
                >
                  <LoaderImage
                    className="media-property-card__image"
                    src={SetImageUrlDimensions({url: mediaProperty.image?.url, width: 600})}
                    loaderAspectRatio={3/4}
                    alt={mediaProperty.title || ""}
                  />
                </Linkish>
              );
            })
          }
        </div>
      </div>
    </div>
  );
});

export default MarketplaceBrowser;
