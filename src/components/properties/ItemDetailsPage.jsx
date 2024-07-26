import ItemDetailStyles from "Assets/stylesheets/media_properties/item-details.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore, transferStore} from "Stores";
import {Ago, MiddleEllipsis, NFTInfo} from "../../utils/Utils";
import {Button, Description, PageContainer} from "Components/properties/Common";
import {NFTImage} from "Components/common/Images";
import {
  ButtonWithLoader,
  CopyableField,
  FormatPriceString,
  Linkish,
  LocalizeString
} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";
import {Modal, TextInput} from "@mantine/core";
import {PageLoader} from "Components/common/Loaders";
import {CreateMediaPropertyPurchaseParams, MediaPropertyBasePath} from "../../utils/MediaPropertyUtils";
import ListingModal from "Components/listings/ListingModal";
import OfferModal from "Components/listings/OfferModal";
import Path from "path";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";
import Utils from "@eluvio/elv-client-js/src/Utils";
import {FilteredTable} from "Components/common/Table";
import {OffersTable} from "Components/listings/TransferTables";

import ProfileIcon from "Assets/icons/profile.svg";
import TransactionIcon from "Assets/icons/transaction history icon";
import PurchaseOffersIcon from "Assets/icons/Offers table icon";
import ListingStats from "Components/listings/ListingStats";

const S = (...classes) => classes.map(c => ItemDetailStyles[c] || "").join(" ");

const TransferModal = ({nft, SetTransferred, Close}) => {
  const [targetAddress, setTargetAddress] = useState("");
  const [addressValid, setAddressValid] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setMessage("");

    const invalid = targetAddress &&
      (!rootStore.client.utils.ValidAddress(targetAddress) || rootStore.client.utils.EqualAddress(rootStore.client.utils.nullAddress, targetAddress));

    if(invalid) {
      setAddressValid(false);
      setError(rootStore.l10n.transfers.errors.invalid_address);
    } else if(rootStore.client.utils.EqualAddress(rootStore.CurrentAddress(), targetAddress)) {
      setAddressValid(false);
      setError(rootStore.l10n.transfers.errors.no_self_transfer);
    } else {
      setAddressValid(true);
      setError("");

      if(targetAddress) {
        rootStore.walletClient.UserItems({userAddress: targetAddress, limit: 1})
          .then(({paging}) => {
            if(paging.total <= 0) {
              setMessage(rootStore.l10n.transfers.errors.address_warning);
            }
          });
      }
    }
  }, [targetAddress]);

  return (
    <Modal
      size="auto"
      centered
      opened
      onClose={Close}
      title="Transfer Item"
    >
      <div className={S("transfer-form")}>
        <TextInput
          label="Recipient Address"
          value={targetAddress}
          onChange={event => setTargetAddress(event.target.value)}
          error={error}
        />
        {
          !message ? null :
            <div className={S("transfer-form__message")}>
              { message }
            </div>
        }
        <div className={S("transfer-form__actions")}>
          <Button
            disabled={!addressValid}
            variant="primary"
            onClick={async () => {
              try {
                await transferStore.TransferNFT({nft, targetAddress});
                SetTransferred();
                Close();
              } catch(error) {
                setError("Transfer failed");
              }
            }}
            className={S("transfer-form__action")}
          >
            Transfer
          </Button>
          <Button variant="outline" onClick={Close} className={S("transfer-form__action")}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};


const Tables = observer(({nftInfo}) => {
  const nft = nftInfo.nft;
  const [page, setPage] = useState(new URLSearchParams(window.location.search).get("tab") || "trading");
  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false;

  if(secondaryDisabled) { return null; }

  const pages = (
    <div className={S("pages", "pages--tables")}>
      {
        ["trading", "offers"].map(option =>
          <button key={`page-${option}`} onClick={() => setPage(option)} className={S("page-button", page === option ? "page-button--active" : "")}>
            <ImageIcon icon={option === "trading" ? TransactionIcon : PurchaseOffersIcon} className={S("page-button__icon")} />
            { rootStore.l10n.media_properties.item_details.tables[option] }
          </button>
        )
      }
    </div>
  );

  let tables;

  if(page === "offers") {
    tables = (
      <OffersTable
        icon={PurchaseOffersIcon}
        header={rootStore.l10n.tables.active_offers}
        contractAddress={nft.details.ContractAddr}
        tokenId={nft.details.TokenIdStr}
        statuses={["ACTIVE"]}
      />
    );
  } else {
    tables = (
      <>
        {
          nft.details.TokenIdStr ?
            <FilteredTable
              collapsible
              initiallyCollapsed
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
          collapsible
          initiallyCollapsed
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
      </>
    );
  }

  return (
    <div className={S("tables")}>
      { pages }
      <ListingStats mode="sales-stats" filterParams={{contractAddress: nftInfo?.nft?.details?.ContractAddr}} />
      {tables}
    </div>
  );
});

const ContractPage = observer(({nftInfo}) => {
  const [burned, setBurned] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  if(burned) {
    return <Redirect to="/" />;
  }

  return (
    <>
      {
        !showTransfer ? null :
          <TransferModal
            nft={nftInfo.nft}
            SetTransferred={() => setBurned(true)}
            Close={() => setShowTransfer(false)}
          />
      }
      <div className={S("page")}>
        <div className={S("details")}>
          <div className={S("details__copy-field")}>
            <div className={S("details__copy-field-title")}>
              { rootStore.l10n.item_details.contract_address }
            </div>
            <CopyableField value={nftInfo.nft.details.ContractAddr}>
              <div className={[S("details__copy-value"), "ellipsis"].join(" ")}>
                { nftInfo.nft.details.ContractAddr }
              </div>
            </CopyableField>
          </div>
          <div className={S("details__copy-field")}>
            <div className={S("details__copy-field-title")}>
              { rootStore.l10n.item_details.version_hash }
            </div>
            <CopyableField value={nftInfo.nft.details.VersionHash}>
              <div className={[S("details__copy-value"), "ellipsis"].join(" ")}>
                { nftInfo.nft.details.VersionHash }
              </div>
            </CopyableField>
          </div>
          <div className={S("details__actions")}>
            <Button
              className={S("details__action")}
              variant="outline"
              target="_blank"
              href={
                rootStore.walletClient.network === "main" ?
                  `https://explorer.contentfabric.io/address/${nftInfo.nft.details.ContractAddr}/transactions` :
                  `https://lookout.qluv.io/address/${nftInfo.nft.details.ContractAddr}/transactions`
              }
              rel="noopener"
            >
              { rootStore.l10n.item_details.lookout_link }
            </Button>

            {
              !nftInfo.isOwned || nftInfo.listingId || nftInfo.heldDate ? null :
                <Button
                  className={S("details__action")}
                  variant="outline"
                  disabled={nftInfo.nft?.metadata?.test}
                  title={nftInfo.nft?.metadata?.test ? "Test items may not be transferred" : ""}
                  onClick={() => setShowTransfer(true)}
                >
                  { rootStore.l10n.actions.transfers.transfer }
                </Button>
            }

            {
              !nftInfo.isOwned || nftInfo.listingId || !rootStore.funds ? null :
                <Button
                  className={S("details__action")}
                  variant="outline"
                  onClick={async () => await Confirm({
                    message: "Are you sure you want to permanently burn this item? This cannot be undone.",
                    Confirm: async () => {
                      await rootStore.BurnNFT({nft: nftInfo.nft});
                      setBurned(true);
                    }
                  })}
                >
                  Burn Item
                </Button>
            }
          </div>
          <div className={S("details__details")}>
            {
              nftInfo.heldDate || !nftInfo.secondaryReleased ?
                <h3 className={S("details__detail")}>
                  { LocalizeString(rootStore.l10n.item_details[nftInfo.heldDate ? "held_message" : "secondary_unreleased"], {heldDate: nftInfo.heldDate || nftInfo.secondaryReleaseDate}) }
                </h3> : null
            }
            {
              nftInfo.secondaryReleased && !nftInfo.secondaryAvailable ?
                <h3 className={S("details__detail")}>
                  { LocalizeString(rootStore.l10n.item_details.secondary_expired, {heldDate: nftInfo.secondaryExpirationDate}) }
                </h3> : null
            }
          </div>
        </div>
      </div>
    </>
  );
});

const DetailsPage = observer(({nftInfo, contractStats}) => {
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
    <div className={S("page")}>
      <div className={S("details")}>
        {
          !nftInfo.metadata?.playable || !embedUrl ? null :
            <div className={S("details__copy-field")}>
              <div className={S("details__copy-field-title")}>
                { rootStore.l10n.item_details.media_url }
              </div>
              <CopyableField value={embedUrl}>
                <a href={embedUrl} target="_blank" className={[S("details__copy-value"), "ellipsis"].join(" ")} rel="noreferrer">
                  { embedUrl }
                </a>
              </CopyableField>
            </div>
        }
        {
          !nft.metadata.image ? null :
            <>
              <div className={S("details__copy-field")}>
                <div className={S("details__copy-field-title")}>
                  { rootStore.l10n.item_details.image_url }
                </div>
                <CopyableField value={nft.metadata.image}>
                  <a href={nft.metadata.image} target="_blank" className={[S("details__copy-value"), "ellipsis"].join(" ")} rel="noreferrer">
                    { nft.metadata.image }
                  </a>
                </CopyableField>
                {
                  !nftInfo.isOwned || rootStore.userProfiles.me?.imageUrl === nft.metadata.image ? null :
                    <Button
                      variant="outline"
                      onClick={async () => await rootStore.UpdateUserProfile({newProfileImageUrl: nft.metadata.image})}
                    >
                      {rootStore.l10n.item_details.menu.set_as_profile}
                    </Button>
                }
              </div>
            </>
        }

        <div className={S("details__details")}>
          {
            nft.metadata.creator ?
              <div className={S("details__detail")}>
                { rootStore.l10n.item_details.creator}: { nft.metadata.creator }
              </div>
              : null
          }
          {
            nft.metadata.edition_name ?
              <div className={S("details__detail")}>
                { rootStore.l10n.item_details.edition }: { nft.metadata.edition_name }
              </div>
              : null
          }
          {
            nft.details.TokenIdStr ?
              <div className={S("details__detail")}>
                { rootStore.l10n.item_details.token_id }: {nft.details.TokenIdStr}
              </div> : null
          }
          {
            typeof nft.details.TokenOrdinal === "undefined" ||
            (nft.metadata?.id_format || "").includes("token_id") ?
              null :
              <div className={S("details__detail")}>
                { rootStore.l10n.item_details.token_ordinal }: { nft.details.TokenOrdinal }
              </div>
          }
          {
            contractStats ?
              <>
                <div className={S("details__detail")}>
                  { rootStore.l10n.item_details.number_minted }: { contractStats.minted || 0 }
                </div>
                <div className={S("details__detail")}>
                  { rootStore.l10n.item_details.number_in_circulation }: { contractStats.total_supply || 0 }
                </div>
                <div className={S("details__detail")}>
                  { rootStore.l10n.item_details.number_burned }: { contractStats.burned || 0 }
                </div>
                {
                  cap && cap < 10000000 ?
                    <div className={S("details__detail")}>
                      { rootStore.l10n.item_details.max_possible }: {contractStats.cap - contractStats.burned}
                    </div> : null
                }
              </> : null
          }
          {
            cap && cap < 10000000 ?
              <div className={S("details__detail")}>
                { rootStore.l10n.item_details.cap }: { contractStats?.cap || nft.details.Cap }
              </div>
              : null
          }
          {
            nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) ?
              <div className={S("details__detail")}>
                { rootStore.l10n.item_details.held_until } { nft.details.TokenHoldDate.toLocaleString(rootStore.preferredLocale, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }) }
              </div>
              : null
          }
          <br />
          <div>
            { nft.metadata.copyright }
          </div>
          {
            nft.metadata.terms_document?.terms_document ?
              <div className={S("details__detail")}>
                <a
                  href={nft.metadata.terms_document.terms_document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={S("details__terms")}
                >
                  {nft.metadata.terms_document.link_text}
                </a>
              </div>: null
          }
          <br />
          <div>
            { mintDate ? LocalizeString(rootStore.l10n.item_details.minted_date, {date: mintDate}) : "" }
          </div>
        </div>
      </div>
    </div>
  );
});

const DescriptionPage = observer(({item, info, status}) => {
  const match = useRouteMatch();
  const ownerAddress = info.ownerAddress;
  const ownerProfile = ownerAddress ? rootStore.userProfiles[Utils.FormatAddress(ownerAddress)] : undefined;

  return (
    <div className={S("page")}>
      <div className={S("details")}>
        <h1 className={S("details__title")}>{ info.name }</h1>
        <div className={S("details__subtitle")}>
          {
            !info.subtitle1 ? null :
              <div className={S("details__subtitle-item")}>
                {info.subtitle1}
              </div>
          }
          {
            !info.sideText?.[0] ? null :
              <div className={S("details__token")}>
                <div className={S("details__subtitle-item")}>
                  {info.sideText[0]}
                </div>
                {
                  !info.sideText?.[1] ? null :
                    <>
                      <div>/</div>
                      <div className={S("details__subtitle-item")}>
                        {info.sideText[1]}
                      </div>
                    </>
                }
              </div>
          }
        </div>
        <Description
          description={item.metadata.description}
          descriptionRichText={item.metadata.description_rich_text}
          className={S("details__description")}
        />

        {
          !status?.listing ? null :
            <div className={S("details__price")}>
              { FormatPriceString(status.listing.details.Price, {stringOnly: true}) }
            </div>
        }

        <Linkish
          to={
            !ownerAddress ? undefined :
              match.params.mediaPropertySlugOrId ?
                UrlJoin(MediaPropertyBasePath(match.params), "users", ownerProfile?.userName || ownerAddress, "listings") :
                match.params.marketplaceId ?
                  UrlJoin("/marketplace", match.params.marketplaceId, "users", ownerProfile.userName || ownerProfile.userAddress, "listings") :
                  UrlJoin("/wallet", "users", ownerProfile.userName || ownerProfile.userAddress, "listings")
          }
          className={S("details__owner")}
        >
          <ImageIcon icon={ProfileIcon} className={S("details__owner-icon")} />
          <div className={S("details__owner-name")}>
            { ownerProfile?.userName ? `@${ownerProfile.userName}` : ownerAddress }
          </div>
        </Linkish>
      </div>
    </div>
  );
});

const Actions = observer(({nftInfo, status, setRedirect, UpdateStatus}) => {
  const [showListingModal, setShowListingModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    UpdateStatus();
  }, [showListingModal, showOfferModal]);

  if(!nftInfo || !status) { return null; }

  const secondaryDisabled = rootStore.domainSettings?.settings?.features?.secondary_marketplace === false;
  const isInCheckout = status?.listing?.details?.CheckoutLockedUntil && status?.listing?.details.CheckoutLockedUntil > Date.now();


  if(nftInfo.isOwned) {
    const listable = !(secondaryDisabled || nftInfo.heldDate || !(nftInfo.secondaryAvailable || nftInfo?.nft?.details?.ListingId));

    // Owned NFT
    return (
      <>
        <div className={S("details__actions")}>
          {
            // Listings available if not held or secondary restricted, or if already listed
            !listable ? null :
              <Button
                title={nftInfo.nft?.metadata?.test ? "Test NFTs may not be listed for sale" : undefined}
                disabled={nftInfo.heldDate || isInCheckout || nftInfo.nft?.metadata?.test}
                onClick={() => setShowListingModal(true)}
                className={S("details__action")}
              >
                { rootStore.l10n.actions.listings[status?.listing ? "edit" : "create"] }
              </Button>
          }

          {
            !nftInfo.listingId && nftInfo.nft?.metadata?.pack_options?.is_openable ?
              <Button
                variant={listable ? "secondary" : "primary"}
                className={S("details__action")}
                onClick={async () => Confirm({
                  message: LocalizeString(rootStore.l10n.actions.packs.open_confirm, {name: nftInfo.nft.metadata.display_name}),
                  Confirm: async () => {
                    await checkoutStore.OpenPack({
                      tenantId: nftInfo.nft.details.TenantId,
                      contractAddress: nftInfo.nft.details.ContractAddr,
                      tokenId: nftInfo.nft.details.TokenIdStr
                    });

                    setRedirect(UrlJoin(window.location.pathname, "open"));
                  }
                })}
              >
                { nftInfo.nft.metadata.pack_options.open_button_text || LocalizeString(rootStore.l10n.actions.packs.open, {name: nftInfo.nft.metadata.display_name}) }
              </Button> : null
          }

          {
            isInCheckout ?
              <h3 className="details-page__transfer-details details-page__held-message">
                { rootStore.l10n.purchase.errors.nft_being_purchased }
              </h3> : null
          }
        </div>
        {
          !showListingModal ? null :
            <ListingModal
              nft={status?.listing || nftInfo.nft}
              listingId={status?.listing?.details?.ListingId}
              Close={() => setShowListingModal(false)}
            />
        }
      </>
    );
  } else {
    // Not Owned

    // Listing sold
    if(status?.listing?.sale) {
      return (
        <h2 className={S("details__message")}>
          {
            LocalizeString(
              rootStore.l10n.purchase.errors.nft_sold,
              {
                price: FormatPriceString(status.listing.sale.price, {stringOnly: true}),
                date: new Date(status.listing.sale.created * 1000).toLocaleString(rootStore.preferredLocale, {
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
    } else if(status?.listing?.removed) {
      // Listing removed
      return (
        <h2 className={S("details__message")}>
          { rootStore.l10n.purchase.errors.listing_unavailable }
        </h2>
      );
    }

    // Not Owned
    return (
      <>
        <div className={S("details__actions")}>
          {
            !status?.listing ? null :
              <Button
                to={
                  location.pathname + "?p=" +
                  CreateMediaPropertyPurchaseParams({
                    id: `listing-${status?.listing.details.ListingId}`,
                    listingId: status?.listing.details.ListingId
                  })
                }
                Component={ButtonWithLoader}
                disabled={isInCheckout}
                className={S("details__action")}
              >
                {LocalizeString(rootStore.l10n.actions.purchase.buy_now_for, {price: FormatPriceString(status?.listing.details.Price, {stringOnly: true})})}
              </Button>
          }
          {
            // Offers available if offerable, not owned, and either secondary trading not restricted or offer currently exists for this nft
            status?.listing?.offer?.id || (nftInfo.offerable && !nftInfo.isOwned && !secondaryDisabled && nftInfo.secondaryAvailable) ?
              <Button
                variant={status?.listing ? "secondary" : "primary"}
                disabled={isInCheckout}
                onClick={() => {
                  if(!rootStore.loggedIn) {
                    rootStore.ShowLogin();
                  } else {
                    setShowOfferModal(true);
                  }
                }}
                className={S("details__action")}
              >
                { rootStore.l10n.actions.offers[status?.offer?.id ? "edit" : "create"] }
              </Button> : null
          }
          {
            isInCheckout ?
              <h3 className={S("details__message")}>
                { rootStore.l10n.purchase.errors.nft_being_purchased }
              </h3> : null
          }
        </div>
        {
          !showOfferModal ? null :
            <OfferModal
              nft={nftInfo.nft}
              offer={status?.offer}
              Close={() => setShowOfferModal(false)}
            />
        }
      </>
    );
  }
});

const ItemDetailsPage = observer(() => {
  const match = useRouteMatch();
  const [page, setPage] = useState(new URLSearchParams(window.location.search).get("page") || "description");
  const [contractStats, setContractStats] = useState(undefined);
  const [status, setStatus] = useState(undefined);
  const [redirect, setRedirect] = useState(undefined);

  const contractId = match.params.contractId || match.params.propertyItemContractId;
  const tokenId = match.params.contractId ? match.params.tokenId : match.params.propertyItemTokenId;

  if(!contractId) { return; }

  const UpdateStatus = () => {
    Promise.all([
      rootStore.LoadNFTData({contractId, tokenId, force: true}),
      transferStore.CurrentNFTStatus({
        listingId: new URLSearchParams(window.location.search).get("listingId"),
        contractId,
        tokenId
      }),
      rootStore.walletClient.NFTContractStats({
        contractAddress: rootStore.client.utils.HashToAddress(contractId)
      })
    ])
      .then(([nft, status, stats]) => {
        Promise.race([
          new Promise(resolve => setTimeout(resolve, 1000)),
          rootStore.UserProfile({userId: nft.details.TokenOwner})
        ]).then(() => {
          setStatus(status);
          setContractStats(stats);
        });
      })
      .catch(error => rootStore.Log(error));
  };

  useEffect(() => {
    if(tokenId) {
      UpdateStatus();
    } else {
      // No token ID specified - try to find an item with this contract that the user owns
      (async () => {
        try {
          const {userAddress} = await rootStore.UserProfile({userId: match.params.userId});

          const firstOwnedItem = (await rootStore.walletClient.UserItems({
            contractAddress: rootStore.client.utils.HashToAddress(contractId),
            userAddress: userAddress,
            limit: 1
          }))?.results?.[0];

          if(firstOwnedItem) {
            setRedirect(UrlJoin(window.location.pathname, firstOwnedItem.details.TokenIdStr));
          } else {
            setRedirect(Path.dirname(window.location.pathname));
          }
        } catch(error) {
          rootStore.Log(error, true);
        }
      })();

      return;
    }
  }, []);

  if(redirect) {
    return <Redirect to={redirect} />;
  }

  const {nft} = rootStore.NFTData({contractId, tokenId});

  if(!nft || !contractStats) {
    return <PageLoader />;
  }

  const nftInfo = NFTInfo({nft, showToken: true});

  // Owned item has bundled media - navigate to property page
  if(match.params.contractId && nftInfo?.hasBundledProperty && nftInfo?.isOwned) {
    return <Redirect to={UrlJoin("/m", match.params.contractId, match.params.tokenId, "p", nftInfo.bundledPropertyId, new URLSearchParams(window.location.search).get("page") === "details" ? "details" : "")} />;
  }

  return (
    <PageContainer className={S("item-details-page")}>
      <div className={S("item-details-container")}>
        <div className={S("item-details")}>
          <div className={S("image-section")}>
            <div className={S("image-container")}>
              <NFTImage nft={nft} showVideo={true} className="image" />
            </div>
            <Actions
              nftInfo={nftInfo}
              status={status}
              setRedirect={setRedirect}
              UpdateStatus={UpdateStatus}
            />
          </div>
          <div className={S("details-container")}>
            <div className={S("pages")}>
              {
                ["description", "details", "contract"].map(option =>
                  <button key={`page-${option}`} onClick={() => setPage(option)} className={S("page-button", page === option ? "page-button--active" : "")}>
                    { rootStore.l10n.media_properties.item_details.pages[option] }
                  </button>
                )
              }
            </div>
            {
              page === "description" ?
                <DescriptionPage item={nft} info={nftInfo} status={status} /> :
                page === "details" ?
                  <DetailsPage nftInfo={nftInfo} contractStats={contractStats} /> :
                  <ContractPage nftInfo={nftInfo} />
            }
          </div>
        </div>
        <Tables nftInfo={nftInfo} />
      </div>
    </PageContainer>
  );
});

export default ItemDetailsPage;
