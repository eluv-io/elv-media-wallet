import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {checkoutStore, rootStore, transferStore} from "Stores";
import {Ago, MiddleEllipsis, NFTDisplayToken, TimeDiff} from "../../utils/Utils";
import {Loader} from "Components/common/Loaders";
import Utils from "@eluvio/elv-client-js/src/Utils";
import ImageIcon from "Components/common/ImageIcon";
import {ButtonWithLoader, FormatPriceString, LocalizeString} from "Components/common/UIComponents";
import Table, {FilteredTable} from "Components/common/Table";
import UrlJoin from "url-join";

import UpCaret from "Assets/icons/up-caret.svg";
import DownCaret from "Assets/icons/down-caret.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import USDIcon from "Assets/icons/crypto/USD icon.svg";

import AcceptIcon from "Assets/icons/thumbs up.svg";
import RejectIcon from "Assets/icons/thumbs down.svg";
import EditIcon from "Assets/icons/edit listing icon.svg";
import Confirm from "Components/common/Confirm";
import OfferModal from "Components/listings/OfferModal";
import {Link, useRouteMatch} from "react-router-dom";
import {Button} from "Components/properties/Common";
import NFTCard from "Components/nft/NFTCard";
import ListingIcon from "Assets/icons/listings icon";
import LinkedIcon from "Assets/icons/linked wallet icon (r)";

export const ActiveListings = observer(({contractAddress, selectedListingId, showSeller=false, perPage=100, Select}) => {
  const [initialListingId] = useState(selectedListingId);
  const [initialListing, setInitialListing] = useState(undefined);

  useEffect(() => {
    if(!initialListingId) { return; }

    rootStore.walletClient.Listing({listingId: initialListingId})
      .then(listing => setInitialListing(listing));
  }, []);

  const [sortOptions, setSortOptions] = useState({
    sortBy: "created",
    sortDesc: true,
    contractAddress
  });

  const UpdateSort = field => {
    if(sortOptions.sortBy === field) {
      setSortOptions({...sortOptions, sortDesc: !sortOptions.sortDesc});
    } else {
      setSortOptions({...sortOptions, sortBy: field, sortDesc: false});
    }
  };

  const sortIcon = sortOptions.sortDesc ? DownCaret : UpCaret;

  let tableHeaders = [
    { text: "Token", icon: sortOptions.sortBy === "info/ordinal" ? sortIcon : null, onClick: () => UpdateSort("info/ordinal") },
    { text: "Price", icon: sortOptions.sortBy === "price" ? sortIcon : null, onClick: () => UpdateSort("price") }
  ];

  if(showSeller) {
    tableHeaders.push({text: "Seller", icon: sortOptions.sortBy === "price" ? sortIcon : null, onClick: () => UpdateSort("seller")});
  }

  return (
    <FilteredTable
      className="transfer-table--active-listings"
      mode="listings"
      hidePagingInfo
      perPage={perPage}
      columnHeaders={tableHeaders}
      columnWidths={
        showSeller ?
          [1, 1, 1] :
          [1, 1]
      }
      mobileColumnWidths={[1, 1]}
      initialFilters={sortOptions}
      pinnedEntries={initialListing ? [initialListing] : null}
      CalculateRowValues={(listing, index) => {
        if(listing.details.ListingId === initialListingId && index > 0) {
          return;
        }

        const isCheckoutLocked = listing.details.CheckoutLockedUntil && listing.details.CheckoutLockedUntil > Date.now();
        return {
          disabled: isCheckoutLocked,
          className: [
            isCheckoutLocked ? "transfer-table__table__row-disabled" : "",
            selectedListingId === listing.details.ListingId ? "transfer-table__table__row-selected" : "",
            Select && !isCheckoutLocked ? "transfer-table__table__row-selectable" : "",
            initialListingId === listing.details.ListingId ? "transfer-table__table__row-initial" : ""
          ]
            .filter(c => c)
            .join(" "),
          onClick: !Select || isCheckoutLocked ?
            undefined :
            () => {
              const selected = selectedListingId === listing.details.ListingId ? undefined : listing.details.ListingId;

              Select(selected, listing);
            },
          columns: [
            NFTDisplayToken(listing),
            <>
              {
                listing.details.USDCOnly ?
                  <>
                    <ImageIcon
                      icon={USDCIcon}
                      label="USDC"
                      title="USDC Accepted"
                      className="transfer-table__table__cell__icon"
                    />
                    <div className="transfer-table__table__cell__icon transfer-table__table__cell__icon--placeholder"/>
                  </> :
                  <>
                    <ImageIcon
                      icon={USDIcon}
                      label="USD"
                      title="USD Accepted"
                      className="transfer-table__table__cell__icon"
                    />
                    {
                      listing.details.USDCAccepted ?
                        <ImageIcon
                          icon={USDCIcon}
                          label="USDC"
                          title="USDC Accepted"
                          className="transfer-table__table__cell__icon"
                        /> :
                        <div className="transfer-table__table__cell__icon transfer-table__table__cell__icon--placeholder"/>
                    }
                  </>
              }
              {FormatPriceString(listing.details.Price, {vertical: true})}
            </>,
            MiddleEllipsis(listing.details.SellerAddress, 14)
          ]
        };
      }}
    />
  );
});


const OffersTableActions = observer(({offer, setShowOfferModal, Reload}) => {
  if(offer.status !== "ACTIVE") { return null; }

  if(Utils.EqualAddress(offer.buyer, rootStore.CurrentAddress())) {
    return (
      <div className="offers-table__actions">
        <button
          onClick={async event => {
            event.stopPropagation();
            event.preventDefault();

            setShowOfferModal({
              offer,
              nft: await rootStore.LoadNFTData({
                contractAddress: offer.contract,
                tokenId: offer.token
              })
            });
          }}
          className="offers-table__action"
        >
          <div className="offers-table__action__text">{rootStore.l10n.actions.offers.edit_offer}</div>
          <ImageIcon icon={EditIcon} title={rootStore.l10n.actions.offers.edit_offer} />
        </button>
      </div>
    );
  }

  if(Utils.EqualAddress(offer.seller, rootStore.CurrentAddress())) {
    return (
      <div className="offers-table__actions">
        <button
          onClick={async event => {
            event.stopPropagation();
            event.preventDefault();

            await Confirm({
              message: (
                <div className="offers-table__accept-modal">
                  <div className="offers-table__accept-modal__message">
                    { LocalizeString(rootStore.l10n.actions.offers.accept_confirm, {price: FormatPriceString(offer.price, {stringOnly: true}), itemName: offer.name}) }
                  </div>
                  <div className="offers-table__accept-modal__breakdown">
                    <div className="offers-table__accept-modal__line-item">
                      <label>{ rootStore.l10n.offers.offer}</label>
                      {FormatPriceString(offer.price)}
                    </div>
                    <div className="offers-table__accept-modal__line-item">
                      <label>{ rootStore.l10n.purchase.creator_royalty }</label>
                      {FormatPriceString(offer.royalty)}
                    </div>
                    <div className="offers-table__accept-modal__separator" />
                    <div className="offers-table__accept-modal__line-item ">
                      <label>{ rootStore.l10n.purchase.total_payout }</label>
                      {FormatPriceString(Math.max(0, offer.payout_amount))}
                    </div>
                  </div>
                </div>
              ),
              Confirm: async () => {
                await rootStore.walletClient.AcceptMarketplaceOffer({offerId: offer.id});

                await new Promise(resolve => setTimeout(resolve, 1000));
                Reload();
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            });
          }}
          className="offers-table__action"
        >
          <div className="offers-table__action__text">{ rootStore.l10n.actions.offers.accept}</div>
          <ImageIcon icon={AcceptIcon} title={rootStore.l10n.actions.offers.accept_offer}/>
        </button>
        <button
          onClick={async event => {
            event.stopPropagation();
            event.preventDefault();

            await Confirm({
              message: LocalizeString(rootStore.l10n.actions.offers.decline_confirm, {price: FormatPriceString(offer.price, {stringOnly: true}), itemName: offer.name}),
              Confirm: async () => {
                await rootStore.walletClient.RejectMarketplaceOffer({offerId: offer.id});

                await new Promise(resolve => setTimeout(resolve, 1000));
                Reload();
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            });
          }}
          className="offers-table__action"
        >
          <div className="offers-table__action__text">{rootStore.l10n.actions.offers.decline}</div>
          <ImageIcon icon={RejectIcon} title={rootStore.l10n.actions.offers.decline_offer}/>
        </button>
      </div>
    );
  }

  return null;
});

export const OffersTable = observer(({
  icon,
  header,
  limit,
  contractAddress,
  tokenId,
  sellerAddress,
  buyerAddress,
  statuses,
  activeView=false,
  noActions=false,
  hideActionsColumn=false,
  showTotal=false,
  useWidth,
  className="",
  ...props
}) => {
  const match = useRouteMatch();

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [loadKey, setLoadKey] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(undefined);

  const UpdateHistory = async () => {
    if(sellerAddress) {
      statuses = ["ACTIVE", "ACCEPTED"];
    }

    let entries = (await rootStore.walletClient.MarketplaceOffers({
      sellerAddress,
      buyerAddress,
      contractAddress,
      tokenId,
      statuses
    }))
      // Filter out offers that apply to all tokens. We don't deal with them yet.
      .filter(offer => offer.token)
      .sort((a, b) => a.updated > b.updated ? -1 : 1);

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    let interval = setInterval(UpdateHistory, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    UpdateHistory();
  }, [loadKey]);

  // Hide actions column if no entries have actions
  noActions = noActions ||
    !entries.find(offer =>
      offer.status === "ACTIVE" &&
      (
        // Offer was made by us
        Utils.EqualAddress(offer.buyer, rootStore.CurrentAddress()) ||
        // Offer was received by us
        Utils.EqualAddress(offer.seller, rootStore.CurrentAddress())
      )
    );

  const Status = (status="") => {
    switch(status.toLowerCase()) {
      case "active":
        return rootStore.l10n.offers.status.active;
      case "expired":
        return rootStore.l10n.offers.status.expired;
      case "accepted":
        return rootStore.l10n.offers.status.accepted;
      case "declined":
        return rootStore.l10n.offers.status.declined;
      case "cancelled":
        return rootStore.l10n.offers.status.cancelled;
      default:
        return rootStore.l10n.offers.status.invalid;
    }
  };

  if(activeView) {
    return (
      <Table
        {...props}
        className={`offers-table ${className}`}
        loading={loading}
        pagingMode="none"
        columnHeaders={[
          rootStore.l10n.tables.columns[buyerAddress ? "to" : "from"],
          rootStore.l10n.tables.columns.price
        ]}
        columnWidths={[1, 1]}
        entries={
          entries.map(offer => {
            let user, userName;
            if(buyerAddress) {
              userName = offer.seller_username ? `@${offer.seller_username}` : undefined;
              user = userName || Utils.FormatAddress(offer.seller);
            } else {
              userName = offer.buyer_username ? `@${offer.buyer_username}` : undefined;
              user = userName || Utils.FormatAddress(offer.buyer);
            }

            return [
              <div key={`offer-${offer.id}`} className="ellipsis" title={`${userName ? userName + " " : ""}(${Utils.FormatAddress(offer.buyer)})`}>
                { user }
              </div>,
              FormatPriceString(offer.price, {stringOnly: true})
            ];
          })
        }
      />
    );
  }

  return (
    <>
      <Table
        {...props}
        className={`offers-table ${className}`}
        loading={loading}
        headerIcon={icon}
        headerText={header}
        pagingMode="none"
        useWidth={useWidth}
        columnHeaders={[
          rootStore.l10n.tables.columns.name,
          rootStore.l10n.tables.columns.token_id,
          rootStore.l10n.tables.columns.time,
          rootStore.l10n.tables.columns.offer_price,
          rootStore.l10n.tables.columns.total_amount,
          rootStore.l10n.tables.columns.expiration,
          rootStore.l10n.tables.columns[buyerAddress ? "to" : "from"],
          rootStore.l10n.tables.columns.status,
          " "
        ]}
        columnWidths={[2, 1, 1, showTotal ? 1 : 0, 1, 1, 1, 1, hideActionsColumn ? 0 : "100px"]}
        tabletColumnWidths={[2, 1, 1, showTotal ? 1 : 0, 1, 1, 0, 1, hideActionsColumn ? 0 : "100px"]}
        mobileColumnWidths={[1, 0, 0, showTotal ? 1 : 0, 1, 0, 0, 1, hideActionsColumn ? 0 : "75px"]}
        entries={
          entries.map(offer => {
            const seller = sellerAddress || offer.seller;
            const useLink = seller && offer.contract && offer.token;

            let path = useLink ?
              UrlJoin(
                "users",
                Utils.EqualAddress(seller, rootStore.CurrentAddress()) ? "me" : Utils.FormatAddress(seller || Utils.nullAddress),
                "items",
                `ictr${Utils.AddressToHash(offer.contract)}`,
                offer.token
              ) : "";
            path = marketplace ? UrlJoin("/marketplace", match.params.marketplaceId, path) : UrlJoin("/wallet", path);

            if(offer.status !== "ACCEPTED") {
              path = path + "?tab=Purchase Offers";
            }

            let user, userName;
            if(buyerAddress) {
              userName = offer.seller_username ? `@${offer.seller_username}` : undefined;
              user = userName || Utils.FormatAddress(offer.seller);
            } else {
              userName = offer.buyer_username ? `@${offer.buyer_username}` : undefined;
              user = userName || Utils.FormatAddress(offer.buyer);
            }

            let expiration = offer.expiration - Date.now() > 0 ? TimeDiff((offer.expiration - Date.now()) / 1000) : Ago(offer.expiration);

            return {
              link: useLink ? path: null,
              columns: [
                offer.name,
                offer.token,
                Ago(offer.updated),
                FormatPriceString(offer.price, {stringOnly: true}),
                FormatPriceString(showTotal ? offer.price + offer.fee : offer.price, {stringOnly: true}),
                expiration,
                <div key={`user-${offer.id}`} className="ellipsis" title={`${userName ? userName + " " : ""}(${Utils.FormatAddress(offer.buyer)})`}>
                  { user }
                </div>,
                <div key={`status-${offer.id}`} className={`offers-table__status ${["ACTIVE", "ACCEPTED"].includes(offer.status) ? "offers-table__status--highlight" : "offers-table__status--dim"}`}>
                  { Status(offer.status) }
                </div>,
                noActions ?
                  null :
                  {
                    className: "no-padding",
                    content: (
                      <OffersTableActions
                        offer={offer}
                        setShowOfferModal={setShowOfferModal}
                        Reload={() => setLoadKey(Math.random())}
                      />
                    )
                  }
              ]
            };
          })
        }
      />
      {
        showOfferModal ?
          <OfferModal
            nft={showOfferModal.nft}
            offer={showOfferModal.offer}
            Close={() => {
              setShowOfferModal(undefined);
              setLoadKey(Math.random());
            }}
          /> : null
      }
    </>
  );
});

export const PendingPaymentsTable = observer(({icon, header, limit, className=""}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const week = rootStore.salePendingDurationDays * 24 * 60 * 60 * 1000;

  const UpdateHistory = async () => {
    let entries = (await transferStore.UserPaymentsHistory())
      .filter(entry =>
        Utils.EqualAddress(entry.addr, rootStore.CurrentAddress()) &&
        Date.now() - entry.created * 1000 < week &&
        !entry.processor?.startsWith("solana:p2p")
      )
      .sort((a, b) => a.created > b.created ? -1 : 1);

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`transfer-table pending-payments-table ${className}`}>
      <div className="transfer-table__header">
        { icon ? <ImageIcon icon={icon} className="transfer-table__header__icon" /> : <div className="transfer-table__header__icon-placeholder" /> }
        { header }
      </div>
      <div className="transfer-table__table">
        <div className="transfer-table__table__header">
          <div className="transfer-table__table__cell">Name</div>
          <div className="transfer-table__table__cell no-mobile">Time</div>
          <div className="transfer-table__table__cell no-mobile">Clears in</div>
          <div className="transfer-table__table__cell">Payout</div>
        </div>
        <div className="transfer-table__content-rows">
          {
            loading ? <div className="transfer-table__loader"><Loader /></div> :
              !entries || entries.length === 0 ?
                <div className="transfer-table__empty">No Transfers</div> :
                entries.map(transfer =>
                  <div className="transfer-table__table__row" key={`transfer-table-row-${transfer.id}`}>
                    <div className="transfer-table__table__cell ellipsis">
                      { transfer.name }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { Ago(transfer.created * 1000) }
                    </div>
                    <div className="transfer-table__table__cell no-mobile">
                      { TimeDiff((transfer.created * 1000 + week - Date.now()) / 1000) }
                    </div>
                    <div className="transfer-table__table__cell">
                      { FormatPriceString(transfer.amount) }
                    </div>
                  </div>
                )
          }
        </div>
      </div>
    </div>
  );
});

export const UserTransferTable = observer(({
  userAddress,
  icon,
  header,
  limit,
  type="sale",
  className="",
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  const Processor = record => {
    let type = record.processor.split(":")[0];

    switch(type) {
      case "eluvio":
        return rootStore.l10n.purchase.purchase_methods.wallet_balance;
      case "stripe":
        return rootStore.l10n.purchase.purchase_methods.credit_card;
      case "solana":
        return rootStore.l10n.purchase.purchase_methods.usdc;
      case "ebanx":
        return rootStore.l10n.purchase.purchase_methods[record.processor.startsWith("ebanx:pix") ? "pix" : "credit_card"];
      case "coinbase-commerce":
        return "Coinbase";
      default:
        return rootStore.l10n.purchase.purchase_methods.crypto;
    }
  };

  const UpdateHistory = async () => {
    let entries = (await transferStore.UserPaymentsHistory(userAddress))
      .map(entry => ({
        ...entry,
        type:
          entry.processor?.startsWith("eluvio") && entry.processor.includes("payin") ? "deposit" :
            !entry.addr && (entry.processor?.includes("stripe-payout") || entry.processor?.includes("ebanx-payout")) ?
              "withdrawal" : Utils.EqualAddress(entry.buyer, rootStore.CurrentAddress()) ? "purchase" : "sale",
        processor: Processor(entry),
        pending: !entry.processor?.startsWith("solana:p2p") && Date.now() < entry.created * 1000 + rootStore.salePendingDurationDays * 24 * 60 * 60 * 1000
      }))
      .filter(entry => entry.type === type)
      .filter(entry => ["deposit", "withdrawal"].includes(entry.type) || Utils.EqualAddress(rootStore.CurrentAddress(), type === "sale" ? entry.addr : entry.buyer))
      .sort((a, b) => a.created > b.created ? -1 : 1);

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  if(type === "deposit") {
    // Deposits table
    return (
      <Table
        {...props}
        className={className}
        loading={loading}
        headerIcon={icon}
        headerText={header}
        pagingMode="none"
        columnHeaders={[
          rootStore.l10n.tables.columns.amount,
          rootStore.l10n.tables.columns.time,
          rootStore.l10n.tables.columns.method,
          rootStore.l10n.tables.columns.status
        ]}
        columnWidths={[1, 1, 1, 1]}
        entries={
          entries.map(transfer => ({
            link: transfer?.extra_json?.charge_code ? `https://commerce.coinbase.com/receipts/${transfer.extra_json?.charge_code}` : undefined,
            columns: [
              FormatPriceString(transfer.amount + transfer.fee),
              Ago(transfer.created * 1000),
              transfer.processor,
              transfer.payment_status?.toUpperCase() || "Pending"
            ]
          }))
        }
      />
    );
  }

  if(type === "withdrawal") {
    // Withdrawals table
    return (
      <Table
        {...props}
        className={className}
        loading={loading}
        headerIcon={icon}
        headerText={header}
        pagingMode="none"
        columnHeaders={[
          rootStore.l10n.tables.columns.amount,
          rootStore.l10n.tables.columns.payout,
          rootStore.l10n.tables.columns.fee,
          rootStore.l10n.tables.columns.time
        ]}
        columnWidths={[1, 1, 1, 1]}
        mobileColumnWidths={[1, 1, 0, 1]}
        entries={
          entries.map(transfer => [
            FormatPriceString(transfer.amount + transfer.fee),
            FormatPriceString(transfer.amount),
            FormatPriceString(transfer.fee),
            Ago(transfer.created * 1000)
          ])
        }
      />
    );
  }

  if(type === "sale") {
    return (
      <Table
        {...props}
        className={className}
        loading={loading}
        pagingMode="none"
        headerIcon={icon}
        headerText={header}
        columnHeaders={[
          rootStore.l10n.tables.columns.name,
          rootStore.l10n.tables.columns.list_price,
          rootStore.l10n.tables.columns.payout,
          rootStore.l10n.tables.columns.time,
          rootStore.l10n.tables.columns.buyer,
          rootStore.l10n.tables.columns.method,
          rootStore.l10n.tables.columns.status
        ]}
        columnWidths={[2, 1, 1, 1, 1, 1, 1]}
        tabletColumnWidths={[2, 1, 1, 1, 0, 1, 1]}
        mobileColumnWidths={[1, 1, 1, 0, 0, 0, 0]}
        entries={
          entries.map(transfer => [
            transfer.name,
            FormatPriceString(transfer.amount + transfer.royalty, {vertical: true}),
            FormatPriceString(transfer.amount, {vertical: true}),
            Ago(transfer.created * 1000),
            MiddleEllipsis(transfer.buyer, 14),
            transfer.processor,
            rootStore.l10n.tables[transfer.pending ? "pending" : "available"]
          ])
            .filter(field => field)
        }
      />
    );
  }

  return (
    <Table
      {...props}
      className={className}
      loading={loading}
      pagingMode="none"
      headerIcon={icon}
      headerText={header}
      columnHeaders={[
        rootStore.l10n.tables.columns.name,
        rootStore.l10n.tables.columns.list_price,
        rootStore.l10n.tables.columns.time,
        rootStore.l10n.tables.columns.seller,
        rootStore.l10n.tables.columns.method,
        rootStore.l10n.tables.columns.status,
      ]}
      columnWidths={[2, 1, 1, 1, 1, 1]}
      tabletColumnWidths={[2, 1, 1, 0, 1, 1]}
      mobileColumnWidths={[2, 1, 1, 0, 0, 0]}
      entries={
        entries.map(transfer => [
          transfer.name,
          FormatPriceString(transfer.amount + transfer.royalty, {vertical: true}),
          Ago(transfer.created * 1000),
          MiddleEllipsis(transfer.addr, 14),
          transfer.processor,
          rootStore.l10n.tables[transfer.pending ? "pending" : "available"]
        ])
      }
    />
  );
});

export const UserGiftsHistory = observer(({icon, header, limit, received=false, className=""}) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const UpdateHistory = async () => {
    let entries = (await transferStore.UserGiftsHistory({received}))
      .sort((a, b) => a.created > b.created ? -1 : 1);

    let users = entries
      .map(entry => entry.sender_addr || entry.claimer_addr)
      .filter((value, index, array) => array.indexOf(value) === index);

    await Promise.all(
      users.map(async address => await rootStore.UserProfile({userId: address}))
    );

    if(limit) {
      entries = entries.slice(0, limit);
    }

    setEntries(entries);
    setLoading(false);
  };

  useEffect(() => {
    UpdateHistory();

    let interval = setInterval(UpdateHistory, 30000);

    return () => clearInterval(interval);
  }, []);

  if(received) {
    return (
      <Table
        className={className}
        loading={loading}
        pagingMode="none"
        headerIcon={icon}
        headerText={header}
        columnHeaders={[
          rootStore.l10n.tables.columns.name,
          rootStore.l10n.tables.columns.giver,
          rootStore.l10n.tables.columns.time,
          rootStore.l10n.tables.columns.status,
          rootStore.l10n.tables.columns.source
        ]}
        columnWidths={[1, 1, 1, 1, 1]}
        tabletColumnWidths={[1, 1, 1, 1]}
        mobileColumnWidths={[1, 1, 0, 1]}
        entries={
          entries.map(record => [
            record.description,
            rootStore.userProfiles[record.sender_addr]?.userName || record.sender_name || MiddleEllipsis(record.sender_addr, 14),
            Ago(record.created),
            <>
              <div className="gifts-table__status" style={{marginRight: "10px"}}>{ rootStore.l10n.tables[record.status === "claimed" ? "claimed" : "unclaimed"] }</div>
              {
                record.status === "claimed" || !record.wallet_claim_page_url ? null :
                  <Link className="action action--compact" to={UrlJoin("/flow", record.wallet_claim_page_url.split("/flow")[1])}>
                    { rootStore.l10n.tables.claim }
                  </Link>
              }
            </>,
            record.source === "publisher" ? "Publisher" : record.source
          ])
        }
      />
    );
  }

  return (
    <Table
      className={className}
      loading={loading}
      pagingMode="none"
      headerIcon={icon}
      headerText={header}
      columnHeaders={[
        rootStore.l10n.tables.columns.name,
        rootStore.l10n.tables.columns.recipient,
        rootStore.l10n.tables.columns.time,
        rootStore.l10n.tables.columns.status,
        rootStore.l10n.tables.columns.source
      ]}
      columnWidths={[1, 1, 1, 1, 1]}
      tabletColumnWidths={[1, 1, 1, 1]}
      mobileColumnWidths={[1, 1, 0, 1]}
      entries={
        entries.map(record => [
          record.description,
          rootStore.userProfiles[record.claimer_addr]?.userName || record.recipient_email || MiddleEllipsis(record.claimer_addr, 14),
          Ago(record.created),
          <>
            <div className="gifts-table__status" style={{marginRight: "10px"}}>{ rootStore.l10n.tables[record.status === "claimed" ? "claimed" : "sent"] }</div>
            {
              record.status === "claimed" ? null :
                <ButtonWithLoader className="action--compact" onClick={async () => await checkoutStore.SendGiftReminder({giftId: record.id})}>
                  { rootStore.l10n.tables.remind }
                </ButtonWithLoader>
            }
          </>,
          record.source === "publisher" ? "Publisher" : record.source
        ])
      }
    />
  );
});

export const UserListingTable = observer(({icon, header, userAddress, className="", ...props}) => {
  const [listings, setListings] = useState(undefined);

  useEffect(() => {
    Promise.all([
      rootStore.walletClient.Listings({
        sellerAddress: userAddress,
        limit: 10000
      }),
      rootStore.walletClient.MarketplaceOffers({
        sellerAddress: userAddress,
        statuses: ["ACTIVE"]
      })
    ])
      .then(([listings, offers]) => {
        listings = listings?.results || [];

        listings = listings.map(listing => {
          const tokenOffers = (offers || [])
            .filter(offer =>
              rootStore.client.utils.EqualAddress(offer.contract, listing.details.ContractAddr) &&
              offer.token === listing.details.TokenIdStr
            )
            .sort((a, b) => a.price >= b.price ? -1 : 1);

          return {
            ...listing,
            offers: tokenOffers
          };
        });

        setListings(listings);
      });
  }, [userAddress]);

  // TODO: finish offerings
  return (
    <Table
      {...props}
      className={`user-listings-table ${className}`}
      loading={!listings}
      pagingMode="none"
      headerIcon={icon}
      headerText={header}
      columnWidths={[2, 1, 1, 1, 1, 1]}
      tabletColumnWidths={[1, 0, 1, 1, 0, 1]}
      columnHeaders={[
        rootStore.l10n.tables.columns.name,
        rootStore.l10n.tables.columns.token_id,
        rootStore.l10n.tables.columns.list_price,
        rootStore.l10n.tables.columns.time,
        rootStore.l10n.tables.columns.top_offers,
        " "
      ]}
      entries={
        listings?.map(listing => [
          <div key={`card-${listing?.details?.ListingId}`} className="user-listings-table__details">
            <div className="user-listings-table__card-container">
              <NFTCard
                imageWidth={400}
                nft={listing}
                selectedListing={listing}
                truncateDescription
                price={listing.details.Price}
                badges={[
                  Utils.EqualAddress(rootStore.CurrentAddress(), listing.details.SellerAddress) ?
                    <ImageIcon key="badge-owned" icon={ListingIcon} title="This is your listing" alt="Listing Icon" className="item-card__badge"/> : null,
                  listing.details.USDCOnly ?
                    <ImageIcon key="badge-usdc" icon={LinkedIcon} title="This listing may only be purchased with a linked wallet" alt="Linked Wallet Icon" className="item-card__badge"/> : null
                ].filter(badge => badge)}
                className="user-listings-table__card"
              />
            </div>
            <div className="user-listings-table__text">
              <div className="user-listings-table__title">
                { listing?.metadata?.display_name || listing.name }
              </div>
              {
                !listing?.metadata?.edition_name ? null :
                  <div className="user-listings-table__subtitle">
                    { listing?.metadata?.display_name || listing.name }
                  </div>
              }
            </div>
          </div>,
          listing.tokenId,
          FormatPriceString(listing?.details?.Price, {vertical: true}),
          Ago(listing?.details?.CreatedAt),
          <div key={`price-${listing?.details?.ListingId}`} className="user-listings-table__offers">
            {
              listing?.offers?.map(offer =>
                <div key={`offer-${offer.id}`} className="user-listings-table__offer">
                  <div>
                    {Ago(offer.updated)}
                  </div>
                  <div>
                    {FormatPriceString(offer.price, {vertical: true})}
                  </div>
                </div>
              )
            }
          </div>,
          <div key={`actions-${listing?.details?.ListingId}`} className="user-listings-table__actions">
            <Button
              to={UrlJoin(location.pathname, listing.details.ContractId, listing.details.TokenIdStr) + `?listingId=${listing.details.ListingId}`}
              variant="outline"
              className="user-listings-table__action"
            >
              { rootStore.l10n.tables.view_listing }
            </Button>
          </div>
        ])
      }
    />
  );
});
