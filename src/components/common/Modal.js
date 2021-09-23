import React, {useEffect} from "react";
import {observer} from "mobx-react";
import CloseIcon from "../../static/icons/x.svg";
import ImageIcon from "Components/common/ImageIcon";

const Modal = observer(({children, Toggle, className=""}) => {
  const Close = (event) => {
    if(event && (event.key || "").toLowerCase() !== "escape") { return; }

    document.removeEventListener("keydown", Close);
    document.body.style.overflowY = "auto";

    Toggle(false);
  };

  useEffect(() => {
    document.addEventListener("keydown", Close);
    document.body.style.overflowY = "hidden";

    return () => {
      document.removeEventListener("keydown", Close);
      document.body.style.overflowY = "auto";
    };
  });

  return (
    <div className={`modal ${className || ""}`} onClick={() => Close()}>
      <ImageIcon
        key={"back-icon-Close Modal"}
        className={"modal__close-button"}
        title={"Close Modal"}
        icon={CloseIcon}
        onClick={() => Close()}
      />
      <div className="modal__content" onClick={event => event.stopPropagation()}>
        { children }
      </div>
    </div>
  );
});

export default Modal;
