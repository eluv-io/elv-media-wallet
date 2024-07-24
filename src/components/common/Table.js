import React, {useEffect, useRef, useState} from "react";
import {rootStore} from "Stores";
import {Link} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import {observer} from "mobx-react";
import {Loader} from "Components/common/Loaders";
import {Linkish, LocalizeString, PageControls} from "Components/common/UIComponents";
import ListingFilters from "Components/listings/ListingFilters";
import {SavedValue} from "../../utils/Utils";

import CaretUpIcon from "Assets/icons/up-caret.svg";
import CaretDownIcon from "Assets/icons/down-caret.svg";

const Table = observer(({
  headerText,
  headerIcon,
  columnHeaders,
  entries,
  paging,
  pagingMode="paginated",
  topPagination,
  hidePagingInfo,
  Update,
  scrollRef,
  loading,
  emptyText,
  columnWidths=[],
  tabletColumnWidths,
  mobileColumnWidths,
  hideOverflow,
  useWidth,
  collapsible=false,
  initiallyCollapsed=false,
  className=""
}) => {
  const [collapsed, setCollapsed] = useState(collapsible && initiallyCollapsed);
  columnHeaders = columnHeaders.filter(h => h);

  // Handle column widths
  tabletColumnWidths = tabletColumnWidths || columnWidths;
  mobileColumnWidths = mobileColumnWidths || tabletColumnWidths;

  const width = useWidth || rootStore.pageWidth;

  columnWidths = width > 1250 ?
    columnWidths :
    width > 850 ?
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

  // Pagination info
  const tableRef = useRef();
  let pagingInfo = null;
  if(paging && !hidePagingInfo) {
    pagingInfo = (
      <div className="transfer-table__pagination-message">
        {
          LocalizeString(
            rootStore.l10n.tables.pagination,
            {
              min: <div key="page-min" className="transfer-table__pagination-message--highlight">{paging.start + 1}</div>,
              max: <div key="page-max" className="transfer-table__pagination-message--highlight">{Math.min(paging.total, paging.start + paging.limit)}</div>,
              total: <div key="page-total" className="transfer-table__pagination-message--highlight">{paging.total}</div>
            }
          )
        }
      </div>
    );
  }

  let pageControls;
  if(pagingMode === "paginated") {
    pageControls = (
      <PageControls
        className="transfer-table__page-controls"
        paging={paging}
        hideIfOnePage
        SetPage={page => Update(page)}
      />
    );
  }

  return (
    <div className={`transfer-table-container ${collapsed ? "transfer-table-container--collapsed" : ""}`} ref={tableRef}>
      <div className={`transfer-table ${collapsible ? "transfer-table--collapsable" : ""} ${className}`}>
        {
          !headerIcon && !headerText ? null :
            <Linkish
              onClick={!collapsible ? undefined : () => setCollapsed(!collapsed)}
              className="transfer-table__header"
            >
              {headerIcon ? <ImageIcon icon={headerIcon} className="transfer-table__header__icon"/> : null}
              {headerText}
              {collapsible ? <ImageIcon icon={collapsed ? CaretDownIcon : CaretUpIcon} className="transfer-table__header__collapse-icon"/> : null}
              {pagingInfo}
            </Linkish>
        }
        { pageControls && topPagination ? pageControls : null }
        <div className={`transfer-table__table transfer-table__table--${pagingMode}`} ref={scrollRef}>
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
                <div className="transfer-table__empty">{ loading ? "" : emptyText || rootStore.l10n.tables.no_results }</div> :
                entries.map((row, rowIndex) => {
                  // Row may be defined as simple list, or { columns, ?link, ?onClick }
                  const link = row?.link;
                  const onClick = row?.onClick;
                  const disabled = row?.disabled;
                  const className = row?.className || "";
                  const columns = row?.columns || row;

                  // Link complains if 'to' is blank, so use div instead
                  const Component = link?.startsWith("https:") ? props => <a {...props} href={link} target="_blank" rel="noopener noreferrer" /> :
                    link ? Link :
                      props => onClick ? <button {...props} /> : <div {...props} />;

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
                              className={`transfer-table__table__cell ${field?.className || ""}`}
                              key={`table-cell-${rowIndex}-${columnIndex}`}
                              style={
                                hideOverflow ?
                                  {
                                    display: "block",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                    height: "max-content"
                                  } : {}
                              }
                            >
                              {field?.content || field}
                            </div>
                        )
                      }
                    </Component>
                  );
                })
            }
          </div>
          {
            !loading ? null :
              <div className="transfer-table__loader-container">
                <Loader className="transfer-table__loader"/>
              </div>
          }
        </div>
      </div>
      { pageControls }
    </div>
  );
});

const savedPage = SavedValue(1, "");

export const FilteredTable = observer(({
  mode,
  initialFilters,
  pinnedEntries,
  showFilters,
  topPagination,
  showStats,
  CalculateRowValues,
  pagingMode="paginated",
  perPage=10,
  ...props
}) => {
  const [page, setPage] = useState(1);
  const [loadKey, setLoadKey] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [paging, setPaging] = useState(undefined);
  const [filters, setFilters] = useState(initialFilters);
  const [previousFilters, setPreviousFilters] = useState(filters);

  useEffect(() => {
    if(!filters) { return; }

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

      case "leaderboard":
        Method = async params => await rootStore.walletClient.Leaderboard(params);
        break;

      default:
        throw Error("Invalid mode: " + mode);
    }

    setLoading(true);

    const start = (page - 1) * perPage;
    Method({...filters, start, limit: perPage})
      .then(({results, paging}) => {
        setEntries(results);
        setPaging(paging);
        setPreviousFilters(filters);
        savedPage.SetValue(page, JSON.stringify(filters));
      })
      .finally(() => setLoading(false));
  }, [page, loadKey]);

  // Reload from start when filters change
  useEffect(() => {
    const newPage = savedPage.GetValue(JSON.stringify(filters || {}));

    if(!filters) {
      return;
    } else if(JSON.stringify(filters || {}) === JSON.stringify(previousFilters)) {
      setPage(newPage);
      return;
    }

    setEntries([]);

    page === newPage ? setLoadKey(loadKey + 1) : setPage(newPage);
  }, [filters]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  let rows = entries;
  if(pinnedEntries && !loading && entries.length > 0) {
    rows = [
      ...pinnedEntries,
      ...entries
    ];
  }

  let table = (
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
      topPagination={topPagination}
      Update={newPage => setPage(newPage || page + 1)}
    />
  );

  if(!showFilters && !showStats) {
    return table;
  }

  return (
    <div className="filtered-view">
      {
        showFilters ?
          <ListingFilters
            mode={mode}
            UpdateFilters={async (newFilters) => {
              setLoading(true);
              setEntries([]);
              setPaging(undefined);
              setFilters(newFilters);
              setPage(1);
            }}
          /> : null
      }
      { table }
    </div>
  );
});

export default Table;
