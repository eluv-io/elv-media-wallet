import React, {useState} from "react";
import SVG from "react-inlinesvg";

import CopyIcon from "Assets/icons/copy.svg";

export const ExpandableSection = ({header, children, className=""}) => {
  const [ show, setShow ] = useState(false);

  return (
    <div className={`expandable-section card-shadow ${show ? "expandable-section-shown" : "expandable-section-hidden"} ${className}`}>
      <div className="expandable-section__header ellipsis" onClick={() => setShow(!show)}>
        { header }
      </div>
      { show ? <div className="expandable-section__content ellipsis">{ children }</div> : null }
    </div>
  );
};

export const CopyableField = ({value, children, className=""}) => {
  const Copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch(error) {
      const input = document.createElement("input");

      input.value = value;
      input.select();
      input.setSelectionRange(0, 99999);
      document.execCommand("copy");
    }
  };

  return (
    <div className={`copyable-field ${className}`} onClick={Copy}>
      <div className="copyable-field__content ellipsis">
        { children }
      </div>
      <button className="copyable-field__button" title="Copy to Clipboard">
        <SVG src={CopyIcon} alt="Copy" />
      </button>
    </div>
  );
};
