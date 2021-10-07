import React, {useState} from "react";
import {rootStore} from "Stores/index";
import AsyncComponent from "Components/common/AsyncComponent";
import {
  Redirect,
  useRouteMatch
} from "react-router-dom";
import UrlJoin from "url-join";
import {MarketplaceImage} from "Components/common/Images";
import Countdown from "Components/common/Countdown";

const DropCard = ({drop, marketplace, label, sku, index, image, selected=false, pendingSelection=false, Select}) => {
  const itemIndex = marketplace.items.findIndex(item => item.sku === sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];

  return (
    <div className={`card-container card-shadow card-container-selectable ${pendingSelection ? "card-container-pending-selection" : ""} ${selected ? "card-container-selected" : ""}`} onClick={Select}>
      <div className="card">
        <MarketplaceImage
          marketplaceHash={marketplace.versionHash}
          item={!image && item}
          path={
            image ?
              UrlJoin("public", "asset_metadata", "info", "events", drop.eventIndex.toString(), "event", "info", "drops", drop.dropIndex.toString(), "nfts", index.toString(), "image") :
              UrlJoin("public", "asset_metadata", "info", "items", itemIndex.toString(), "image")
          }
        />
        <div className="card__text">
          <div className="card__titles">
            <h2 className="card__title">
              { label || item.name }
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

const Drop = () => {
  const match = useRouteMatch();

  const [selection, setSelection] = useState(undefined);
  const [pendingSelection, setPendingSelection] = useState(undefined);
  const [votingEnded, setVotingEnded] = useState(false);
  const [mintingStarted, setMintingStarted] = useState(false);

  if(mintingStarted) {
    return <Redirect to={UrlJoin(match.url, "status")} />;
  }

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];
  const drop = marketplace.drops.find(drop => drop.uuid === match.params.dropId);

  if(!marketplace || !drop) { return null; }

  return (
    <AsyncComponent
      Load={async () => {
        try {
          const dropStatus = await rootStore.DropStatus({marketplace, eventId: drop.eventId, dropId: drop.uuid});
          setSelection(dropStatus.itm);
        } catch(error) {
          rootStore.Log("Failed to retrieve drop vote", true);
          rootStore.Log(error, true);
        }

        const postVoteState = drop.event_state_post_vote || {};
        const mintStartState = drop.event_state_mint_start || {};

        rootStore.SetMarketplaceFilters(drop.store_filters || []);

        try {
          setVotingEnded(new Date(postVoteState.start_date).getTime() < Date.now());
          setMintingStarted(new Date(mintStartState.start_date).getTime() < Date.now());
        } catch(error) {
          rootStore.Log("Failed to parse drop state date", true);
          rootStore.Log(error, true);
        }
      }}
      loadingClassName="page-loader"
      render={() => {
        if(!drop.votable) {
          return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId)} />;
        }

        const postVoteState = drop.event_state_post_vote || {};
        const mintStartState = drop.event_state_mint_start || {};

        return (
          <div className="drop">
            { drop.drop_header ? <h1 className="page-header">{ drop.drop_header }</h1> : null }
            <div className="card-list">
              {
                drop.nfts.map(({label, image, sku}, index) =>
                  votingEnded && (selection !== sku) ?
                    null :
                    <DropCard
                      key={`drop-card-${index}`}
                      drop={drop}
                      marketplace={marketplace}
                      label={label}
                      sku={sku}
                      image={image}
                      index={index}
                      selected={selection === sku}
                      pendingSelection={pendingSelection === sku}
                      Select={async () => {
                        if(selection === sku) { return; }

                        try {
                          setPendingSelection(sku);
                          await rootStore.SubmitDropVote({marketplace, eventId: drop.eventId, dropId: drop.uuid, sku});
                          setSelection(sku);
                        } catch(error) {
                          rootStore.Log("Failed to submit vote:", true);
                          rootStore.Log(error, true);
                        } finally {
                          setPendingSelection(undefined);
                        }
                      }}
                    />
                )
              }
            </div>
            <Countdown
              time={postVoteState.start_date}
              showSeconds
              OnEnded={() => {
                setVotingEnded(true);
              }}
            />
            <Countdown
              time={mintStartState.start_date}
              showSeconds
              OnEnded={() => {
                setMintingStarted(true);
              }}
            />
          </div>
        );
      }}
    />
  );
};

export default Drop;
