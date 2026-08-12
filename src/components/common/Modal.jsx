import React, {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import CloseIcon from "../../static/icons/x.svg";
import ImageIcon from "Components/common/ImageIcon";

const Modal = observer(({children, Toggle, closable=true, noFade=false, id="", className=""}) => {
  const [scrolled, setScrolled] = useState(false);

  const Close = (event) => {
    if(!closable || !Toggle) { return; }

    if(event && (event.key || "").toLowerCase() !== "escape") { return; }

    document.removeEventListener("keydown", Close);
    document.body.style.overflowY = "scroll";

    Toggle(false);
  };

  useEffect(() => {
    const originalWidth = document.body.getBoundingClientRect().width;
    window.__activeMenues += 1;
    document.addEventListener("keydown", Close);
    document.body.style.overflowY = "hidden";
    document.body.setAttribute("data-scroll-locked", "1");

    document.querySelector(":root")
      .style
      .setProperty("--scroll-bar-width", `${document.body.getBoundingClientRect().width - originalWidth}px`);

    rootStore.AddActiveModal();

    return () => {
      window.__activeMenues -= 1;
      document.removeEventListener("keydown", Close);
      document.body.style.overflowY = "scroll";
      document.body.removeAttribute("data-scroll-locked");

      rootStore.RemoveActiveModal();
    };
  }, []);

  return (
    <div id={id} className={`modal ${noFade ? "modal--no-fade" : ""} ${className || ""}`} onClick={() => Close()}>
      {
        closable && Toggle ?
          <button className="action action-modal-close modal__close-button">
            <ImageIcon
              key={"back-icon-Close Modal"}
              className={"modal__close-icon"}
              title={"Close Modal"}
              icon={CloseIcon}
              onClick={() => Close()}
            />
          </button> :
          null
      }
      <div
        className="modal__content"
        onClick={event => event.stopPropagation()}
        ref={element => {
          // Ensure content is scrolled to top on first render
          if(!element || scrolled) { return; }

          element.scrollTo(0, 0);

          setScrolled(true);
        }}
      >
        { children }
      </div>
    </div>
  );
});

const ModalPortal = (args) => {
  return (
    createPortal(
      <Modal {...args} />,
      document.body
    )
  );
};

export default ModalPortal;
