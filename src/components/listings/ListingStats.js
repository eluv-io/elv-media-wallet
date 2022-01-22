import React, {useState, useEffect} from "react";
import {transferStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {Loader} from "Components/common/Loaders";
import {FormatPriceString} from "Components/common/UIComponents";

const ListingStats = ({mode="listings-stats", filterParams}) => {
  const match = useRouteMatch();
  const [stats, setStats] = useState(undefined);

  let params = filterParams || { mode, marketplaceId: match.params.marketplaceId };

  if(params.mode === "listings") {
    params.mode = "listing-stats";
  } else if(params.mode === "sales") {
    params.mode = "sales-stats";
  } else if(!params.mode) {
    params.mode = mode;
  }

  useEffect(() => {
    transferStore.FilteredQuery(params)
      .then(results => setStats(results));
  }, [filterParams]);

  if(!stats) {
    return (
      <div className="listing-stats">
        <Loader className="listing-stats__loader" />
      </div>
    );
  }

  return (
    <div className="listing-stats">
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          { params.mode === "listing-stats" ? "Active Listings" : "Total Sales" }
        </label>
        <div className="listing-stats__value">
          { stats.count || 0 }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          { params.mode === "listing-stats" ? "Active Listing Value" : "Total Sales Volume" }
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: stats.volume || 0}) }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          { params.mode === "listing-stats" ? "Average Listing Price" : "Average Price" }
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: stats.avg || 0}) }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Highest Price
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: stats.max || 0}) }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Lowest Price
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: stats.min || 0}) }
        </div>
      </div>
    </div>
  );
};

export default ListingStats;
