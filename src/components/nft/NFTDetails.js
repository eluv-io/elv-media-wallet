import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {checkoutStore, rootStore, transferStore} from "Stores";
import Path from "path";
import UrlJoin from "url-join";

import {Link, Redirect, useHistory, useRouteMatch} from "react-router-dom";
import {
  ExpandableSection,
  CopyableField,
  ButtonWithLoader,
  FormatPriceString,
  ButtonWithMenu,
  Copy,
  RichText
} from "Components/common/UIComponents";

import Confirm from "Components/common/Confirm";
import ListingModal from "Components/listings/ListingModal";
import PurchaseModal from "Components/listings/PurchaseModal";
import ListingStats from "Components/listings/ListingStats";
import NFTTransfer from "Components/nft/NFTTransfer";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {LoginClickGate} from "Components/common/LoginGate";
import TransferModal from "Components/listings/TransferModal";
import {FilteredTable} from "Components/common/Table";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import AsyncComponent from "Components/common/AsyncComponent";
import {Ago, MiddleEllipsis, NFTInfo} from "../../utils/Utils";
import Utils from "@eluvio/elv-client-js/src/Utils";
import NFTOffers from "Components/nft/NFTOffers";
import {NFTMediaContainer} from "Components/nft/media/index";

import UserIcon from "Assets/icons/user.svg";
import TransactionIcon from "Assets/icons/transaction history icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
import TraitsIcon from "Assets/icons/properties icon.svg";
import BackIcon from "Assets/icons/arrow-left.svg";
import ShareIcon from "Assets/icons/share icon.svg";
import TwitterIcon from "Assets/icons/twitter.svg";
import PictureIcon from "Assets/icons/image.svg";
import CopyIcon from "Assets/icons/copy.svg";
import MediaIcon from "Assets/icons/media-icon.svg";

let mediaPreviewEnabled = false;

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

  const cap = contractStats?.cap || nft.details.Cap;
  return (
    <ExpandableSection header="Details" icon={DetailsIcon}>
      { nft.metadata.rich_text ? <RichText richText={nft.metadata.rich_text} className="details-page__rich-text" /> : null }
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
            {
              cap && cap < 10000000 ?
                <div className="details-page__detail-field">
                  Maximum Possible in Circulation: {contractStats.cap - contractStats.burned}
                </div> : null
            }
          </> : null
      }
      {
        cap && cap < 10000000 ?
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
          nftInfo.isOwned && !nftInfo.listingId && !nftInfo.heldDate ?
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

const NFTInfoMenu = observer(({nftInfo}) => {
  const match = useRouteMatch();

  let nftImageUrl;
  if(nftInfo.isOwned && rootStore.userProfiles.me?.imageUrl?.toString() !== nftInfo?.mediaInfo.imageUrl?.toString()) {
    nftImageUrl = nftInfo?.mediaInfo?.imageUrl;
  }

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

  if(!nftImageUrl && !shareUrl && !(nftInfo.mediaInfo && !nftInfo.mediaInfo.requiresPermissions)) {
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
              nftImageUrl ?
                <ButtonWithLoader onClick={async () => await rootStore.UpdateUserProfile({newProfileImageUrl: nftImageUrl.toString()})}>
                  <ImageIcon icon={PictureIcon} />
                  Set as My Profile Image
                </ButtonWithLoader> : null
            }
            {
              twitterUrl ?
                <a href={twitterUrl.toString()} target="_blank" onClick={Close}>
                  <ImageIcon icon={TwitterIcon} />
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
});

const NFTInfoSection = ({nftInfo, className=""}) => {
  const match = useRouteMatch();

  let sideText = nftInfo.sideText;
  if(nftInfo.stock) {
    sideText = [`${nftInfo.stock.minted} Minted`];

    if(nftInfo.stock.max < 10000000) {
      sideText.push(`${nftInfo.stock.max - nftInfo.stock.minted} Available`);
    }
  }

  useEffect(() => {
    const ownerAddress = nftInfo.ownerAddress;

    if(!ownerAddress) { return; }

    rootStore.UserProfile({userId: ownerAddress});
  }, [nftInfo?.listing?.details?.ownerAddress]);

  const ownerAddress = nftInfo.ownerAddress;
  const ownerProfile = ownerAddress ? rootStore.userProfiles[Utils.FormatAddress(ownerAddress)] : undefined;

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
          sideText ?
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
      <ResponsiveEllipsis
        component="div"
        className="details-page__nft-info__description"
        text={nftInfo.item?.description || nftInfo.nft.metadata.description}
        maxLine={50}
      />
      {
        nftInfo.renderedPrice || nftInfo.status ?
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
      {
        ownerProfile ?
          <Link
            className="details-page__nft-info__owner"
            to={
              match.params.marketplaceId ?
                UrlJoin("/marketplace", match.params.marketplaceId, "users", ownerProfile.userName || ownerProfile.userAddress, "listings") :
                UrlJoin("/wallet", "users", ownerProfile.userName || ownerProfile.userAddress, "listings")
            }
          >
            <div className="user__profile__image-container details-page__nft-info__owner-image-container">
              <ImageIcon
                icon={rootStore.ProfileImageUrl(ownerProfile.imageUrl, "400") || UserIcon}
                className="user__profile__image details-page__nft_info__owner-image"
                alternateIcon={UserIcon}
              />
            </div>
            <div className={`details-page__nft-info__owner-name ${!ownerProfile.userName ? "details-page__nft-info__owner-address" : ""}`}>
              { ownerProfile.userName ? `@${ownerProfile.userName}` : ownerProfile.userAddress }
            </div>
          </Link> : null
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
  previewMedia,
  ShowModal,
  SetClaimed,
  SetOpened,
  SetPreviewMedia
}) => {
  const match = useRouteMatch();

  const previewMode = match.params.marketplaceId === rootStore.previewMarketplaceId;

  if(nftInfo.item) {
    return (
      <div className="details-page__actions">
        {
          nftInfo.marketplacePurchaseAvailable ?
            <LoginClickGate
              Component={ButtonWithLoader}
              onLoginBlocked={() => {
                if(!nftInfo.free) {
                  ShowModal();
                }
              }}
              onClick={async () => {
                if(!nftInfo.free) {
                  ShowModal();
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
        {
          previewMode && nftInfo.hasAdditionalMedia && !previewMedia ?
            <button className="action" onClick={() => SetPreviewMedia(true)}>
              Preview Media
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
          onLoginBlocked={ShowModal}
          onClick={ShowModal}
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
              onClick={ShowModal}
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

const NFTTabbedContent = observer(({nft, nftInfo, previewMedia, tab, setTab}) => {
  const anyTabs = nftInfo.hasOffers || nftInfo.hasAdditionalMedia;

  if((!nft && !previewMedia) || !anyTabs) {
    return <NFTTables nftInfo={nftInfo} />;
  }

  let tabs = [
    nftInfo.hasAdditionalMedia && (nftInfo.isOwned || previewMedia) ? "Media" : "",
    nftInfo.hasOffers ? "Offers" : "",
    "Trading"
  ].filter(tab => tab);

  let activeContent;
  switch(tab) {
    case "Trading":
      activeContent = <NFTTables nftInfo={nftInfo} />;
      break;

    case "Offers":
      activeContent = <NFTOffers nftInfo={nftInfo} />;
      break;

    case "Media":
      activeContent = <NFTMediaContainer nftInfo={nftInfo} browserOnly />;
      break;
  }

  return (
    <div className="details-page__tabbed-content">
      {
        anyTabs ?
          <div className="details-page__tabbed-content__tabs">
            {
              tabs.map(tabName =>
                <button
                  key={`tab-${tabName}`}
                  className={`details-page__tabbed-content__tab ${tab === tabName ? "details-page__tabbed-content__tab--active" : ""}`}
                  onClick={() => setTab(tabName)}
                >
                  {tabName}
                </button>
              )
            }
          </div> : null
      }
      { activeContent }
    </div>
  );
});

const NFTDetails = observer(({nft, initialListingStatus, item}) => {
  const match = useRouteMatch();
  const history = useHistory();

  const [nftInfo, setNFTInfo] = useState(undefined);
  const [tab, setTab] = useState(new URLSearchParams(window.location.hash.split("?")[1]).get("tab"));

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

  // Modals / Settings
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(mediaPreviewEnabled);

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
    // Tab parameter set, scroll to tab
    if(tab) {
      setTimeout(() => document.querySelector(".page-block--nft-content")?.scrollIntoView({block: "start", inline: "start", behavior: "smooth"}), 100);
    }

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

  useEffect(() => {
    const nftInfo = NFTInfo({
      nft,
      listing: listingStatus?.listing,
      item,
      showToken: true,
      allowFullscreen: true
    });

    setNFTInfo(nftInfo);

    if(!tab) {
      setTab(nftInfo.hasAdditionalMedia && nftInfo.isOwned ? "Media" : nftInfo.hasOffers ? "Offers" : "Trading");
    }
  }, [nft, listingStatus]);

  // Redirects

  // Marketplace item claimed
  if(claimed) {
    return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "store", item.sku, "claim")} />;
  }

  // Pack opened
  if(opened) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items", match.params.contractId, match.params.tokenId, "open")} /> :
      <Redirect to={UrlJoin("/wallet", "users", "me", "items", match.params.contractId, match.params.tokenId, "open")} />;
  }

  // NFT Burned
  if(burned) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items")}/> :
      <Redirect to={Path.dirname(Path.dirname(match.url))}/>;
  }

  if(!nftInfo) { return; }

  // Misc
  if(listingStatus?.listing) {
    nft = {
      ...(nft || {}),
      ...listingStatus.listing,
      details: {
        ...(nft?.details || {}),
        ...listingStatus.listing.details
      },
      metadata: {
        ...(nft?.metadata || {}),
        ...listingStatus.listing.metadata
      }
    };
  }

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const itemTemplate = item?.nft_template?.nft;
  const listingId = nft?.details?.ListingId || match.params.listingId || listingStatus?.listing?.details?.ListingId;
  const contractAddress = nft?.details?.ContractAddr || itemTemplate?.address;
  const tokenId = match.params.tokenId || listingStatus?.listing?.details?.TokenIdStr;
  const isInCheckout = listingStatus?.listing?.details?.CheckoutLockedUntil && listingStatus?.listing.details.CheckoutLockedUntil > Date.now();
  const showModal = match.params.mode === "purchase" || match.params.mode === "list";

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <>
      {
        !showModal ? null :
          match.params.mode === "list" ?
            <ListingModal
              nft={listingStatus?.listing || nft}
              listingId={listingId}
              Close={() => {
                history.replace(match.url.split("/").slice(0, -1).join("/"));
                LoadListingStatus();
              }}
            /> :
            <PurchaseModal
              type={match.params.sku ? "marketplace" : "listing"}
              nft={nftInfo.nft}
              item={item}
              initialListingId={listingId}
              Close={() => {
                history.replace(match.url.split("/").slice(0, -1).join("/"));
              }}
            />
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
      <div className="page-block page-block--nft">
        <div className="page-block__content">
          <div key={match.url} className="details-page">
            {
              backPage ?
                <Link to={backPage.path} className="details-page__back-link">
                  <ImageIcon icon={BackIcon}/>
                  <div className="details-page__back-link__text ellipsis">
                    Back to {backPage.name}
                  </div>
                </Link> : null
            }
            <div className="details-page__main-content">
              <div className="details-page__content-container">
                <div className={`card-container ${nftInfo.variant ? `card-container--variant-${nftInfo.variant}` : ""}`}>
                  <div className="item-card media-card">
                    {
                      item ?
                        <MarketplaceImage
                          marketplaceHash={marketplace.versionHash}
                          item={item}
                          path={UrlJoin("public", "asset_metadata", "info", "items", item.itemIndex.toString(), "image")}
                          showVideo
                        /> :
                        <NFTImage
                          nft={nft}
                          showVideo
                          allowFullscreen
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
                  previewMedia={previewMedia}
                  SetPreviewMedia={preview => {
                    mediaPreviewEnabled = preview;
                    setPreviewMedia(preview);
                    setTab(preview ? "Media" : "Trading");
                  }}
                  SetOpened={setOpened}
                  SetClaimed={setClaimed}
                  ShowModal={async () => {
                    if(listingId) {
                      const status = await LoadListingStatus();

                      if(!nftInfo.isOwned && status?.listing?.details?.CheckoutLockedUntil && status?.listing.details.CheckoutLockedUntil > Date.now()) {
                        return;
                      }
                    }

                    history.replace(UrlJoin(match.url, nftInfo.isOwned ? "list" : "purchase"));
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
                  nftInfo.hasAdditionalMedia && (nftInfo.isOwned || previewMedia) ?
                    <ExpandableSection
                      header="Media"
                      toggleable={false}
                      icon={MediaIcon}
                      onClick={() => {
                        if(tab !== "Media") {
                          setTab("Media");
                        }

                        setTimeout(() => {
                          document.querySelector(".page-block--nft-content")
                            .scrollIntoView({block: "start", inline: "start", behavior: "smooth"});
                        }, tab !== "Media" ? 500 : 100);
                      }}
                    /> : null
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
          </div>
        </div>
      </div>
      <div className="page-block page-block--lower-content page-block--nft-content">
        <div className="page-block__content page-block__content--unrestricted">
          <NFTTabbedContent nft={nft} nftInfo={nftInfo} tab={tab} setTab={setTab} previewMedia={previewMedia} />
        </div>
      </div>
    </>
  );
});

const DeletedPage = () => {
  return (
    <div className="page-block--nft">
      <div className="page-block__content">
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
      </div>
    </div>
  );
};

// Marketplace Item
export const MarketplaceItemDetails = observer(({Render}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const itemIndex = marketplace.items.findIndex(item => item.sku === match.params.sku);
  const item = marketplace.items[itemIndex];

  return (
    Render ?
      Render({item}) :
      <NFTDetails item={item} />
  );
});

// NFT - Also used for NFTMedia page
export const MintedNFTDetails = observer(({Render}) => {
  const match = useRouteMatch();

  const nft = rootStore.NFTData({
    contractId: match.params.contractId,
    tokenId: match.params.tokenId
  });

  const [unavailable, setUnavailable] = useState(false);

  if(unavailable) {
    return <DeletedPage />;
  }

  return (
    <AsyncComponent
      loadingClassName="page-loader"
      loaded={!!nft}
      Load={async () => {
        try {
          await rootStore.LoadNFTData({
            contractId: match.params.contractId,
            tokenId: match.params.tokenId
          });
        } catch(error) {
          rootStore.Log(error, true);
          setUnavailable(true);
        }
      }}
      render={() =>
        Render ?
          Render({nft}) :
          <NFTDetails nft={nft} />
      }
    />
  );
});

// Listing
export const ListingDetails = observer(() => {
  const match = useRouteMatch();

  const [listingStatus, setListingStatus] = useState(undefined);
  const [unavailable, setUnavailable] = useState(false);

  const nft = rootStore.NFTData({
    contractAddress: listingStatus?.listing?.details?.ContractAddr || (listingStatus?.sale || listingStatus?.removed)?.contract,
    tokenId: listingStatus?.listing?.details?.TokenIdStr || (listingStatus?.sale || listingStatus?.removed)?.token
  });

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
          await rootStore.LoadNFTData({
            contractAddress: status.listing?.details?.ContractAddr || (status.sale || status.removed).contract,
            tokenId: status.listing?.details?.TokenIdStr || (status.sale || status.removed).token
          });

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
