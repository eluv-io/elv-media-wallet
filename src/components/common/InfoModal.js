import React from "react";
import Modal from "Components/common/Modal";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";
import SanitizeHTML from "sanitize-html";
import {MarketplaceImage} from "Components/common/Images";
import {rootStore} from "Stores/index";

const InfoModal = ({info, imagePath, backgroundImagePath, marketplaceHash, Close, className=""}) => {
  const backgroundImageUrl = info.background_image && backgroundImagePath && marketplaceHash ?
    rootStore.PublicLink({
      versionHash: marketplaceHash,
      path: backgroundImagePath,
      queryParams: {
        width: 800
      }
    }) : null;

  return (
    <Modal className="info-modal-container" Toggle={Close}>
      <div
        className={`info-modal ${className}`}
        style={backgroundImagePath ? { backgroundImage: `url("${backgroundImageUrl}")` } : {}}
      >
        <div className="info-modal__content card-shadow ">
          {
            info.message ?
              <div
                className="info-modal__message rich-text"
                ref={element => {
                  if(!element) {
                    return;
                  }

                  render(
                    <ReactMarkdown linkTarget="_blank" allowDangerousHtml>
                      {SanitizeHTML(info.message)}
                    </ReactMarkdown>,
                    element
                  );
                }}
              /> : null
          }
          {
            info.image && imagePath && marketplaceHash ?
              <MarketplaceImage
                rawImage
                className="info-modal__image"
                marketplaceHash={marketplaceHash}
                path={imagePath}
              /> : null
          }
          <div className="info-modal__actions">
            <button className="info-modal__button info-modal__close" onClick={Close}>
              { info.button_text || "Close" }
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InfoModal;
