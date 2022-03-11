import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, transferStore} from "Stores/index";
import Path from "path";
import UrlJoin from "url-join";

import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {ExpandableSection, CopyableField, ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";

import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import Confirm from "Components/common/Confirm";
import {TransferTable} from "Components/listings/TransferTables";
import ListingModal from "Components/listings/ListingModal";
import {Loader, PageLoader} from "Components/common/Loaders";
import ListingPurchaseModal from "Components/listings/ListingPurchaseModal";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {v4 as UUID} from "uuid";
import NFTCard from "Components/common/NFTCard";
import ListingStats from "Components/listings/ListingStats";
import Activity from "Components/listings/Activity";
import NFTTransfer from "Components/wallet/NFTTransfer";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import NFTMediaControls from "Components/wallet/NFTMediaControls";

import DescriptionIcon from "Assets/icons/Description icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
import TraitsIcon from "Assets/icons/properties icon.svg";
import MediaSectionIcon from "Assets/icons/Media tab icon.svg";
import PlayIcon from "Assets/icons/blue play icon.svg";
import {MediaIcon} from "../../utils/Utils";

const FormatRarity = (rarity) => {
  if(!rarity) {
    return "";
  }

  rarity = rarity.toString();

  if(!rarity.includes("/")) {
    return rarity;
  }

  const [ numerator, denominator ] = rarity.split("/");
  let percentage = 100 * parseInt(numerator) / parseInt(denominator);

  if(percentage < 1) {
    percentage = percentage.toFixed(2);
  } else {
    percentage = percentage.toFixed(1).toString().replace(".0", "");
  }

  return `${percentage}% have this trait`;
};

const NFTMediaSection = ({nft, containerElement, selectedMediaIndex, setSelectedMediaIndex, currentPlayerInfo}) => {
  let media = nft.metadata.additional_media || [];
  const isOwned = nft.details && rootStore.NFTInfo({contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr});

  if(!isOwned) {
    media = media.filter(item => !item.requires_permissions);
  }

  if(media.length === 0) {
    return null;
  }

  useEffect(() => {
    const defaultMediaIndex = media.findIndex(item => item.default);

    if(defaultMediaIndex >= 0) {
      setSelectedMediaIndex(defaultMediaIndex);
    }
  }, []);

  return (
    <ExpandableSection
      expanded
      toggleable={false}
      header="Media"
      icon={MediaSectionIcon}
      contentClassName="details-page__media-container"
      additionalContent={
        <NFTMediaControls
          nft={nft}
          containerElement={containerElement}
          selectedMediaIndex={selectedMediaIndex}
          setSelectedMediaIndex={setSelectedMediaIndex}
          currentPlayerInfo={currentPlayerInfo}
        />
      }
    >
      { media.map((item, index) => {
        let image;
        if(item.image) {
          const url = new URL(typeof item.image === "string" ? item.image : item.image.url);
          url.searchParams.set("width", "400");
          image = url.toString();
        }

        return (
          <button
            key={`alternate-media-${index}`}
            className={`details-page__media ${index === selectedMediaIndex ? "details-page__media--selected" : ""}`}
            onClick={() => {
              setSelectedMediaIndex(index);

              if(containerElement) {
                const top = containerElement.getBoundingClientRect().top;

                if(item.media_type !== "Audio" && top < 0) {
                  window.scrollTo({top: Math.max(0, window.scrollY + top - 20), behavior: "smooth"});
                }
              }
            }}
          >
            <div className="details-page__media__image-container">
              { image ? <ImageIcon icon={image} title={item.name} className="details-page__media__image" /> : <div className="details-page__media__image details-page__media__image--fallback" /> }
              { index === selectedMediaIndex ?
                <ImageIcon icon={MediaIcon(item, true)} className="details-page__media__selected-indicator" title="Selected" /> :
                <ImageIcon icon={PlayIcon} className="details-page__media__hover-icon" label="Play Icon" />
              }
            </div>
            <div className="details-page__media__details">
              <ResponsiveEllipsis
                component="h2"
                className="details-page__media__name"
                text={item.name || ""}
                maxLine="2"
              />
              <div className="details-page__media__subtitles">
                <h3 className="details-page__media__subtitle-1 ellipsis">{item.subtitle_1 || ""}</h3>
                <h3 className="details-page__media__subtitle-2 ellipsis">{item.subtitle_2 || ""}</h3>
              </div>
            </div>
          </button>
        );
      })}
    </ExpandableSection>
  );
};

const NFTDescriptionSection = ({nft}) => {
  return (
    <ExpandableSection header="Description" icon={DescriptionIcon}>
      <p className="details-page__description">{ nft.metadata.description }</p>
      {
        nft.metadata.rich_text ?
          <div
            className="details-page__rich-text rich-text"
            ref={element => {
              if(!element) { return; }

              render(
                <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                  { SanitizeHTML(nft.metadata.rich_text) }
                </ReactMarkdown>,
                element
              );
            }}
          /> : null
      }
    </ExpandableSection>
  );
};

const NFTTraitsSection = ({nft}) => {
  const FILTERED_ATTRIBUTES = [ "Content Fabric Hash", "Creator", "Total Minted Supply" ];
  const traits = ((nft.metadata || {}).attributes || [])
    .filter(attribute => attribute && !FILTERED_ATTRIBUTES.includes(attribute.trait_type));

  if(traits.length === 0) {
    return null;
  }

  return (
    <ExpandableSection header="Properties" icon={TraitsIcon}>
      <div className="traits">
        {traits.map(({rarity, trait_type, value}, index) =>
          <div className="trait" key={`trait-${index}`}>
            <div className="trait__type">
              { trait_type }
            </div>
            <div className="trait__value">
              { value }
            </div>
            <div className="trait__rarity">
              { FormatRarity(rarity) }
            </div>
          </div>
        )}
      </div>
    </ExpandableSection>
  );
};

const NFTDetailsSection = ({nft}) => {
  let mintDate = nft.metadata.created_at;
  if(mintDate) {
    try {
      const parsedMintDate = new Date(mintDate);
      if(!(parsedMintDate instanceof Date && !isNaN(parsedMintDate))) {
        rootStore.Log(`Invalid date: ${mintDate}`, true);
      } else {
        mintDate = `${parsedMintDate.getFullYear()}/${parsedMintDate.getMonth() + 1}/${parsedMintDate.getDate()}`;
      }
    } catch(error) {
      mintDate = "";
    }
  }

  return (
    <ExpandableSection header="Details" icon={DetailsIcon}>
      {
        nft.details.TokenUri ?
          <CopyableField value={nft.details.TokenUri}>
            Token URI: <a href={nft.details.TokenUri} target="_blank">{ nft.details.TokenUri }</a>
          </CopyableField>
          : null
      }
      {
        nft.metadata.embed_url ?
          <CopyableField value={nft.metadata.embed_url}>
            Media URL: <a href={nft.metadata.embed_url} target="_blank">{ nft.metadata.embed_url }</a>
          </CopyableField>
          : null
      }
      {
        nft.metadata.image ?
          <CopyableField value={nft.metadata.image}>
            Image URL: <a href={nft.metadata.image} target="_blank">{ nft.metadata.image }</a>
          </CopyableField>
          : null
      }
      {
        nft.metadata.creator ?
          <div>
            Creator: { nft.metadata.creator }
          </div>
          : null
      }
      {
        nft.metadata.edition_name ?
          <div>
            Edition: { nft.metadata.edition_name }
          </div>
          : null
      }

      <div>Token ID: { nft.details.TokenIdStr }</div>

      {
        typeof nft.details.TokenOrdinal !== "undefined" ?
          <div>
            Token Ordinal: { nft.details.TokenOrdinal }
          </div>
          : null
      }
      {
        nft.metadata.total_supply ?
          <div>
            Total Supply: { nft.metadata.total_supply }
          </div>
          : null
      }
      {
        nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) ?
          <div>
            Held Until { nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) }
          </div>
          : null
      }
      <br />
      <div>
        { nft.metadata.copyright }
      </div>
      <div>
        { mintDate ? `Minted on the Eluvio Content Fabric on ${mintDate}` : "" }
      </div>
    </ExpandableSection>
  );
};

const NFTContractSection = ({nft, listing, isOwned, setDeleted}) => {
  return (
    <ExpandableSection header="Contract" icon={ContractIcon} className="no-padding">
      <div className="expandable-section__content-row">
        <CopyableField value={nft.details.ContractAddr}>
          Contract Address: { nft.details.ContractAddr }
        </CopyableField>
      </div>
      <div className="expandable-section__content-row">
        <CopyableField value={nft.details.VersionHash}>
          Hash: { nft.details.VersionHash }
        </CopyableField>
      </div>
      <div className="expandable-section__actions">
        <a
          className="lookout-url"
          target="_blank"
          href={
            EluvioConfiguration["config-url"].includes("main.net955305") ?
              `https://explorer.contentfabric.io/address/${nft.details.ContractAddr}/transactions` :
              `https://lookout.qluv.io/address/${nft.details.ContractAddr}/transactions`
          }
          rel="noopener"
        >
          See More Info on Eluvio Lookout
        </a>
        {
          rootStore.funds ?
            <ButtonWithLoader
              className="details-page__delete-button"
              onClick={async () => {
                if(confirm("Are you sure you want to delete this NFT from your collection?")) {
                  await rootStore.BurnNFT({nft});
                  setDeleted(true);
                  await rootStore.LoadNFTInfo(true);
                }
              }}
            >
              Delete this NFT
            </ButtonWithLoader> : null
        }
      </div>
      { isOwned && !listing ? <NFTTransfer nft={nft}/> : null }
    </ExpandableSection>
  );
};

const NFTDetails = observer(() => {
  const match = useRouteMatch();

  const [opened, setOpened] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const [loadingListing, setLoadingListing] = useState(true);
  const [listing, setListing] = useState(undefined);
  const [sale, setSale] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [statusCheckKey, setStatusCheckKey] = useState("");
  const [listingId, setListingId] = useState(match.params.listingId);
  const [detailsRef, setDetailsRef] = useState(undefined);

  const [nftData, setNFTData] = useState(undefined);

  // TODO: Default media
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);
  const [currentPlayerInfo, setCurrentPlayerInfo] = useState({selectedMediaIndex: selectedMediaIndex, playerInfo: undefined});

  const nftInfo = rootStore.NFTInfo({contractId: match.params.contractId, tokenId: match.params.tokenId});
  const isOwned = !!nftInfo || (listing && Utils.EqualAddress(listing.details.SellerAddress, rootStore.userAddress));
  const heldDate = nftInfo && nftInfo.TokenHoldDate && (new Date() < nftInfo.TokenHoldDate) && nftInfo.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

  const LoadListing = async ({listingId, setLoading=false}) => {
    try {
      if(setLoading) { setLoadingListing(true); }

      const status = await transferStore.CurrentNFTStatus({
        listingId,
        nft: nftData || (nftInfo ? { details: nftInfo } : undefined),
        contractId: match.params.contractId,
        tokenId: match.params.tokenId
      });

      if(match.params.listingId && "sale" in status) {
        setSale(status.sale);
      } else if("listing" in status) {
        setListing(status.listing);
        setListingId(status.listing?.details?.ListingId);

        if(!match.params.contractId && !status.listing) {
          setErrorMessage("This listing has been removed");
        }
      } else if("error" in status) {
        setErrorMessage(status.error);
      }

      return status;
    } finally {
      setLoadingListing(false);
    }
  };

  useEffect(() => {
    let listingStatusInterval;
    rootStore.UpdateMetamaskChainId();

    if(match.params.contractId) {
      rootStore.LoadNFTData({
        contractId: match.params.contractId,
        tokenId: match.params.tokenId
      }).then(nft => setNFTData(nft));
    }

    LoadListing({listingId, setLoading: true});

    listingStatusInterval = setInterval(() => setStatusCheckKey(UUID()), 60000);

    return () => clearInterval(listingStatusInterval);
  }, []);


  useEffect(() => {
    LoadListing({listingId});
  }, [statusCheckKey, nftData]);

  if(deleted) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "collection")}/> :
      <Redirect to={Path.dirname(Path.dirname(match.url))}/>;
  }

  if(errorMessage) {
    return (
      <div className="details-page details-page-message">
        <div className="details-page__message-container">
          <h2 className="details-page__message">
            { errorMessage }
          </h2>
        </div>
      </div>
    );
  }

  if(sale) {
    return (
      <div className="details-page details-page-message">
        <div className="details-page__message-container">
          <h2 className="details-page__message">
            This NFT was sold for { FormatPriceString({USD: sale.price}) } on { new Date(sale.created * 1000).toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) }
          </h2>
          <div className="actions-container">
            <Link
              className="button action"
              to={
                match.params.marketplaceId ?
                  UrlJoin("/marketplace", match.params.marketplaceId, "collection") :
                  UrlJoin("/wallet", "collection")
              }
            >
              Back to My Items
            </Link>
            <Link
              className="button action"
              to={
                match.params.marketplaceId ?
                  UrlJoin("/marketplace", match.params.marketplaceId, "my-listings") :
                  UrlJoin("/wallet", "my-listings")
              }
            >
              My Listings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if(!nftData && !listing) {
    return <PageLoader />;
  }

  // If NFT is not owned, use the listing
  let nft = nftData;
  if(!nftData) {
    nft = listing;
  }

  if(opened) {
    return <Redirect to={UrlJoin(match.url, "open")} />;
  }

  const NFTActions = () => {
    if(loadingListing) {
      return (
        <div className="details-page__actions">
          <Loader />
        </div>
      );
    }

    let isInCheckout = listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now();
    if(!isOwned) {
      if(!listing) { return null; }

      return (
        <div className="details-page__actions">
          <ButtonWithLoader
            disabled={isInCheckout}
            className="details-page__listing-button action action-primary"
            onClick={async () => {
              const { listing } = await LoadListing({listingId});

              if(listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now()) {
                // checkout locked
              } else {
                setShowPurchaseModal(true);
              }
            }}
          >
            Buy Now for { FormatPriceString({USD: listing.details.Price}) }
          </ButtonWithLoader>
          {
            isInCheckout ?
              <h3 className="details-page__transfer-details details-page__held-message">
                This NFT is currently in the process of being purchased
              </h3> : null
          }
        </div>
      );
    } else {
      return (
        <div className="details-page__actions">
          {
            listing ?
              <div className="details-page__listing-info">
                <h3 className="details-page__listing-info__header">This NFT is listed for sale on the marketplace</h3>
                <div className="details-page__listing-price-label">
                  Listing Price
                </div>
                <div className="details-page__listing-price-value">
                  ${listing.details.Price.toFixed(2)}
                </div>
              </div> : null
          }

          <ButtonWithLoader
            disabled={heldDate || isInCheckout}
            className="action action-primary details-page__listing-button"
            onClick={async () => {
              const { listing } = await LoadListing({listingId});

              if(listing && listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now()) {
                // checkout locked
              } else {
                setShowListingModal(true);
              }
            }}
          >
            { listing ? "Edit Listing" : "List for Sale" }
          </ButtonWithLoader>
          {
            !listing && nft && nft.metadata && nft.metadata.pack_options && nft.metadata.pack_options.is_openable ?
              <ButtonWithLoader
                className="details-page__open-button"
                onClick={async () => Confirm({
                  message: "Are you sure you want to open this pack?",
                  Confirm: async () => {
                    await rootStore.OpenNFT({nft});
                    setOpened(true);
                  }
                })}
              >
                Open Pack
              </ButtonWithLoader> : null
          }
          {
            heldDate ?
              <h3 className="details-page__transfer-details details-page__held-message">
                This NFT is in a holding period until { heldDate } for payment settlement. You will not be able to transfer it until then.
              </h3> : null
          }
          {
            isInCheckout ?
              <h3 className="details-page__transfer-details details-page__held-message">
                This NFT is currently in the process of being purchased
              </h3> : null
          }
        </div>
      );
    }
  };

  return (
    <>
      {
        showListingModal ?
          <ListingModal
            nft={listing || nft}
            Close={(info={}) => {
              setShowListingModal(false);

              if(info.deleted) {
                setListingId(undefined);
                setListing(undefined);

                if(!match.params.contractId) {
                  setDeleted(true);
                }
              } else if(info.listingId) {
                setListingId(info.listingId);
                LoadListing({listingId: info.listingId, setLoading: true});
              }
            }}
          /> : null
      }
      { showPurchaseModal ?
        <ListingPurchaseModal
          nft={listing || nft}
          initialListingId={listing && listing.details.ListingId}
          Close={() => setShowPurchaseModal(false)}
        /> : null
      }
      <div className="details-page" ref={element => setDetailsRef(element)}>
        <div className="details-page__content-container">
          <NFTCard
            nft={nft}
            selectedListing={listing}
            showVideo
            showOrdinal
            selectedMediaIndex={selectedMediaIndex}
            setSelectedMediaIndex={setSelectedMediaIndex}
            playerCallback={playerInfo => {
              if(playerInfo === currentPlayerInfo?.playerInfo || playerInfo?.videoElement === currentPlayerInfo?.videoElement) {
                return;
              }

              setCurrentPlayerInfo({selectedMediaIndex, playerInfo});
            }}
          />
        </div>
        <div className="details-page__info">
          <NFTActions />
          <NFTMediaSection
            nft={nft}
            containerElement={detailsRef}
            selectedMediaIndex={selectedMediaIndex}
            setSelectedMediaIndex={setSelectedMediaIndex}
            currentPlayerInfo={currentPlayerInfo && currentPlayerInfo.selectedMediaIndex === selectedMediaIndex ? currentPlayerInfo.playerInfo : undefined}
          />
          <NFTDescriptionSection nft={nft} />
          <NFTTraitsSection nft={nft} />
          <NFTDetailsSection nft={nft} />
          <NFTContractSection nft={nft} listing={listing} isOwned={isOwned} setDeleted={setDeleted} />
        </div>
      </div>
      <div className="details-page__transfer-tables">
        <ListingStats
          mode="sales-stats"
          filterParams={{contractAddress: nft.details.ContractAddr}}
        />
        <TransferTable
          header="Transaction history for this token"
          contractAddress={nft.details.ContractAddr}
          tokenId={nft.details.TokenIdStr}
        />
        <Activity
          hideFilters
          hideStats
          tableHeader={`Sales history for all '${nft.metadata.display_name}' tokens`}
          initialFilters={{
            sortBy: "created",
            sortDesc: true,
            contractAddress: nft.details.ContractAddr
          }}
        />
      </div>
    </>
  );
});

// Ensure component reloads if parameters change
const NFTDetailsWrapper = () => {
  const match = useRouteMatch();

  return <NFTDetails key={`nft-details-${match.params.contractId}-${match.params.tokenId}-${match.params.listingId}`} />;
};

export default NFTDetailsWrapper;
