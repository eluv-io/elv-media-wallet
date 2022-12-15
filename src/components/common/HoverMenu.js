import React, {useRef, useEffect} from "react";
import {observer} from "mobx-react";

window.__activeMenues = 0;

const HoverMenu = observer(({children, Hide, className="", ...props}) => {
  const menuRef = useRef();

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    window.__activeMenues += 1;
    const menuIndex = window.__activeMenues;

    const onClickOutside = event => {
      if(window.__activeMenues > menuIndex) { return; }

      if(menuRef?.current && !menuRef.current.contains(event.target)) {
        Hide();
      }
    };

    document.addEventListener("click", onClickOutside, { capture: true });

    return () => {
      window.__activeMenues -= 1;
      document.removeEventListener("click", onClickOutside);
    };
  }, [menuRef]);

  return (
    <div className={`hover-menu ${className}`} ref={menuRef} {...props}>
      { children }
    </div>
  );
});

export default HoverMenu;
