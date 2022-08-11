import React from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {UserTransferTable} from "Components/listings/TransferTables";

import SalesIcon from "Assets/icons/misc/sales icon.svg";
import PurchasesIcon from "Assets/icons/misc/purchases icon.svg";
import Utils from "@eluvio/elv-client-js/src/Utils";

const UserActivity = observer(() => {
  const match = useRouteMatch();
  const userAddress = rootStore.userProfiles[match.params.userId].userAddress;

  // TODO: Figure out scoping these APIs to arbitrary users
  return (
    <div className="listings-page">
      <UserTransferTable
        userAddress={userAddress}
        icon={PurchasesIcon}
        header="Bought NFTs"
        type="purchase"
        marketplaceId={match.params.marketplaceId}
        className="my-listings-transfer-history my-listings-bought"
      />
      <UserTransferTable
        userAddress={userAddress}
        icon={SalesIcon}
        header="Sold NFTs"
        type="sale"
        marketplaceId={match.params.marketplaceId}
        className="my-listings-transfer-history my-listings-sold"
      />

      {
        Utils.EqualAddress(userAddress, rootStore.CurrentAddress()) ?
          <>
            <div className="listings-page__message">
              Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT.
              Account holders acknowledge that, during this hold period, a seller will be unable to withdraw the amounts
              attributable to such sale(s). The current hold period for withdrawing the balance is 15 days.
            </div>
            <div className="listings-page__message">
              For questions or concerns, please contact <a href={"mailto:payments@eluv.io"}>payments@eluv.io</a>
            </div>
          </> : null
      }
    </div>
  );
});

export default UserActivity;
