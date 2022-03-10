import React from "react";
import {FormatPriceString} from "Components/common/UIComponents";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {Link, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";

const Activity = ({header, hideFilters, hideStats, tableHeader, initialFilters}) => {
  const match = useRouteMatch();

  const linkPath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "activity") :
    UrlJoin("/wallet", "activity");

  return (
    <FilteredView
      mode="sales"
      perPage={100}
      expectRef
      loadOffset={1500}
      hideFilters={hideFilters}
      hideStats={hideStats}
      initialFilters={initialFilters}
      header={header}
      Render={({entries, paging, scrollRef, loading}) => (
        <div
          className="transfer-table activity-table"
          style={!loading && entries.length === 0 ? { visibility: "hidden" } : {}}
        >
          {
            !tableHeader ? null :
              <div className="transfer-table__header">
                { tableHeader }
              </div>
          }
          {
            !paging ? null :
              <div className="transfer-table__pagination">
                {
                  paging.total <= 0 ?
                    "No Results" :
                    `Showing 1 - ${entries.length} of ${paging.total} results`
                }
              </div>
          }
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
                !entries || entries.length === 0 ?
                  <div className="transfer-table__empty">No Sales</div> :
                  entries.map(transfer =>
                    <Link
                      to={transfer.contract && transfer.token ? UrlJoin(linkPath, `ictr${Utils.AddressToHash(transfer.contract)}`, transfer.token) : null}
                      className={`transfer-table__table__row ${!transfer.contract || !transfer.token ? "transfer-table__table__row--no-click" : ""}`}
                      key={`transfer-table-row-${transfer.id}`}
                    >
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
                    </Link>
                  )
              }
            </div>
          </div>
        </div>
      )}
    />
  );
};

export const RecentSales = () => (
  <Activity
    header="Sales History"
    tableHeader="Recent Sales"
  />
);

export default Activity;
