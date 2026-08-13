import React, {memo, useState} from "react";
import {observer} from "mobx-react";
import {mediaPropertyStore, rootStore} from "@/stores";
import {useRouteMatch} from "react-router-dom";
import UrlJoin from "url-join";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "@/components/common/ImageIcon";
import FilteredView from "@/components/listings/FilteredView";
import NFTCard from "@/components/nft/NFTCard";
import {RecentSales} from "@/components/listings/Activity";

import ListingIcon from "@/assets/icons/listings icon.svg";
import LinkedIcon from "@/assets/icons/linked wallet icon (r).svg";
import GraphIcon from "@/assets/icons/bar-chart-2.svg";
import XIcon from "@/assets/icons/x.svg";

// eslint-disable-next-line react/display-name
const Listing = memo(({url, listing}) => (
  <NFTCard
    link={UrlJoin(url, listing.details.ContractId, listing.details.TokenIdStr, `?listingId=${listing.details.ListingId}`)}
    imageWidth={600}
    nft={listing}
    selectedListing={listing}
    truncateDescription
    badges={[
      Utils.EqualAddress(rootStore.CurrentAddress(), listing.details.SellerAddress) ?
        <ImageIcon key="badge-owned" icon={ListingIcon} title="This is your listing" alt="Listing Icon" className="item-card__badge"/> : null,
      listing.details.USDCOnly ?
        <ImageIcon key="badge-usdc" icon={LinkedIcon} title="This listing may only be purchased with a linked wallet" alt="Linked Wallet Icon" className="item-card__badge"/> : null
    ].filter(badge => badge)}
  />
));

const Listings = observer(({initialFilters, includeActivity=true}) => {
  const match = useRouteMatch();
  const [showActivity, setShowActivity] = useState(false);

  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false;

  if(secondaryDisabled) {
    return null;
  }

  if(!initialFilters && match.params.mediaPropertySlugOrId) {
    const mediaProperty = mediaPropertyStore.MediaProperty({
      mediaPropertySlugOrId: match.params.mediaPropertySlugOrId
    });

    initialFilters = {
      marketplaceId: mediaProperty?.metadata.associated_marketplaces?.[0]?.marketplace_id
    };
  }

  if(new URLSearchParams(location.search).has("filter")) {
    initialFilters = {
      ...initialFilters,
      filter: new URLSearchParams(location.search).get("filter"),
      editionFilter: new URLSearchParams(location.search).get("edition"),
    };
  }

  return (
    showActivity ?
      <RecentSales
        menuButton={{
          icon: XIcon,
          active: true,
          title: "Back to Listings",
          onClick: () => setShowActivity(false)
        }}
      /> :
      <FilteredView
        mode="listings"
        pagingMode="paginated"
        showPagingInfo
        perPage={12}
        scrollOnPageChange
        initialFilters={initialFilters}
        menuButton={
          !includeActivity ? undefined :
            {
              icon: GraphIcon,
              active:false,
              title: "Show Recent Activity",
              onClick: () => setShowActivity(true)
            }
        }
        Render={({entries}) => (
          entries.length === 0 ? null :
            <div className="card-list">
              {
                entries.map((listing, index) => {
                  return (
                    <Listing
                      url={match.url}
                      listing={listing}
                      key={`listing-card-${listing.details.ListingId}-${index}`}
                    />
                  );
                })
              }
            </div>
        )}
      />
  );
});

export default Listings;
