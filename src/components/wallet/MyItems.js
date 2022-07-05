import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";

import {rootStore, transferStore} from "Stores/index";
import UrlJoin from "url-join";
import {useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";
import ImageIcon from "Components/common/ImageIcon";

import Utils from "@eluvio/elv-client-js/src/Utils";
import {NFTDisplayToken} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {Loader} from "Components/common/Loaders";
import ItemCard from "Components/common/ItemCard";
import {FormatPriceString} from "Components/common/UIComponents";

import ListingIcon from "Assets/icons/listings icon.svg";

const MyItems = observer(() => {
  const match = useRouteMatch();

  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    transferStore.FetchTransferListings({userAddress: rootStore.CurrentAddress()})
      .then(listings => setMyListings(listings));
  }, []);

  return (
    <FilteredView
      mode="owned"
      hideStats
      perPage={60}
      cacheDuration={30}
      Render={({entries, paging, loading}) =>
        <>
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
            entries.length === 0 ? null :
              <div className="card-list">
                {
                  entries.map((nft) => {
                    const listing = myListings.find(listing =>
                      nft.details.TokenIdStr === listing.details.TokenIdStr &&
                      Utils.EqualAddress(nft.details.ContractAddr, listing.details.ContractAddr)
                    );

                    return (
                      <ItemCard
                        key={`nft-card-${nft.details.ContractId}-${nft.details.TokenIdStr}`}
                        link={UrlJoin(match.url, nft.details.ContractId, nft.details.TokenIdStr)}
                        image={<NFTImage nft={nft} width={600} />}
                        badges={
                          listing ?
                            <ImageIcon
                              icon={ListingIcon}
                              title="This NFT is listed for sale"
                              alt="Listing Icon"
                              className="item-card__badge"
                            /> : null
                        }
                        name={nft.metadata.display_name}
                        edition={nft.metadata.edition_name}
                        sideText={NFTDisplayToken(nft)}
                        description={nft.metadata.description}
                        price={listing ?
                          FormatPriceString(
                            listing.details.Price,
                            {
                              includeCurrency: !listing.details.USDCOnly,
                              useCurrencyIcon: false,
                              includeUSDCIcon: listing.details.USDCAccepted,
                              prependCurrency: true
                            }
                          ) : null
                        }
                        usdcAccepted={listing?.details?.USDCAccepted}
                        variant={nft.metadata.style}
                      />
                    );
                  })
                }
              </div>
          }
          { // Infinite scroll loading indicator
            loading && entries.length > 1 ? <Loader className="card-list__loader"/> : null
          }
        </>
      }
    />
  );
});

export default MyItems;
