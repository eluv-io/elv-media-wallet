import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, transferStore} from "Stores";
import {Ago, MiddleEllipsis, NFTDisplayToken, TimeDiff} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import {FormatPriceString} from "Components/common/UIComponents";
import {v4 as UUID} from "uuid";

import { useInfiniteScroll } from "react-g-infinite-scroll";

import UpCaret from "Assets/icons/up-caret.svg";
import DownCaret from "Assets/icons/down-caret.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import USDIcon from "Assets/icons/crypto/USD icon.svg";

export const ActiveListings = observer(({contractAddress, contractId, initialSelectedListingId, noSeller=false, Select}) => {
  const [listings, setListings] = useState([]);
  const [paging, setPaging] = useState({});
  const [sortField, setSortField] = useState("price");
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(initialSelectedListingId);
  const [id] = useState(`active-listings-table-${UUID()}`);
  const [loading, setLoading] = useState(true);
  const previouslyLoaded = listings && listings.length > 0;
  const perPage = 20;

  const UpdateHistory = async (append=false) => {
    try {
      if(append && !paging.more) {
        return;
      }

      setLoading(true);

      const query = await transferStore.FilteredQuery({
        contractAddress,
        contractId,
        sortBy: sortField,
        sortDesc,
        start: append ? paging.start + perPage + 1 : 0,
        limit: perPage
      });

      setPaging(query.paging);

      let results;
      if(append) {
        results = [
          ...listings,
          ...query.results
        ];
      } else {
        if(initialSelectedListingId) {
          // If initial listing ID set, ensure it is first item in list
          const initialListing = ((await transferStore.FetchTransferListings({
            listingId: initialSelectedListingId
          })) || [])[0];

          if(initialListing) {

            query.results.unshift(initialListing);
          }
        }

        results = query.results;
      }

      if(initialSelectedListingId) {
        // Filter out normal instance of initial listing
        results = results.filter((item, index) => index === 0 || item.details.ListingId !== initialSelectedListingId);
      }

      setListings(results);
    } finally {
      setLoading(false);
    }
  };

  const UpdateSort = field => {
    if(sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
  };

  useEffect(() => {
    UpdateHistory()
      .then(() => {
        if(previouslyLoaded) { return; }

        // Automatically scroll to the selected listing
        setTimeout(() => {
          const table = document.getElementById(id);
          const selectedItem = table.querySelector(".transfer-table__table__row-selected");

          if(selectedItem) {
            table.scrollTop = selectedItem.offsetTop - 50;
          }
        }, 250);
      });
  }, [sortField, sortDesc]);

  const sortIcon = (
    <ImageIcon
      icon={sortDesc ? DownCaret : UpCaret}
      className="transfer-table__sort-icon"
    />
  );

  const ref = useInfiniteScroll({
    expectRef: true,
    fetchMore: async () => await UpdateHistory(true),
    ignoreScroll: !previouslyLoaded || loading || paging && !paging.more
  });

  return (
    <div id={id} className={`transfer-table active-listings ${Select ? "transfer-table-selectable" : ""}`}>
      <div className="transfer-table__table" ref={ref}>
        <div className="transfer-table__table__header transfer-table__table__header-sortable">
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("info/ordinal")}>
            Token { sortField === "info/ordinal" ? sortIcon : null }
          </button>
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("price")}>
            Price { sortField === "price" ? sortIcon : null }
          </button>
          {
            noSeller ?
              null :
              <button className="transfer-table__table__cell no-mobile" onClick={() => UpdateSort("seller")}>
                Seller {sortField === "seller" ? sortIcon : null}
              </button>
          }
        </div>
        <div className="transfer-table__content-rows">
          {
            loading && !previouslyLoaded ? <div className="transfer-table__loader"><Loader/></div> :
              !listings || listings.length === 0 ?
                <div className="transfer-table__empty">No Active Listings</div> :
                listings.map((listing, index) => {
                  const isCheckoutLocked = listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now();
                  return (
                    <div
                      tabIndex={0}
                      role="button"
                      aria-roledescription="button"
                      aria-disabled={isCheckoutLocked}
                      key={`transfer-table-row-${index}`}
                      title={isCheckoutLocked ? "This listing is currently in the process of being purchased" : ""}
                      onClick={
                        !Select || isCheckoutLocked ? undefined :
                          () => {
                            const selected = selectedListingId === listing.details.ListingId ? undefined : listing.details.ListingId;

                            setSelectedListingId(selected);
                            Select(selected, listing);
                          }
                      }
                      className={
                        [
                          "transfer-table__table__row",
                          isCheckoutLocked ? "transfer-table__table__row-disabled" : "",
                          selectedListingId === listing.details.ListingId ? "transfer-table__table__row-selected" : "",
                          Select && !isCheckoutLocked ? "transfer-table__table__row-selectable" : "",
                          initialSelectedListingId === listing.details.ListingId ? "transfer-table__table__row-initial" : ""
                        ]
                          .filter(c => c)
                          .join(" ")
                      }
                    >
                      <div className="transfer-table__table__cell">
                        { NFTDisplayToken(listing) }
                      </div>
                      <div className="transfer-table__table__cell">
                        { listing.details.USDCOnly ?
                          <>
                            <ImageIcon icon={USDCIcon} label="USDC" title="USDC Accepted" className="transfer-table__table__cell__icon" />
                            <div className="transfer-table__table__cell__icon transfer-table__table__cell__icon--placeholder" />
                          </> :
                          <>
                            <ImageIcon icon={USDIcon} label="USD" title="USD Accepted" className="transfer-table__table__cell__icon" />
                            {
                              listing.details.USDCAccepted ?
                                <ImageIcon icon={USDCIcon} label="USDC" title="USDC Accepted" className="transfer-table__table__cell__icon"/> :
                                <div className="transfer-table__table__cell__icon transfer-table__table__cell__icon--placeholder"/>
                            }
                          </>
                        }
                        {`$${listing.details.Price.toFixed(2)}`}
                      </div>
                      {
                        noSeller ?
                          null :
                          <div className="transfer-table__table__cell no-mobile">
                            {listing.details.SellerAddress}
                          </div>
                      }
                    </div>
                  );
                })
          }
          { loading && previouslyLoaded ? <div className="transfer-table__loader"><Loader/></div> : null }
        </div>
      </div>
    </div>
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

export const UserTransferTable = observer(({icon, header, limit, marketplaceId, type="sale", className=""}) => {
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
    return (
      <div className={`transfer-table user-transfer-table withdrawal-table ${className}`}>
        <div className="transfer-table__header">
          { icon ? <ImageIcon icon={icon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
          { header }
        </div>
        <div className="transfer-table__table">
          <div className="transfer-table__table__header">
            <div className="transfer-table__table__cell">Amount</div>
            <div className="transfer-table__table__cell">Payout</div>
            <div className="transfer-table__table__cell no-mobile">Fee</div>
            <div className="transfer-table__table__cell">Time</div>
          </div>
          <div className="transfer-table__content-rows">
            {
              loading ? <div className="transfer-table__loader"><Loader /></div> :
                !entries || entries.length === 0 ?
                  <div className="transfer-table__empty">No Withdrawals</div> :
                  entries.map(transfer =>
                    <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                      <div className="transfer-table__table__cell">
                        { FormatPriceString({USD: transfer.amount + transfer.fee}) }
                      </div>
                      <div className="transfer-table__table__cell">
                        { FormatPriceString({USD: transfer.amount}) }
                      </div>
                      <div className="transfer-table__table__cell no-mobile">
                        { FormatPriceString({USD: transfer.fee}) }
                      </div>
                      <div className="transfer-table__table__cell">
                        { Ago(transfer.created * 1000) } ago
                      </div>
                    </div>
                  )
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`transfer-table user-transfer-table ${className}`}>
      <div className="transfer-table__header">
        { icon ? <ImageIcon icon={icon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
        { header }
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          <div className="transfer-table__table__cell">Name</div>
          <div className="transfer-table__table__cell">List Price { type === "sale" ? " (Payout)" : "" }</div>
          <div className="transfer-table__table__cell">Time</div>
          <div className="transfer-table__table__cell no-tablet">{ type === "sale" ? "Buyer" : "Seller" }</div>
          <div className="transfer-table__table__cell no-mobile">Purchase Method</div>
          <div className="transfer-table__table__cell no-mobile">Payment Status</div>
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
                    <div className="transfer-table__table__cell">
                      { FormatPriceString({USD: transfer.amount + transfer.royalty}) } { type === "sale" ? <em>({ FormatPriceString({USD: transfer.amount}) })</em> : null}
                    </div>
                    <div className="transfer-table__table__cell">
                      { Ago(transfer.created * 1000) } ago
                    </div>
                    <div className="transfer-table__table__cell no-tablet ellipsis" title={ type === "sale" ? transfer.buyer : transfer.addr }>
                      { type === "sale" ? transfer.buyer : transfer.addr }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { transfer.processor }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      <div className={`transfer-table__badge ${transfer.pending ? "transfer-table__badge-inactive" : "transfer-table__badge-active"}`}>
                        { transfer.pending ? "Pending" : "Available" }
                      </div>
                    </div>
                  </div>
                )
          }
        </div>
      </div>
    </div>
  );
});

export const TransferTable = observer(({icon, header, contractAddress, contractId, tokenId, limit}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const UpdateHistory = async () => {
    let entries = (await transferStore.TransferHistory({contractAddress, contractId, tokenId}))
      .filter(entry => entry.action === "SOLD")
      .sort((a, b) => a.created > b.created ? -1 : 1);

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="transfer-table">
      <div className="transfer-table__header">
        { icon ? <ImageIcon icon={icon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
        { header }
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          { tokenId ? null : <div className="transfer-table__table__cell">Token ID</div> }
          <div className="transfer-table__table__cell">Time</div>
          <div className="transfer-table__table__cell">Total Amount</div>
          <div className="transfer-table__table__cell no-mobile">Buyer</div>
          <div className="transfer-table__table__cell no-mobile">Seller</div>
        </div>
        <div className="transfer-table__content-rows">
          {
            loading ? <div className="transfer-table__loader"><Loader /></div> :
              !entries || entries.length === 0 ?
                <div className="transfer-table__empty">No Transfers</div> :
                entries.map(transfer =>
                  <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                    {
                      tokenId ? null :
                        <div className="transfer-table__table__cell">
                          {transfer.token}
                        </div>
                    }
                    <div className="transfer-table__table__cell">
                      { Ago(transfer.created * 1000) } ago
                    </div>
                    <div className="transfer-table__table__cell">
                      { FormatPriceString({USD: transfer.price}) }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { MiddleEllipsis(transfer.buyer, 14) }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { MiddleEllipsis(transfer.seller, 14) }
                    </div>
                  </div>
                )
          }
        </div>
      </div>
    </div>
  );
});
