import React, {useState} from "react";
import {observer} from "mobx-react";
import {cryptoStore, rootStore} from "Stores";
import Confirm from "Components/common/Confirm";

const TransferSection = observer(({nft}) => {
  const heldDate = nft.details.TokenHoldDate && (new Date() < nft.details.TokenHoldDate) && nft.details.TokenHoldDate.toLocaleString(navigator.languages, {year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const notMetamask = !cryptoStore.MetamaskAvailable() && window.ethereum;
  const notMetaMaskMessage = "Other browser extensions like Coinbase may be preventing the wallet from accessing MetaMask. Please disable them and refresh the page.";

  const heldMessage = heldDate ?
    <h3 className="details-page__transfer-details details-page__held-message">
      Note: This NFT in a holding period until { heldDate } for payment settlement. You will not be able to transfer it until then.
    </h3> : null;

  if(rootStore.embedded) {
    if(!cryptoStore.MetamaskAvailable()) {
      return (
        <div className="expandable-section__actions">
          { heldMessage }

          <h3 className="details-page__transfer-details">
            You can transfer your NFT to another network using MetaMask. Please install MetaMask to transfer your NFT.
          </h3>
          { notMetamask ? <h3 className="details-page__transfer-details">{ notMetaMaskMessage }</h3> : "" }
        </div>
      );
    }

    const url = new URL(window.location.href);
    if(rootStore.darkMode) {
      url.searchParams.append("dk", "");
    }

    if(rootStore.marketplaceHash) {
      url.searchParams.append("mid", rootStore.marketplaceHash);
    }

    return (
      <div className="expandable-section__actions">
        { heldMessage }

        <h3 className="details-page__transfer-details">
          You can transfer your NFT to another network using MetaMask. Click the link below to open the full wallet experience and transfer your NFT.
        </h3>
        { notMetamask ? <h3 className="details-page__transfer-details">{ notMetaMaskMessage }</h3> : "" }

        <div className="details-page__transfer-buttons">
          <a href={url.toString()} target="_blank" className="button details-page__transfer-button details-page__transfer-link">
            Open Full Wallet to Transfer
          </a>
        </div>
      </div>
    );
  }

  const [transferError, setTransferError] = useState(undefined);
  const transferInfo = cryptoStore.transferredNFTs[`${nft.details.ContractAddr}:${nft.details.TokenIdStr}`];

  if(transferInfo) {
    return (
      <div className="expandable-section__actions">
        <div className="details-page__transfer-details details-page__transfer-success">
          <h3>
            Transfer request to { transferInfo.network.name } succeeded
          </h3>

          <a className="button details-page__transfer-details__opensea-button" target="_blank" href={transferInfo.openSeaLink} rel="noopener">Find it on OpenSea</a>

          <h3 className="details-page__transfer-details__hash">
            Hash: { transferInfo.hash }
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="expandable-section__actions">
      {
        transferError ?
          <h3 className="details-page__transfer-details details-page__transfer-error">
            { transferError }
          </h3> : null
      }

      { heldMessage }

      <h3 className="details-page__transfer-details">
        {
          cryptoStore.MetamaskAvailable() ?
            "You can transfer your NFT to another network using MetaMask. Select the network you wish to transfer to in MetaMask to enable the transfer option." :
            "Install MetaMask to transfer your NFT"
        }
      </h3>

      { notMetamask ? <h3 className="details-page__transfer-details">{ notMetaMaskMessage }</h3> : "" }

      <div className="details-page__transfer-buttons">
        {
          cryptoStore.ExternalChains()
            .sort((a, b) => {
              if(a.chainId === cryptoStore.metamaskChainId) {
                return -1;
              } else if(b.chainId === cryptoStore.metamaskChainId) {
                return 1;
              }

              return a.name < b.name ? -1 : 1;
            })
            .map(({name, network, chainId}) => (
              <button
                key={`transfer-button-${network}`}
                disabled={heldMessage ||!cryptoStore.MetamaskAvailable() || cryptoStore.metamaskChainId !== chainId}
                className="action details-page__transfer-button"
                onClick={async () => await Confirm({
                  message: `Are you sure you want to transfer this NFT to ${name}?`,
                  Confirm: async () => {
                    try {
                      await cryptoStore.TransferNFT({network, nft});
                    } catch(error) {
                      rootStore.Log(error, true);
                      setTransferError("Failed to transfer NFT");
                    }
                  }
                })}
              >
                Transfer NFT To { name }
              </button>
            ))
        }
      </div>
    </div>
  );
});

export default TransferSection;
