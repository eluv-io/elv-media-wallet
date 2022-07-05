import React, {useEffect, useState} from "react";
import {PageLoader} from "Components/common/Loaders";
import ListingStats from "Components/listings/ListingStats";
import ListingFilters from "Components/listings/ListingFilters";
import {useInfiniteScroll} from "react-g-infinite-scroll";
import {transferStore} from "Stores";
import {ButtonWithLoader} from "Components/common/UIComponents";

let cachedResults = {};
let queryIndex = 0;
const FilteredView = ({
  header,
  mode="listings",
  perPage=30,
  expectRef,
  loadOffset=100,
  initialFilters,
  hideFilters,
  hideStats,
  Render,
  cacheDuration=30
}) => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [paging, setPaging] = useState(undefined);

  const Load = async ({currentFilters={}, currentPaging, currentEntries = [], force=false} = {}) => {
    const query = ++queryIndex;

    try {
      let start = 0;
      if(currentPaging) {
        start = currentPaging.start + currentPaging.limit;
      }

      // Delete all expired results
      Object.keys(cachedResults).forEach(key => {
        if(Date.now() - cachedResults[key].retrievedAt > cacheDuration * 1000) {
          delete cachedResults[key];
        }
      });

      // Remove saved results if the filter parameters are different or more results are being requested
      const key = JSON.stringify(currentFilters);
      if(force || (cachedResults[mode] && (cachedResults[mode].key !== key || cachedResults[mode].paging.start < start))) {
        delete cachedResults[mode];
      }

      if(!cachedResults[mode]) {
        setLoading(true);

        let {results, paging} = await transferStore.FilteredQuery({
          ...(currentFilters || {}),
          start,
          limit: perPage,
          mode
        });

        cachedResults[mode] = {
          key,
          retrievedAt: Date.now(),
          paging,
          entries: [...(currentEntries || []), ...results]
        };
      }

      // Don't update results if a more recent query was made
      if(query !== queryIndex) {
        return;
      }

      setPaging(cachedResults[mode].paging);
      setEntries(cachedResults[mode].entries);

      if(cachedResults[mode].scroll) {
        setTimeout(() => window.scrollTo({top: cachedResults[mode].scroll, behavior: "smooth"}), 100);
      }
    } finally {
      if(query === queryIndex) {
        setLoading(false);
      }
    }
  };

  const scrollRef = useInfiniteScroll({
    expectRef,
    fetchMore: async () => await Load({currentFilters: filters, currentPaging: paging, currentEntries: entries}),
    offset: loadOffset,
    ignoreScroll: loading || (entries && entries.length === 0) || (paging && entries.length === paging.total)
  });

  useEffect(() => {
    if(initialFilters) {
      Load({currentFilters: initialFilters});
    }

    return () => {
      // Cache scroll position when navigating away from page with uncontained filtered view (e.g. my items)
      if(!expectRef && cachedResults[mode]) {
        cachedResults[mode].scroll = window.scrollY;
      }
    };
  }, []);

  return (
    <div className="marketplace-listings marketplace__section filtered-view">
      { header ? <h1 className="page-header">{ header }</h1> : null }
      {
        hideFilters ? null :
          <ListingFilters
            mode={mode}
            UpdateFilters={async (newFilters, force) => {
              setLoading(true);
              setEntries([]);
              setPaging(undefined);
              setFilters(newFilters);
              await Load({currentFilters: newFilters, force});
            }}
          />
      }
      { filters && !hideStats ? <ListingStats mode={mode === "listings" ? "listing-stats" : "sales-stats"} filterParams={filters} /> : null }
      {
        // Initial Load
        loading && entries.length === 0 ?
          <PageLoader/> :
          Render({entries, paging, scrollRef, loading})
      }

      {
        !expectRef && !loading && paging && entries.length < paging.total ?
          <div className="filtered-view__actions">
            <ButtonWithLoader
              onClick={async () => await Load({currentFilters: filters, currentPaging: paging, currentEntries: entries})}
              className="action action-primary filtered-view__action"
            >
              Load More
            </ButtonWithLoader>
          </div> : null
      }
    </div>
  );
};

export default FilteredView;
