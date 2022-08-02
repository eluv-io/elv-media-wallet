import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";

import {rootStore} from "Stores/index";
import UrlJoin from "url-join";
import {useRouteMatch} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";

import Utils from "@eluvio/elv-client-js/src/Utils";
import FilteredView from "Components/listings/FilteredView";

import ListingIcon from "Assets/icons/listings icon.svg";
import TestIcon from "Assets/icons/alert-circle.svg";
import NFTCard from "Components/nft/NFTCard";

const MyItems = observer(() => {
  const match = useRouteMatch();

  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    rootStore.walletClient.UserListings()
      .then(listings => setMyListings(listings));
  }, []);

  return (
    <FilteredView
      mode="owned"
      hideStats
      perPage={9}
      showPagingInfo
      topPagination
      scrollOnPageChange
      Render={({entries}) =>
        entries.length === 0 ? null :
          <div className="card-list">
            {
              entries.map((nft) => {
                const listing = myListings.find(listing =>
                  nft.details.TokenIdStr === listing.details.TokenIdStr &&
                  Utils.EqualAddress(nft.details.ContractAddr, listing.details.ContractAddr)
                );

                return (
                  <NFTCard
                    key={`nft-card2-${nft.details.ContractId}-${nft.details.TokenIdStr}`}
                    link={UrlJoin(match.url, nft.details.ContractId, nft.details.TokenIdStr)}
                    nft={nft}
                    selectedListing={listing}
                    imageWidth={600}
                    badges={
                      <>
                        {
                          listing ?
                            <ImageIcon
                              icon={ListingIcon}
                              title="This NFT is listed for sale"
                              alt="Listing Icon"
                              className="item-card__badge"
                            /> : null
                        }
                        {
                          nft.metadata.test ?
                            <ImageIcon
                              icon={TestIcon}
                              title="This is a test NFT"
                              alt="Test NFT"
                              className="item-card__badge item-card__badge--test"
                            /> : null
                        }
                      </>
                    }
                  />
                );
              })
            }
          </div>
      }
    />
  );
});

export default MyItems;
