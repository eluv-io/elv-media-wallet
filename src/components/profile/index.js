import React from "react";
import {rootStore} from "Stores/index";

const Profile = () => {
  return (
    <div className="page-container profile-page">
      <div className="profile-page__section profile-page__section-account">
        <h2>Account Info</h2>
        <div className="labelled-field">
          <label>Address</label>
          <div className="address">{ rootStore.client.CurrentAccountAddress() }</div>
        </div>
      </div>

      <button onClick={() => rootStore.SignOut()} className="profile-page__sign-out-button">
        Sign Out
      </button>
    </div>
  );
};

export default Profile;
