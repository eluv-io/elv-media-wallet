import React from "react";

const LoaderComponent = () => {
  return (
    <div className="lds-default">
      {
        [...new Array(12)].map((_, i) =>
          <div className="lds-default__element" key={`loader-${i}`}/>
        )
      }
    </div>
  );
};

export const PageLoader = () => {
  return (
    <div className="loader page-loader page-container">
      <div className="main-content-container loader-component">
        <LoaderComponent />
      </div>
    </div>
  );
};


export const Loader = ({className=""}) => {
  return (
    <div className={`loader ${className}`}>
      <div className="loader-component">
        <LoaderComponent />
      </div>
    </div>
  );
};

