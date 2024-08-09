import React from "react";
import {observer} from "mobx-react";
import {FormatPriceString} from "Components/common/UIComponents";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {FilteredTable} from "Components/common/Table";
import {rootStore} from "Stores";

import SalesIcon from "Assets/icons/misc/sales icon.svg";


const Activity = observer(({mode="sales", icon, hideName, tableHeader, initialFilters, ...props}) => {
  const match = useRouteMatch();

  const linkPath = match.url.startsWith("/marketplace") ?
    UrlJoin("/marketplace", match.params.marketplaceId, "activity") :
    UrlJoin("/wallet", "activity");

  return (
    <FilteredTable
      mode={mode}
      showFilters
      showStats
      pagingMode="paginated"
      perPage={10}
      initialFilters={initialFilters}
      className="transfer-table--activity"
      headerText={tableHeader}
      headerIcon={icon}
      columnHeaders={[
        rootStore.l10n.tables.columns.name,
        rootStore.l10n.tables.columns.time,
        rootStore.l10n.tables.columns.token_id,
        rootStore.l10n.tables.columns.total_amount,
        rootStore.l10n.tables.columns.buyer,
        rootStore.l10n.tables.columns.seller
      ]}
      CalculateRowValues={transfer => ({
        columns: [
          transfer.name,
          Ago(transfer.created * 1000),
          transfer.token,
          FormatPriceString(transfer.price),
          MiddleEllipsis(transfer.buyer, 14),
          MiddleEllipsis(transfer.seller, 14)
        ],
        link: transfer.contract && transfer.token ?
          UrlJoin(linkPath, `ictr${Utils.AddressToHash(transfer.contract)}`, transfer.token) :
          undefined
      })}
      columnWidths={[hideName ? 0 : 3, 2, 2, 2, 2, 2]}
      tabletColumnWidths={[hideName ? 0 : 3, 2, 2, 2, 0, 0]}
      mobileColumnWidths={[hideName ? 0 : 3, 0, 2, 2, 0, 0]}
      hideOverflow
      {...props}
    />
  );
});

export const RecentSales = ({...props}) => (
  <Activity icon={SalesIcon} tableHeader={rootStore.l10n.tables.activity} {...props} />
);

export default Activity;
