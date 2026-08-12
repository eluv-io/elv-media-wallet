import React, {useState, useEffect, useRef} from "react";
import {Linkish} from "Components/common/UIComponents";

const MenuButton = ({children, items, menuMaxWidth=250, className="", optionClassName=""}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const containerRef = useRef(null);

  const HandleClickOutside = (event) => {
    if(containerRef.current && !containerRef.current.contains(event.target)) {
      setMenuOpen(false);
    }
  };

  const HandleEscapeKey = (event) => {
    if(event.key === "Escape") {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", HandleClickOutside);
    document.addEventListener("keydown", HandleEscapeKey);

    return (() => {
      document.removeEventListener("mousedown", HandleClickOutside);
      document.removeEventListener("keydown", HandleEscapeKey);
    });
  }, []);

  const availableWidth = containerRef?.current ?
    document.body.getBoundingClientRect().width - containerRef.current.getBoundingClientRect().left - 20 :
    menuMaxWidth;

  let style = {
    maxWidth: menuMaxWidth,
    left: 0
  };

  if(availableWidth < menuMaxWidth) {
    style.left = -(menuMaxWidth - availableWidth);
  }

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(!menuOpen);
      }}
      className={`menu-button ${menuOpen ? "menu-button--active" : ""} ${className}`}
      ref={containerRef}
    >
      { children }
      {
        menuOpen &&
        <ul
          className="menu-button__options"
          style={style}
        >
          {(items || []).map((item, index) => (
            <li key={`menu-button-${index}`} className="menu-button__option">
              <Linkish
                {...item}
                onClick={() => {
                  item.onClick && item.onClick();
                  setMenuOpen(false);
                }}
                className={`menu-button__button ${optionClassName}`}
              >
                { item.label }
              </Linkish>
            </li>
          ))}
        </ul>
      }
    </div>
  );
};

export default MenuButton;
