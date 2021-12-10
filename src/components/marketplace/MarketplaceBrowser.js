import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {MarketplaceImage} from "Components/common/Images";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";

const MarketplaceBrowser = observer(() => {
  let match = useRouteMatch();

  useEffect(() => rootStore.SetMarketplaceFilters([]), []);

  return (
    <div className="marketplace-browser content">
      <h1 className="page-header">Marketplace</h1>
      <div className="card-list">
        { Object.keys(rootStore.marketplaces).map((marketplaceId, index) => {
          const marketplace = rootStore.marketplaces[marketplaceId];

          if(!marketplace) { return null; }

          const imageUrl = rootStore.PublicLink({
            versionHash: marketplace.versionHash,
            path: UrlJoin("public", "asset_metadata", "info", "images", "image"),
            queryParams: { width: 400 }
          });

          return (
            <div className="card-container card-container-marketplace" key={`marketplace-${index}`}>
              <Link
                to={`${match.url}/${marketplaceId}`}
                className="card nft-card"
              >
                <MarketplaceImage title={marketplace.name} url={imageUrl} />
                <div className="card__text">
                  <div className="card__titles">
                    <h2 className="card__title">
                      { marketplace.name }
                    </h2>
                    <ResponsiveEllipsis
                      className="card__subtitle"
                      component="h2"
                      text={marketplace.description}
                      maxLine="3"
                    />
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default MarketplaceBrowser;
