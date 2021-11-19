import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {transferStore} from "Stores";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";

const TransferHistory = observer(({contractAddress, contractId, tokenId}) => {
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

export default TransferHistory;
