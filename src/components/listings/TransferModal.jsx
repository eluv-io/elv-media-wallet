import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {rootStore, transferStore} from "Stores";
import Modal from "Components/common/Modal";
import NFTCard from "Components/nft/NFTCard";
import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";

const TransferModal = observer(({nft, onTransferring, onTransferred, Close}) => {
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
      setError(rootStore.l10n.transfers.errors.invalid_address);
    } else if(rootStore.client.utils.EqualAddress(rootStore.CurrentAddress(), targetAddress)) {
      setAddressValid(false);
      setError(rootStore.l10n.transfers.errors.no_self_transfer);
    } else {
      setAddressValid(true);
      setError("");

      if(targetAddress) {
        rootStore.walletClient.UserItems({userAddress: targetAddress, limit: 1})
          .then(({paging}) => {
            if(paging.total <= 0) {
              setError(rootStore.l10n.transfers.errors.address_warning);
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
          { rootStore.l10n.transfers.header }
        </h1>
        <div className="listing-modal__content">
          <NFTCard nft={nft} truncateDescription />
          <div className="listing-modal__form__inputs">
            <div className="listing-modal__form__labelled-input">
              <label className="listing-modal__form__label">
                { rootStore.l10n.transfers.network }
              </label>
              <input
                disabled
                className="listing-modal__form__input"
                value={`${rootStore.network === "demo" ? "Eluvio Demonet 955210" : "Eluvio Mainnnet 955305"}`}
              />
            </div>
            <div className="listing-modal__form__labelled-input">
              <label className="listing-modal__form__label">
                { rootStore.l10n.transfers.target_address }
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
              disabled={!targetAddress || !addressValid}
              className="action action-primary listing-modal__action"
              onClick={async () => {
                let confirmed = false;
                await Confirm({
                  message: LocalizeString(rootStore.l10n.actions.transfers.transfer_confirm, {targetAddress}),
                  Confirm: () => { confirmed = true; }
                });

                if(!confirmed) { return; }

                try {
                  setTransferring(true);
                  onTransferring(true);
                  setError("");
                  setMessage(rootStore.l10n.transfers.transferring);

                  await transferStore.TransferNFT({nft, targetAddress});

                  await onTransferred(targetAddress);
                } catch(error) {
                  setMessage("");
                  setError(rootStore.l10n.transfers.errors.failed);
                  setTransferring(false);
                  onTransferring(false);
                }
              }}
            >
              { rootStore.l10n.actions.transfers.transfer }
            </ButtonWithLoader>
            <button
              disabled={transferring}
              className="action listing-modal__action"
              onClick={() => Close()}
            >
              { rootStore.l10n.actions.cancel }
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

export default TransferModal;
