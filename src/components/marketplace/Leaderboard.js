import React from "react";
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
      perPage={50}
      initialFilters={{
        marketplaceId: match.params.marketplaceId
      }}
      className="transfer-table--leaderboard"
      headerText="Climb the Leaderboard"
      headerIcon={LeaderboardIcon}
      columnHeaders={[
        "Rank",
        "Username",
        "Address",
        "Total Number of Collectibles",
      ]}
      CalculateRowValues={entry => ({
        columns: [
          entry.rank,
          entry.username || entry.adr,
          entry.addr,
          entry.count
        ],
        link: UrlJoin("/marketplace", match.params.marketplaceId, "users", entry.addr, "items")
      })}
      columnWidths={[1, 2, 2, 2]}
      mobileColumnWidths={[1, 1, 0, 1]}
      hideOverflow
    />
  );
});

export default Leaderboard;
