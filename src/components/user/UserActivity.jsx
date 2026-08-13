import React from "react";
import {rootStore} from "@/stores";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {OffersTable, UserListingTable, UserTransferTable} from "@/components/listings/TransferTables";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {RichText} from "@/components/common/UIComponents";

import ListingsIcon from "@/assets/icons/listing.svg";
import SalesIcon from "@/assets/icons/misc/sales icon.svg";
import PurchasesIcon from "@/assets/icons/misc/purchases icon.svg";
import OffersTableIcon from "@/assets/icons/Offers table icon.svg";

const UserActivity = observer(() => {
  const match = useRouteMatch();
  const userAddress = rootStore.userProfiles[match.params.userId].userAddress;
  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === match.params.marketplaceId);
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false || marketplace?.branding?.disable_secondary_market;

  return (
    <div className="listings-page">
      <UserListingTable
        collapsible
        userAddress={userAddress}
        icon={ListingsIcon}
        header={rootStore.l10n.tables.active_listings}
        className="user-transfer-table user-transfer-table--listings"
      />
      <UserTransferTable
        collapsible
        initiallyCollapsed
        userAddress={userAddress}
        icon={PurchasesIcon}
        header={rootStore.l10n.tables.bought_items}
        type="purchase"
        marketplaceId={match.params.marketplaceId}
        className="user-transfer-table user-transfer-table--bought"
      />
      {
        secondaryDisabled ? null :
          <UserTransferTable
            collapsible
            initiallyCollapsed
            userAddress={userAddress}
            icon={SalesIcon}
            header={rootStore.l10n.tables.sold_items}
            type="sale"
            marketplaceId={match.params.marketplaceId}
            className="user-transfer-table user-transfer-table--sold"
          />
      }
      {
        secondaryDisabled ? null :
          <>
            <OffersTable
              collapsible
              initiallyCollapsed
              header={rootStore.l10n.tables.offers_received}
              sellerAddress={userAddress}
              icon={OffersTableIcon}
              className="user-transfer-table user-transfer-table--bought"
            />
            <OffersTable
              collapsible
              initiallyCollapsed
              header={rootStore.l10n.tables.offers_made}
              buyerAddress={userAddress}
              icon={OffersTableIcon}
              className="user-transfer-table user-transfer-table--bought"
            />
          </>
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
