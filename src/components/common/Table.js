import React from "react";
import {rootStore} from "Stores";
import {Link} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import {observer} from "mobx-react";

const Table = observer(({
  headerText,
  headerIcon,
  columnHeaders,
  entries,
  paging,
  scrollRef,
  emptyText="No Results",
  columnWidths=[],
  tabletColumnWidths,
  mobileColumnWidths,
  className=""
}) => {
  tabletColumnWidths = tabletColumnWidths || mobileColumnWidths;
  mobileColumnWidths = mobileColumnWidths || tabletColumnWidths;

  columnWidths = rootStore.pageWidth > 1250 ?
    columnWidths :
    rootStore.pageWidth > 850 ?
      tabletColumnWidths
      : mobileColumnWidths;

  let gridTemplateColumns = [...new Array(columnHeaders.length)]
    .map((_, column) => columnWidths[column] ? `${columnWidths[column]}fr` : "")
    .filter(c => c)
    .join(" ");

  return (
    <div className={`transfer-table ${className}`}>
      {
        !headerText ? null :
          <div className="transfer-table__header">
            { headerIcon ? <ImageIcon icon={headerIcon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
            { headerText }
          </div>
      }
      {
        !paging ? null :
          <div className="transfer-table__pagination">
            {
              paging.total <= 0 ?
                "No Results" :
                `Showing ${paging.start + 1} - ${paging.limit} of ${paging.total} results`
            }
          </div>
      }
      {
        !paging || paging.total <= 0 ?
          <div className="transfer-table__table" ref={scrollRef} /> :
          <div className="transfer-table__table" ref={scrollRef}>
            <div className="transfer-table__table__header" style={{gridTemplateColumns}}>
              {
                columnHeaders.map((field, columnIndex) => (
                  !columnWidths[columnIndex] ?
                    null :
                    <div key={`table-header-${field}`} className="transfer-table__table__cell">
                      {field}
                    </div>
                ))
              }
            </div>
            <div className="transfer-table__content-rows">
              {
                !entries || entries.length === 0 ?
                  <div className="transfer-table__empty">{ emptyText }</div> :
                  entries.map(({columns, link, onClick}, rowIndex) => {
                    // Link complains if 'to' is blank, so use div instead
                    const Component = link ? Link : ({children, ...props}) => <div {...props}>{children}</div>;

                    return (
                      <Component
                        to={link}
                        onClick={onClick}
                        className={`transfer-table__table__row ${!link && !onClick ? "transfer-table__table__row--no-click" : ""}`}
                        key={`transfer-table-row-${rowIndex}`}
                        style={{gridTemplateColumns}}
                      >
                        {
                          columns.map((field, columnIndex) =>
                            !columnWidths[columnIndex] ?
                              null :
                              <div className="transfer-table__table__cell" key={`table-cell-${rowIndex}-${columnIndex}`}>
                                { field }
                              </div>
                          )
                        }
                      </Component>
                    );
                  })
              }
            </div>
          </div>
      }
    </div>
  );
});

export default Table;
