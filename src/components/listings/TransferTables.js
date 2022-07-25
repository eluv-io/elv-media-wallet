import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, transferStore} from "Stores";
import {Ago, MiddleEllipsis, NFTDisplayToken, TimeDiff} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import {FormatPriceString} from "Components/common/UIComponents";

import UpCaret from "Assets/icons/up-caret.svg";
import DownCaret from "Assets/icons/down-caret.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import USDIcon from "Assets/icons/crypto/USD icon.svg";
import Table, {FilteredTable} from "Components/common/Table";

export const ActiveListings = observer(({contractAddress, selectedListingId, showSeller=false, Select}) => {
  const [initialListingId] = useState(selectedListingId);
  const [initialListing, setInitialListing] = useState(undefined);

  useEffect(() => {
    if(!initialListingId) { return; }

    rootStore.walletClient.Listing({listingId: initialListingId})
      .then(listing => setInitialListing(listing));
  }, []);

  const [sortOptions, setSortOptions] = useState({
    sortBy: "created",
    sortDesc: true,
    contractAddress
  });

  const UpdateSort = field => {
    if(sortOptions.sortBy === field) {
      setSortOptions({...sortOptions, sortDesc: !sortOptions.sortDesc});
    } else {
      setSortOptions({...sortOptions, sortBy: field, sortDesc: false});
    }
  };

  const sortIcon = sortOptions.sortDesc ? DownCaret : UpCaret;

  let tableHeaders = [
    { text: "Token", icon: sortOptions.sortBy === "info/ordinal" ? sortIcon : null, onClick: () => UpdateSort("info/ordinal") },
    { text: "Price", icon: sortOptions.sortBy === "price" ? sortIcon : null, onClick: () => UpdateSort("price") }
  ];

  if(showSeller) {
    tableHeaders.push({text: "Seller", icon: sortOptions.sortBy === "price" ? sortIcon : null, onClick: () => UpdateSort("seller")});
  }

  return (
    <FilteredTable
      className="transfer-table--active-listings"
      mode="listings"
      pagingMode="infinite"
      hidePagingInfo
      perPage={100}
      columnHeaders={tableHeaders}
      columnWidths={
        showSeller ?
          [1, 1, 1] :
          [1, 1]
      }
      mobileColumnWidths={[1, 1]}
      filters={sortOptions}
      pinnedEntries={initialListing ? [initialListing] : null}
      CalculateRowValues={(listing, index) => {
        if(listing.details.ListingId === initialListingId && index > 0) {
          return;
        }

        const isCheckoutLocked = listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now();
        return {
          disabled: isCheckoutLocked,
          className: [
            isCheckoutLocked ? "transfer-table__table__row-disabled" : "",
            selectedListingId === listing.details.ListingId ? "transfer-table__table__row-selected" : "",
            Select && !isCheckoutLocked ? "transfer-table__table__row-selectable" : "",
            initialListingId === listing.details.ListingId ? "transfer-table__table__row-initial" : ""
          ]
            .filter(c => c)
            .join(" "),
          onClick: !Select || isCheckoutLocked ?
            undefined :
            () => {
              const selected = selectedListingId === listing.details.ListingId ? undefined : listing.details.ListingId;

              Select(selected, listing);
            },
          columns: [
            NFTDisplayToken(listing),
            <>
              {
                listing.details.USDCOnly ?
                  <>
                    <ImageIcon
                      icon={USDCIcon}
                      label="USDC"
                      title="USDC Accepted"
                      className="transfer-table__table__cell__icon"
                    />
                    <div className="transfer-table__table__cell__icon transfer-table__table__cell__icon--placeholder"/>
                  </> :
                  <>
                    <ImageIcon
                      icon={USDIcon}
                      label="USD"
                      title="USD Accepted"
                      className="transfer-table__table__cell__icon"
                    />
                    {
                      listing.details.USDCAccepted ?
                        <ImageIcon
                          icon={USDCIcon}
                          label="USDC"
                          title="USDC Accepted"
                          className="transfer-table__table__cell__icon"
                        /> :
                        <div className="transfer-table__table__cell__icon transfer-table__table__cell__icon--placeholder"/>
                    }
                  </>
              }
              {FormatPriceString(listing.details.Price)}
            </>,
            MiddleEllipsis(listing.details.SellerAddress, 14)
          ]
        };
      }}
    />
  );
});

export const PendingPaymentsTable = observer(({icon, header, limit, className=""}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const week = rootStore.salePendingDurationDays * 24 * 60 * 60 * 1000;

  const UpdateHistory = async () => {
    let entries = (await transferStore.UserPaymentsHistory())
      .filter(entry =>
        Utils.EqualAddress(entry.addr, rootStore.CurrentAddress()) &&
        Date.now() - entry.created * 1000 < week &&
        !entry.processor?.startsWith("solana:p2p")
      )
      .sort((a, b) => a.created > b.created ? -1 : 1);

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`transfer-table pending-payments-table ${className}`}>
      <div className="transfer-table__header">
        { icon ? <ImageIcon icon={icon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
        { header }
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          <div className="transfer-table__table__cell">Name</div>
          <div className="transfer-table__table__cell no-mobile">Time</div>
          <div className="transfer-table__table__cell no-mobile">Clears in</div>
          <div className="transfer-table__table__cell">Payout</div>
        </div>
        <div className="transfer-table__content-rows">
          {
            loading ? <div className="transfer-table__loader"><Loader /></div> :
              !entries || entries.length === 0 ?
                <div className="transfer-table__empty">No Transfers</div> :
                entries.map(transfer =>
                  <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                    <div className="transfer-table__table__cell ellipsis">
                      { transfer.name }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { Ago(transfer.created * 1000) } ago
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { TimeDiff((transfer.created * 1000 + week - Date.now()) / 1000) }
                    </div>
                    <div className="transfer-table__table__cell">
                      { FormatPriceString({USD: transfer.amount}) }
                    </div>
                  </div>
                )
          }
        </div>
      </div>
    </div>
  );
});

export const UserTransferTable = observer(({icon, header, limit, marketplaceId, type="sale"}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const UpdateHistory = async () => {
    let entries = (await transferStore.UserPaymentsHistory())
      .map(entry => ({
        ...entry,
        type:
          !entry.addr && (entry.processor || "").includes("stripe-payout") ?
            "withdrawal" : Utils.EqualAddress(entry.buyer, rootStore.CurrentAddress()) ? "purchase" : "sale",
        processor:
          (entry.processor || "").startsWith("eluvio") ? "Wallet Balance" :
            (entry.processor || "").startsWith("stripe") ? "Credit Card" :
              entry.processor?.startsWith("solana:p2p") ? "USDC" : "Crypto",
        pending: !entry.processor?.startsWith("solana:p2p") && Date.now() < entry.created * 1000 + rootStore.salePendingDurationDays * 24 * 60 * 60 * 1000
      }))
      .filter(entry => entry.type === type)
      .filter(entry => entry.type === "withdrawal" || Utils.EqualAddress(rootStore.CurrentAddress(), type === "sale" ? entry.addr : entry.buyer))
      .sort((a, b) => a.created > b.created ? -1 : 1);

    /*
    if(marketplaceId) {
      const marketplace = rootStore.marketplaces[marketplaceId];
      // If marketplace filtered, exclude entries that aren't present in the marketplace
      entries = entries.filter(entry =>
        marketplace.items.find(item => Utils.EqualAddress(
          entry.contract,
          Utils.SafeTraverse(item, "nft_template", "nft", "address"),
        ))
      );
    }

     */

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  if(type === "withdrawal") {
    // Withdrawals table
    return (
      <Table
        loading={loading}
        headerIcon={icon}
        headerText={header}
        pagingMode="none"
        columnHeaders={[
          "Amount",
          "Payout",
          "Fee",
          "Time"
        ]}
        columnWidths={[1, 1, 1, 1]}
        mobileColumnWidths={[1, 1, 0, 1]}
        entries={
          entries.map(transfer => [
            FormatPriceString({USD: transfer.amount + transfer.fee}),
            FormatPriceString({USD: transfer.amount}),
            FormatPriceString({USD: transfer.fee}),
            `${Ago(transfer.created * 1000)} ago`
          ])
        }
      />
    );
  }

  return (
    <Table
      loading={loading}
      pagingMode="none"
      headerIcon={icon}
      headerText={header}
      columnHeaders={[
        "Name",
        `List Price ${ type === "sale" ? " (Payout)" : ""}`,
        "Time",
        type === "sale" ? "Buyer" : "Seller",
        "Purchase Method",
        "Payment Status"
      ]}
      columnWidths={[1, 1, "150px", 1, "150px", "150px"]}
      tabletColumnWidths={[1, 1, "150px", 0, "150px", "150px"]}
      mobileColumnWidths={[1, 1, "150px", 0, 0, 0]}
      entries={
        entries.map(transfer => [
          transfer.name,
          <>{ FormatPriceString({USD: transfer.amount + transfer.royalty}) } { type === "sale" ? <em>({ FormatPriceString({USD: transfer.amount}) })</em> : null }</>,
          `${Ago(transfer.created * 1000) } ago`,
          MiddleEllipsis(type === "sale" ? transfer.buyer : transfer.addr, 14),
          transfer.processor,
          transfer.pending ? "Pending" : "Available"
        ])
      }
    />
  );
});
