import React from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {OffersTable} from "Components/listings/TransferTables";

import OffersTableIcon from "Assets/icons/Offers table icon.svg";

const UserOffers = observer(() => {
  const match = useRouteMatch();
  const userAddress = rootStore.userProfiles[match.params.userId].userAddress;

  return (
    <div className="listings-page">
      <OffersTable
        sellerAddress={userAddress}
        icon={OffersTableIcon}
        header="Offers Received"
        className="user-transfer-table user-transfer-table--bought"
      />
      <OffersTable
        buyerAddress={userAddress}
        icon={OffersTableIcon}
        header="Offers Made"
        className="user-transfer-table user-transfer-table--bought"
      />
    </div>
  );
});

export default UserOffers;
