import React, {useState, useEffect} from "react";
import {rootStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {Loader} from "Components/common/Loaders";
import {FormatPriceString} from "Components/common/UIComponents";

const ListingStats = ({mode="listings", filterParams}) => {
  const match = useRouteMatch();
  const [stats, setStats] = useState(undefined);

  let params = filterParams || { mode, marketplaceId: match.params.marketplaceId };

  useEffect(() => {
    if(mode === "listings") {
      rootStore.walletClient.ListingStats(params)
        .then(results => setStats(results));
    } else {
      rootStore.walletClient.SalesStats(params)
        .then(results => setStats(results));
    }
  }, [filterParams]);

  if(!stats) {
    return (
      <div className="stats">
        <Loader className="stats__loader" />
      </div>
    );
  }

  return (
    <div className="stats">
      <div className="stats__item">
        <label className="stats__label">
          { mode === "listings" ? "Active Listings" : "Total Secondary Sales" }
        </label>
        <div className="stats__value">
          { stats.count || 0 }
        </div>
      </div>
      <div className="stats__item">
        <label className="stats__label">
          { mode === "listings" ? "Active Listing Value" : "Secondary Sales Volume" }
        </label>
        <div className="stats__value">
          { FormatPriceString(stats.volume || 0, {vertical: true}) }
        </div>
      </div>
      <div className="stats__item">
        <label className="stats__label">
          { mode === "listings" ? "Average Listing Price" : "Average Price" }
        </label>
        <div className="stats__value">
          { FormatPriceString(stats.avg || 0, {vertical: true}) }
        </div>
      </div>
      <div className="stats__item">
        <label className="stats__label">
          Highest Price
        </label>
        <div className="stats__value">
          { FormatPriceString(stats.max || 0, {vertical: true}) }
        </div>
      </div>
      <div className="stats__item">
        <label className="stats__label">
          Lowest Price
        </label>
        <div className="stats__value">
          { FormatPriceString(stats.min || 0, {vertical: true}) }
        </div>
      </div>
    </div>
  );
};

export default ListingStats;
