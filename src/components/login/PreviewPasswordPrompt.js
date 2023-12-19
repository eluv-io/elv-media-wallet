import React, {useEffect, useRef, useState} from "react";
import Modal from "Components/common/Modal";
import {ButtonWithLoader} from "Components/common/UIComponents";
import Confirm from "Components/common/Confirm";
import {rootStore} from "Stores";

const SHA512 = async (str) => {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str));
  return Array.prototype.map.call(new Uint8Array(buf), x=>(("00"+x.toString(16)).slice(-2))).join("");
};

const PreviewPasswordPromptComponent = ({marketplaceId, digest, Confirm}) => {
  const ref = useRef(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const Submit = async (password) => {
    setError(false);

    if((await SHA512(password)) !== digest) {
      setError(true);
      return;
    }

    rootStore.SetLocalStorage(`preview-password-${marketplaceId}`, password);

    Confirm();
  };

  useEffect(() => {
    if(ref.current) {
      ref.current.focus();
    }
  }, [ref]);

  useEffect(() => {
    if(window.location.hostname === "localhost") {
      Confirm();
    }

    const savedPassword = rootStore.GetLocalStorage(`preview-password-${marketplaceId}`);
    if(savedPassword) {
      setPassword(savedPassword);
      Submit(savedPassword)
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, []);

  if(loading) {
    return null;
  }

  return (
    <Modal className="confirm-modal">
      <div className="confirm">
        <div className="confirm__content">
          <h1 className="confirm__message">
            Enter the marketplace preview password to continue.
          </h1>

          <input
            ref={ref}
            className="confirm__input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onKeyDown={event => {
              if(event.key === "Enter") {
                Submit(password);
              }
            }}
          />
          {
            error ?

              <h1 className="confirm__error">
                Incorrect Password
              </h1> : null
          }
        </div>
        <div className="actions-container">
          <ButtonWithLoader className="action action-primary" onClick={async () => Submit(password)}>
            Submit
          </ButtonWithLoader>
        </div>
      </div>
    </Modal>
  );
};

const PreviewPasswordPrompt = async ({marketplaceId, passwordDigest}) => {
  if(!window.passwordConfirmation) {
    window.passwordConfirmation = await Confirm({
      ModalComponent: ({Confirm}) =>
        <PreviewPasswordPromptComponent
          marketplaceId={marketplaceId}
          digest={passwordDigest}
          Confirm={async () => {
            await Confirm();

            window.passwordConfirmation = undefined;
          }}
        />
    });
  }

  await window.passwordConfirmation;
};

export default PreviewPasswordPrompt;
