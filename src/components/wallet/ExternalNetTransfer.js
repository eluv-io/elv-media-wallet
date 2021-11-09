import React from "react";
import {
  rootStore
} from "Stores/index";
import { ethers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";

// GetNFTDelegation = flow(function * ({network, nftAddress, tokenId}) {
//   return yield Utils.ResponseToJson(
//     yield this.client.authClient.MakeAuthServiceRequest({
//       path: UrlJoin("as", "wlt", "act", tenantId),
//       method: "POST",
//       body: {
//         op: "nft-transfer",
//         tgt: network,
//         adr: nftAddress,
//         tok: tokenId
//       },
//       headers: {
//         Authorization: `Bearer ${this.client.signer.authToken}`
//       }
//     })
//   );
// });

const xferNFT = async ({network, nftAddress, tok}) => {
  // Hit API with function commented out above in the rootstore. Tenant ID is hardcoded, not sure if this is true in the prod env tho.
  let response = await rootStore.GetNFTDelegation({network, nftAddress, tokenId: tok});

  // Define contract functions and the contracts address on the target chain
  let abi = ["function mintSignedWithTokenURI(address to, uint256 tokenId, string memory tokenURI, uint8 v, bytes32 r, bytes32 s) public returns (bool)", "function mintWithTokenURI(address to, uint256 tokenId, string memory tokenURI) public returns (bool)"];
  let networkAddr = response.caddr;
  const accs = await window.ethereum.request({ method: "eth_requestAccounts" }); accs;
  // get the connected signer and check that it's on the right chain.
  let signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  if (window.ethereum.chainId !== "0x4") {
    await ethereum.request({ method: "wallet_switchEthereumChain", params:[{chainId: "0x4"}]});
    alert("Reloading the page to switch your chain");
    location.reload();
  }
  // Wallet connect example: 
  // let provider = new WalletConnectProvider({
  //   infuraId: "029ae68725a144d6800e1f041b5f056c",
  // });
  // await provider.enable();
  // let web3provider = new ethers.providers.Web3Provider(provider);
  // let signer = web3provider.getSigner();

  // Create Contract and call appropriate method:
  let contract = new ethers.Contract(networkAddr, abi, signer);
  let minted = await contract.mintSignedWithTokenURI(
    response.taddr, 
    tok, 
    response.turi, 
    ethers.utils.arrayify("0x" + response.v), 
    ethers.utils.arrayify("0x" + response.r), 
    ethers.utils.arrayify("0x" + response.s), 
    {gasPrice: ethers.utils.parseUnits("100", "gwei"), gasLimit: 1000000} // I was getting some weird "unpredictable gas" errors w/o this
  );
  // let minted = await contract.mintWithTokenURI(
  //   response.taddr, 
  //   tok, 
  //   response.turi, 
  //   {gasPrice: ethers.utils.parseUnits("100", "gwei"), gasLimit: 1000000}
  // );

  alert(minted.hash);
};

/**
 * 
 * @param {string} network - string name of the network to publish to per @Paul only "rinkeby" is supported right now
 * @param {object} nft - just needs to be of the following structure: {details: {ContractAddr, TokenIdStr}}
 * @returns 
 */
export const MainNetTransfer = ({network, nft}) => {
  let nftAddress = nft.details.ContractAddr;
  let tok = nft.details.TokenIdStr;
  return ( 
    <div>
      <button
        className = "transfer-button"
        role = "link"
        onClick = {
          () => xferNFT({network, nftAddress, tok})
        } >
    Transfer NFT To Network
      </button>
    </div>
  );
};