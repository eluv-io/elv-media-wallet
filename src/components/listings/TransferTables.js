import React, {useEffect, useState} from "react";
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

export const ActiveListings = observer(({contractAddress, contractId, initialSelectedListingId, Select}) => {
  const [listings, setListings] = useState([]);
  const [sortField, setSortField] = useState("Price");
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(initialSelectedListingId);

  const [loading, setLoading] = useState(true);
  const UpdateHistory = async () => {
    try {
      setListings(await transferStore.FetchTransferListings({contractAddress, contractId}));
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
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 60000);

    return () => clearInterval(interval);
  }, []);

  const sortedListings = (listings || []).slice().sort(
    (a, b) => {
      let sort = sortField;
      if(sortField === "TokenOrdinal" && typeof (a.details || {}).TokenOrdinal === "undefined") {
        sort = "TokenIdStr";
      }

      return ((a.details || {})[sort] > (b.details || {})[sort] ? 1 : -1) * (sortDesc ? -1 : 1);
    }
  );

  const sortIcon = (
    <ImageIcon
      icon={sortDesc ? DownCaret : UpCaret}
      className="transfer-table__sort-icon"
    />
  );

  return (
    <div className={`transfer-table active-listings ${Select ? "transfer-table-selectable" : ""}`}>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header transfer-table__table__header-sortable">
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("TokenOrdinal")}>
            Ordinal / Token ID { sortField === "TokenOrdinal" ? sortIcon : null }
          </button>
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("Price")}>
            Price { sortField === "Price" ? sortIcon : null }
          </button>
          <button className="transfer-table__table__cell no-mobile" onClick={() => UpdateSort("SellerAddress")}>
            Seller { sortField === "SellerAddress" ? sortIcon : null }
          </button>
        </div>
        <div className="transfer-table__content-rows">
          {
            loading ? <div className="transfer-table__loader"><Loader /></div> :
              !listings || listings.length === 0 ?
                <div className="transfer-table__empty">No Active Listings</div> :
                sortedListings.map((nft, index) =>
                  <div
                    tabIndex={0}
                    role="button"
                    aria-roledescription="button"
                    key={`transfer-table-row-${index}`}
                    onClick={
                      !Select ? undefined :
                        () => {
                          const selected = selectedListingId === nft.details.ListingId ? undefined : nft.details.ListingId;

                          setSelectedListingId(selected);
                          Select(selected);
                        }
                    }
                    className={`transfer-table__table__row ${selectedListingId === nft.details.ListingId ? "transfer-table__table__row-selected" : ""} ${Select ? "transfer-table__table__row-selectable" : ""}`}
                  >
                    <div className="transfer-table__table__cell">
                      {
                        typeof nft.details.TokenOrdinal !== "undefined" ?
                          `${parseInt(nft.details.TokenOrdinal) + 1} / ${nft.details.Cap}` :
                          MiddleEllipsis(nft.details.TokenIdStr, 20)
                      }
                    </div>
                    <div className="transfer-table__table__cell">
                      { `$${nft.details.Price.toFixed(2)}`}
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { MiddleEllipsis(nft.details.SellerAddress, 12) }
                    </div>
                  </div>
                )
          }
        </div>
      </div>
    </div>
  );
});

export const UserTransferTable = observer(({header, limit, marketplaceId, type="sell"}) => {
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
    <div className="transfer-table user-transfer-table">
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
  );
});
