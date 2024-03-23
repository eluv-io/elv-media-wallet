import React, {useEffect, useRef, useState} from "react";
import {PageLoader} from "Components/common/Loaders";
import ListingStats from "Components/listings/ListingStats";
import ListingFilters from "Components/listings/ListingFilters";
//import {useInfiniteScroll} from "react-g-infinite-scroll";
import {rootStore} from "Stores";
import {LocalizeString, PageControls} from "Components/common/UIComponents";
import {SavedValue, ScrollTo} from "../../utils/Utils";

const savedPage = SavedValue(1, "");

const FilteredView = ({
  header,
  mode="listings",
  pagingMode="paginated",
  perPage=30,
  topPagination,
  showPagingInfo,
  scrollOnPageChange,
  expectRef,
  initialFilters,
  hideFilters,
  hideStats,
  Render,
}) => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState(hideFilters ? initialFilters : undefined);
  const [paging, setPaging] = useState(undefined);
  const [page, setPage] = useState(1);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [loadKey, setLoadKey] = useState(1);
  const containerRef = useRef();

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

        savedPage.SetValue(page, JSON.stringify(filters));
      })
      .finally(() => setLoading(false));
  }, [page, loadKey]);

  // Reload from start when filters change
  useEffect(() => {
    if(!filters) { return; }

    setEntries([]);

    const newPage = savedPage.GetValue(JSON.stringify(filters));

    page === newPage ? setLoadKey(loadKey + 1) : setPage(newPage);
  }, [filters]);

  let scrollRef;
  /*
  if(pagingMode === "infinite") {
    scrollRef = useInfiniteScroll({
      expectRef,
      fetchMore: () => {
        // Debounce
        if(Date.now() - lastUpdate < 500) {
          return;
        }

        setLastUpdate(Date.now());
        setPage(page + 1);
      },
      offset: 200,
      ignoreScroll: loading || (entries && entries.length === 0) || (paging && entries.length === paging.total)
    });
  }

   */

  // Pagination info
  let pagingInfo = null;
  if(paging && showPagingInfo) {
    pagingInfo = (
      <div className="filtered-view__pagination-message">
        {
          LocalizeString(
            rootStore.l10n.tables.pagination,
            {
              min: <div key="page-min" className="filtered-view__pagination-message--highlight">{pagingMode === "infinite" ? 1 : paging.start + 1}</div>,
              max: <div key="page-max" className="filtered-view__pagination-message--highlight">{Math.min(paging.total, paging.start + paging.limit)}</div>,
              total: <div key="page-total" className="filtered-view__pagination-message--highlight">{paging.total}</div>
            }
          )
        }
      </div>
    );
  }

  return (
    <div className="filtered-view" ref={containerRef}>
      { header ? <h1 className="page-header">{ header }</h1> : null }
      {
        hideFilters ? null :
          <ListingFilters
            mode={mode}
            initialFilters={initialFilters}
            UpdateFilters={async (newFilters) => {
              setLoading(true);
              setEntries([]);
              setPaging(undefined);
              setFilters(newFilters);
              setPage(1);
            }}
          />
      }
      { filters && !hideStats ? <ListingStats mode={mode} filterParams={filters} /> : null }
      {
        topPagination && pagingMode === "paginated" ?
          <PageControls
            paging={paging}
            className={`filtered-view__page-controls ${loading ? "filtered-view__page-controls--loading" : ""}`}
            SetPage={page => setPage(page)}
          /> : null
      }
      { pagingInfo }
      {
        // Initial Load
        loading && entries.length === 0 ?
          <PageLoader/> :
          Render({entries, paging, scrollRef, loading})
      }
      {
        pagingMode === "infinite" && !expectRef && !loading && paging && entries.length < paging.total ?
          <div className="filtered-view__actions">
            <button
              onClick={() => setPage(page + 1)}
              className="action action-primary filtered-view__action"
            >
              Load More
            </button>
          </div> : null
      }
      {
        pagingMode === "paginated" ?
          <PageControls
            paging={paging}
            className="filtered-view__page-controls"
            SetPage={page => {
              setPage(page);

              if(scrollOnPageChange && containerRef.current) {
                ScrollTo(containerRef.current.getBoundingClientRect().top + window.scrollY);
              }
            }}
          /> : null
      }
    </div>
  );
};

export default FilteredView;
