import CommonStyles from "Assets/stylesheets/media_properties/common.module";

import React, {useCallback, useEffect, useState} from "react";
import {rootStore} from "Stores";
import {observer} from "mobx-react";
import {Button, Modal} from "Components/properties/Common";
import {useHistory} from "react-router-dom";
import {PasswordInput} from "@mantine/core";
import {SHA512} from "../../utils/Utils";

const S = (...classes) => classes.map(c => CommonStyles[c] || "").join(" ");

const urlParams = new URLSearchParams(window.location.search);
const PreviewPasswordGateComponent = observer(({id, name, digest, children, backPath="/"}) => {
  const passwordKey = `preview-password-${id}`;

  const [password, setPassword] = useState(rootStore.GetLocalStorage(passwordKey) || urlParams.get("pw") || "");
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const history = useHistory();

  const Submit = useCallback(async (showError) => {
    setError("");

    const passed = (await SHA512(password)) === digest;

    if(passed) {
      rootStore.SetLocalStorage(passwordKey, password);
      setPassed(true);
    } else if(showError) {
      setError("Incorrect password");
    }
  }, [password]);

  useEffect(() => {
    if(urlParams.has("pw")) {
      // Ensure password param is removed from url
      const url = new URL(window.location.href);
      url.searchParams.delete("pw");
      window.history.replaceState({}, document.title, url.toString());
    }

    if(password && !passed) {
      Submit(false)
        .then(() => setLoaded(true));

      return;
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    setError("");
  }, [password]);

  if(!loaded) {
    return null;
  }

  if(passed) {
    return children;
  }

  return (
    <Modal
      size="auto"
      centered
      opened
      header="Preview Password"
      withCloseButton={false}
    >
      <div className={S("preview-password")}>
        <label className={S("preview-password__label")}>
          Please enter the preview password for {name || "this property"}
        </label>
        <PasswordInput
          error={error}
          align="center"
          textAlign="center"
          placeholder="Password"
          type="password"
          autoFocus
          autoComplete="new-password"
          value={password}
          classNames={{
            input: S("preview-password__input")
          }}
          onKeyDown={event => {
            if(event.key === "Enter") {
              Submit(true);
            }
          }}
          onChange={event => setPassword(event.target.value)}
        />
        <div className={S("preview-password__actions")}>
          <Button onClick={() => history.push(backPath || "/")} variant="outline" className={S("preview-password__action")}>
            Cancel
          </Button>
          <Button onClick={() => Submit(true)} disabled={!password} className={S("preview-password__action")}>
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const PreviewPasswordGate = observer(({id, name, digest, backPath, children}) => {
  if(EluvioConfiguration.mode === "production" || !id || !digest) {
    return children;
  }

  return (
    <PreviewPasswordGateComponent
      id={id}
      name={name}
      digest={digest}
      backPath={backPath}
    >
      { children }
    </PreviewPasswordGateComponent>
  );
});

export default PreviewPasswordGate;
