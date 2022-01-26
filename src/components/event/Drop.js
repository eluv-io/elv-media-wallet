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

const DropCard = ({marketplace, label, sku, image, selected=false, pendingSelection=false, Select}) => {
  const itemIndex = marketplace.items.findIndex(item => item.sku === sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];

  return (
    <div className={`card-container card-shadow card-container-selectable ${pendingSelection ? "card-container-pending-selection" : ""} ${selected ? "card-container-selected" : ""}`} onClick={Select}>
      <div className="card">
        <MarketplaceImage
          marketplaceHash={marketplace.versionHash}
          item={!image && item}
          url={(image && image.url) || (item && item.image && item.image.url)}
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

  const [drop, setDrop] = useState(undefined);
  const [selection, setSelection] = useState(rootStore.GetLocalStorage(`drop-vote-${match.params.dropId}`));
  const [pendingSelection, setPendingSelection] = useState(undefined);
  const [votingEnded, setVotingEnded] = useState(false);
  const [mintingStarted, setMintingStarted] = useState(false);

  const marketplace = rootStore.marketplaces[match.params.marketplaceId];

  return (
    <AsyncComponent
      loadingClassName="page-loader"
      Load={async () => {
        setDrop(
          await rootStore.LoadDrop({tenantSlug: match.params.tenantSlug, eventSlug: match.params.eventSlug, dropId: match.params.dropId})
        );
      }}
      render={() => {
        if(!marketplace || !drop) { return null; }

        if(!drop.votable || (votingEnded && !selection)) {
          // No voting, or voting has ended, but user hasn't voted - just redirect to the marketplace
          rootStore.SetMarketplaceFilters(drop.store_filters_no_vote || []);
          return <Redirect to={UrlJoin("/marketplaces", match.params.marketplaceId)} />;
        }

        if(drop.votable && mintingStarted) {
          return <Redirect to={UrlJoin(match.url, "status")} />;
        }

        return (
          <AsyncComponent
            loadingClassName="page-loader"
            Load={async () => {
              try {
                const dropStatus = await rootStore.DropStatus({marketplace, eventId: drop.eventId, dropId: drop.uuid});
                if(dropStatus && dropStatus.itm) {
                  rootStore.SetLocalStorage(`drop-vote-${match.params.dropId}`, dropStatus.itm);
                  setSelection(dropStatus.itm);
                }
              } catch(error) {
                rootStore.Log("Failed to retrieve drop vote", true);
                rootStore.Log(error, true);
              }

              const postVoteState = drop.event_state_post_vote || {};
              const mintStartState = drop.event_state_mint_start || {};

              rootStore.SetMarketplaceFilters(drop.store_filters || []);

              try {
                setVotingEnded(new Date(postVoteState.start_date).getTime()  < Date.now());
                setMintingStarted(new Date(mintStartState.start_date).getTime()  < Date.now());
              } catch(error) {
                rootStore.Log("Failed to parse drop state date", true);
                rootStore.Log(error, true);
              }
            }}
            render={() => {
              const postVoteState = drop.event_state_post_vote || {};
              const mintStartState = drop.event_state_mint_start || {};
              let header = drop.drop_header;

              try {
                const states = ["event_state_preroll", "event_state_main", "event_state_post_vote", "event_state_mint_start", "event_state_event_end"].map(state =>
                  (state === "event_state_main" || drop[state].use_state) ? {state, ...drop[state]} : null
                ).filter(state => state);

                const currentState = states.map((state, index) => Date.now() > new Date(state.start_date) ? index : null)
                  .filter(active => active)
                  .slice(-1)[0] ||
                  states.slice(-1)[0];

                header = currentState.header || header;
              } catch(error) {
                rootStore.Log("Failed to determine drop state", true);
                rootStore.Log(error, true);
              }

              return (
                <div className="drop">
                  { header ? <h1 className="page-header">{ drop.drop_header }</h1> : null }
                  <div className="card-list">
                    {
                      drop.nfts.map(({label, image, sku}, index) =>
                        votingEnded && (selection !== sku) ?
                          null :
                          <DropCard
                            key={`drop-card-${index}`}
                            marketplace={marketplace}
                            label={label}
                            sku={sku}
                            image={image}
                            selected={selection === sku}
                            pendingSelection={pendingSelection === sku}
                            Select={async () => {
                              if(selection === sku) { return; }

                              try {
                                setPendingSelection(sku);
                                await rootStore.SubmitDropVote({marketplace, eventId: drop.eventId, dropId: drop.uuid, sku});
                                rootStore.SetLocalStorage(`drop-vote-${match.params.dropId}`, sku);
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
      }}
    />
  );
};

export default Drop;
