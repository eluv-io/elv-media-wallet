import React from "react";
import {rootStore} from "@/stores";
import {observer} from "mobx-react";

export const Loader = observer(({className=""}) => {
  return (
    <div className={["loader", className].join(" ")} />
  );
});

export const PageLoader = observer(({containerClassName="", force=false, className=""}) => {
  if(rootStore.showSplash && !force) { return null; }

  return (
    <div className={["page-loader", containerClassName].join(" ")}>
      <Loader className={className} />
    </div>
  );
});
