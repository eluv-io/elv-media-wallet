import React from "react";
import {FormatPriceString} from "Components/common/UIComponents";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {Link, useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";

import SalesIcon from "Assets/icons/misc/sales icon.svg";

const Activity = ({mode="sales", icon, header, hideName, hideFilters, hideStats, tableHeader, initialFilters}) => {
  const match = useRouteMatch();

  const linkPath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "activity") :
    UrlJoin("/wallet", "activity");

  return (
    <FilteredView
      mode={mode}
      perPage={100}
      expectRef
      loadOffset={1500}
      hideFilters={hideFilters}
      hideStats={hideStats}
      initialFilters={initialFilters}
      header={header}
      cacheDuration={10}
      Render={({entries, paging, scrollRef}) => (
        <div className="transfer-table activity-table">
          {
            !tableHeader ? null :
              <div className="transfer-table__header">
                { icon ? <ImageIcon icon={icon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
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
              { hideName ? null : <div className="transfer-table__table__cell">Name</div> }
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
                  entries.map(transfer => {
                    const link = transfer.contract && transfer.token ? UrlJoin(linkPath, `ictr${Utils.AddressToHash(transfer.contract)}`, transfer.token) : undefined;

                    // Link complains if 'to' is blank, so use div instead
                    const Component = link ? Link : ({children, ...props}) => <div {...props}>{children}</div>;
                    return (
                      <Component
                        to={link}
                        className={`transfer-table__table__row ${!transfer.contract || !transfer.token ? "transfer-table__table__row--no-click" : ""}`}
                        key={`transfer-table-row-${transfer.id}`}
                      >
                        {
                          hideName ? null :
                            <div className="transfer-table__table__cell">
                              {transfer.name}
                            </div>
                        }
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
                      </Component>
                    );
                  })
              }
            </div>
          </div>
        </div>
      )}
    />
  );
};

export const RecentSales = () => (
  <Activity icon={SalesIcon} tableHeader="Recent Sales" />
);

export default Activity;
