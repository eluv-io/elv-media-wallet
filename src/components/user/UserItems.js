import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";

import {rootStore} from "Stores";
import UrlJoin from "url-join";
import {useRouteMatch} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";

import Utils from "@eluvio/elv-client-js/src/Utils";
import FilteredView from "Components/listings/FilteredView";

import ListingIcon from "Assets/icons/listings icon.svg";
import TestIcon from "Assets/icons/alert-circle.svg";
import NFTCard from "Components/nft/NFTCard";

const UserItems = observer(() => {
  const match = useRouteMatch();
  const userAddress =
    rootStore.userProfiles[match.params.userId]?.userAddress ||
    (match.params.userId === "me" && rootStore.CurrentAddress()) ||
    (match.params.userId.startsWith("0x") && match.params.userId);

  const [userListings, setUserListings] = useState([]);

  useEffect(() => {
    rootStore.walletClient.UserListings({userAddress})
      .then(listings => setUserListings(listings));

    if(match.params.marketplaceId) {
      if(!rootStore.sidePanelMode || !rootStore.noItemsAvailable) { return; }

      // If there are no items available for sale and we're in the side panel, we want to avoid navigating back to the marketplace page.
      const originalHideNavigation = rootStore.hideNavigation;
      rootStore.ToggleNavigation(false);

      return () => {
        rootStore.ToggleNavigation(originalHideNavigation);
      };
    }
  }, []);

  return (
    <FilteredView
      mode="owned"
      hideStats
      perPage={12}
      showPagingInfo
      scrollOnPageChange
      initialFilters={{ userAddress }}
      Render={({entries}) =>
        entries.length === 0 ? null :
          <div className="card-list">
            {
              entries.map((nft) => {
                const listing = userListings.find(listing =>
                  nft.details.TokenIdStr === listing.details.TokenIdStr &&
                  Utils.EqualAddress(nft.details.ContractAddr, listing.details.ContractAddr)
                );

                return (
                  <NFTCard
                    key={`nft-card-${nft.details.ContractId}-${nft.details.TokenIdStr}`}
                    link={UrlJoin(match.url, nft.details.ContractId, nft.details.TokenIdStr)}
                    detailsLink={
                      !rootStore.client.utils.EqualAddress(nft.details.TokenOwner, rootStore.CurrentAddress()) ? null :
                        UrlJoin(match.url, nft.details.ContractId, nft.details.TokenIdStr) + "?page=details"
                    }
                    nft={nft}
                    imageWidth={600}
                    badges={[
                      !listing ? null :
                        <ImageIcon
                          key="badge-listing"
                          icon={ListingIcon}
                          title="This NFT is listed for sale"
                          alt="Listing Icon"
                          className="item-card__badge"
                        />,
                      !nft.metadata.test ? null :
                        <ImageIcon
                          key="badge-test"
                          icon={TestIcon}
                          title="This is a test NFT"
                          alt="Test NFT"
                          className="item-card__badge item-card__badge--test"
                        />
                    ].filter(badge => badge)}
                  />
                );
              })
            }
          </div>
      }
    />
  );
});

export default UserItems;
