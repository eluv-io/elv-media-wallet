import React, {useEffect} from "react";
import {rootStore} from "Stores";
import {useAuth0} from "@auth0/auth0-react";
import {
  useRouteMatch
} from "react-router-dom";
import {CopyableField} from "Components/common/UIComponents";

const Profile = () => {
  const match = useRouteMatch();

  let auth0;
  if(!rootStore.embedded) {
    auth0 = useAuth0();
  }

  useEffect(() => {
    rootStore.SetNavigationBreadcrumbs([{name: "Profile", path: "/profile" }]);
    rootStore.GetUSDCBalance();
  }, [match.url]);

  return (
    <div className="page-container profile-page">
      <div className="profile-page__section profile-page__section-account">
        <h2 className="profile-page__section-header">
          Wallet Address
        </h2>
        <div className="profile-page__address">
          <CopyableField className="profile-page__address-field" value={rootStore.userAddress} ellipsis={false}>
            { rootStore.userAddress }
          </CopyableField>
        </div>
      </div>

      <div className="profile-page__section profile-page__section-balance">
        <h2 className="profile-page__section-header">
          Wallet Balance
        </h2>
        <div className="profile-page__balance">
          ${ rootStore.usdcBalance || 0 } USD
        </div>
      </div>

      <div className="profile-page__section profile-page__section-actions">
        <div className="profile-page__actions">
          <button
            onClick={() => rootStore.SignOut(auth0)}
            className="action"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="profile-page__section profile-page__section-message">
        <div className="profile-page__message">
          Funds availability notice – A hold period will be imposed on amounts that accrue from the sale of an NFT. Account holders acknowledge that, during this hold period, a seller will be unable to use or withdraw the amounts attributable to such sale(s).  The current hold period for spending the balance is 7 days, and withdrawing the balance is 30 days.
        </div>
      </div>
    </div>
  );
};

export default Profile;
