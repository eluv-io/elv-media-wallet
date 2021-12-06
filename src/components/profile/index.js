import React, {useEffect} from "react";
import {rootStore} from "Stores/index";
import {useAuth0} from "@auth0/auth0-react";
import {
  useRouteMatch
} from "react-router-dom";
import ImageIcon from "Components/common/ImageIcon";
import USDCIcon from "Assets/icons/usd-coin-usdc-logo";
import {CopyableField} from "Components/common/UIComponents";

const Profile = () => {
  const match = useRouteMatch();

  let auth0;
  if(!rootStore.embedded) {
    auth0 = useAuth0();
  }

  useEffect(() => {
    rootStore.SetNavigationBreadcrumbs([{name: "Profile", path: "/profile" }]);
  }, [match.url]);

  return (
    <div className="page-container profile-page">
      <div className="profile-page__section profile-page__section-account">
        <h2 className="profile-page__section-header">
          Wallet Balance
        </h2>
        <div className="profile-page__balance">
          <ImageIcon icon={USDCIcon} title="Balance in USDC" />
          ${ rootStore.usdcBalance || 0 } USDC
        </div>
      </div>

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

      <div className="profile-page__section">
        <div className="profile-page__actions">
          <button
            onClick={() => rootStore.SignOut(auth0)}
            className="action"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
