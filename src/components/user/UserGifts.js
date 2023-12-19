import React from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {UserGiftsHistory} from "Components/listings/TransferTables";

import GiftIcon from "Assets/icons/gift.svg";

const UserActivity = observer(() => {
  const match = useRouteMatch();

  return (
    <div className="listings-page">
      <UserGiftsHistory
        received
        icon={GiftIcon}
        header={rootStore.l10n.tables.gifts_received}
        type="purchase"
        marketplaceId={match.params.marketplaceId}
        className="user-transfer-table user-transfer-table--bought"
      />
      <UserGiftsHistory
        icon={GiftIcon}
        header={rootStore.l10n.tables.gifts_given}
        type="sale"
        marketplaceId={match.params.marketplaceId}
        className="user-transfer-table user-transfer-table--sold"
      />

    </div>
  );
});

export default UserActivity;
