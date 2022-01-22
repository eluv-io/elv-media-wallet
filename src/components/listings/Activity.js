import React from "react";
import {FormatPriceString} from "Components/common/UIComponents";
import {Ago, MiddleEllipsis} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";

const Activity = () => {
  return (
    <FilteredView
      mode="sales"
      perPage={50}
      expectRef
      Render={({entries, scrollRef, loading}) => (
        <div
          className="transfer-table activity-table"
          style={!loading && entries.length === 0 ? { visibility: "hidden" } : {}}
        >
          <div className="transfer-table__header">
            Recent Sales
          </div>
          <div className="transfer-table__table" ref={scrollRef}>
            <div className="transfer-table__table__header">
              <div className="transfer-table__table__cell">Name</div>
              <div className="transfer-table__table__cell">Token ID</div>
              <div className="transfer-table__table__cell no-mobile">Time</div>
              <div className="transfer-table__table__cell">Total Amount</div>
              <div className="transfer-table__table__cell no-tablet">Buyer</div>
              <div className="transfer-table__table__cell no-tablet">Seller</div>
            </div>
            <div className="transfer-table__content-rows">
              {
                !entries || entries.length === 0 ?
                  <div className="transfer-table__empty">No Sales</div> :
                  entries.map(transfer =>
                    <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                      <div className="transfer-table__table__cell">
                        { transfer.name }
                      </div>
                      <div className="transfer-table__table__cell">
                        { transfer.token }
                      </div>
                      <div className="transfer-table__table__cell no-mobile">
                        { Ago(transfer.created * 1000) } ago
                      </div>
                      <div className="transfer-table__table__cell">
                        { FormatPriceString({USD: transfer.price}) }
                      </div>
                      <div className="transfer-table__table__cell no-tablet">
                        { MiddleEllipsis(transfer.buyer, 14) }
                      </div>
                      <div className="transfer-table__table__cell no-tablet">
                        { MiddleEllipsis(transfer.seller, 14) }
                      </div>
                    </div>
                  )
              }
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default Activity;
