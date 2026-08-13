import React from "react";
import {rootStore} from "@/stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {OffersTable} from "@/components/listings/TransferTables";

import OffersTableIcon from "@/assets/icons/Offers table icon.svg";

const UserOffers = observer(() => {
  const match = useRouteMatch();
  const userAddress = rootStore.userProfiles[match.params.userId].userAddress;

  return (
    <div className="listings-page">
      <OffersTable
        header={rootStore.l10n.tables.offers_received}
        sellerAddress={userAddress}
        icon={OffersTableIcon}
        className="user-transfer-table user-transfer-table--bought"
      />
      <OffersTable
        header={rootStore.l10n.tables.offers_made}
        buyerAddress={userAddress}
        icon={OffersTableIcon}
        className="user-transfer-table user-transfer-table--bought"
      />
    </div>
  );
});

export default UserOffers;
