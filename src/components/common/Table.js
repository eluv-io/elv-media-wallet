import React, {useEffect, useRef, useState} from "react";
import {rootStore} from "Stores";
import {Link} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import {observer} from "mobx-react";
import {Loader} from "Components/common/Loaders";
import {PageControls} from "Components/common/UIComponents";
import {useInfiniteScroll} from "react-g-infinite-scroll";

const Table = observer(({
  headerText,
  headerIcon,
  columnHeaders,
  entries,
  paging,
  pagingMode="infinite",
  hidePagingInfo,
  Update,
  scrollRef,
  loading,
  emptyText="No Results",
  columnWidths=[],
  tabletColumnWidths,
  mobileColumnWidths,
  hideOverflow,
  className=""
}) => {
  columnHeaders = columnHeaders.filter(h => h);

  // Handle column widths
  tabletColumnWidths = tabletColumnWidths || columnWidths;
  mobileColumnWidths = mobileColumnWidths || tabletColumnWidths;

  columnWidths = rootStore.pageWidth > 1250 ?
    columnWidths :
    rootStore.pageWidth > 850 ?
      tabletColumnWidths
      : mobileColumnWidths;

  let gridTemplateColumns = [...new Array(columnHeaders.length)]
    .map((_, column) => {
      const width = columnWidths[column];
      if(typeof width === "string") {
        return width;
      } else if(width) {
        return `${width}fr`;
      }
    })
    .filter(c => c)
    .join(" ");

  // Set up infinite scroll
  const [lastUpdate, setLastUpdate] = useState(0);
  if(pagingMode === "infinite" && !scrollRef) {
    scrollRef = useInfiniteScroll({
      expectRef: true,
      fetchMore: () => {
        // Debounce
        if(Date.now() - lastUpdate < 500) {
          return;
        }

        setLastUpdate(Date.now());
        Update();
      },
      offset: 200,
      ignoreScroll: entries.length === 0 || !paging || loading || paging.start + paging.limit > paging.total
    });
  }

  // Pagination info
  const tableRef = useRef();
  let pagingInfo = null;
  if(paging && !hidePagingInfo) {
    pagingInfo = (
      <div className="transfer-table__pagination-message">
        Showing
        <div className="transfer-table__pagination-message--highlight">{pagingMode === "infinite" ? 1 : paging.start + 1}</div>
        -
        <div className="transfer-table__pagination-message--highlight">{Math.min(paging.total, paging.start + paging.limit)}</div>
        of
        <div className="transfer-table__pagination-message--highlight">{paging.total}</div>
        results
      </div>
    );
  }

  return (
    <div className="transfer-table-container" ref={tableRef}>
      <div className={`transfer-table ${className}`}>
        {
          !headerText ? null :
            <div className="transfer-table__header">
              { headerIcon ? <ImageIcon icon={headerIcon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
              { headerText }
            </div>
        }
        { pagingInfo }
        {
          (!paging && pagingMode !== "none") ?
            <div className={`transfer-table__table ${pagingMode === "infinite" ? "transfer-table__table--infinite" : "transfer-table__table--paginated"}`} ref={scrollRef} /> :
            <div className={`transfer-table__table ${pagingMode === "infinite" ? "transfer-table__table--infinite" : "transfer-table__table--paginated"}`} ref={scrollRef}>
              <div className="transfer-table__table__header" style={{gridTemplateColumns}}>
                {
                  columnHeaders.map((field, columnIndex) => {
                    if(!columnWidths[columnIndex]) { return null; }

                    const Component = props => field?.onClick ? <button {...props} /> : <div {...props} />;

                    return (
                      <Component key={`table-header-${columnIndex}`} onClick={field?.onClick} className="transfer-table__table__cell">
                        { field?.icon ? <ImageIcon icon={field.icon} className="transfer-table__table__cell__icon" /> : null }
                        { field?.text || field }
                      </Component>
                    );
                  })
                }
              </div>

              <div className="transfer-table__content-rows">
                {
                  !entries || entries.length === 0 ?
                    <div className="transfer-table__empty">{ loading ? "" : emptyText }</div> :
                    entries.map((row, rowIndex) => {
                      // Row may be defined as simple list, or { columns, ?link, ?onClick }
                      const link = row?.link;
                      const onClick = row?.onClick;
                      const disabled = row?.disabled;
                      const className = row?.className || "";
                      const columns = row?.columns || row;

                      // Link complains if 'to' is blank, so use div instead
                      const Component = link ? Link : props => onClick ? <button {...props} /> : <div {...props} />;

                      return (
                        <Component
                          to={link}
                          onClick={onClick}
                          disabled={disabled}
                          className={`transfer-table__table__row ${!link && !onClick ? "transfer-table__table__row--no-click" : ""} ${className}`}
                          key={`transfer-table-row-${rowIndex}`}
                          style={{gridTemplateColumns}}
                        >
                          {
                            columns.map((field, columnIndex) =>
                              !columnWidths[columnIndex] ?
                                null :
                                <div
                                  className="transfer-table__table__cell"
                                  key={`table-cell-${rowIndex}-${columnIndex}`}
                                  style={
                                    hideOverflow ?
                                      {
                                        display: "block",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis"
                                      } : {}
                                  }
                                >
                                  {field}
                                </div>
                            )
                          }
                        </Component>
                      );
                    })
                }
                {loading ? <Loader className="transfer-table__content-rows__loader"/> : null}
              </div>
            </div>
        }
      </div>
      {
        pagingMode === "paginated" ?
          <PageControls
            className="transfer-table__page-controls"
            paging={paging}
            hideIfOnePage
            SetPage={page => {
              Update(page);

              setTimeout(() => tableRef?.current?.scrollIntoView({behavior: "smooth"}), 500);
            }}
          /> : null
      }
    </div>
  );
});

export const FilteredTable = observer(({mode, filters, pinnedEntries, CalculateRowValues, pagingMode="infinite", perPage=10, ...props}) => {
  const [page, setPage] = useState(1);
  const [loadKey, setLoadKey] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [paging, setPaging] = useState(undefined);
  const [previousFilters, setPreviousFilters] = useState(filters);

  useEffect(() => {
    let Method;
    switch(mode) {
      case "listings":
        Method = async params => await rootStore.walletClient.Listings(params);
        break;

      case "transfers":
        Method = async params => await rootStore.walletClient.Transfers(params);
        break;

      case "sales":
        Method = async params => await rootStore.walletClient.Sales(params);
        break;

      case "owned":
        Method = async params => await rootStore.walletClient.UserItems(params);
        break;

      default:
        throw Error("Invalid mode: " + mode);
    }

    setLoading(true);

    const start = (page - 1) * perPage;
    Method({...filters, start, limit: perPage})
      .then(({results, paging}) => {
        if(pagingMode === "infinite") {
          setEntries([
            ...entries,
            ...results
          ]);
        } else {
          setEntries(results);
        }

        setPaging(paging);
        setPreviousFilters(filters);
      })
      .finally(() => setLoading(false));
  }, [page, loadKey]);

  // Reload from start when filters change
  useEffect(() => {
    if(JSON.stringify(filters || {}) === JSON.stringify(previousFilters)) {
      return;
    }

    setEntries([]);

    page === 1 ? setLoadKey(loadKey + 1) : setPage(1);
  }, [filters]);

  let rows = entries;
  if(pinnedEntries && !loading && entries.length > 0) {
    rows = [
      ...pinnedEntries,
      ...entries
    ];
  }

  return (
    <Table
      {...props}
      loading={loading}
      entries={
        rows
          .map(CalculateRowValues)
          .filter(row => row)
      }
      pagingMode={pagingMode}
      paging={paging}
      Update={newPage => setPage(newPage || page + 1)}
    />
  );
});

export default Table;
