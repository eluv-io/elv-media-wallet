import React, {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {rootStore} from "Stores";
import Modal from "Components/common/Modal";
import {Loader} from "Components/common/Loaders";
import {observer} from "mobx-react";
import {Button} from "Components/properties/Common";

const ConfirmModal = observer(({message, Confirm, Close}) => {
  const [confirming, setConfirming] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if(ref.current) {
      ref.current.focus();
    }
  }, [ref]);

  return (
    <Modal className="confirm-modal" Toggle={Close}>
      <div className="confirm">
        <div className="confirm__content">
          <h1 className="confirm__message">
            { message }
          </h1>
        </div>
        <div className="actions-container">
          {
            confirming ? <Loader/> :
              <>
                <Button variant="outline" className="confirm__action confirm__action--cancel" onClick={Close} ref={ref} autoFocus>
                  { rootStore.l10n.actions.cancel }
                </Button>
                <Button
                  className="confirm__action confirm__action--confirm"
                  onClick={async () => {
                    try {
                      setConfirming(true);
                      await Confirm();
                    } finally {
                      setConfirming(false);
                    }
                  }}
                >
                  { rootStore.l10n.actions.confirm }
                </Button>
              </>
          }
        </div>
      </div>
    </Modal>
  );
});

const Confirm = async ({message, ModalComponent, Confirm, Close}) => {
  if(!ModalComponent) {
    ModalComponent = ConfirmModal;
  }

  return await new Promise(resolve => {
    const targetId = "-elv-confirm-target";
    const target = document.createElement("div");
    target.id = targetId;
    document.getElementById("app").appendChild(target);

    const root = createRoot(target);

    const RemoveModal = () => {
      const target = document.getElementById(targetId);
      root.unmount();
      target.parentNode.removeChild(target);
    };

    const HandleConfirm = async (response) => {
      if(Confirm) {
        await Confirm();
      }

      RemoveModal();

      resolve(response || true);
    };

    const HandleClose = async () => {
      try {
        if(Close) {
          await Close();
        }
      } finally {
        RemoveModal();

        resolve(false);
      }
    };

    root.render(
      <ModalComponent message={message} Confirm={HandleConfirm} Close={HandleClose} />
    );
  });
};

export default Confirm;
