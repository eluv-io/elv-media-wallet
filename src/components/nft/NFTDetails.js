import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {checkoutStore, rootStore, transferStore} from "Stores";
import Path from "path";
import UrlJoin from "url-join";

import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {
  ExpandableSection,
  CopyableField,
  ButtonWithLoader,
  FormatPriceString,
  ButtonWithMenu, Copy
} from "Components/common/UIComponents";

import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import Confirm from "Components/common/Confirm";
import ListingModal from "Components/listings/ListingModal";
import PurchaseModal from "Components/listings/PurchaseModal";
import ListingStats from "Components/listings/ListingStats";
import NFTTransfer from "Components/nft/NFTTransfer";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import NFTMediaControls from "Components/nft/NFTMediaControls";
import {LoginClickGate} from "Components/common/LoginGate";
import TransferModal from "Components/listings/TransferModal";
import {FilteredTable} from "Components/common/Table";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import AsyncComponent from "Components/common/AsyncComponent";
import {Ago, MediaIcon, MiddleEllipsis, NFTInfo} from "../../utils/Utils";

import TransactionIcon from "Assets/icons/transaction history icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
import TraitsIcon from "Assets/icons/properties icon.svg";
import MediaSectionIcon from "Assets/icons/Media tab icon.svg";
import PlayIcon from "Assets/icons/blue play icon.svg";
import BackIcon from "Assets/icons/arrow-left.svg";
import ShareIcon from "Assets/icons/share icon.svg";
import TwitterIcon from "Assets/icons/twitter.svg";
import CopyIcon from "Assets/icons/copy.svg";

const NFTMediaSection = ({nftInfo, containerElement, selectedMediaIndex, setSelectedMediaIndex, currentPlayerInfo}) => {
  const nft = nftInfo.nft;

  const [orderKey, setOrderKey] = useState(0);

  let media = nft.metadata.additional_media || [];
  const isOwned = nft.details && rootStore.NFTContractInfo({contractAddress: nft.details.ContractAddr, tokenId: nft.details.TokenIdStr});

  if(!isOwned) {
    media = media.filter(item => !item.requires_permissions);
  }

  useEffect(() => {
    const defaultMediaIndex = media.findIndex(item => item.default);

    if(defaultMediaIndex >= 0) {
      setSelectedMediaIndex(defaultMediaIndex);
    }
  }, []);


  if(media.length === 0) {
    return null;
  }

  return (
    <ExpandableSection
      expanded
      header="Media"
      icon={MediaSectionIcon}
      contentClassName="details-page__media-container"
      additionalContent={
        nft.metadata.hide_additional_media_player_controls ? null :
          <NFTMediaControls
            nft={nft}
            containerElement={containerElement}
            orderKey={orderKey}
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
          url.searchParams.set("width", "600");
          image = url.toString();
        }

        return (
          <button
            key={`alternate-media-${index}`}
            className={`details-page__media ${index === selectedMediaIndex ? "details-page__media--selected" : ""}`}
            onClick={() => {
              setSelectedMediaIndex(index);
              setOrderKey(orderKey + 1);

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
                title={item.name || ""}
                maxLine="2"
              />
              <div className="details-page__media__subtitles">
                <h3 className="details-page__media__subtitle-1 ellipsis" title={item.subtitle_1 || ""}>{item.subtitle_1 || ""}</h3>
                <h3 className="details-page__media__subtitle-2 ellipsis" title={item.subtitle_2 || ""}>{item.subtitle_2 || ""}</h3>
              </div>
            </div>
          </button>
        );
      })}
    </ExpandableSection>
  );
};

const NFTTraitsSection = ({nftInfo}) => {
  const traits = nftInfo.nft?.metadata?.attributes || [];

  if(traits.length === 0) { return null; }

  return (
    <ExpandableSection header="Properties" icon={TraitsIcon}>
      <div className="traits">
        {traits.map(({name, value, rarity_percent}, index) =>
          <div className="trait" key={`trait-${index}`}>
            <div className="trait__type">
              { name }
            </div>
            <div className="trait__value">
              { value }
            </div>
            {
              rarity_percent ?
                <div className="trait__rarity">
                  {`${rarity_percent}% have this trait`}
                </div> : null
            }
          </div>
        )}
      </div>
    </ExpandableSection>
  );
};

const NFTDetailsSection = ({nftInfo, contractStats}) => {
  const nft = nftInfo.nft;

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
      <br />
      {
        nft.metadata.creator ?
          <div className="details-page__detail-field">
            Creator: { nft.metadata.creator }
          </div>
          : null
      }
      {
        nft.metadata.edition_name ?
          <div className="details-page__detail-field">
            Edition: { nft.metadata.edition_name }
          </div>
          : null
      }
      {
        nft.details.TokenIdStr ?
          <div className="details-page__detail-field">
            Token ID: {nft.details.TokenIdStr}
          </div> : null
      }
      {
        typeof nft.details.TokenOrdinal === "undefined" ||
        (nft.metadata?.id_format || "").includes("token_id") ?
          null :
          <div className="details-page__detail-field">
            Token Ordinal: { nft.details.TokenOrdinal }
          </div>
      }
      {
        contractStats ?
          <>
            <div className="details-page__detail-field">
              Number Minted: { contractStats.minted || 0 }
            </div>
            <div className="details-page__detail-field">
              Number in Circulation: { contractStats.total_supply || 0 }
            </div>
            <div className="details-page__detail-field">
              Number Burned: { contractStats.burned || 0 }
            </div>
            <div className="details-page__detail-field">
              Maximum Possible in Circulation: { contractStats.cap - contractStats.burned }
            </div>
          </> : null
      }
      {
        contractStats?.cap || nft.details.Cap ?
          <div className="details-page__detail-field">
            Cap: { contractStats?.cap || nft.details.Cap }
          </div>
          : null
      }
      {
        nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) ?
          <div className="details-page__detail-field">
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

const NFTContractSection = ({nftInfo, SetBurned, ShowTransferModal}) => {
  return (
    <ExpandableSection header="Contract" icon={ContractIcon} className="no-padding">
      <div className="expandable-section__content-row">
        <CopyableField value={nftInfo.nft.details.ContractAddr}>
          Contract Address: { nftInfo.nft.details.ContractAddr }
        </CopyableField>
      </div>
      <div className="expandable-section__content-row">
        <CopyableField value={nftInfo.nft.details.VersionHash}>
          Hash: { nftInfo.item ? nftInfo.item.nftTemplateHash : nftInfo.nft.details.VersionHash }
        </CopyableField>
      </div>
      {
        nftInfo.heldDate ?
          <h3 className="expandable-section__details details-page__held-message">
            This NFT is in a holding period until { nftInfo.heldDate }. You will not be able to transfer it until then.
          </h3> : null
      }
      <div className="expandable-section__actions">
        {
          nftInfo.isOwned && !nftInfo.listingId ?
            <button
              disabled={nftInfo.nft?.metadata?.test}
              title={nftInfo.nft?.metadata?.test ? "Test NFTs may not be transferred" : ""}
              className="action details-page-transfer-button"
              onClick={ShowTransferModal}
            >
              Transfer NFT
            </button> : null
        }
        <a
          className="action lookout-url"
          target="_blank"
          href={
            rootStore.walletClient.network === "main" ?
              `https://explorer.contentfabric.io/address/${nftInfo.nft.details.ContractAddr}/transactions` :
              `https://lookout.qluv.io/address/${nftInfo.nft.details.ContractAddr}/transactions`
          }
          rel="noopener"
        >
          See More Info on Eluvio Lookout
        </a>
        {
          nftInfo.isOwned && !nftInfo.listingId && rootStore.funds ?
            <ButtonWithLoader
              className="action-danger details-page__delete-button"
              onClick={async () => await Confirm({
                message: "Are you sure you want to permanently burn this NFT? This cannot be undone.",
                Confirm: async () => {
                  await rootStore.BurnNFT({nft: nftInfo.nft});
                  SetBurned(true);
                  await rootStore.LoadNFTContractInfo();
                }
              })}
            >
              Burn NFT
            </ButtonWithLoader> : null
        }
      </div>
      { false && nftInfo.isOwned && !nftInfo.listingId && !nftInfo.heldDate ? <NFTTransfer nft={nftInfo.nft} /> : null }
    </ExpandableSection>
  );
};

const NFTInfoMenu = ({nftInfo}) => {
  const match = useRouteMatch();

  const listingId = match.params.listingId || nftInfo.listingId;
  let shareUrl;
  if(listingId) {
    shareUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
    shareUrl.hash = match.params.marketplaceId ?
      UrlJoin("/marketplace", match.params.marketplaceId, "listings", listingId) :
      UrlJoin("/wallet", "listings", listingId);
  } else if(match.params.marketplaceId && match.params.sku) {
    shareUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
    shareUrl.hash = UrlJoin("/marketplace", match.params.marketplaceId, "store", match.params.sku);
  }

  let twitterUrl;
  if(shareUrl) {
    twitterUrl = new URL("https://twitter.com/share");
    twitterUrl.searchParams.set("url", shareUrl);
    twitterUrl.searchParams.set("text", `${nftInfo.name}\n\n`);
  }

  if(!shareUrl && !(nftInfo.mediaInfo && !nftInfo.mediaInfo.requiresPermissions)) {
    return null;
  }

  return (
    <div className="details-page__nft-info__buttons">
      <ButtonWithMenu
        className="action details-page__nft-info__menu-button-container"
        buttonProps={{
          className: "details-page__nft-info__menu-button",
          children: <ImageIcon icon={ShareIcon} />
        }}
        RenderMenu={Close => (
          <>
            {
              twitterUrl ?
                <a href={twitterUrl.toString()} target="_blank" onClick={Close}>
                  <ImageIcon icon={TwitterIcon}/>
                  Share on Twitter
                </a> : null
            }
            {
              shareUrl ?
                <button
                  onClick={() => {
                    Copy(shareUrl);
                    Close();
                  }}
                >
                  <ImageIcon icon={CopyIcon}/>
                  Copy { listingId ? "Listing" : "Item" } URL
                </button> : null
            }
            {
              nftInfo.mediaInfo && !nftInfo.mediaInfo.requiresPermissions ?
                <button
                  onClick={() => {
                    Copy(nftInfo.mediaInfo.mediaLink || nftInfo.mediaInfo.embedUrl || nftInfo.mediaInfo.imageUrl);
                    Close();
                  }}
                >
                  <ImageIcon icon={CopyIcon}/>
                  Copy Media URL
                </button> : null
            }
          </>
        )}
      />
    </div>
  );
};

const NFTInfoSection = ({nftInfo, className=""}) => {
  let sideText = nftInfo.sideText;
  if(nftInfo.stock) {
    sideText = [`${nftInfo.stock.minted} Minted`, `${nftInfo.stock.max - nftInfo.stock.minted} Available`];
  }

  return (
    <div className={`details-page__nft-info ${className}`}>
      <NFTInfoMenu nftInfo={nftInfo} />
      <div className="details-page__nft-info__name">
        { nftInfo.name }
      </div>
      <div className="details-page__nft-info__subtitle-container">
        {
          nftInfo.subtitle1 ?
            <div className="details-page__nft-info__edition">
              {nftInfo.subtitle1}
            </div> : null
        }
        {
          sideText && !nftInfo.selectedMedia ?
            <div className="details-page__nft-info__token-container">
              <div className={`details-page__nft-info__token ${!nftInfo.stock ? "details-page__nft-info__token--highlight" : ""}`}>
                {sideText[0]}
              </div>
              {
                sideText[1] ?
                  <>
                    /&nbsp;
                    <div className={`details-page__nft-info__token ${nftInfo.stock ? "details-page__nft-info__token--highlight" : ""}`}>
                      {sideText[1]}
                    </div>
                  </> : null
              }
            </div> : null
        }
      </div>
      {
        nftInfo.selectedMedia ?
          <div
            className="details-page__nft-info__description rich-text markdown-document"
            ref={element => {
              if(!element) { return; }

              render(
                <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
                  { SanitizeHTML(nftInfo.selectedMedia.description) }
                </ReactMarkdown>,
                element
              );
            }}
          /> :
          <ResponsiveEllipsis
            component="div"
            className="details-page__nft-info__description"
            text={nftInfo.item?.description || nftInfo.nft.metadata.description}
            maxLine={50}
          />
      }
      {
        !nftInfo.selectedMedia && nftInfo.renderedPrice || nftInfo.status ?
          <div className="details-page__nft-info__status">
            {
              nftInfo.renderedPrice ?
                <div className="details-page__nft-info__status__price">
                  {nftInfo.renderedPrice}
                </div> : null
            }
            {
              nftInfo.status ?
                <div className="details-page__nft-info__status__text">
                  {nftInfo.status}
                </div> : null
            }
          </div> : null
      }
    </div>
  );
};

const NFTTables = observer(({nftInfo}) => {
  const nft = nftInfo.nft;

  return (
    <div className="details-page__tables">
      <ListingStats
        mode="sales-stats"
        filterParams={{contractAddress: nft.details.ContractAddr}}
      />
      {
        nft.details.TokenIdStr ?
          <FilteredTable
            mode="transfers"
            pagingMode="paginated"
            perPage={10}
            headerText="Transaction history for this token"
            headerIcon={TransactionIcon}
            columnHeaders={[
              "Time",
              "Total Amount",
              "Buyer",
              "Seller"
            ]}
            columnWidths={[1, 1, 1, 1]}
            mobileColumnWidths={[1, 1, 0, 0]}
            initialFilters={{
              sortBy: "created",
              sortDesc: true,
              contractAddress: nft.details.ContractAddr,
              tokenId: nft.details.TokenIdStr
            }}
            CalculateRowValues={transfer => [
              `${Ago(transfer.created * 1000)} ago`,
              FormatPriceString({USD: transfer.price}),
              MiddleEllipsis(transfer.buyer, 14),
              MiddleEllipsis(transfer.seller, 14)
            ]}
          /> : null
      }
      <FilteredTable
        mode="sales"
        pagingMode="paginated"
        perPage={10}
        headerText={`Secondary sales history for all '${nft.metadata.display_name}' tokens`}
        headerIcon={TransactionIcon}
        columnHeaders={[
          "Time",
          "Token Id",
          "Total Amount",
          "Buyer",
          "Seller"
        ]}
        columnWidths={[1, 1, 1, 1, 1]}
        mobileColumnWidths={[1, 1, 1, 0, 0]}
        initialFilters={{
          sortBy: "created",
          sortDesc: true,
          contractAddress: nft.details.ContractAddr
        }}
        CalculateRowValues={transfer => [
          `${Ago(transfer.created * 1000)} ago`,
          transfer.token,
          FormatPriceString({USD: transfer.price}),
          MiddleEllipsis(transfer.buyer, 14),
          MiddleEllipsis(transfer.seller, 14)
        ]}
      />
    </div>
  );
});

const NFTActions = observer(({
  nftInfo,
  listingStatus,
  isInCheckout,
  transferring,
  ShowListingModal,
  ShowMarketplacePurchaseModal,
  ShowPurchaseModal,
  SetClaimed,
  SetOpened,
  SetSelectedMediaIndex
}) => {
  const match = useRouteMatch();

  if(nftInfo.item) {
    return (
      <div className="details-page__actions">
        {
          nftInfo.marketplacePurchaseAvailable ?
            <LoginClickGate
              Component={ButtonWithLoader}
              onClick={async () => {
                if(!nftInfo.free) {
                  ShowMarketplacePurchaseModal();
                } else {
                  try {
                    const status = await rootStore.ClaimStatus({
                      marketplaceId: match.params.marketplaceId,
                      sku: nftInfo.item.sku
                    });

                    if(status && status.status !== "none") {
                      // Already claimed, go to status
                      SetClaimed(true);
                    } else if(await checkoutStore.ClaimSubmit({
                      marketplaceId: match.params.marketplaceId,
                      sku: nftInfo.item.sku
                    })) {
                      // Claim successful
                      SetClaimed(true);
                    }
                  } catch(error) {
                    rootStore.Log("Checkout failed", true);
                    rootStore.Log(error);
                  }
                }
              }}
              disabled={nftInfo.outOfStock || nftInfo.maxOwned}
              className="action action-primary"
            >
              {nftInfo.free ? "Claim Now" : "Buy Now"}
            </LoginClickGate> : null
        }
        <Link
          className={`action ${!nftInfo.marketplacePurchaseAvailable ? "action-primary" : ""}`}
          to={UrlJoin("/marketplace", match.params.marketplaceId, "listings", `?filter=${encodeURIComponent(nftInfo.item.nftTemplateMetadata.display_name)}`)}
        >
          View Listings
        </Link>
      </div>
    );
  } else if(nftInfo.selectedMedia) {
    return (
      <div className="details-page__actions">
        {
          nftInfo.mediaInfo.mediaLink ?
            <a href={nftInfo.mediaInfo.mediaLink} target="_blank" className="action">
              View Media
            </a> : null
        }
        {
          nftInfo.selectedMedia ?
            <button onClick={() => SetSelectedMediaIndex(-1)} className="action">
              Back to NFT
            </button> : null
        }
      </div>
    );
  } else if(nftInfo.listingId && !nftInfo.isOwned) {
    return (
      <div className="details-page__actions">
        <LoginClickGate
          Component={ButtonWithLoader}
          disabled={isInCheckout}
          className="details-page__listing-button action action-primary"
          onClick={ShowPurchaseModal}
        >
          Buy Now for {FormatPriceString({USD: nftInfo.nft.details.Price})}
        </LoginClickGate>
        {
          isInCheckout ?
            <h3 className="details-page__transfer-details details-page__held-message">
              This NFT is currently in the process of being purchased
            </h3> : null
        }
      </div>
    );
  } else if(match.params.listingId && (listingStatus?.sale || listingStatus?.removed)) {
    // Listing page, but listing must have been sold or deleted
    if(listingStatus.sale) {
      return (
        <h2 className="details-page__message">
          This NFT was sold for { FormatPriceString({USD: listingStatus.sale.price}) } on { new Date(listingStatus.sale.created * 1000).toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) }
        </h2>
      );
    } else if(listingStatus.removed) {
      return (
        <h2 className="details-page__message">
          This listing has been removed
        </h2>
      );
    }
  } else if(nftInfo.isOwned) {
    return (
      <div className="details-page__actions">
        {
          nftInfo.heldDate ? null :
            <ButtonWithLoader
              title={nftInfo.nft?.metadata?.test ? "Test NFTs may not be listed for sale" : undefined}
              disabled={transferring || nftInfo.heldDate || isInCheckout || nftInfo.nft?.metadata?.test}
              className="action action-primary details-page__listing-button"
              onClick={ShowListingModal}
            >
              {nftInfo.listingId ? "Edit Listing" : "List for Sale"}
            </ButtonWithLoader>
        }

        {
          !nftInfo.listingId && nftInfo.nft?.metadata?.pack_options?.is_openable ?
            <ButtonWithLoader
              disabled={transferring}
              className="details-page__open-button"
              onClick={async () => Confirm({
                message: `Are you sure you want to open '${nftInfo.nft.metadata.display_name}?'`,
                Confirm: async () => {
                  await checkoutStore.OpenPack({
                    tenantId: nftInfo.nft.details.TenantId,
                    contractAddress: nftInfo.nft.details.ContractAddr,
                    tokenId: nftInfo.nft.details.TokenIdStr
                  });

                  SetOpened(true);
                }
              })}
            >
              { nftInfo.nft.metadata.pack_options.open_button_text || "Open Pack" }
            </ButtonWithLoader> : null
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

  return null;
});

const NFTDetails = observer(({nft, initialListingStatus, item}) => {
  const match = useRouteMatch();

  // Contract
  const [contractStats, setContractStats] = useState(undefined);

  // Listing status
  const [listingStatus, setListingStatus] = useState(initialListingStatus);

  // Status
  const [opened, setOpened] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [burned, setBurned] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferAddress, setTransferAddress] = useState(false);

  // Media
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);

  // Modals
  const [showListingModal, setShowListingModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showMarketplacePurchaseModal, setShowMarketplacePurchaseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Misc
  const [detailsRef, setDetailsRef] = useState(undefined);
  const [currentPlayerInfo, setCurrentPlayerInfo] = useState(undefined);

  nft = listingStatus?.listing || nft;

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const itemTemplate = item?.nft_template?.nft;
  const listingId = nft?.details?.ListingId || match.params.listingId || listingStatus?.listing?.details?.ListingId;
  const contractAddress = nft?.details?.ContractAddr || itemTemplate?.address;
  const tokenId = match.params.tokenId || listingStatus?.listing?.details?.TokenIdStr;

  const isInCheckout = listingStatus?.listing?.details?.CheckoutLockedUntil && listingStatus?.listing.details.CheckoutLockedUntil > Date.now();

  const LoadListingStatus = async () => {
    const status = await transferStore.CurrentNFTStatus({
      listingId,
      nft,
      contractAddress,
      tokenId
    });

    setListingStatus(status);

    return status;
  };

  // Load listing status and contract stats
  useEffect(() => {
    if(!item) {
      LoadListingStatus();
    }

    if(!contractAddress) { return; }

    rootStore.walletClient.NFTContractStats({contractAddress})
      .then(stats => setContractStats(stats));

    if(match.params.listingId) {
      let listingStatusInterval = setInterval(LoadListingStatus, 30000);

      return () => clearInterval(listingStatusInterval);
    }
  }, []);

  const nftInfo = NFTInfo({
    nft,
    listing: listingStatus?.listing,
    item,
    showFullMedia: true,
    showToken: true,
    allowFullscreen: true,
    selectedMediaIndex
  });

  // Redirects

  // Marketplace item claimed
  if(claimed) {
    return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "store", item.sku, "claim")} />;
  }

  // Pack opened
  if(opened) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "my-items", match.params.contractId, match.params.tokenId, "open")} /> :
      <Redirect to={UrlJoin("/wallet", "my-items", match.params.contractId, match.params.tokenId, "open")} />;
  }

  // NFT Burned
  if(burned) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "my-items")}/> :
      <Redirect to={Path.dirname(Path.dirname(match.url))}/>;
  }

  // NFT Transferred
  if(transferAddress) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "activity", match.params.contractId, match.params.tokenId)} /> :
      <Redirect to={UrlJoin("/wallet", "activity", match.params.contractId, match.params.tokenId)} />;
  }

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <>
      {
        showListingModal ?
          <ListingModal
            nft={listingStatus?.listing || nft}
            listingId={listingId}
            Close={() => {
              setShowListingModal(false);
              LoadListingStatus();
            }}
          /> : null
      }
      { showPurchaseModal ?
        <PurchaseModal
          type="listing"
          nft={nft}
          initialListingId={listingId}
          Close={() => setShowPurchaseModal(false)}
        /> : null
      }
      {
        showMarketplacePurchaseModal ?
          <PurchaseModal
            type="marketplace"
            nft={nftInfo.nft}
            item={item}
            Close={() => setShowMarketplacePurchaseModal(false)}
          /> : null
      }
      {
        showTransferModal ?
          <TransferModal
            nft={nft}
            onTransferring={value => setTransferring(value)}
            onTransferred={address => {
              setTransferAddress(address);
              setShowTransferModal(false);
            }}
            Close={() => setShowTransferModal(false)}
          /> : null
      }
      <div key={match.url} className="details-page" ref={element => setDetailsRef(element)}>
        <Link to={backPage.path} className="details-page__back-link">
          <ImageIcon icon={BackIcon} />
          Back to { marketplace ? marketplace.branding?.name || "Marketplace" : backPage.name }
        </Link>
        <div className="details-page__main-content">
          <div className="details-page__content-container">
            <div className={`card-container ${nftInfo.variant ? `card-container--variant-${nftInfo.variant}` : ""}`}>
              <div className="item-card media-card">
                {
                  item ?
                    <MarketplaceImage
                      marketplaceHash={marketplace.marketplaceHash}
                      item={item}
                      path={UrlJoin("public", "asset_metadata", "info", "items", item.itemIndex.toString(), "image")}
                      showFullMedia
                    /> :
                    <NFTImage
                      nft={nft}
                      selectedMedia={nftInfo.selectedMedia}
                      showFullMedia
                      allowFullscreen
                      playerCallback={playerInfo => {
                        if(playerInfo === currentPlayerInfo?.playerInfo || playerInfo?.videoElement === currentPlayerInfo?.videoElement) {
                          return;
                        }

                        setCurrentPlayerInfo({selectedMediaIndex, playerInfo});
                      }}
                    />
                }
              </div>
            </div>

            <NFTInfoSection nftInfo={nftInfo} className="details-page__nft-info--mobile" />

            <NFTActions
              nftInfo={nftInfo}
              listingStatus={listingStatus}
              isInCheckout={isInCheckout}
              transferring={transferring}
              transferAddress={transferAddress}
              SetOpened={setOpened}
              SetClaimed={setClaimed}
              SetSelectedMediaIndex={setSelectedMediaIndex}
              ShowMarketplacePurchaseModal={() => setShowMarketplacePurchaseModal(true)}
              ShowListingModal={async () => {
                const status = await LoadListingStatus();

                if(status?.listing?.details?.CheckoutLockedUntil && status?.listing.details.CheckoutLockedUntil > Date.now()) {
                  return;
                }

                setShowListingModal(true);
              }}
              ShowPurchaseModal={async () => {
                const status = await LoadListingStatus();

                if(!status.listing) { return; }

                setShowPurchaseModal(true);
              }}
            />
            {
              nft?.metadata?.test ?
                <div className="details-page__test-banner">
                  This is a test NFT
                </div> : null
            }
          </div>
          <div className="details-page__info">
            <NFTInfoSection nftInfo={nftInfo} className="details-page__nft-info--default" />
            {
              nftInfo.item ? null :
                <NFTMediaSection
                  nftInfo={nftInfo}
                  containerElement={detailsRef}
                  selectedMediaIndex={selectedMediaIndex}
                  setSelectedMediaIndex={setSelectedMediaIndex}
                  currentPlayerInfo={currentPlayerInfo && currentPlayerInfo.selectedMediaIndex === selectedMediaIndex ? currentPlayerInfo.playerInfo : undefined}
                />
            }
            {
              nftInfo.item ? null :
                <NFTTraitsSection
                  nftInfo={nftInfo}
                />
            }
            <NFTDetailsSection nftInfo={nftInfo} contractStats={contractStats} />
            <NFTContractSection nftInfo={nftInfo} SetBurned={setBurned} ShowTransferModal={() => setShowTransferModal(true)} />
          </div>
        </div>

        <NFTTables nftInfo={nftInfo} />
      </div>
    </>
  );
});

const DeletedPage = () => {
  return (
    <div className="details-page details-page-message">
      <div className="details-page__message-container">
        <h2 className="details-page__message">
          This NFT is no longer available.
        </h2>
        <h3 className="details-page__sub-message">If it was a pack, it may have been opened.</h3>
        <div className="actions-container">
          <button className="button action" onClick={() => history.goBack()}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

// Marketplace Item
export const MarketplaceItemDetails = observer(() => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const itemIndex = marketplace.items.findIndex(item => item.sku === match.params.sku);
  const item = marketplace.items[itemIndex];

  return <NFTDetails item={item} />;
});

// NFT
export const MintedNFTDetails = observer(() => {
  const match = useRouteMatch();

  const [nft, setNFT] = useState(undefined);
  const [unavailable, setUnavailable] = useState(false);

  if(unavailable) {
    return <DeletedPage />;
  }

  return (
    <AsyncComponent
      loadingClassName="page-loader"
      Load={async () => {
        try {
          setNFT(
            await rootStore.LoadNFTData({
              contractId: match.params.contractId,
              tokenId: match.params.tokenId
            })
          );
        } catch(error) {
          rootStore.Log(error, true);
          setUnavailable(true);
        }
      }}
      render={() => <NFTDetails nft={nft} />}
    />
  );
});

// Listing
export const ListingDetails = observer(() => {
  const match = useRouteMatch();

  const [listingStatus, setListingStatus] = useState(undefined);
  const [nft, setNFT] = useState(undefined);
  const [unavailable, setUnavailable] = useState(false);

  if(unavailable) {
    return <DeletedPage />;
  }

  return (
    <AsyncComponent
      loadingClassName="page-loader"
      Load={async () => {
        try {
          const status = (await transferStore.CurrentNFTStatus({listingId: match.params.listingId})) || {};

          // Load full nft in case listing is removed or sold
          setNFT(
            await rootStore.LoadNFTData({
              contractAddress: status.listing?.details?.ContractAddr || (status.sale || status.removed).contract,
              tokenId: status.listing?.details?.TokenIdStr || (status.sale || status.removed).token
            })
          );

          setListingStatus(status);
        } catch(error) {
          rootStore.Log(error, true);
          setUnavailable(true);
        }
      }}
      render={() => <NFTDetails nft={nft} initialListingStatus={listingStatus} />}
    />
  );
});
