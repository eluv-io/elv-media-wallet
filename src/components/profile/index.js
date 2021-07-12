import React from "react";
import {rootStore} from "Stores/index";

const Profile = () => {
  return (
    <div className="page-container profile-page">
      <button onClick={() => rootStore.SignOut()} className="profile-page__sign-out-button">
        Sign Out
      </button>
    </div>
  );
};

export default Profile;
