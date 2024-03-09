import React from "react";

const LoaderComponentDefault2 = () => {
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

export const LoaderComponentDefault = ({className=""}) => (
  <div className={`spinner ${className}`}>
    <div className="spinner-inner" />
  </div>
);


const InlineLoaderComponent = () => {
  return (
    <div className="lds-ellipsis">
      {
        [...new Array(4)].map((_, i) =>
          <div className="lds-ellipsis__element" key={`loader-${i}`}/>
        )
      }
    </div>
  );
};

const LoaderComponent = ({loader}) => {
  switch(loader) {
    case "inline":
      return <InlineLoaderComponent />;
    default:
      return <LoaderComponentDefault />;
  }
};



export const PageLoader = ({loader="default"}) => {
  return (
    <div className="loader page-loader page-container">
      <div className="main-content-container loader-component">
        <LoaderComponent loader={loader} />
      </div>
    </div>
  );
};


export const Loader = ({loader="default", className=""}) => {
  return (
    <div className={`loader ${className}`}>
      <div className="loader-component">
        <LoaderComponent loader={loader} />
      </div>
    </div>
  );
};

