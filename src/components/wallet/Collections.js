import React, {useState, useEffect} from "react";
import {observer} from "mobx-react";

import {rootStore, transferStore} from "Stores/index";
import UrlJoin from "url-join";
import LinesEllipsis from "react-lines-ellipsis";
import responsiveHOC from "react-lines-ellipsis/lib/responsiveHOC";
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis);
import {Link, useRouteMatch} from "react-router-dom";
import {NFTImage} from "Components/common/Images";
import ImageIcon from "Components/common/ImageIcon";

import ListingIcon from "Assets/icons/listing.svg";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {NFTDisplayToken} from "../../utils/Utils";
import FilteredView from "Components/listings/FilteredView";
import {Loader} from "Components/common/Loaders";

const CollectionCard = observer(({nft, listing}) => {
  const match = useRouteMatch();

  return (
    <div className="card-container card-shadow">
      <Link
        to={UrlJoin(match.url, nft.details.ContractId, nft.details.TokenIdStr)}
        className="card nft-card"
      >
        <NFTImage nft={nft} width={400} />
        <div className="card__badges">
          { listing ?
            <ImageIcon icon={ListingIcon} title="This NFT is listed for sale" alt="Listing Icon" className="card__badge" />
            : null
          }
        </div>
        <div className="card__text">
          <div className="card__titles">
            <h2 className="card__title">
              { nft.metadata.display_name || "" }
            </h2>
            {
              nft.metadata.edition_name ?
                <h2 className="card__title-edition">
                  { nft.metadata.edition_name }
                </h2> : null
            }
            <div className="card__title-edition">
              { NFTDisplayToken(nft) }
            </div>
            <ResponsiveEllipsis
              component="h2"
              className="card__subtitle"
              text={nft.metadata.description}
              maxLine="3"
            />
          </div>
        </div>
      </Link>
    </div>
  );
});

const Collections = observer(() => {
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    transferStore.FetchTransferListings({userAddress: rootStore.userAddress})
      .then(listings => setMyListings(listings));
  }, []);

  return (
    <FilteredView
      mode="owned"
      hideStats
      perPage={32}
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
                  entries.map((nft) =>
                    <CollectionCard
                      key={`nft-card-${nft.details.ContractId}-${nft.details.TokenIdStr}`}
                      nft={nft}
                      listing={myListings.find(listing =>
                        nft.details.TokenIdStr === listing.details.TokenIdStr &&
                        Utils.EqualAddress(nft.details.ContractAddr, listing.details.ContractAddr)
                      )}
                    />
                  )
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

export default Collections;
