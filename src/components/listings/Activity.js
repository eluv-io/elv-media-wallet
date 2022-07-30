import React from "react";
import {observer} from "mobx-react";
import {FormatPriceString} from "Components/common/UIComponents";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import Table from "Components/common/Table";

import SalesIcon from "Assets/icons/misc/sales icon.svg";

const Activity = observer(({mode="sales", icon, header, hideName, hideFilters, hideStats, tableHeader, initialFilters}) => {
  const match = useRouteMatch();

  const linkPath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "activity") :
    UrlJoin("/wallet", "activity");

  return (
    <FilteredView
      mode={mode}
      perPage={20}
      scrollOnPageChange
      expectRef
      hideFilters={hideFilters}
      hideStats={hideStats}
      initialFilters={initialFilters}
      header={header}
      Render={({entries, paging}) => (
        <Table
          className="transfer-table--activity"
          pagingMode="none"
          headerText={tableHeader}
          headerIcon={icon}
          columnHeaders={[
            "Name",
            "Time",
            "Token ID",
            "Total Amount",
            "Buyer",
            "Seller"
          ]}
          entries={
            entries.map(transfer => ({
              columns: [
                transfer.name,
                `${Ago(transfer.created * 1000)} ago`,
                transfer.token,
                FormatPriceString({USD: transfer.price}),
                MiddleEllipsis(transfer.buyer, 14),
                MiddleEllipsis(transfer.seller, 14)
              ],
              link: transfer.contract && transfer.token ?
                UrlJoin(linkPath, `ictr${Utils.AddressToHash(transfer.contract)}`, transfer.token) :
                undefined
            }))
          }
          paging={paging}
          columnWidths={[hideName ? 0 : 2, 2, 1, 2, 2, 2]}
          tabletColumnWidths={[hideName ? 0 : 2, 2, 1, 2, 0, 0]}
          mobileColumnWidths={[hideName ? 0 : 2, 0, 1, 2, 0, 0]}
          hideOverflow
        />
      )}
    />
  );
});

export const RecentSales = () => (
  <Activity icon={SalesIcon} tableHeader="Recent Sales" />
);

export default Activity;
