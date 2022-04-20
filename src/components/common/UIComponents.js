import React, {useEffect, useState} from "react";
import SVG from "react-inlinesvg";

import CopyIcon from "Assets/icons/copy.svg";
import {Loader} from "Components/common/Loaders";
import ImageIcon from "Components/common/ImageIcon";

export const ExpandableSection = ({header, icon, children, expanded=false, toggleable=true, className="", contentClassName="", additionalContent}) => {
  const [ show, setShow ] = useState(expanded);

  return (
    <div className={`expandable-section card-shadow ${show ? "expandable-section-shown" : "expandable-section-hidden"} ${className}`}>
      <div className="expandable-section__header ellipsis" onClick={() => toggleable && setShow(!show)}>
        { icon ? <ImageIcon className="expandable-section__header__icon" icon={icon} title={header} /> : null}
        { header }
      </div>
      { show ? <div className={`expandable-section__content ${contentClassName}`}>{ children }</div> : null }
      { additionalContent || null }
    </div>
  );
};

export const CopyableField = ({value, children, className="", ellipsis=true}) => {
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
      <div className={`copyable-field__content ${ellipsis ? "ellipsis" : ""}`}>
        { children }
      </div>
      <button className="copyable-field__button" title="Copy to Clipboard">
        <SVG src={CopyIcon} alt="Copy" />
      </button>
    </div>
  );
};

export const ItemPrice = (item, currency) => {
  currency = Object.keys(item.price || {}).find(c => c.toLowerCase() === currency.toLowerCase());

  if(!currency) {
    return "";
  }

  return parseFloat(item.price[currency]);
};

export const FormatPriceString = (priceList, options={currency: "USD", quantity: 1, trimZeros: false}) => {
  let price = ItemPrice({price: priceList}, options.currency || "USD");

  if(typeof price !== "number" || isNaN(price)) { return; }

  price = price * (options.quantity || 1);

  const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
  let formattedPrice = new Intl.NumberFormat(currentLocale || "en-US", { style: "currency", currency: options.currency || "USD"}).format(price);

  if(options.trimZeros && formattedPrice.endsWith(".00")) {
    formattedPrice = formattedPrice.slice(0, -3);
  }

  return formattedPrice;
};

export const ButtonWithLoader = ({children, className="", onClick, disabled}) => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="button-container loader-button">
      {
        loading ?
          <Loader
            className={[
              "loader-button__loader",
              className.includes("action") ? "action-loader" : "",
              className.includes("action-primary") ? "action-loader-primary" : "",
              className.includes("action-primary") ? "action-loader-primary" : "",
              className.includes("action-danger") ? "action-loader-danger" : "",
            ].filter(className => className).join(" ")}
          /> :
          <button
            disabled={disabled}
            className={`button action loader-button__button ${className}`}
            onClick={async event => {
              try {
                setLoading(true);
                await onClick(event);
              } finally {
                setLoading(false);
              }
            }}
          >
            { children }
          </button>
      }
    </div>
  );
};

let debounceTimeout;
export const DebouncedInput = (props) => {
  const [inputValue, setInputValue] = useState(props.value);

  useEffect(() => {
    setInputValue(props.value);
  }, [props.value]);

  return (
    <input
      {...props}
      className={`debounced-input ${props.className || ""}`}
      value={inputValue}
      onChange={event => {
        clearTimeout(debounceTimeout);

        let value = event.target.value;
        setInputValue(value);
        debounceTimeout = setTimeout(() => props.onChange(value), 1000);
      }}
    />
  );
};
