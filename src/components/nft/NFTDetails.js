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
  RichText, LocalizeString
} from "Components/common/UIComponents";

import Confirm from "Components/common/Confirm";
import ListingModal from "Components/listings/ListingModal";
import PurchaseModal from "Components/listings/PurchaseModal";
import ListingStats from "Components/listings/ListingStats";
//import NFTTransfer from "Components/nft/NFTTransfer";
import ImageIcon from "Components/common/ImageIcon";
import ResponsiveEllipsis from "Components/common/ResponsiveEllipsis";
import {LoginClickGate} from "Components/common/LoginGate";
import TransferModal from "Components/listings/TransferModal";
import {FilteredTable} from "Components/common/Table";
import {MarketplaceImage, NFTImage} from "Components/common/Images";
import AsyncComponent from "Components/common/AsyncComponent";
import {Ago, MiddleEllipsis, NFTInfo, ScrollTo, SearchParams, SetImageUrlDimensions} from "../../utils/Utils";
import Utils from "@eluvio/elv-client-js/src/Utils";
import NFTRedeemableOffers from "Components/nft/NFTRedeemableOffers";
import {NFTMediaContainer} from "Components/nft/media/index";
import OfferModal from "../listings/OfferModal";
import {OffersTable} from "../listings/TransferTables";
import {Loader, PageLoader} from "Components/common/Loaders";

import UserIcon from "Assets/icons/user.svg";
import TransactionIcon from "Assets/icons/transaction history icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
import TraitsIcon from "Assets/icons/properties icon.svg";
import BackIcon from "Assets/icons/arrow-left.svg";
import ShareIcon from "Assets/icons/share icon.svg";
import TwitterIcon from "Assets/icons/X logo.svg";
import WhatsAppIcon from "Assets/icons/whatsapp.svg";
import PictureIcon from "Assets/icons/image.svg";
import CopyIcon from "Assets/icons/copy.svg";
import MediaIcon from "Assets/icons/media-icon.svg";
import TradeIcon from "Assets/icons/Trading Icon.svg";
import OffersIcon from "Assets/icons/Offers icon.svg";
import PurchaseOffersIcon from "Assets/icons/Offers table icon.svg";
import VotingIcon from "Assets/icons/Voting Icon.svg";

let mediaPreviewEnabled = false;

const NFTVotingSection = observer(({votingEvents, sku}) => {
  if(!votingEvents || !sku) { return null; }

  return (
    <ExpandableSection
      header={rootStore.l10n.voting.voting}
      icon={VotingIcon}
    >
      {
        votingEvents.map(({id, title, description, start_date, end_date}) => {
          const status = rootStore.voteStatus[id];
          const hasVoted = (status?.user_votes || []).find(vote => vote === sku);
          const totalVotes = status?.current_tally?.[sku];

          return (
            <div className="details-page__voting-details" key={`voting-event-details-${id}`}>
              { title ? <h2 className="details-page__voting-details__title">{title}</h2> : null }
              { description ? <RichText richText={description} className="details-page__voting-details__text details-page__voting-details__description" /> : null }
              <div className="details-page__voting-details__text">
                {
                  LocalizeString(
                    rootStore.l10n.voting.voting_window,
                    {
                      startDate: start_date ? new Date(start_date).toLocaleDateString(navigator.languages, {year: "numeric", "month": "long", day: "numeric"}) : "",
                      endDate: end_date ? new Date(end_date).toLocaleDateString(navigator.languages, {year: "numeric", "month": "long", day: "numeric"}) : ""
                    }
                  )
                }
              </div>
              {
                typeof totalVotes === "undefined" ? null :
                  <div className="details-page__voting-details__text">
                    {LocalizeString(rootStore.l10n.voting.total_votes, {votes: totalVotes})}
                  </div>
              }
              {
                hasVoted ?
                  <div className="details-page__voting-details__text">
                    {hasVoted ? rootStore.l10n.voting.voted : null}
                  </div> : null
              }
            </div>
          );
        })
      }
    </ExpandableSection>
  );
});

const VotingButtons = observer(({sku, votingEvents}) => {
  const match = useRouteMatch();
  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === match.params.marketplaceId);

  if(!marketplace || !sku || !votingEvents) { return null; }

  return (
    votingEvents
      .filter(({ongoing}) => ongoing)
      .map(({id, title}) => {
        const status = rootStore.voteStatus[id];

        if(!status) {
          return null;
        }

        const hasVoted = (status.user_votes || []).find(vote => vote === sku);
        const totalVotes = status?.current_tally?.[sku];

        const l10nKey = `${hasVoted ? "revoke" : "vote"}${title ? "_with_title" : ""}`;

        return (
          <ButtonWithLoader
            key={`voting-button-${id}`}
            onClick={async () => {
              if(!rootStore.loggedIn) {
                rootStore.ShowLogin();
              } else if(hasVoted) {
                await rootStore.RevokeVote({tenantId: marketplace.tenant_id, votingEventId: id, sku});
              } else {
                await rootStore.CastVote({tenantId: marketplace.tenant_id, votingEventId: id, sku});
              }
            }}
            className={`action ${hasVoted ? "" : "action-danger"} details-page__voting-button`}
          >
            <div className="details-page__voting-button__text">
              { LocalizeString(rootStore.l10n.voting[l10nKey], {title}) }
            </div>
            {
              typeof totalVotes === "undefined" ? null :
                <div className="details-page__voting-button__status">
                  <ImageIcon icon={VotingIcon} label="Current Tally" className="details-page__voting-button__icon"/>
                  <div className="details-page__voting-button__total">
                    { totalVotes }
                  </div>
                </div>
            }
          </ButtonWithLoader>
        );
      })
  );
});

const NFTTraitsSection = ({nftInfo}) => {
  const traits = nftInfo.nft?.metadata?.attributes || [];

  if(traits.length === 0) { return null; }

  return (
    <ExpandableSection header={rootStore.l10n.item_details.properties} icon={TraitsIcon}>
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
                  { LocalizeString(rootStore.l10n.item_details.have_trait, { rarity: rarity_percent }) }
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

  const embedUrl = (nftInfo.mediaInfo?.embedUrl || nft.metadata.embed_url || "").toString();
  const cap = contractStats?.cap || nft.details.Cap;

  return (
    <ExpandableSection header={rootStore.l10n.item_details.details} icon={DetailsIcon}>
      { nft.metadata.rich_text ? <RichText richText={nft.metadata.rich_text} className="details-page__rich-text" /> : null }
      {
        nft.details.TokenUri ?
          <CopyableField value={nft.details.TokenUri}>
            { rootStore.l10n.item_details.token_url }: <a href={nft.details.TokenUri} target="_blank">{ nft.details.TokenUri }</a>
          </CopyableField>
          : null
      }
      {
        embedUrl ?
          <CopyableField value={embedUrl}>
            { rootStore.l10n.item_details.media_url }: <a href={embedUrl} target="_blank">{ embedUrl }</a>
          </CopyableField>
          : null
      }
      {
        nft.metadata.image ?
          <CopyableField value={nft.metadata.image}>
            { rootStore.l10n.item_details.image_url }: <a href={nft.metadata.image} target="_blank">{ nft.metadata.image }</a>
          </CopyableField>
          : null
      }
      <br />
      {
        nft.metadata.creator ?
          <div className="details-page__detail-field">
            { rootStore.l10n.item_details.creator}: { nft.metadata.creator }
          </div>
          : null
      }
      {
        nft.metadata.edition_name ?
          <div className="details-page__detail-field">
            { rootStore.l10n.item_details.edition }: { nft.metadata.edition_name }
          </div>
          : null
      }
      {
        nft.details.TokenIdStr ?
          <div className="details-page__detail-field">
            { rootStore.l10n.item_details.token_id }: {nft.details.TokenIdStr}
          </div> : null
      }
      {
        typeof nft.details.TokenOrdinal === "undefined" ||
        (nft.metadata?.id_format || "").includes("token_id") ?
          null :
          <div className="details-page__detail-field">
            { rootStore.l10n.item_details.token_ordinal }: { nft.details.TokenOrdinal }
          </div>
      }
      {
        contractStats ?
          <>
            <div className="details-page__detail-field">
              { rootStore.l10n.item_details.number_minted }: { contractStats.minted || 0 }
            </div>
            <div className="details-page__detail-field">
              { rootStore.l10n.item_details.number_in_circulation }: { contractStats.total_supply || 0 }
            </div>
            <div className="details-page__detail-field">
              { rootStore.l10n.item_details.number_burned }: { contractStats.burned || 0 }
            </div>
            {
              cap && cap < 10000000 ?
                <div className="details-page__detail-field">
                  { rootStore.l10n.item_details.max_possible }: {contractStats.cap - contractStats.burned}
                </div> : null
            }
          </> : null
      }
      {
        cap && cap < 10000000 ?
          <div className="details-page__detail-field">
            { rootStore.l10n.item_details.cap }: { contractStats?.cap || nft.details.Cap }
          </div>
          : null
      }
      {
        nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) ?
          <div className="details-page__detail-field">
            { rootStore.l10n.item_details.held_until } { nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) }
          </div>
          : null
      }
      <br />
      <div>
        { nft.metadata.copyright }
      </div>
      {
        nft.metadata.terms_document?.terms_document ?
          <div className="details-page__detail-field">
            <a
              href={nft.metadata.terms_document.terms_document.url}
              target="_blank"
              rel="noopener"
              className="details-page__terms-link"
            >
              {nft.metadata.terms_document.link_text}
            </a>
          </div>: null
      }
      <br />
      <div>
        { mintDate ? LocalizeString(rootStore.l10n.item_details.minted_date, {date: mintDate}) : "" }
      </div>
    </ExpandableSection>
  );
};

const NFTContractSection = ({nftInfo, SetBurned, ShowTransferModal}) => {
  return (
    <ExpandableSection header={rootStore.l10n.item_details.contract} icon={ContractIcon} className="no-padding">
      <div className="expandable-section__content-row">
        <CopyableField value={nftInfo.nft.details.ContractAddr}>
          { rootStore.l10n.item_details.contract_address }: { nftInfo.nft.details.ContractAddr }
        </CopyableField>
      </div>
      <div className="expandable-section__content-row">
        <CopyableField value={nftInfo.nft.details.VersionHash}>
          Hash: { nftInfo.item ? nftInfo.item.nftTemplateHash : nftInfo.nft.details.VersionHash }
        </CopyableField>
      </div>
      {
        nftInfo.heldDate || !nftInfo.secondaryReleased ?
          <h3 className="expandable-section__details details-page__held-message">
            { LocalizeString(rootStore.l10n.item_details[nftInfo.heldDate ? "held_message" : "secondary_unreleased"], {heldDate: nftInfo.heldDate || nftInfo.secondaryReleaseDate}) }
          </h3> : null
      }
      {
        nftInfo.secondaryReleased && !nftInfo.secondaryAvailable ?
          <h3 className="expandable-section__details details-page__held-message">
            { LocalizeString(rootStore.l10n.item_details.secondary_expired, {heldDate: nftInfo.secondaryExpirationDate}) }
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
              { rootStore.l10n.actions.transfers.transfer }
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
          { rootStore.l10n.item_details.lookout_link }
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
                }
              })}
            >
              Burn NFT
            </ButtonWithLoader> : null
        }
      </div>
      { /* nftInfo.isOwned && !nftInfo.listingId && !nftInfo.heldDate ? <NFTTransfer nft={nftInfo.nft} /> : null } */ }
    </ExpandableSection>
  );
};

const NFTInfoMenu = observer(({nftInfo}) => {
  const match = useRouteMatch();

  const listingId = match.params.listingId || nftInfo.listingId;
  const ownerAddress = nftInfo.ownerAddress;
  const ownerProfile = ownerAddress ? rootStore.userProfiles[Utils.FormatAddress(ownerAddress)] : undefined;

  if(nftInfo.nft.metadata.hide_share) {
    return null;
  }

  let shareUrl;
  if(listingId) {
    shareUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
    shareUrl.pathname = match.params.marketplaceId ?
      UrlJoin("/marketplace", match.params.marketplaceId, "listings", listingId) :
      UrlJoin("/wallet", "listings", listingId);
  } else if(match.params.marketplaceId && match.params.sku) {
    shareUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
    shareUrl.pathname = UrlJoin("/marketplace", match.params.marketplaceId, "store", match.params.sku);
  } else if(ownerProfile) {
    shareUrl = new URL(UrlJoin(window.location.origin, window.location.pathname));
    shareUrl.pathname = match.params.marketplaceId ?
      UrlJoin("/marketplace", match.params.marketplaceId, "users", ownerProfile.userAddress, "items", match.params.contractId, match.params.tokenId) :
      UrlJoin("/wallet", "users", ownerProfile.userAddress, "items", match.params.contractId, match.params.tokenId);
  }

  if(shareUrl) {
    shareUrl.searchParams.set(
      "og",
      rootStore.client.utils.B64(
        JSON.stringify({
          "og:title": nftInfo.name,
          "og:description": nftInfo.item?.description || nftInfo.nft.metadata.description,
          "og:image": SetImageUrlDimensions({url: nftInfo?.item?.url || nftInfo.nft.metadata.image, width: 400}),
          "og:image:alt": nftInfo.name
        })
      )
    );
  }

  const [urls, setURLs] = useState(undefined);
  const InitializeURLs = async () => {
    if(!shareUrl) {
      setURLs({});

      return;
    }

    let mediaUrl;
    if(nftInfo.mediaInfo && !nftInfo.mediaInfo.requiresPermissions) {
      mediaUrl = nftInfo.mediaInfo.mediaLink || nftInfo.mediaInfo.embedUrl || nftInfo.mediaInfo.imageUrl;
    }

    const [shortUrl, shortMediaUrl] = await Promise.all([
      rootStore.CreateShortURL(shareUrl),
      mediaUrl ? rootStore.CreateShortURL(mediaUrl) : undefined
    ]);

    let twitterUrl = new URL("https://twitter.com/share");
    twitterUrl.searchParams.set("url", shortUrl);
    twitterUrl.searchParams.set("text", `${nftInfo.name}\n\n`);

    let whatsAppUrl = new URL("https://wa.me");
    whatsAppUrl.searchParams.set("url", shortUrl);
    whatsAppUrl.searchParams.set("text", `${nftInfo.name}\n\n${shortUrl}`);

    setURLs({
      shareUrl: shortUrl,
      twitterUrl,
      whatsAppUrl,
      mediaUrl: shortMediaUrl
    });
  };

  let nftImageUrl;
  if(nftInfo.isOwned && rootStore.userProfiles.me?.imageUrl?.toString() !== nftInfo?.mediaInfo.imageUrl?.toString()) {
    nftImageUrl = nftInfo?.mediaInfo?.imageUrl;
  }

  if(!nftImageUrl && !shareUrl && !(nftInfo.mediaInfo && !nftInfo.mediaInfo.requiresPermissions)) {
    return null;
  }

  return (
    <div className="details-page__nft-info__buttons">
      <ButtonWithMenu
        className="action details-page__nft-info__action-menu-container"
        buttonProps={{
          className: "details-page__nft-info__action-menu",
          children: <ImageIcon icon={ShareIcon} />
        }}
        RenderMenu={Close => {
          if(!urls) {
            InitializeURLs();
            return <Loader/>;
          }

          return (
            <>
              {
                nftImageUrl ?
                  <ButtonWithLoader
                    onClick={async () => await rootStore.UpdateUserProfile({newProfileImageUrl: nftImageUrl.toString()})}>
                    <ImageIcon icon={PictureIcon}/>
                    {rootStore.l10n.item_details.menu.set_as_profile}
                  </ButtonWithLoader> : null
              }
              {
                urls.twitterUrl ?
                  <a href={urls.twitterUrl.toString()} target="_blank" onClick={Close}>
                    <ImageIcon icon={TwitterIcon}/>
                    {rootStore.l10n.item_details.menu.share_on_twitter}
                  </a> : null
              }
              {
                urls.whatsAppUrl ?
                  <a href={urls.whatsAppUrl.toString()} target="_blank" onClick={Close}>
                    <ImageIcon icon={WhatsAppIcon} />
                    {rootStore.l10n.item_details.menu.share_on_whatsapp}
                  </a> : null
              }
              {
                urls.shareUrl ?
                  <button
                    onClick={() => {
                      Copy(urls.shareUrl);
                      Close();
                    }}
                  >
                    <ImageIcon icon={CopyIcon}/>
                    {rootStore.l10n.item_details.menu[listingId ? "copy_listing_url" : "copy_item_url"]}
                  </button> : null
              }
              {
                urls.mediaUrl ?
                  <button
                    onClick={() => {
                      Copy(urls.mediaUrl);
                      Close();
                    }}
                  >
                    <ImageIcon icon={CopyIcon}/>
                    {rootStore.l10n.item_details.menu.copy_media_url}
                  </button> : null
              }
            </>
          );
        }}
      />
    </div>
  );
});

const NFTInfoSection = observer(({nftInfo, className=""}) => {
  const match = useRouteMatch();

  let sideText = nftInfo.sideText;
  if(nftInfo.stock) {
    sideText = [`${nftInfo.stock.minted} ${rootStore.l10n.item_details.minted}`];

    if(nftInfo.stock.max < 10000000) {
      const available = nftInfo.stock.max - nftInfo.stock.minted;
      sideText.push(`${available} ${rootStore.l10n.item_details[available === 1 ? "available_single" : "available"]}`);
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
      {
        nftInfo.item?.description_rich_text || (!nftInfo.item?.description && nftInfo.nft.metadata.description_rich_text) ?
          <RichText richText={nftInfo.item?.description_rich_text || nftInfo.nft.metadata.description_rich_text} className="markdown-document details-page__nft-info__description"/> :
          <ResponsiveEllipsis
            component="div"
            className="details-page__nft-info__description"
            text={nftInfo.item?.description || nftInfo.nft.metadata.description}
            maxLine={50}
          />
      }
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
});

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
            headerText={rootStore.l10n.tables.token_history_single}
            headerIcon={TransactionIcon}
            columnHeaders={[
              rootStore.l10n.tables.columns.time,
              rootStore.l10n.tables.columns.total_amount,
              rootStore.l10n.tables.columns.buyer,
              rootStore.l10n.tables.columns.seller
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
              `${Ago(transfer.created * 1000)}`,
              FormatPriceString(transfer.price),
              MiddleEllipsis(transfer.buyer, 14),
              MiddleEllipsis(transfer.seller, 14)
            ]}
          /> : null
      }
      <FilteredTable
        mode="sales"
        pagingMode="paginated"
        perPage={10}
        headerText={LocalizeString(rootStore.l10n.tables.token_history_all, {name: nft.metadata.display_name})}
        headerIcon={TransactionIcon}
        columnHeaders={[
          rootStore.l10n.tables.columns.time,
          rootStore.l10n.tables.columns.token_id,
          rootStore.l10n.tables.columns.total_amount,
          rootStore.l10n.tables.columns.buyer,
          rootStore.l10n.tables.columns.seller
        ]}
        columnWidths={[1, 1, 1, 1, 1]}
        mobileColumnWidths={[1, 1, 1, 0, 0]}
        initialFilters={{
          sortBy: "created",
          sortDesc: true,
          contractAddress: nft.details.ContractAddr
        }}
        CalculateRowValues={transfer => [
          `${Ago(transfer.created * 1000)}`,
          transfer.token,
          FormatPriceString(transfer.price),
          MiddleEllipsis(transfer.buyer, 14),
          MiddleEllipsis(transfer.seller, 14)
        ]}
      />
    </div>
  );
});

const PurchaseOffersTables = observer(({nftInfo}) => {
  const nft = nftInfo.nft;

  return (
    <div className="details-page__tables">
      <ListingStats
        mode="sales-stats"
        filterParams={{contractAddress: nft.details.ContractAddr}}
      />
      {
        nft?.details.TokenIdStr ?
          <OffersTable
            icon={PurchaseOffersIcon}
            header={rootStore.l10n.tables.active_offers}
            contractAddress={nft.details.ContractAddr}
            tokenId={nft.details.TokenIdStr}
            statuses={["ACTIVE"]}
          /> : null
      }
    </div>
  );
});

const NFTActions = observer(({
  nftInfo,
  listingStatus,
  isInCheckout,
  transferring,
  previewMedia,
  secondaryDisabled,
  ownedItem,
  votingEvents,
  ShowOfferModal,
  ShowModal,
  SetOpened,
  SetPreviewMedia
}) => {
  const match = useRouteMatch();

  const previewMode = match.params.marketplaceId === rootStore.previewMarketplaceId;

  if(nftInfo.item) {
    // Item from store

    return (
      <div className="details-page__actions">
        {
          nftInfo.marketplacePurchaseAvailable ?
            <Link
              to={UrlJoin(match.url, nftInfo.free ? "claim" : "purchase")}
              disabled={nftInfo.outOfStock || nftInfo.maxOwned}
              className="action action-primary"
            >
              {nftInfo.free ? rootStore.l10n.actions.purchase.claim : rootStore.l10n.actions.purchase.buy_now}
            </Link> :
            ownedItem ?
              <>
                <div className="details-page__actions__message">{rootStore.l10n.item_details.status.max_owned}</div>
                <Link
                  to={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items", ownedItem.contractId, ownedItem.tokenId)}
                  className="action action-primary"
                >
                  {rootStore.l10n.item_details.go_to_item}
                </Link>
              </> : null
        }
        {
          secondaryDisabled ? null :
            <Link
              className={`action ${!(nftInfo.marketplacePurchaseAvailable || ownedItem) ? "action-primary" : ""}`}
              to={UrlJoin("/marketplace", match.params.marketplaceId, "listings", `?filter=${encodeURIComponent(nftInfo.item.nftTemplateMetadata.display_name)}`)}
            >
              {rootStore.l10n.actions.listings.view}
            </Link>
        }
        {votingEvents ? <VotingButtons sku={nftInfo.item.sku} votingEvents={votingEvents}/> : null}
        {
          previewMode && nftInfo.hasAdditionalMedia && !previewMedia ?
            <button className="action" onClick={() => SetPreviewMedia(true)}>
              Preview Media
            </button> : null
        }
      </div>
    );
  } else if(!nftInfo.listingStatusLoaded) {
    return null;
  } else if(nftInfo.listingId && !nftInfo.isOwned) {
    // Listing that is not owned

    return (
      <div className="details-page__actions">
        <LoginClickGate
          Component={ButtonWithLoader}
          disabled={isInCheckout}
          className="details-page__listing-button action action-primary"
          onLoginBlocked={ShowModal}
          onClick={ShowModal}
        >
          { LocalizeString(rootStore.l10n.actions.purchase.buy_now_for, {price: FormatPriceString(nftInfo.nft.details.Price, {stringOnly: true})}) }
        </LoginClickGate>
        {
          // Offers available if offerable, not owned, and either secondary trading not restricted or offer currently exists for this nft
          listingStatus?.offer?.id || (nftInfo.offerable && !nftInfo.isOwned && !secondaryDisabled && nftInfo.secondaryAvailable) ?
            <LoginClickGate
              Component={ButtonWithLoader}
              disabled={isInCheckout}
              className="details-page__listing-button action"
              onClick={ShowOfferModal}
            >
              { rootStore.l10n.actions.offers[listingStatus?.offer?.id ? "edit" : "create"] }
            </LoginClickGate> : null
        }
        {
          isInCheckout ?
            <h3 className="details-page__transfer-details details-page__held-message">
              { rootStore.l10n.purchase.errors.nft_being_purchased }
            </h3> : null
        }
      </div>
    );
  } else if(match.params.listingId && (listingStatus?.sale || listingStatus?.removed)) {
    // Listing page, but listing must have been sold or deleted

    if(listingStatus.sale) {
      return (
        <h2 className="details-page__message">
          {
            LocalizeString(
              rootStore.l10n.purchase.errors.nft_sold,
              {
                price: FormatPriceString(listingStatus.sale.price, {stringOnly: true}),
                date: new Date(listingStatus.sale.created * 1000).toLocaleString(navigator.languages, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric"
                })
              }
            )
          }
        </h2>
      );
    } else if(listingStatus.removed) {
      return (
        <h2 className="details-page__message">
          { rootStore.l10n.purchase.errors.listing_unavailable }
        </h2>
      );
    }
  } else if(nftInfo.isOwned) {
    // Owned NFT
    return (
      <div className="details-page__actions">
        {
          // Listings available if not held or secondary restricted, or if already listed
          secondaryDisabled || nftInfo.heldDate || !(nftInfo.secondaryAvailable || nftInfo?.nft?.details?.ListingId) ? null :
            <ButtonWithLoader
              title={nftInfo.nft?.metadata?.test ? "Test NFTs may not be listed for sale" : undefined}
              disabled={transferring || nftInfo.heldDate || isInCheckout || nftInfo.nft?.metadata?.test}
              className="action action-primary details-page__listing-button"
              onClick={ShowModal}
            >
              { rootStore.l10n.actions.listings[nftInfo.listingId ? "edit" : "create"] }
            </ButtonWithLoader>
        }

        {
          !nftInfo.listingId && nftInfo.nft?.metadata?.pack_options?.is_openable ?
            <ButtonWithLoader
              disabled={transferring}
              className="details-page__open-button"
              onClick={async () => Confirm({
                message: LocalizeString(rootStore.l10n.actions.packs.open_confirm, {name: nftInfo.nft.metadata.display_name}),
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
              { nftInfo.nft.metadata.pack_options.open_button_text || LocalizeString(rootStore.l10n.actions.packs.open, {name: nftInfo.nft.metadata.display_name}) }
            </ButtonWithLoader> : null
        }

        {
          isInCheckout ?
            <h3 className="details-page__transfer-details details-page__held-message">
              { rootStore.l10n.purchase.errors.nft_being_purchased }
            </h3> : null
        }
      </div>
    );
  } else if(listingStatus && listingStatus?.offer?.id || (nftInfo.offerable && !secondaryDisabled && nftInfo.secondaryAvailable)) {
    // Not listed or owned but can be offered

    return (
      <div className="details-page__actions">
        <LoginClickGate
          Component={ButtonWithLoader}
          disabled={isInCheckout}
          className="details-page__listing-button action action-primary"
          onClick={ShowOfferModal}
        >
          { rootStore.l10n.actions.offers[listingStatus?.offer?.id ? "edit" : "create"] }
        </LoginClickGate>
      </div>
    );
  }

  return null;
});

const NFTTabbedContent = observer(({nft, nftInfo, previewMedia, showMediaSections, hideTables, secondaryDisabled, tab, setTab}) => {
  const anyTabs = showMediaSections || (!secondaryDisabled && (nftInfo.hasRedeemables || nftInfo.offerable));

  if((!nft && !previewMedia) || !anyTabs) {
    return hideTables || secondaryDisabled ? null : <NFTTables nftInfo={nftInfo} />;
  }

  const mediaTab = showMediaSections;
  const redeemablesTab = nftInfo.hasRedeemables;
  const tradingTab = !nft?.metadata?.test && !nftInfo.heldDate && !secondaryDisabled && !hideTables;
  const offersTab = !secondaryDisabled && nftInfo.offerable;

  let tabs = [
    mediaTab ? [rootStore.l10n.item_details.media, MediaIcon] : "",
    redeemablesTab ? [rootStore.l10n.item_details.rewards, OffersIcon] : "",
    tradingTab ? [rootStore.l10n.item_details.trading, TradeIcon] : "",
    offersTab ? [rootStore.l10n.item_details.purchase_offers, PurchaseOffersIcon] : ""
  ].filter(tab => tab);

  if(tabs.length === 0) {
    return null;
  }

  let activeContent;
  switch(tab) {
    case rootStore.l10n.item_details.trading:
      activeContent = <NFTTables nftInfo={nftInfo} />;
      break;

    case rootStore.l10n.item_details.purchase_offers:
      activeContent = <PurchaseOffersTables nftInfo={nftInfo} />;
      break;

    case rootStore.l10n.item_details.rewards:
      activeContent = <NFTRedeemableOffers nftInfo={nftInfo} />;
      break;

    case rootStore.l10n.item_details.media:
      activeContent = <NFTMediaContainer nftInfo={nftInfo} browserOnly />;
      break;
  }

  if(tabs.length === 1) {
    return activeContent;
  }

  return (
    <div className="details-page__tabbed-content">
      {
        anyTabs ?
          <div className="details-page__tabbed-content__tabs">
            {
              tabs.map(([tabName, tabIcon]) =>
                <button
                  key={`tab-${tabName}`}
                  className={`action details-page__tabbed-content__tab ${tab === tabName ? "details-page__tabbed-content__tab--active" : ""}`}
                  onClick={() => {
                    setTab(tabName);

                    setTimeout(() => {
                      const target = document.querySelector(".page-block--nft-content");
                      if(target) {
                        ScrollTo(target.getBoundingClientRect().top + window.scrollY);
                      }
                    }, 250);
                  }}
                >
                  <ImageIcon icon={tabIcon} className="details-page__tabbed-content__tab__icon" />
                  <div className="details-page__tabbed-content__tab__text">
                    {tabName}
                  </div>
                </button>
              )
            }
          </div> : null
      }
      { activeContent }
    </div>
  );
});

// Cache listing status to preserve initial state between page loads (e.g. opening listing or purchase modals)
const listingStatusCache = {};

const NFTDetails = observer(({nft, initialListingStatus, item, hideSecondaryStats}) => {
  const match = useRouteMatch();
  const history = useHistory();

  const [nftInfo, setNFTInfo] = useState();
  const [tab, setTab] = useState(SearchParams()["tab"]);

  // Contract
  const [contractStats, setContractStats] = useState(undefined);

  // Listing / Offer status
  const [listingStatus, setListingStatus] = useState(initialListingStatus || listingStatusCache[`${nft?.details?.ContractAddr}-${nft?.details?.TokenIdStr}`]);

  // Owned item
  const [ownedItem, setOwnedItem] = useState(undefined);

  // Status
  const [opened, setOpened] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [burned, setBurned] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferAddress, setTransferAddress] = useState(false);

  // Modals / Settings
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(mediaPreviewEnabled);

  const itemTemplate = item?.nft_template?.nft;
  const contractAddress = nft?.details?.ContractAddr || itemTemplate?.address;

  const LoadListingStatus = async () => {
    const status = await transferStore.CurrentNFTStatus({
      listingId: match.params.listingId,
      nft,
      contractAddress,
      tokenId
    });

    setListingStatus(status);

    listingStatusCache[`${nft?.details?.ContractAddr}-${nft?.details?.TokenIdStr}`] = listingStatus;

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

  useEffect(() => {
    const nftInfo = NFTInfo({
      nft,
      listing: listingStatus?.listing,
      item,
      showToken: true,
      allowFullscreen: true
    });

    nftInfo.listingStatusLoaded = !!listingStatus;

    setNFTInfo(nftInfo);

    if(!tab) {
      setTab(
        nftInfo.hasAdditionalMedia && nftInfo.isOwned ? rootStore.l10n.item_details.media :
          nftInfo.hasRedeemables ? rootStore.l10n.item_details.rewards : rootStore.l10n.item_details.trading
      );
    }
  }, [nft, listingStatus, checkoutStore.currency]);

  useEffect(() => {
    if(match.params.action !== "claim" || !rootStore.loggedIn || !nftInfo) { return; }

    const Claim = async () => {
      try {
        const status = await rootStore.ClaimStatus({
          marketplaceId: match.params.marketplaceId,
          sku: nftInfo.item.sku
        });

        if(status && status.status !== "none") {
          // Already claimed, go to status
          setClaimed(true);
        } else if(nftInfo.outOfStock || nftInfo.maxOwned) {
          throw "Out of stock or max owned";
        } else if(await checkoutStore.ClaimSubmit({
          marketplaceId: match.params.marketplaceId,
          sku: nftInfo.item.sku
        })) {
          // Claim successful
          setClaimed(true);
        }
      } catch(error) {
        rootStore.Log("Failed to claim", true);
        rootStore.Log(error, true);

        history.push(match.url.replace("/claim", ""));
      }
    };

    // Automatic claim if url action is claim and claim is possible
    Claim();
  }, [nftInfo]);

  useEffect(() => {
    if(!rootStore.loggedIn || !nftInfo || !nftInfo.item) { return; }

    rootStore.walletClient.UserItems({
      contractAddress: nftInfo?.nft?.details?.ContractAddr || nftInfo?.item?.address,
      limit: 1
    }).then(({results}) => {
      setOwnedItem(results && results[0]);
    });
  }, [nftInfo]);

  window.nftInfo = nftInfo;

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

  const marketplace = rootStore.marketplaces[match.params.marketplaceId] || rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === match.params.marketplaceId);
  const listingId = match.params.listingId || listingStatus?.listing?.details?.ListingId || nft?.details?.ListingId;
  const tokenId = match.params.tokenId || listingStatus?.listing?.details?.TokenIdStr;
  const isInCheckout = listingStatus?.listing?.details?.CheckoutLockedUntil && listingStatus?.listing.details.CheckoutLockedUntil > Date.now();
  const showModal = match.params.action === "purchase" || match.params.action === "list";
  const showMediaSections = (nftInfo?.isOwned || previewMedia) && nftInfo?.hasAdditionalMedia && nftInfo?.additionalMedia?.type !== "List";
  const secondaryDisabled = marketplace?.branding?.disable_secondary_market;

  let votingEvents;
  if(marketplace && marketplace.voting_events && nftInfo?.item) {
    const events = marketplace.voting_events
      // Hide not started
      .filter(({start_date}) => (!start_date || new Date(start_date) <= new Date()))
      // Includes this item
      .filter(({type, items}) => type === "all" || items?.includes(nftInfo.item.sku))
      .map(event => ({
        ...event,
        // Mark if this event is currently ongoing
        ongoing: (!event.end_date || new Date(event.end_date) >= new Date())
      }));

    votingEvents = events.length > 0 ? events : undefined;
  }

  useEffect(() => {
    if(!marketplace || !votingEvents) { return; }

    votingEvents.forEach(({id}) =>
      rootStore.UpdateVoteStatus({tenantId: marketplace.tenant_id, votingEventId: id})
    );
  }, [!!votingEvents]);

  // Redirects

  // Marketplace item claimed
  if(claimed) {
    return <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "store", item.sku, "claim", "status")} />;
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

  if(ownedItem && SearchParams()["redirect"] === "owned") {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplace", match.params.marketplaceId, "users", "me", "items", ownedItem.contractId, ownedItem.tokenId)} /> :
      <Redirect to={UrlJoin("/wallet", "users", "me", "items", ownedItem.contractId, ownedItem.tokenId)} />;
  }

  if(!nftInfo || match.params.action === "claim") {
    return <PageLoader />;
  }

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];
  return (
    <>
      {
        !showModal ? null :
          match.params.action === "list" ?
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
        showOfferModal ?
          <OfferModal
            nft={nft}
            offer={listingStatus?.offer}
            Close={() => {
              LoadListingStatus();
              setShowOfferModal(false);
            }}
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
      <div className="page-block page-block--nft">
        <div className="page-block__content">
          <div key={match.url} className="details-page">
            {
              backPage ?
                <Link to={backPage.path} className="details-page__back-link">
                  <ImageIcon icon={BackIcon}/>
                  <div className="details-page__back-link__text ellipsis">
                    { LocalizeString(rootStore.l10n.actions.back_to, {thing: backPage.name}) }
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
                          url={item?.image?.url}
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

                <NFTInfoSection
                  nftInfo={nftInfo}
                  className="details-page__nft-info--mobile"
                />

                <NFTActions
                  secondaryDisabled={secondaryDisabled}
                  nftInfo={nftInfo}
                  listingStatus={listingStatus}
                  isInCheckout={isInCheckout}
                  transferring={transferring}
                  transferAddress={transferAddress}
                  previewMedia={previewMedia}
                  ownedItem={ownedItem}
                  votingEvents={votingEvents}
                  SetPreviewMedia={preview => {
                    mediaPreviewEnabled = preview;
                    setPreviewMedia(preview);
                    setTab(preview ? "Media" : "Trading");
                  }}
                  SetOpened={setOpened}
                  ShowOfferModal={() => setShowOfferModal(true)}
                  ShowModal={async () => {
                    if(listingId) {
                      const status = await LoadListingStatus();

                      if(!nftInfo.isOwned && status?.listing?.details?.CheckoutLockedUntil && status?.listing.details.CheckoutLockedUntil > Date.now()) {
                        return;
                      }
                    }

                    const action = nftInfo.isOwned ? "list" : (nftInfo.free ? "claim" : "purchase");

                    history.push(UrlJoin(match.url, action));
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
                <NFTInfoSection
                  nftInfo={nftInfo}
                  className="details-page__nft-info--default"
                />
                {
                  nftInfo.hasAdditionalMedia && (nftInfo.isOwned || previewMedia) ?
                    <ExpandableSection
                      header={rootStore.l10n.item_details.media}
                      toggleable={false}
                      icon={MediaIcon}
                      onClick={() => {
                        // Single list - clicking navigates to media page
                        if(nftInfo.additionalMedia.type === "List") {
                          history.push(UrlJoin(match.url, "media", "list", "0"));
                          return;
                        }

                        // Sectional media - switch to media tab and scroll down to media browser
                        if(tab !== rootStore.l10n.item_details.media) {
                          setTab(rootStore.l10n.item_details.media);
                        }

                        setTimeout(() => {
                          const target = document.querySelector(".page-block--nft-content");
                          if(target) {
                            ScrollTo(target.getBoundingClientRect().top + window.scrollY);
                          }
                        }, tab !== rootStore.l10n.item_details.media ? 500 : 100);
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
                { votingEvents ? <NFTVotingSection votingEvents={votingEvents} sku={nftInfo.item.sku} /> : null }
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-block page-block--lower-content page-block--nft-content">
        <div className={`page-block__content ${showMediaSections ? "page-block__content--extra-wide" : ""}`}>
          <NFTTabbedContent
            key={`tabbed-content-${listingStatus?.offer?.id}-${listingStatus?.offer?.price}`}
            nft={nft}
            nftInfo={nftInfo}
            showMediaSections={showMediaSections}
            tab={tab}
            setTab={setTab}
            previewMedia={previewMedia}
            hideTables={hideSecondaryStats}
            secondaryDisabled={secondaryDisabled}
          />
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

  useEffect(() => {
    if(!item.use_analytics) { return; }

    checkoutStore.AnalyticsEvent({
      marketplace,
      analytics: item?.page_view_analytics,
      eventName: "Item Page View"
    });
  }, []);

  return (
    Render ?
      Render({item}) :
      <NFTDetails item={item} hideSecondaryStats={marketplace?.branding?.hide_secondary_in_store} />
  );
});

// NFT - Also used for NFTMedia page
export const MintedNFTDetails = observer(({Render}) => {
  const match = useRouteMatch();

  const {nft, expired} = rootStore.NFTData({
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
      loaded={!expired}
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

export const MintedNFTRedirect = observer(() => {
  const match = useRouteMatch();
  const [tokenId, setTokenId] = useState(undefined);
  const [notFound, setNotFound] = useState(false);

  return (
    <AsyncComponent
      key={`nft-redirect-${match.params.contractId}`}
      loadingClassName="page-loader"
      Load={async () => {
        try {
          const {userAddress} = await rootStore.UserProfile({userId: match.params.userId});

          const firstOwnedItem = (await rootStore.walletClient.UserItems({
            contractAddress: rootStore.client.utils.HashToAddress(match.params.contractId),
            userAddress: userAddress,
            limit: 1
          }))?.results?.[0];

          if(firstOwnedItem) {
            setTokenId(firstOwnedItem.details.TokenIdStr);
          } else {
            setNotFound(true);
          }
        } catch(error) {
          rootStore.Log(error, true);
          setNotFound(true);
        }
      }}
      render={() =>
        tokenId ? <Redirect to={UrlJoin(match.url, tokenId)} /> :
          notFound ? <Redirect to={Path.dirname(match.url)} /> :
            null
      }
    />
  );
});

// Listing
export const ListingDetails = observer(() => {
  const match = useRouteMatch();

  const [listingStatus, setListingStatus] = useState(undefined);
  const [unavailable, setUnavailable] = useState(false);

  const {nft, expired} = rootStore.NFTData({
    contractAddress: listingStatus?.listing?.details?.ContractAddr || (listingStatus?.sale || listingStatus?.removed)?.contract,
    tokenId: listingStatus?.listing?.details?.TokenIdStr || (listingStatus?.sale || listingStatus?.removed)?.token
  });

  if(unavailable) {
    return <DeletedPage />;
  }

  return (
    <AsyncComponent
      key={`listing-${match.params.listingId}`}
      loadingClassName="page-loader"
      Load={async () => {
        try {
          const status = (await transferStore.CurrentNFTStatus({listingId: match.params.listingId})) || {};

          if(expired) {
            // Load full nft in case listing is removed or sold
            await rootStore.LoadNFTData({
              contractAddress: status.listing?.details?.ContractAddr || (status.sale || status.removed).contract,
              tokenId: status.listing?.details?.TokenIdStr || (status.sale || status.removed).token
            });
          }

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
