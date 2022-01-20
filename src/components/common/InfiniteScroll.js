import React, {useEffect} from "react";

const InfiniteScroll = ({children, Load}) => {
  console.log(children.ref);

  return children;
};

export default InfiniteScroll;
