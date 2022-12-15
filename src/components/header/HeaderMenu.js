import React, {useRef, useEffect} from "react";
import {observer} from "mobx-react";

const HeaderMenu = observer(({children, Hide, className=""}) => {
  const menuRef = useRef();

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const onClickOutside = event => {
      if(window._showPreferencesMenu) { return; }

      if(!menuRef?.current || !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside, true);

    return () => document.removeEventListener("click", onClickOutside);
  }, [menuRef]);

  return (
    <div className={`header__menu ${className}`} ref={menuRef}>
      { children }
    </div>
  );
});

export default HeaderMenu;
