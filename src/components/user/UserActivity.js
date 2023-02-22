import React from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {UserTransferTable} from "Components/listings/TransferTables";

import SalesIcon from "Assets/icons/misc/sales icon.svg";
import PurchasesIcon from "Assets/icons/misc/purchases icon.svg";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {RichText} from "Components/common/UIComponents";

const UserActivity = observer(() => {
  const match = useRouteMatch();
  const userAddress = rootStore.userProfiles[match.params.userId].userAddress;
  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === match.params.marketplaceId);
  const secondaryDisabled = marketplace?.branding?.disable_secondary_market;

  return (
    <div className="listings-page">
      <UserTransferTable
        userAddress={userAddress}
        icon={PurchasesIcon}
        header={rootStore.l10n.tables.bought_nfts}
        type="purchase"
        marketplaceId={match.params.marketplaceId}
        className="user-transfer-table user-transfer-table--bought"
      />
      {
        secondaryDisabled ? null :
          <UserTransferTable
            userAddress={userAddress}
            icon={SalesIcon}
            header={rootStore.l10n.tables.sold_nfts}
            type="sale"
            marketplaceId={match.params.marketplaceId}
            className="user-transfer-table user-transfer-table--sold"
          />
      }

      {
        !secondaryDisabled && Utils.EqualAddress(userAddress, rootStore.CurrentAddress()) ?
          <>
            <RichText
              className="listings-page__message"
              richText={rootStore.l10n.profile.payout_terms}
            />
            <RichText
              className="listings-page__message"
              richText={rootStore.l10n.profile.payout_terms_contact}
            />
          </> : null
      }
    </div>
  );
});

export default UserActivity;
