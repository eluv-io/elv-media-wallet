import React, {useRef, useEffect} from "react";
import {observer} from "mobx-react";

window.__activeMenues = 0;

const HoverMenu = observer(({children, Hide, className="", setRef, ...props}) => {
  const menuRef = useRef();

  useEffect(() => {
    setRef && setRef(menuRef);

    if(!menuRef || !menuRef.current) { return; }

    window.__activeMenues += 1;
    const menuIndex = window.__activeMenues;

    const onClickOutside = event => {
      if(window.__activeMenues > menuIndex) { return; }

      if(menuRef?.current && !menuRef.current.contains(event.target)) {
        setTimeout(Hide, 50);
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
