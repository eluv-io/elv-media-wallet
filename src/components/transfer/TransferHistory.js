import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {transferStore} from "Stores";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";

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
    <div className="transfer-history transfer-history-user">
      <div className="transfer-history__header">
        { type === "purchases" ? "Purchases" : "Sales" }
      </div>
      <div className="transfer-history__table">
        <div className="transfer-history__table__header">
          <div className="transfer-history__table__cell">NFT Title</div>
          <div className="transfer-history__table__cell no-mobile">Transaction ID</div>
          <div className="transfer-history__table__cell no-mobile">Transaction Type</div>
          <div className="transfer-history__table__cell">Time</div>
          <div className="transfer-history__table__cell">Purchase Price</div>
          <div className="transfer-history__table__cell no-mobile">{ type === "purchases" ? "Seller" : "Buyer" }</div>
        </div>
        {
          loading ? <div className="transfer-history__loader"><Loader /></div> :
            !transfers || transfers.length === 0 ?
              <div className="transfer-history__empty">No Transfers</div> :
              transfers.map(transfer =>
                <div className="transfer-history__table__row" key={`transfer-history-row-${transfer.id}`}>
                  <div className="transfer-history__table__cell">
                    { transfer.name }
                  </div>
                  <div className="transfer-history__table__cell no-mobile">
                    { MiddleEllipsis(transfer.transactionId, 10)}
                  </div>
                  <div className="transfer-history__table__cell no-mobile">
                    { transfer.transactionType }
                  </div>
                  <div className="transfer-history__table__cell">
                    { Ago(transfer.createdAt) } ago
                  </div>
                  <div className="transfer-history__table__cell">
                    { `$${(transfer.price).toFixed(2)}`}
                  </div>
                  <div className="transfer-history__table__cell no-mobile">
                    { MiddleEllipsis(type === "purchases" ? transfer.sellerAddress : transfer.buyerAddress, 10) }
                  </div>
                </div>
              )
        }
      </div>
    </div>
  );
});

export const TransferHistory = observer(({contractAddress, contractId, tokenId}) => {
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
    <div className="transfer-history">
      <div className="transfer-history__header">
        Transaction History for this NFT
      </div>
      <div className="transfer-history__table">
        <div className="transfer-history__table__header">
          <div className="transfer-history__table__cell no-mobile">Transaction ID</div>
          <div className="transfer-history__table__cell">Transaction Type</div>
          <div className="transfer-history__table__cell">Time</div>
          <div className="transfer-history__table__cell">Total Amount</div>
          <div className="transfer-history__table__cell no-mobile">Buyer</div>
          <div className="transfer-history__table__cell no-mobile">Seller</div>
        </div>
        {
          loading ? <div className="transfer-history__loader"><Loader /></div> :
            !transfers || transfers.length === 0 ?
              <div className="transfer-history__empty">No Transfers</div> :
              transfers.map(transfer =>
                <div className="transfer-history__table__row" key={`transfer-history-row-${transfer.id}`}>
                  <div className="transfer-history__table__cell no-mobile">
                    { MiddleEllipsis(transfer.transactionId, 10)}
                  </div>
                  <div className="transfer-history__table__cell">
                    { transfer.transactionType }
                  </div>
                  <div className="transfer-history__table__cell">
                    { Ago(transfer.createdAt) } ago
                  </div>
                  <div className="transfer-history__table__cell">
                    { `$${(transfer.price + transfer.fee).toFixed(2)}`}
                  </div>
                  <div className="transfer-history__table__cell no-mobile">
                    { MiddleEllipsis(transfer.buyerAddress, 10) }
                  </div>
                  <div className="transfer-history__table__cell no-mobile">
                    { MiddleEllipsis(transfer.sellerAddress, 10) }
                  </div>
                </div>
              )
        }
      </div>
    </div>
  );
});
