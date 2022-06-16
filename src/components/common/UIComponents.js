import React, {useEffect, useRef, useState} from "react";
import SVG from "react-inlinesvg";

import CopyIcon from "Assets/icons/copy.svg";
import {Loader} from "Components/common/Loaders";
import ImageIcon from "Components/common/ImageIcon";
import {v4 as UUID} from "uuid";

import SelectIcon from "Assets/icons/select-icon.svg";
import USDIcon from "Assets/icons/crypto/USD icon.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";

export const ExpandableSection = ({header, icon, children, expanded=false, toggleable=true, className="", contentClassName="", additionalContent}) => {
  const [ show, setShow ] = useState(expanded);

  return (
    <div className={`expandable-section ${show ? "expandable-section-shown" : "expandable-section-hidden"} ${className}`}>
      <button className="expandable-section__header ellipsis" onClick={() => toggleable && setShow(!show)} tabIndex={0}>
        { icon ? <ImageIcon className="expandable-section__header__icon" icon={icon} title={header} /> : null}
        { header }
      </button>
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

export const FormatPriceString = (
  priceList,
  options= {
    currency: "USD",
    quantity: 1,
    trimZeros: false,
    includeCurrency: false,
    useCurrencyIcon: false,
    includeUSDCIcon: false,
    prependCurrency: false
  }
) => {
  const currency = options?.currency || "USD";

  if(typeof priceList !== "object") {
    priceList = { USD: priceList };
  }

  let price = ItemPrice({price: priceList}, currency);

  if(typeof price !== "number" || isNaN(price)) { return; }

  price = price * (options.quantity || 1);

  const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
  let formattedPrice = new Intl.NumberFormat(currentLocale || "en-US", { style: "currency", currency: currency}).format(price);

  if(options.trimZeros && formattedPrice.endsWith(".00")) {
    formattedPrice = formattedPrice.slice(0, -3);
  }

  const usdcIcon = options.includeUSDCIcon ? <ImageIcon icon={USDCIcon} className="formatted-price__icon" /> : null;
  if(options?.includeCurrency) {
    if(options?.useCurrencyIcon) {
      formattedPrice = <div className="formatted-price__value">{ formattedPrice }</div>;
      const icon = <ImageIcon icon={USDIcon} className="formatted-price__icon" />;
      return (
        <div className="formatted-price">
          {
            options.prependCurrency ?
              <>{usdcIcon}{icon}{formattedPrice}</> :
              <>{formattedPrice}{usdcIcon}{icon}</>
          }
        </div>
      );
    } else {
      formattedPrice = (
        <div className="formatted-price__value">
          {
            options.prependCurrency ?
              `${currency} ${formattedPrice}` :
              `${formattedPrice} ${currency}`
          }
        </div>
      );

      return (
        <div className="formatted-price">
          {options?.includeUSDCIcon ? usdcIcon : null}{formattedPrice}
        </div>
      );
    }
  } else if(options.includeUSDCIcon) {
    formattedPrice = <div className="formatted-price__value">{ formattedPrice }</div>;

    return (
      <div className="formatted-price">
        {usdcIcon}{formattedPrice}
      </div>
    );
  } else {
    return formattedPrice;
  }
};

export const ButtonWithLoader = ({children, className="", onClick, ...props}) => {
  const [loading, setLoading] = useState(false);

  return (
    <button
      {...props}
      className={`action action-with-loader ${loading ? "action-with-loader--loading": ""} ${className}`}
      onClick={async event => {
        if(loading) { return; }

        try {
          setLoading(true);
          await onClick(event);
        } finally {
          setLoading(false);
        }
      }}
    >
      {
        loading ?
          <Loader loader="inline" className="action-with-loader__loader" /> :
          children
      }
    </button>
  );
};

let debounceTimeout;
export const DebouncedInput = ({...props}) => {
  const [inputValue, setInputValue] = useState(props.value);

  useEffect(() => {
    setInputValue(props.value);
  }, [props.value]);

  return (
    <input
      {...props}
      className={`debounced-input ${props.className || ""}`}
      value={inputValue}
      onKeyDown={event => {
        if(event.key === "Enter") {
          clearTimeout(debounceTimeout);
          props.onChange(inputValue);
        }
      }}
      onChange={event => {
        clearTimeout(debounceTimeout);

        let value = event.target.value;
        setInputValue(value);
        debounceTimeout = setTimeout(() => props.onChange(value), 1000);
      }}
    />
  );
};

export const Select = ({label, value, options, onChange, containerClassName="", buttonClassName="", menuClassName=""}) => {
  // If only labels are provided, convert to array format
  if(!Array.isArray(options[0])) {
    options = options.map(option => [option, option]);
  }

  const currentIndex = Math.max(options.findIndex(option => option[0] === value), 0);

  const [idPrefix] = useState(UUID());
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [filter, setFilter] = useState("");
  const [filterLastTyped, setFilterLastTyped] = useState(0);
  const [mouseIn, setMouseIn] = useState(false);

  const ref = useRef();

  useEffect(() => {
    const onClickOutside = event => {
      if(!ref.current || !ref.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, []);


  useEffect(() => {
    if(!showMenu || mouseIn) { return; }

    // Scroll to selected item for keyboard selection
    const selectedItem = document.getElementById(`styled-select-${idPrefix}-${selectedIndex}`);

    if(selectedItem ) {
      selectedItem.parentElement.scrollTop = selectedItem.offsetTop;
    }
  }, [selectedIndex, showMenu]);

  useEffect(() => {
    const optionIndex = options.findIndex(option => option[1].toLowerCase().startsWith(filter.toLowerCase()));

    if(optionIndex >= 0) {
      setSelectedIndex(optionIndex);
    }
  }, [filter]);

  const KeyboardControls = event => {
    if(!showMenu) { return; }

    event.preventDefault();

    switch(event.key) {
      case "Escape":
        setShowMenu(false);
        break;
      case "ArrowDown":
        setSelectedIndex(Math.min(selectedIndex + 1, options.length - 1));
        break;
      case "ArrowUp":
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
        break;
      case "Home":
        setSelectedIndex(0);
        break;
      case "End":
        setSelectedIndex(options.length - 1);
        break;
      case "Enter":
        onChange(options[selectedIndex][0]);
        setShowMenu(false);
        break;
      case "Backspace":
        setFilter(filter.slice(0, filter.length - 1));
        break;
      default:
        if(event.key.length === 1 || event.key === "Space") {
          if(Date.now() - filterLastTyped < 2000) {
            setFilter(filter + event.key);
          } else {
            setFilter(event.key);
          }

          setFilterLastTyped(Date.now());
        }

        return;
    }
  };

  let menu;
  if(showMenu) {
    menu = (
      <ul
        aria-expanded={true}
        role="listbox"
        aria-labelledby={`styled-select-${idPrefix}-button`}
        tabIndex="-1"
        className={`styled-select__menu ${menuClassName}`}
        onMouseEnter={() => setMouseIn(true)}
        onMouseLeave={() => setMouseIn(false)}
      >
        {
          options.map((option, index) =>
            <li
              onClick={() => onChange(option[0])}
              onMouseEnter={() => setSelectedIndex(index)}
              role="option"
              data-value={option[0]}
              aria-selected={value === option[0]}
              className={`styled-select__menu__option ${index === selectedIndex ? "styled-select__menu__option--selected" : ""}`}
              id={`styled-select-${idPrefix}-${index}`}
              key={`option-${index}`}
            >
              { option[1] }
            </li>
          )
        }
      </ul>
    );
  }

  return (
    <div className={`styled-select ${containerClassName}`}>
      <button
        id={`styled-select-${idPrefix}-button`}
        className={`styled-select__button ${showMenu ? "styled-select__button--active" : ""} ${buttonClassName}`}
        ref={ref}
        aria-haspopup="listbox"
        aria-label={label}
        aria-activedescendant={showMenu ? `styled-select-${idPrefix}-${selectedIndex}` : ""}
        onClick={() => {
          if(!showMenu) {
            setSelectedIndex(currentIndex);
          }

          setShowMenu(!showMenu);
        }}
        onKeyDown={KeyboardControls}
      >
        { options[currentIndex || 0][1] }
        <div className="styled-select__button__icon-container">
          <ImageIcon icon={SelectIcon} className="styled-select__button__icon" />
        </div>
      </button>
      { menu }
    </div>
  );
};
