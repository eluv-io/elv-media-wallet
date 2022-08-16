import React from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {rootStore} from "Stores";
import Listings from "Components/listings/Listings";

const UserListings = observer(() => {
  const match = useRouteMatch();
  const userProfile = rootStore.userProfiles[match.params.userId];

  return <Listings initialFilters={{sellerAddress: userProfile.userAddress, includeCheckoutLocked: true}} />;
});

export default UserListings;
