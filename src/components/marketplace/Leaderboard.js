import React from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import {FilteredTable} from "Components/common/Table";

import LeaderboardIcon from "Assets/icons/leaderboard icon.svg";

const Leaderboard = observer(() => {
  const match = useRouteMatch();

  return (
    <FilteredTable
      mode="leaderboard"
      pagingMode="paginated"
      perPage={20}
      initialFilters={{
        marketplaceParams: {
          marketplaceId: match.params.marketplaceId
        }
      }}
      className="transfer-table--leaderboard"
      headerText={rootStore.l10n.tables.leaderboard}
      headerIcon={LeaderboardIcon}
      columnHeaders={[
        rootStore.l10n.tables.columns.rank,
        rootStore.l10n.tables.columns.username,
        rootStore.l10n.tables.columns.address,
        rootStore.l10n.tables.columns.total_collectibles,
      ]}
      CalculateRowValues={entry => ({
        columns: [
          entry.rank,
          entry.username ? `@${entry.username }` : (rootStore.pageWidth <= 1250 ? entry.addr : null),
          entry.addr,
          entry.count
        ],
        link: UrlJoin("/marketplace", match.params.marketplaceId, "users", entry.username || entry.addr, "items")
      })}
      columnWidths={["100px", 2, 3, "250px"]}
      tabletColumnWidths={["100px", 1, 0, "250px"]}
      mobileColumnWidths={[1, 2, 0, 0]}
      hideOverflow
    />
  );
});

export default Leaderboard;
