import React, {useState, useEffect} from "react";
import {transferStore} from "Stores";
import {useRouteMatch} from "react-router-dom";
import {Loader} from "Components/common/Loaders";
import {FormatPriceString} from "Components/common/UIComponents";

const ListingStats = ({mode="listings"}) => {
  const match = useRouteMatch();
  const [stats, setStats] = useState(undefined);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  useEffect(() => {
    transferStore.TransferStats({marketplace: marketplace})
      .then(results => setStats(results));
  });

  if(!stats) {
    return (
      <div className="listing-stats">
        <Loader className="listing-stats__loader" />
      </div>
    );
  }

  const info = mode === "listings" ? stats.listed : stats.sold;

  return (
    <div className="listing-stats">
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Active Listings
        </label>
        <div className="listing-stats__value">
          { stats.listed.count }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Total Sales
        </label>
        <div className="listing-stats__value">
          { stats.sold.count }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Total Volume
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: info.volume}) }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Average Price
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: info.avg}) }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Highest Price
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: info.max}) }
        </div>
      </div>
      <div className="listing-stats__item">
        <label className="listing-stats__label">
          Lowest Price
        </label>
        <div className="listing-stats__value">
          { FormatPriceString({USD: info.min}) }
        </div>
      </div>
    </div>
  );
};

export default ListingStats;
