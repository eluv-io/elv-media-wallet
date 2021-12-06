import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {transferStore} from "Stores";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";

import UpCaret from "Assets/icons/up-caret.svg";
import DownCaret from "Assets/icons/down-caret.svg";
import ImageIcon from "Components/common/ImageIcon";

export const ActiveListings = observer(({contractAddress, contractId, initialSelectedListingId, Select}) => {
  const [listings, setListings] = useState([]);
  const [sortField, setSortField] = useState("Total");
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
          <button className="transfer-table__table__cell" onClick={() => UpdateSort("Total")}>
            Price { sortField === "Total" ? sortIcon : null }
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
                          `${parseInt(nft.details.TokenOrdinal)} / ${nft.details.Cap}` :
                          MiddleEllipsis(nft.details.TokenIdStr, 20)
                      }
                    </div>
                    <div className="transfer-table__table__cell">
                      { `$${nft.details.Total.toFixed(2)}`}
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

export const UserTransferHistory = observer(({userAddress, type="purchases"}) => {
  userAddress = Utils.FormatAddress(userAddress);
  const transfers =
    type === "purchases" ?
      transferStore.userPurchases[userAddress] :
      transferStore.userSales[userAddress];

  const [loading, setLoading] = useState(true);
  const UpdateHistory = async () => {
    await transferStore.UserTransferHistory({userAddress, type});
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="transfer-table transfer-table-user">
      <div className="transfer-table__header">
        { type === "purchases" ? "Purchases" : "Sales" }
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          <div className="transfer-table__table__cell">NFT Title</div>
          <div className="transfer-table__table__cell no-mobile">Transaction ID</div>
          <div className="transfer-table__table__cell no-mobile">Transaction Type</div>
          <div className="transfer-table__table__cell">Time</div>
          <div className="transfer-table__table__cell">Purchase Price</div>
          <div className="transfer-table__table__cell no-mobile">{ type === "purchases" ? "Seller" : "Buyer" }</div>
        </div>
        {
          loading ? <div className="transfer-table__loader"><Loader /></div> :
            !transfers || transfers.length === 0 ?
              <div className="transfer-table__empty">No Transfers</div> :
              transfers.map(transfer =>
                <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                  <div className="transfer-table__table__cell">
                    { transfer.name }
                  </div>
                  <div className="transfer-table__table__cell no-mobile">
                    { MiddleEllipsis(transfer.transactionId, 10)}
                  </div>
                  <div className="transfer-table__table__cell no-mobile">
                    { transfer.transactionType }
                  </div>
                  <div className="transfer-table__table__cell">
                    { Ago(transfer.createdAt) } ago
                  </div>
                  <div className="transfer-table__table__cell">
                    { `$${(transfer.price).toFixed(2)}`}
                  </div>
                  <div className="transfer-table__table__cell no-mobile">
                    { MiddleEllipsis(type === "purchases" ? transfer.sellerAddress : transfer.buyerAddress, 10) }
                  </div>
                </div>
              )
        }
      </div>
    </div>
  );
});

export const TransferTables = observer(({contractAddress, contractId, tokenId}) => {
  const transferKey = transferStore.TransferKey({contractAddress, contractId, tokenId});
  const transfers = transferStore.transferHistories[transferKey];

  const [loading, setLoading] = useState(true);
  const UpdateHistory = async () => {
    await transferStore.TransferHistory({contractAddress, contractId, tokenId});
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="transfer-table">
      <div className="transfer-table__header">
        Transaction History for this NFT
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          <div className="transfer-table__table__cell no-mobile">Transaction ID</div>
          <div className="transfer-table__table__cell">Transaction Type</div>
          <div className="transfer-table__table__cell">Time</div>
          <div className="transfer-table__table__cell">Total Amount</div>
          <div className="transfer-table__table__cell no-mobile">Buyer</div>
          <div className="transfer-table__table__cell no-mobile">Seller</div>
        </div>
        {
          loading ? <div className="transfer-table__loader"><Loader /></div> :
            !transfers || transfers.length === 0 ?
              <div className="transfer-table__empty">No Transfers</div> :
              transfers.map(transfer =>
                <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                  <div className="transfer-table__table__cell no-mobile">
                    { MiddleEllipsis(transfer.transactionId, 10)}
                  </div>
                  <div className="transfer-table__table__cell">
                    { transfer.transactionType }
                  </div>
                  <div className="transfer-table__table__cell">
                    { Ago(transfer.createdAt) } ago
                  </div>
                  <div className="transfer-table__table__cell">
                    { `$${(transfer.price + transfer.fee).toFixed(2)}`}
                  </div>
                  <div className="transfer-table__table__cell no-mobile">
                    { MiddleEllipsis(transfer.buyerAddress, 10) }
                  </div>
                  <div className="transfer-table__table__cell no-mobile">
                    { MiddleEllipsis(transfer.sellerAddress, 10) }
                  </div>
                </div>
              )
        }
      </div>
    </div>
  );
});
