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
