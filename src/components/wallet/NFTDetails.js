import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, transferStore} from "Stores/index";
import Path from "path";
import UrlJoin from "url-join";

import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {ExpandableSection, CopyableField, ButtonWithLoader, FormatPriceString} from "Components/common/UIComponents";

import DescriptionIcon from "Assets/icons/Description icon.svg";
import DetailsIcon from "Assets/icons/Details icon.svg";
import ContractIcon from "Assets/icons/Contract icon.svg";
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

const TransferSection = observer(({nft}) => {
  const heldDate = nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) && nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const notMetamask = !rootStore.MetamaskAvailable() && window.ethereum;
  const notMetaMaskMessage = "Other browser extensions like Coinbase may be preventing the wallet from accessing MetaMask. Please disable them and refresh the page.";

  const heldMessage = heldDate ?
    <h3 className="details-page__transfer-details details-page__held-message">
      Note: This NFT in a holding period until { heldDate } for payment settlement. You will not be able to transfer it until then.
    </h3> : null;

  if(rootStore.embedded) {
    if(!rootStore.MetamaskAvailable()) {
      return (
        <div className="expandable-section__actions">
          { heldMessage }

          <h3 className="details-page__transfer-details">
            You can transfer your NFT to another network using MetaMask. Please install MetaMask to transfer your NFT.
          </h3>
          { notMetamask ? <h3 className="details-page__transfer-details">{ notMetaMaskMessage }</h3> : "" }
        </div>
      );
    }

    const url = new URL(window.location.href);
    if(rootStore.darkMode) {
      url.searchParams.append("d", "");
    }

    if(rootStore.marketplaceHash) {
      url.searchParams.append("mid", rootStore.marketplaceHash);
    }

    return (
      <div className="expandable-section__actions">
        { heldMessage }

        <h3 className="details-page__transfer-details">
          You can transfer your NFT to another network using MetaMask. Click the link below to open the full wallet experience and transfer your NFT.
        </h3>
        { notMetamask ? <h3 className="details-page__transfer-details">{ notMetaMaskMessage }</h3> : "" }

        <div className="details-page__transfer-buttons">
          <a href={url.toString()} target="_blank" className="button details-page__transfer-button details-page__transfer-link">
            Open Full Wallet to Transfer
          </a>
        </div>
      </div>
    );
  }

  const [transferError, setTransferError] = useState(undefined);
  const transferInfo = rootStore.transferredNFTs[`${nft.details.ContractAddr}:${nft.details.TokenIdStr}`];

  if(transferInfo) {
    return (
      <div className="expandable-section__actions">
        <div className="details-page__transfer-details details-page__transfer-success">
          <h3>
            Transfer request to { transferInfo.network.name } succeeded
          </h3>

          <a className="button details-page__transfer-details__opensea-button" target="_blank" href={transferInfo.openSeaLink} rel="noopener">Find it on OpenSea</a>

          <h3 className="details-page__transfer-details__hash">
            Hash: { transferInfo.hash }
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="expandable-section__actions">
      {
        transferError ?
          <h3 className="details-page__transfer-details details-page__transfer-error">
            { transferError }
          </h3> : null
      }

      { heldMessage }

      <h3 className="details-page__transfer-details">
        {
          rootStore.MetamaskAvailable() ?
            "You can transfer your NFT to another network using MetaMask. Select the network you wish to transfer to in MetaMask to enable the transfer option." :
            "Install MetaMask to transfer your NFT"
        }
      </h3>

      { notMetamask ? <h3 className="details-page__transfer-details">{ notMetaMaskMessage }</h3> : "" }

      <div className="details-page__transfer-buttons">
        {
          rootStore.ExternalChains()
            .sort((a, b) => {
              if(a.chainId === rootStore.metamaskChainId) {
                return -1;
              } else if(b.chainId === rootStore.metamaskChainId) {
                return 1;
              }

              return a.name < b.name ? -1 : 1;
            })
            .map(({name, network, chainId}) => (
              <button
                key={`transfer-button-${network}`}
                disabled={heldMessage ||!rootStore.MetamaskAvailable() || rootStore.metamaskChainId !== chainId}
                className="action details-page__transfer-button"
                onClick={async () => await Confirm({
                  message: `Are you sure you want to transfer this NFT to ${name}?`,
                  Confirm: async () => {
                    try {
                      await rootStore.TransferNFT({network, nft});
                    } catch(error) {
                      rootStore.Log(error, true);
                      setTransferError("Failed to transfer NFT");
                    }
                  }
                })}
              >
                Transfer NFT To { name }
              </button>
            ))
        }
      </div>
    </div>
  );
});

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

  let nft = rootStore.NFT({contractId: match.params.contractId, tokenId: match.params.tokenId});
  const isOwned = !!nft || (listing && Utils.EqualAddress(listing.details.SellerAddress, rootStore.userAddress));
  const heldDate = nft && nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) && nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

  const LoadListing = async ({listingId, setLoading=false}) => {
    try {
      if(setLoading) { setLoadingListing(true); }

      const status = await transferStore.CurrentNFTStatus({
        listingId,
        nft,
        contractId: match.params.contractId,
        tokenId: match.params.tokenId
      });

      if("sale" in status) {
        setSale(status.sale);
      } else if("listing" in status) {
        setListing(status.listing);
        setListingId(listing ? listing.details.ListingId : undefined);

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

    LoadListing({listingId, setLoading: true});

    listingStatusInterval = setInterval(() => setStatusCheckKey(UUID()), 60000);

    return () => clearInterval(listingStatusInterval);
  }, []);


  useEffect(() => {
    LoadListing({listingId});
  }, [statusCheckKey]);

  if(deleted) {
    return match.params.marketplaceId ?
      <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId, "collections")}/> :
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
                  UrlJoin("/marketplaces", match.params.marketplaceId, "collections") :
                  UrlJoin("/wallet", "collection")
              }
            >
              Back to My Collection
            </Link>
            <Link
              className="button action"
              to={
                match.params.marketplaceId ?
                  UrlJoin("/marketplaces", match.params.marketplaceId, "my-listings") :
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

  if(!nft && !listing) {
    return <PageLoader />;
  }

  // If NFT is not owned, use the listing
  if(!nft) {
    nft = listing;
  }

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
      <div className="details-page">
        <div className="details-page__content-container">
          <NFTCard nft={nft} selectedListing={listing} showVideo showOrdinal />
        </div>
        <div className="details-page__info">
          <NFTActions />
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
                        await rootStore.LoadWalletCollection(true);
                      }
                    }}
                  >
                    Delete this NFT
                  </ButtonWithLoader> : null
              }
            </div>
            { isOwned && !listing ? <TransferSection nft={nft}/> : null }
          </ExpandableSection>
        </div>
      </div>
      <div className="details-page__transfer-tables">
        <ListingStats mode="sales-stats" filterParams={{contractAddress: nft.details.ContractAddr}} />
        <TransferTable
          header="Transaction History for this NFT"
          contractAddress={nft.details.ContractAddr}
          tokenId={nft.details.TokenIdStr}
        />
        {
          /*
            <TransferTable
              header={<div>Recent Transactions for <b>{ nft.metadata.display_name }</b> NFTs</div>}
              contractAddress={nft.details.ContractAddr}
              limit={10}
            />

         */
        }
      </div>
    </>
  );
});

export default NFTDetails;
