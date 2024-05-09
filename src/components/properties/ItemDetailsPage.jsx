import ItemDetailStyles from "Assets/stylesheets/media_properties/item-details-modal.module.scss";

import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import {NFTInfo} from "../../utils/Utils";
import {Button, Description, PageContainer} from "Components/properties/Common";
import {NFTImage} from "Components/common/Images";
import {CopyableField, LocalizeString} from "Components/common/UIComponents";

const S = (...classes) => classes.map(c => ItemDetailStyles[c] || "").join(" ");

const ContractPage = observer(({nftInfo}) => {
  return (
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
  );
});

const MintPage = observer(({nftInfo, contractStats}) => {
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
                  rootStore.userProfiles.me?.imageUrl === nft.metadata.image ? null :
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

const DetailsPage = observer(({item, info}) => {
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
      </div>
    </div>
  );
});

const ItemDetailsPage = observer(() => {
  const match = useRouteMatch();
  const [page, setPage] = useState("description");
  const [contractStats, setContractStats] = useState(undefined);

  if(!match.params.contractId) { return; }

  useEffect(() => {
    rootStore.walletClient.NFTContractStats({
      contractAddress: rootStore.client.utils.HashToAddress(match.params.contractId)
    })
      .then(stats => setContractStats(stats));
  }, []);

  const {nft} = rootStore.NFTData({
    contractId: match.params.contractId,
    tokenId: match.params.tokenId
  });

  if(!nft) {
    return;
  }

  const nftInfo = NFTInfo({nft, showToken: true});

  return (
    <PageContainer className={S("item-details-page")}>
      <div className={S("item-details")}>
        <div className={S("image-container")}>
          <NFTImage nft={nft} showVideo={true} className="image" />
        </div>
        <div className={S("details-container")}>
          <div className={S("pages")}>
            {
              ["description", "mint_info", "contract"].map(option =>
                <button key={`page-${option}`} onClick={() => setPage(option)} className={S("page-button", page === option ? "page-button--active" : "")}>
                  { rootStore.l10n.media_properties.item_details.pages[option] }
                </button>
              )
            }
          </div>
          {
            page === "description" ?
              <DetailsPage item={nft} info={nftInfo} /> :
              page === "mint_info" ?
                <MintPage nftInfo={nftInfo} contractStats={contractStats} /> :
                <ContractPage nftInfo={nftInfo} />
          }
        </div>
      </div>
    </PageContainer>
  );
});

export default ItemDetailsPage;
