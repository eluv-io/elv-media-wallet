import React, {useEffect, useRef, useState} from "react";
import SVG from "react-inlinesvg";
import {observer} from "mobx-react";
import {checkoutStore, rootStore} from "Stores";
import {Loader} from "Components/common/Loaders";
import ImageIcon from "Components/common/ImageIcon";
import {v4 as UUID} from "uuid";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import QRCode from "qrcode";
import {Link, NavLink} from "react-router-dom";
import Modal from "Components/common/Modal";
import Money from "js-money";
import Currencies from "js-money/lib/currency";

import SelectIcon from "Assets/icons/select-icon.svg";
import USDIcon from "Assets/icons/crypto/USD icon.svg";
import USDCIcon from "Assets/icons/crypto/USDC-icon.svg";
import CopyIcon from "Assets/icons/copy.svg";
import PageBackIcon from "Assets/icons/pagination arrow back.svg";
import PageForwardIcon from "Assets/icons/pagination arrow forward.svg";

export const PageControls = observer(({paging, maxSpread=15, hideIfOnePage, SetPage, className=""}) => {
  if(!paging || paging.total === 0) { return null; }

  const perPage = paging.limit || 1;
  const currentPage = Math.floor(paging.start / perPage) + 1;
  const pages = Math.ceil(paging.total / perPage);

  let spread = maxSpread;
  if(rootStore.pageWidth < 600) {
    spread = Math.min(5, maxSpread);
  } else if(rootStore.pageWidth < 1200) {
    spread = Math.min(9, maxSpread);
  }

  let spreadStart = Math.max(1, currentPage - Math.floor(spread / 2));
  const spreadEnd = Math.min(pages + 1, spreadStart + spread);
  spreadStart = Math.max(1, spreadEnd - spread);

  if(hideIfOnePage && pages <= 1) {
    return null;
  }

  return (
    <div className={`page-controls ${className}`}>
      <button
        title="Previous Page"
        disabled={paging.start <= 0}
        onClick={() => SetPage(currentPage - 1)}
        className="page-controls__button page-controls__button--previous"
      >
        <ImageIcon icon={PageBackIcon} />
      </button>
      { spreadStart > 1 ? <div className="page-controls__ellipsis">...</div> : null }
      {
        [...new Array(Math.max(1, spreadEnd - spreadStart))].map((_, index) => {
          const page = spreadStart + index;
          return (
            <button
              key={`page-controls-${index}`}
              title={`Page ${page}`}
              disabled={page === currentPage}
              onClick={() => SetPage(page)}
              className={`page-controls__page ${page === currentPage ? "page-controls__page--current" : ""}`}
            >
              {page}
            </button>
          );
        })
      }
      { spreadEnd < pages ? <div className="page-controls__ellipsis">...</div> : null }
      <button
        title="Next Page"
        disabled={paging.total <= currentPage * perPage}
        onClick={() => SetPage(currentPage + 1)}
        className="page-controls__button page-controls__button--next"
      >
        <ImageIcon icon={PageForwardIcon} />
      </button>
    </div>
  );
});

export const ExpandableSection = ({header, icon, children, expanded=false, toggleable=true, onClick, className="", contentClassName="", additionalContent}) => {
  const [ show, setShow ] = useState(expanded);

  return (
    <div className={`expandable-section ${show ? "expandable-section-shown" : "expandable-section-hidden"} ${className}`}>
      <button
        className="expandable-section__header ellipsis"
        onClick={() => {
          toggleable && setShow(!show);

          if(onClick) {
            onClick();
          }
        }}
        tabIndex={0}
      >
        { icon ? <ImageIcon className="expandable-section__header__icon" icon={icon} title={header} /> : null}
        { header }
      </button>
      { show ? <div className={`expandable-section__content ${contentClassName}`}>{ children }</div> : null }
      { show && additionalContent || null }
    </div>
  );
};

export const PossibleButton = ({isButton, onClick, ...args}) => {
  if(isButton) {
    return <button onClick={onClick} {...args} />;
  }

  return <div {...args} />;
};

export const Linkish = ({to, href, useNavLink, ...args}) => {
  if(to) {
    if(useNavLink) {
      return  <NavLink to={to} {...args} />;
    } else {
      return  <Link to={to} {...args} />;
    }
  } else if(href) {
    return <a href={href} {...args} />;
  }

  return <div {...args} />;
};

export const Copy = async (value) => {
  try {
    value = (value || "").toString();

    await navigator.clipboard.writeText(value);
  } catch(error) {
    const input = document.createElement("input");

    input.value = value;
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand("copy");
  }
};

export const CopyableField = ({value, children, className="", ellipsis=true}) => {
  return (
    <div className={`copyable-field ${className}`} onClick={() => Copy(value)}>
      <div className={`copyable-field__content ${ellipsis ? "ellipsis" : ""}`}>
        { children }
      </div>
      <button className="copyable-field__button" title="Copy to Clipboard">
        <SVG src={CopyIcon} alt="Copy" />
      </button>
    </div>
  );
};

export const LocalizeString = (text, variables={}) => {
  return (
    <>
      {
        text
          .split(/{(\w+)}/)
          .filter(s => s)
          .map(token => variables[token] || token)
      }
    </>
  );
};

export const ParseMoney = (amount, currency) => {
  currency = currency.toUpperCase();

  if(typeof amount !== "object") {
    if(isNaN(parseFloat(amount))) {
      amount = new Money(0, currency);
    } else {
      amount = new Money(parseInt(parseFloat(amount) * (10 ** Currencies[currency]?.decimal_digits || 2)), currency);
    }
  }

  return amount;
};

export const ConvertCurrency = (amount, originalCurrency, targetCurrency) => {
  const rate = originalCurrency === "USD" ?
    checkoutStore.exchangeRates[targetCurrency].rate :
    1 / checkoutStore.exchangeRates[originalCurrency].rate;

  amount = ParseMoney(amount, originalCurrency);

  return Money.fromDecimal(amount.multiply(rate).toString(), targetCurrency, "ceil");
};

export const ToUSD = (amount) => {
  return ConvertCurrency(amount, checkoutStore.currency, "USD");
};

export const FromUSD = (amount) => {
  return ConvertCurrency(amount, "USD", checkoutStore.currency);
};

window.ParseMoney = ParseMoney;

export const FormatPriceString = (
  price,
  options= {
    quantity: 1,
    trimZeros: false,
    includeCurrency: false,
    useCurrencyIcon: false,
    includeUSDCIcon: false,
    prependCurrency: false,
    excludeAlternateCurrency: false,
    stringOnly: false,
    noConversion: false,
    className: ""
  }
) => {
  if((typeof price !== "number" || isNaN(price)) && (typeof price?.amount === "undefined")) { return; }

  let currency = checkoutStore.currency || "USD";
  if(checkoutStore.currency === "USD" || options.excludeAlternateCurrency) {
    // Work in USD exclusively
    price = ParseMoney(price, "USD");
    currency = "USD";
  } else if(options.noConversion) {
    // Work in alternate currency exclusively
    price = ParseMoney(price, checkoutStore.currency);
  } else {
    // Convert price from USD to alternate currency
    price = FromUSD(price);
  }

  price = price.multiply(options.quantity || 1);

  // TODO: Use same locale as language
  const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
  let formattedPrice = new Intl.NumberFormat(currentLocale || "en-US", { style: "currency", currency}).format(price.toString());

  if(options.trimZeros && formattedPrice.endsWith(".00")) {
    formattedPrice = formattedPrice.slice(0, -3);
  }

  const usdcIcon = options.includeUSDCIcon ? <ImageIcon icon={USDCIcon} className="formatted-price__icon" /> : null;

  let priceString;
  if(options?.includeCurrency) {
    if(options?.useCurrencyIcon && currency === "USD") {
      formattedPrice = <div className="formatted-price__value">{ formattedPrice }</div>;
      const icon = <ImageIcon icon={USDIcon} className="formatted-price__icon" />;
      priceString = (
        <div className={`formatted-price ${options.className || ""}`}>
          {
            options.prependCurrency ?
              <>{usdcIcon}{icon}{formattedPrice}</> :
              <>{formattedPrice}{usdcIcon}{icon}</>
          }
        </div>
      );
    } else {
      formattedPrice = (
        <div className={`formatted-price__value ${options.className || ""}`}>
          {
            options.prependCurrency ?
              `${currency} ${formattedPrice}` :
              `${formattedPrice} ${currency}`
          }
        </div>
      );

      priceString = (
        <div className={`formatted-price  ${options.className || ""}`}>
          {options?.includeUSDCIcon ? usdcIcon : null}{formattedPrice}
        </div>
      );
    }
  } else if(options.includeUSDCIcon) {
    formattedPrice = <div className="formatted-price__value">{formattedPrice}</div>;

    priceString = (
      <div className={`formatted-price ${options.className || ""}`}>
        {usdcIcon}{formattedPrice}
      </div>
    );
  } else {
    if(options.stringOnly) {
      return formattedPrice;
    }

    return (
      <div className="formatted-price">
        { formattedPrice }
      </div>
    );
  }

  return priceString;
};

window.FormatPriceString = FormatPriceString;

export const RichText = ({richText, className=""}) => {
  return (
    <div
      className={`rich-text ${className}`}
      ref={element => {
        if(!element) { return; }

        render(
          <ReactMarkdown linkTarget="_blank" allowDangerousHtml >
            { SanitizeHTML(richText) }
          </ReactMarkdown>,
          element
        );
      }}
    />
  );
};

export const ButtonWithLoader = ({children, className="", onClick, isLoading, ...props}) => {
  const [loading, setLoading] = useState(false);

  return (
    <button
      {...props}
      className={`action action-with-loader ${loading || isLoading ? "action-with-loader--loading": ""} ${className}`}
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
      { loading || isLoading ? <Loader loader="inline" className="action-with-loader__loader" /> : null }
      <div className="action-with-loader__content">
        { children }
      </div>
    </button>
  );
};

export const ButtonWithMenu = ({buttonProps, RenderMenu, className=""}) => {
  const ref = useRef();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const onClickOutside = event => {
      if(!ref.current || !ref.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className={`menu-button ${showMenu ? "menu-button--active" : ""} ${className}`} ref={ref}>
      <button
        {...buttonProps}
        className={`menu-button__button ${buttonProps?.className || ""}`}
        onClick={() => {
          setShowMenu(!showMenu);

          if(buttonProps?.onClick) {
            buttonProps.onClick();
          }
        }}
      />
      {
        showMenu ?
          <div className="menu-button__menu">
            { RenderMenu(() => setShowMenu(false)) }
          </div> : null
      }
    </div>
  );
};

export const SwitchButton = ({value, onChange}) => {
  return (
    <button className={`switch-button ${value ? "switch-button--active" : ""}`} onClick={() => onChange(!value)}>
      <div className="switch-button__slider">
        <div className="switch-button__slider__ball" />
      </div>
    </button>
  );
};

let debounceTimeout;
export const DebouncedInput = ({...props}) => {
  const [inputValue, setInputValue] = useState(props.value);

  useEffect(() => {
    setInputValue(props.value);
  }, [props.value]);

  let inputProps = {...props};
  delete inputProps.onImmediateChange;

  return (
    <input
      {...inputProps}
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
        debounceTimeout = setTimeout(() => props.onChange(value), props.timeout || 1000);

        if(props.onImmediateChange) {
          props.onImmediateChange(value);
        }
      }}
    />
  );
};

export const Select = ({label, value, activeValuePrefix, options, placeholder, disabled, onChange, initialChange, containerClassName="", buttonClassName="", menuClassName=""}) => {
  // If only labels are provided, convert to array format
  if(!Array.isArray(options[0])) {
    options = options.map(option => [option, option]);
  }

  let currentIndex = options.findIndex(option => option[0] === value);
  if(currentIndex < 0 && !placeholder) {
    currentIndex = 0;
  }

  const [idPrefix] = useState(UUID());
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [filter, setFilter] = useState("");
  const [filterLastTyped, setFilterLastTyped] = useState(0);
  const [mouseIn, setMouseIn] = useState(false);

  const ref = useRef();

  useEffect(() => {
    initialChange && onChange && onChange(value);
  }, []);

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

    setMouseIn(false);
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
              onMouseEnter={() => {
                setMouseIn(true);
                setSelectedIndex(index);
              }}
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
        disabled={disabled || options.length === 0}
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
        { currentIndex < 0 ? placeholder : `${activeValuePrefix || ""}${options[currentIndex || 0][1]}` }
        <div className="styled-select__button__icon-container">
          <ImageIcon icon={SelectIcon} className="styled-select__button__icon" />
        </div>
      </button>
      { menu }
    </div>
  );
};

export const QRCodeElement = ({content}) => {
  let options = { errorCorrectionLevel: "M", margin: 1 };

  if(rootStore.pageWidth < 600) {
    options.width = rootStore.pageWidth - 100;
  }

  return (
    <div className="qr-code">
      <canvas
        ref={element => {
          if(!element) { return; }

          QRCode.toCanvas(
            element,
            typeof content === "object" ? JSON.stringify(content) : content,
            options,
            error => error && rootStore.Log(error, true)
          );
        }}
        className="qr-code__canvas"
      />
    </div>
  );
};

export const MenuLink = ({icon, children, className="", ...props}) => {
  let Component = props.to ? NavLink :
    props.href ? ({...args}) => <a {...args} /> :
      ({...args}) => <button {...args} />;

  return (
    <Component className={`menu-link ${className}`} {...props}>
      <ImageIcon className="menu-link__icon" icon={icon} />
      <div className="menu-link__text">
        { children }
      </div>
    </Component>
  );
};


export const FullScreenImage = observer(({className="", modalClassName="", magnification=2, Toggle, ...props}) => {
  const imageRef = useRef();
  const [zoom, setZoom] = useState(false);
  const [initialZoom, setInitialZoom] = useState(false);
  const [dragStatus, setDragStatus] = useState({dragging: false, delta: 0, start: 0});
  const [position, setPosition] = useState({top: 0, left: 0});

  useEffect(() => setZoom(false), [props.src, rootStore.pageWidth]);

  useEffect(() => {
    const MouseOut = () => setDragStatus({...dragStatus, dragging: false});

    document.addEventListener("mouseout", MouseOut);

    return () => document.removeEventListener("mouseout", MouseOut);
  });

  const zoomable = rootStore.pageWidth > 800;

  return (
    <Modal Toggle={Toggle} className={`fullscreen-image ${modalClassName}`}>
      <img
        key={`fullscreen-image-${props.src}`}
        ref={imageRef}
        className={`fullscreen-image__image ${zoomable ? "fullscreen-image__image--zoomable" : ""} ${zoom ? "fullscreen-image__image--hidden" : ""} ${className}`}
        onClick={event => {
          if(!zoomable) { return; }

          const containerWidth = imageRef.current.getBoundingClientRect().width;
          const containerHeight = imageRef.current.getBoundingClientRect().height;

          let imageWidth = imageRef.current.naturalWidth;
          let imageHeight = imageRef.current.naturalHeight;

          let renderedImageWidth = imageWidth;
          let renderedImageHeight = imageHeight;

          const aspectRatio = imageWidth / imageHeight;

          if(imageWidth > containerWidth && (containerWidth / imageWidth) * imageHeight < containerHeight) {
            // Natural width wider than container AND if we scaled the image down to fit, the height would not exceed the container
            renderedImageWidth = containerWidth;
            renderedImageHeight = containerWidth / aspectRatio;
          } else if(imageHeight > containerHeight) {
            renderedImageHeight = containerHeight;
            renderedImageWidth = containerHeight * aspectRatio;
          }

          const imageLeft = containerWidth / 2 - renderedImageWidth / 2;
          const imageTop = containerHeight / 2 - renderedImageHeight / 2;

          const relativeClientX = (event.clientX - imageLeft) / renderedImageWidth;
          const relativeClientY = (event.clientY - imageTop) / renderedImageHeight;

          let positionLeft = -1 * Math.max(0, Math.min(renderedImageWidth * magnification * relativeClientX - containerWidth / 2, renderedImageWidth * magnification - containerWidth));
          if(renderedImageWidth * magnification < containerWidth) {
            // Magnified width is not enough to fill container - center horizontally
            positionLeft = containerWidth / 2 - (renderedImageWidth * magnification) / 2;
          }

          let positionTop = -1 * Math.max(0, Math.min(renderedImageHeight * magnification * relativeClientY - containerHeight / 2, renderedImageHeight * magnification - containerHeight));
          if(renderedImageHeight * magnification < containerHeight) {
            // Magnified height is not enough to fill container - center vertically
            positionTop = containerHeight / 2 - (renderedImageHeight * magnification) / 2;
          }

          setPosition({
            width: renderedImageWidth * magnification,
            height: renderedImageHeight * magnification,
            left: positionLeft,
            top: positionTop
          });

          setZoom(true);
          setInitialZoom(true);
        }}
        {...props}
      />
      <div
        key={`fullscreen-image-zoomed-${props.src}`}
        className={`fullscreen-image__zoomed-image ${dragStatus.dragging ? "fullscreen-image__zoomed-image--dragging" : ""} ${!zoom ? "fullscreen-image__zoomed-image--hidden" : ""}`}
        onClick={() => {
          if(dragStatus.delta > 50 || Date.now() - dragStatus.start > 175) {
            return;
          }

          setZoom(false);
        }}
        onMouseDown={() => {
          setDragStatus({dragging: true, delta: 0, start: Date.now()});
        }}
        onMouseMove={event => {
          if(!dragStatus.dragging) { return; }

          setDragStatus({...dragStatus, delta: dragStatus.delta + Math.abs(event.movementX) + Math.abs(event.movementY)});
          setPosition({left: position.left + event.movementX, top: position.top + event.movementY});
        }}
        onMouseUp={() => setDragStatus({...dragStatus, dragging: false})}
        draggable
        style={{
          display: initialZoom ? "block" : "none",
          backgroundImage: `url("${props.src}")`,
          backgroundPosition: `${position.left}px ${position.top}px`,
          backgroundSize: `${position.width}px ${position.height}px`
        }}
        {...props}
      />
    </Modal>
  );
});
