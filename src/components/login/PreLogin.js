import React, {useState} from "react";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {rootStore} from "Stores";
import Modal from "Components/common/Modal";

const PrivacyPolicy = () => {
  const [policyModal, setPolicyModal] = useState(null);

  let { link, rich_text, html } = (rootStore.customizationMetadata || {}).privacy_policy || {};

  let policyLink;
  if(link) {
    policyLink = (
      <a
        target="_blank"
        className="pre-login__privacy-link"
        rel="noopener"
        href={link}
      >
        Privacy Policy
      </a>
    );
  } else if(rich_text || html) {
    policyLink = (
      <button
        className="pre-login__privacy-link"
        onClick={() => {
          setPolicyModal(
            <Modal
              className="pre-login__privacy-modal"
              Toggle={() => setPolicyModal(null)}
            >
              {
                rich_text ?
                  <div className="pre-login__privacy-modal__content">
                    <div
                      className="markdown-document event-message__content__message"
                      ref={element => {
                        if(!element) {
                          return;
                        }

                        render(
                          <ReactMarkdown linkTarget="_blank" allowDangerousHtml>
                            {SanitizeHTML(rich_text)}
                          </ReactMarkdown>,
                          element
                        );
                      }}
                    />
                  </div> :
                  <iframe
                    className="pre-login__privacy-frame"
                    src={html.url}
                  />
              }
            </Modal>
          );
        }}
      >
        Privacy Policy
      </button>
    );
  } else {
    return null;
  }

  return (
    <>
      { policyModal }
      { policyLink }
    </>
  );
};

const PreLogin = ({onComplete}) => {
  const [consent, setConsent] = useState(true);

  return (
    <div className="pre-login">
      <div className="pre-login__text">
        <div
          className="markdown-document pre-login__header"
          ref={element => {
            if(!element) {
              return;
            }

            render(
              <ReactMarkdown linkTarget="_blank" allowDangerousHtml>
                {SanitizeHTML((rootStore.customizationMetadata || {}).consent_form_text)}
              </ReactMarkdown>,
              element
            );
          }}
        />

        <div className="pre-login__consent">
          <input name="consent" type="checkbox" checked={consent} onChange={() => setConsent(!consent)} className="pre-login__consent-checkbox" />
          <label htmlFor="consent" className="pre-login__consent-label"  onClick={() => setConsent(!consent)}>
            By checking this box, I give consent for my email address to be stored with my wallet address and shared with { (rootStore.customizationMetadata || {}).tenant_name || "Eluvio's Partner" }
          </label>
        </div>
      </div>

      <div className="pre-login__privacy-policy">
        <PrivacyPolicy />
      </div>

      <div className="pre-login__actions">
        <button className="login-page__login-button login-page__login-button-pre-login pre-login__button" onClick={() => onComplete({data: { share_email: consent }})}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default PreLogin;
