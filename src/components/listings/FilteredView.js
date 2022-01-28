import React, {useState} from "react";
import {PageLoader} from "Components/common/Loaders";
import ListingStats from "Components/listings/ListingStats";
import ListingFilters from "Components/listings/ListingFilters";
import {useInfiniteScroll} from "react-g-infinite-scroll";
import {transferStore} from "Stores";

const FilteredView = ({header, mode="listings", perPage=50, expectRef, loadOffset=100, Render}) => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState(undefined);
  const [paging, setPaging] = useState(undefined);

  const Load = async ({currentFilters={}, currentPaging, currentEntries = []} = {}) => {
    try {
      setLoading(true);

      let start = 0;
      if(currentPaging) {
        start = currentPaging.start + currentPaging.limit;
      }

      let {listings, paging} = await transferStore.FilteredQuery({
        ...(currentFilters || {}),
        start,
        limit: perPage,
        mode
      });

      setPaging(paging);
      setEntries([...(currentEntries || []), ...listings]);
    } finally {
      setLoading(false);
    }
  };

  const scrollRef = useInfiniteScroll({
    expectRef,
    fetchMore: async () => await Load({currentFilters: filters, currentPaging: paging, currentEntries: entries}),
    offset: loadOffset,
    ignoreScroll: loading || (entries && entries.length === 0) || (paging && entries.length === paging.total)
  });

  return (
    <div className="marketplace-listings marketplace__section">
      <h1 className="page-header">{ header }</h1>
      <ListingFilters
        mode={mode}
        UpdateFilters={async (newFilters) => {
          setLoading(true);
          setEntries([]);
          setPaging(undefined);
          setFilters(newFilters);
          await Load({currentFilters: newFilters});
        }}
      />
      { filters ? <ListingStats mode={mode === "listings" ? "listing-stats" : "sales-stats"} filterParams={filters} /> : null }
      {
        !paging ? null :
          <div className="listing-pagination">
            {
              paging.total <= 0 ?
                "No Results" :
                `Showing 1 - ${entries.length} of ${paging.total} results`
            }
          </div>
      }
      {
        // Initial Load
        loading && entries.length === 0 ? <PageLoader/> : null
      }
      { Render({entries, scrollRef, loading}) }
    </div>
  );
};

export default FilteredView;
