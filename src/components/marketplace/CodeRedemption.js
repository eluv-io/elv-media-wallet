import React, {useEffect} from "react";
import {observer} from "mobx-react";
import {useState} from "react";
import {ButtonWithLoader, LocalizeString, RichText} from "Components/common/UIComponents";
import {useRouteMatch} from "react-router";
import {rootStore} from "Stores";
import {PageLoader} from "Components/common/Loaders";
import {Redirect} from "react-router-dom";
import {SearchParams} from "../../utils/Utils";
import UrlJoin from "url-join";

const initialCode = (SearchParams().code);

const CodeRedemption = observer(() => {
  const match = useRouteMatch();

  const previouslyRedeemed = rootStore.GetLocalStorage(`${match.params.offerId}-code`);

  const [offer, setOffer] = useState(undefined);
  const [code, setCode] = useState(initialCode || "");
  const [error, setError] = useState(undefined);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(previouslyRedeemed);

  const marketplace = rootStore.allMarketplaces.find(marketplace => marketplace.marketplaceId === match.params.marketplaceId);

  const RedeemOffer = async () => {
    try {
      setError(undefined);
      setRedeeming(true);

      await rootStore.RedeemCode({
        tenantId: offer.tenant_id || marketplace?.tenant_id,
        ntpId: offer.ntp_id,
        code
      });

      rootStore.SetLocalStorage(`${match.params.offerId}-code`, code);
      setRedeemed(true);
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error(error);

      try {
        if(error.body && error.body.includes("not yet valid")) {
          const releaseDate = new Date(parseInt(error.body.match(/.+VAT: (\d+)/)[1]));
          setError(
            LocalizeString(
              rootStore.l10n.codes.errors.not_yet_valid,
              { date: releaseDate.toLocaleDateString(rootStore.preferredLocale, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric"}) }
            )
          );
          return;
        }
      // eslint-disable-next-line no-empty
      } catch(error) {}

      setError(rootStore.l10n.codes.errors.failed);
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    if(!marketplace) { return; }

    rootStore.LoadEventOffer({
      tenantSlug: marketplace.tenantSlug || marketplace.tenant_slug,
      eventSlug: match.params.eventSlug,
      offerId: match.params.offerId
    }).then(offer => setOffer(offer));
  }, [marketplace]);

  // Automatically redeem if code specified
  useEffect(() => {
    if(code && offer) {
      RedeemOffer();
    }
  }, [offer]);

  if(!offer) {
    return <PageLoader />;
  } else if(redeemed) {
    return <Redirect to={UrlJoin("/marketplace", offer?.marketplace || match.params.marketplaceId, "store", offer.sku || "")} />;
  }

  return (
    <div className="code-redemption">
      <div className="code-redemption__text-container">
        <h2 className="code-redemption__title page-header">{ offer?.title || rootStore.l10n.codes.redeem_offer }</h2>
        { offer.description ? <RichText richText={offer.description} className="markdown-document code-redemption__description" /> : null }
      </div>

      <div className="code-redemption__input-container">
        <input
          className="code-redemption__input"
          placeholder={rootStore.l10n.codes.redemption_code}
          value={code}
          onChange={event => {
            setError(undefined);
            setCode(event.target.value);
          }}
          onKeyDown={event => {
            if(event.key === "Enter") {
              RedeemOffer();
            }
          }}
        />

        <ButtonWithLoader
          disabled={!code}
          isLoading={redeeming}
          onClick={RedeemOffer}
          title={rootStore.l10n.codes.redeem_offer}
          className="action action-primary code-redemption__button"
        >
          { rootStore.l10n.codes.redeem_offer }
        </ButtonWithLoader>

        { error ? <div className="error-message code-redemption__error"> {error} </div> : null }
      </div>
    </div>
  );
});

export default CodeRedemption;
