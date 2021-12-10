import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import {transferStore} from "Stores";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";

import UpCaret from "Assets/icons/up-caret.svg";
import DownCaret from "Assets/icons/down-caret.svg";
import ImageIcon from "Components/common/ImageIcon";
import {roundToUp} from "round-to";
import {FormatPriceString} from "Components/common/UIComponents";
import {v4 as UUID} from "uuid";

export const ActiveListings = observer(({contractAddress, contractId, initialSelectedListingId, Select}) => {
  const tableRef = useRef();
  const [listings, setListings] = useState([]);
  const [paging, setPaging] = useState({});
  const [sortField, setSortField] = useState("price");
  const [sortDesc, setSortDesc] = useState(false);
  const [scrollLoadKey, setScrollLoadKey] = useState("");
  const [selectedListingId, setSelectedListingId] = useState(initialSelectedListingId);
  const [id] = useState(`active-listings-table-${UUID()}`);
  const [loading, setLoading] = useState(true);
  const perPage = 50;

  const UpdateHistory = async (append=false) => {
    if(!append) {
      setLoading(true);
    } else {
      if(!paging.more) { return; }
    }

    try {
      const results = await transferStore.FilteredTransferListings({
        contractAddress,
        contractId,
        sortBy: sortField,
        sortDesc,
        start: append ? paging.start + perPage + 1 : 0,
        limit: perPage
      });

      setPaging(results.paging);

      if(append) {
        setListings([
          ...listings,
          ...results.listings
        ]);
      } else {
        setListings(results.listings);
      }
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
    // Update key when scrolled to the bottom of the page
    let scrollTimeout;

    const table = tableRef.current;

    if(!table) { return; }

    const InfiniteScroll = () => {
      if(Math.abs(table.scrollHeight - (table.offsetHeight + table.scrollTop)) < 10) {
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
          setScrollLoadKey(UUID());
        }, 300);
      }
    };

    table.addEventListener("scroll", InfiniteScroll);

    return () => table.removeEventListener("scroll", InfiniteScroll);
  }, [tableRef.current]);

  useEffect(() => {
    UpdateHistory(true);
  }, [scrollLoadKey]);

  useEffect(() => {
    const previouslyLoaded = listings && listings.length > 0;
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

  return (
    <div id={id} ref={tableRef} className={`transfer-table active-listings ${Select ? "transfer-table-selectable" : ""}`}>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header transfer-table__table__header-sortable">
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("info/ordinal")}>
            Token { sortField === "info/ordinal" ? sortIcon : null }
          </button>
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("price")}>
            Price { sortField === "price" ? sortIcon : null }
          </button>
          <button className="transfer-table__table__cell no-mobile" onClick={() => UpdateSort("seller")}>
            Seller { sortField === "seller" ? sortIcon : null }
          </button>
        </div>
        <div className="transfer-table__content-rows">
          {
            loading ? <div className="transfer-table__loader"><Loader/></div> :
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
                      className={`transfer-table__table__row ${isCheckoutLocked ? "transfer-table__table__row-disabled" : ""} ${selectedListingId === listing.details.ListingId ? "transfer-table__table__row-selected" : ""} ${Select && !isCheckoutLocked ? "transfer-table__table__row-selectable" : ""}`}
                    >
                      <div className="transfer-table__table__cell">
                        {
                          typeof listing.details.TokenOrdinal !== "undefined" ?
                            `${parseInt(listing.details.TokenOrdinal) + 1} / ${listing.details.Cap}` :
                            MiddleEllipsis(listing.details.TokenIdStr, 20)
                        }
                      </div>
                      <div className="transfer-table__table__cell">
                        {`$${listing.details.Price.toFixed(2)}`}
                      </div>
                      <div className="transfer-table__table__cell no-mobile">
                        {MiddleEllipsis(listing.details.SellerAddress, 12)}
                      </div>
                    </div>
                  );
                })
          }
        </div>
      </div>
    </div>
  );
});

export const UserTransferTable = observer(({header, limit, marketplaceId, type="sell", className=""}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const UpdateHistory = async () => {
    let entries = (await transferStore.UserTransferHistory())
      .filter(entry => entry.action === "SOLD")
      .filter(entry => Utils.EqualAddress(rootStore.userAddress, type === "sell" ? entry.seller : entry.buyer))
      .sort((a, b) => a.created > b.created ? -1 : 1);

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
    <div className={`transfer-table user-transfer-table ${className}`}>
      <div className="transfer-table__header">
        { header }
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          <div className="transfer-table__table__cell">Name</div>
          <div className="transfer-table__table__cell no-mobile">Token ID</div>
          <div className="transfer-table__table__cell">Time</div>
          <div className="transfer-table__table__cell">Total Amount { type === "sell" ? " (Payout)" : "" }</div>
          <div className="transfer-table__table__cell no-mobile">{ type === "sell" ? "Buyer" : "Seller" }</div>
        </div>
        <div className="transfer-table__content-rows">
          {
            loading ? <div className="transfer-table__loader"><Loader /></div> :
              !entries || entries.length === 0 ?
                <div className="transfer-table__empty">No Transfers</div> :
                entries.map(transfer =>
                  <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                    <div className="transfer-table__table__cell">
                      { transfer.name }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { transfer.token }
                    </div>
                    <div className="transfer-table__table__cell">
                      { Ago(transfer.created * 1000) } ago
                    </div>
                    <div className="transfer-table__table__cell">
                      { FormatPriceString({USD: transfer.price}) } { type === "sell" ? ` (${FormatPriceString({USD: roundToUp(transfer.price * 0.9, 2)})})` : ""}
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { MiddleEllipsis(type === "sell" ? transfer.buyer : transfer.seller, 14) }
                    </div>
                  </div>
                )
          }
        </div>
      </div>
    </div>
  );
});

export const TransferTable = observer(({header, contractAddress, contractId, tokenId, limit}) => {
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
