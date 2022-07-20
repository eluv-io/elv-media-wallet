import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, transferStore} from "Stores";
import Modal from "Components/common/Modal";
import NFTCard from "Components/common/NFTCard";
import {ButtonWithLoader} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";

const TransferModal = observer(({nft, setTransferred, Close}) => {
  const [transferring, setTransferring] = useState(false);
  const [targetAddress, setTargetAddress] = useState("");
  const [addressValid, setAddressValid] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const invalid = targetAddress &&
      (!rootStore.client.utils.ValidAddress(targetAddress) || rootStore.client.utils.EqualAddress(rootStore.client.utils.nullAddress, targetAddress));

    if(invalid) {
      setAddressValid(false);
      setError("Invalid target address");
    } else if(rootStore.client.utils.EqualAddress(rootStore.CurrentAddress(), targetAddress)) {
      setAddressValid(false);
      setError("You may not transfer an NFT to yourself");
    } else {
      setAddressValid(true);
      setError("");

      if(targetAddress) {
        rootStore.walletClient.UserItemInfo({userAddress: targetAddress})
          .then(items => {
            if(Object.keys(items || {}).length === 0) {
              setError("The target address does not currently own any items. Are you sure this is the right address?");
            }
          });
      }
    }
  }, [targetAddress]);


  return (
    <Modal
      id="transfer-modal"
      className="listing-modal-container"
      Toggle={() => Close()}
    >
      <div className="listing-modal">
        <h1 className="listing-modal__header">
          Transfer Your Item
        </h1>
        <div className="listing-modal__content">
          <NFTCard nft={nft} showToken truncateDescription />
          <div className="listing-modal__form__inputs">
            <div className="listing-modal__form__labelled-input">
              <label className="listing-modal__form__label">
                Network
              </label>
              <input
                disabled
                className="listing-modal__form__input"
                value={`${rootStore.network === "demo" ? "Eluvio Demonet 955210" : "Eluvio Mainnnet 955305"}`}
              />
            </div>
            <div className="listing-modal__form__labelled-input">
              <label className="listing-modal__form__label">
                Target Address
              </label>
              <input
                placeholder="0x0000000000000000000000000000000000000000"
                className={`listing-modal__form__input listing-modal__form__input--address ${!addressValid ? "listing-modal__form__input--error" : ""}`}
                value={targetAddress}
                onChange={event => setTargetAddress(event.target.value)}
              />
            </div>
          </div>
          {
            error ?
              <div className="listing-modal__error-message">
                { error }
              </div> : null
          }
          {
            message ?
              <div className="listing-modal__message">
                { message }
              </div> : null
          }
          <div className="listing-modal__actions actions">
            <ButtonWithLoader
              disabled={!addressValid}
              className="action action-primary listing-modal__action"
              onClick={async () => {
                let confirmed = false;
                await Confirm({
                  message: `Are you sure you want to transfer this NFT to ${targetAddress}?`,
                  Confirm: () => { confirmed = true; }
                });

                if(!confirmed) { return; }

                try {
                  setTransferring(true);
                  setError("");
                  setMessage("Transferring NFT. This may take several minutes.");

                  await transferStore.TransferNFT({nft, targetAddress});

                  setTransferred(true);
                } catch(error) {
                  setMessage("");
                  setError("Transfer failed");
                  setTransferring(false);
                }
              }}
            >
              Transfer NFT
            </ButtonWithLoader>
            <button
              disabled={transferring}
              className="action listing-modal__action"
              onClick={() => Close()}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default TransferModal;
