import React, {useState} from "react";
import {PageLoader} from "Components/common/Loaders";
import {FormatPriceString} from "Components/common/UIComponents";
import ListingStats from "Components/listings/ListingStats";
import ListingFilters from "Components/listings/ListingFilters";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import {useInfiniteScroll} from "react-g-infinite-scroll";

const Activity = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadKey, setLoadKey] = useState(1);
  const [finished, setFinished] = useState(false);

  const scrollRef = useInfiniteScroll({
    expectRef: true,
    fetchMore: () => setLoadKey(loadKey + 1),
    ignoreScroll: loading || finished
  });

  return (
    <div className="marketplace-listings marketplace__section">
      <h1 className="page-header">Sales History</h1>
      <ListingStats mode="sales" />
      <ListingFilters
        perPage={50}
        Loading={setLoading}
        UpdateListings={setSales}
        mode="sales"
        loadKey={loadKey}
        setLoading={setLoading}
        setFinished={setFinished}
      />
      {
        // Initial Load
        loading && sales.length === 0 ? <PageLoader/> : null
      }
      <div className="transfer-table activity-table">
        <div className="transfer-table__header">
          Recent Sales
        </div>
        <div className="transfer-table__table" ref={scrollRef}>
          <div className="transfer-table__table__header">
            <div className="transfer-table__table__cell">Name</div>
            <div className="transfer-table__table__cell">Token ID</div>
            <div className="transfer-table__table__cell no-mobile">Time</div>
            <div className="transfer-table__table__cell">Total Amount</div>
            <div className="transfer-table__table__cell no-tablet">Buyer</div>
            <div className="transfer-table__table__cell no-tablet">Seller</div>
          </div>
          <div className="transfer-table__content-rows">
            {
              !sales || sales.length === 0 ?
                <div className="transfer-table__empty">No Sales</div> :
                sales.map(transfer =>
                  <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                    <div className="transfer-table__table__cell">
                      { transfer.name }
                    </div>
                    <div className="transfer-table__table__cell">
                      { transfer.token }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { Ago(transfer.created * 1000) } ago
                    </div>
                    <div className="transfer-table__table__cell">
                      { FormatPriceString({USD: transfer.price}) }
                    </div>
                    <div className="transfer-table__table__cell no-tablet">
                      { MiddleEllipsis(transfer.buyer, 14) }
                    </div>
                    <div className="transfer-table__table__cell no-tablet">
                      { MiddleEllipsis(transfer.seller, 14) }
                    </div>
                  </div>
                )
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activity;
