## External Transfer Documentation
The main flow for the interaction is as follows:
NFT data (ContractAddr, TokenIdStr, TargetNetwork) -> Transfer NFT Authority service nft_transfer call -> contract interaction on target network -> token minted

This is implemented in [external tranfer](./ExternalNetTransfer.js) as a button, which performs this flow on a passed in NFT and network. 

### NFT Data:
 * @param {string} network - string name of the network to publish to per @Paul only "rinkeby" is supported right now
 * @param {object} nft - just needs to be of the following structure: {details: {ContractAddr, TokenIdStr}} from the NFT objects
The network should be selected by the user and the NFT should be given by the context of UI. I tried to follow the NFT object format, but I'm not sure if I got it right. 

### Auth Service Call
From here, we need the delegated permission to mint the NFT on the target chain (gas of course paid for by the user).
The general call is in [the root store](../../stores/index.js) on line 401. The parameters are all given by the NFT data and user choice of network. 
The bearer token should be `this.client.signer.authToken`.  

### Contract Interaction
We then assume that the user is connect either via metamask or walletconnect (if not I have it so that it'll prompt them to do that in the code).

We then take the contract address given by the Auth Service Call and instantiate the minting contact and pass in all the relevant parameters given by the call. 

It's important the user is connected to the correct chain on their external wallet when this happens, because otherwise the contact interaction will fail. 

For now the tokenId can be taken straight from the NFT as the Auth Service returns a non-uint tokenId. 

See how I implemented this in [external tranfer](./ExternalNetTransfer.js) as a simple button. 
