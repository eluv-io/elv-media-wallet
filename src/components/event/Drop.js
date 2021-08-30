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

const DropCard = ({drop, marketplace, label, sku, index, image, selected=false, Select}) => {
  const itemIndex = marketplace.items.findIndex(item => item.sku === sku);

  if(itemIndex < 0) { return null; }

  const item = marketplace.items[itemIndex];

  return (
    <div className={`card-container card-shadow card-container-selectable ${selected ? "card-container-selected" : ""}`} onClick={Select}>
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
          <h2 className="card__title">
            <div className="card__title__title">
              { label || item.name }
            </div>
          </h2>
          <h2 className="card__subtitle">
            { item.description }
          </h2>
        </div>
      </div>
    </div>
  );
};

const Drop = () => {
  const match = useRouteMatch();

  const [selection, setSelection] = useState(undefined);
  const [ended, setEnded] = useState(false);

  if(ended) {
    return <Redirect to={UrlJoin(match.url, "status")} />;
  }

  return (
    <AsyncComponent
      Load={async () => {
        const marketplace = await rootStore.LoadMarketplace(match.params.marketplaceId);
        const drop = marketplace.drops.find(drop => drop.uuid === match.params.dropId);

        try {
          setSelection(await rootStore.RetrieveDropVote({eventId: drop.eventId, dropId: drop.uuid}));
        } catch(error) {
          rootStore.Log("Failed to retrieve drop vote", true);
          rootStore.Log(error, true);
        }
      }}
      loadingClassName="page-loader"
      render={() => {
        const marketplace = rootStore.marketplaces[match.params.marketplaceId];
        const drop = marketplace.drops.find(drop => drop.uuid === match.params.dropId);

        if(!marketplace || !drop) { return null; }

        return (
          <div className="drop content">
            <h1 className="page-header">{ drop.drop_header }</h1>
            { drop.drop_subheader ? <h2 className="page-subheader">{ drop.drop_subheader }</h2> : null }
            <div className="card-list">
              {
                drop.nfts.map(({label, image, sku}, index) =>
                  <DropCard
                    key={`drop-card-${index}`}
                    drop={drop}
                    marketplace={marketplace}
                    label={label}
                    sku={sku}
                    image={image}
                    index={index}
                    selected={selection === sku}
                    Select={() => {
                      setSelection(sku);

                      rootStore.SubmitDropVote({eventId: drop.eventId, dropId: drop.uuid, sku});
                    }}
                  />
                )
              }
            </div>
            <Countdown
              time={drop.end_date}
              showSeconds
              OnEnded={() => {
                setEnded(true);
                rootStore.SetMarketplaceFilters(drop.store_filters || []);
              }}
            />
          </div>
        );
      }}
    />
  );
};

export default Drop;
