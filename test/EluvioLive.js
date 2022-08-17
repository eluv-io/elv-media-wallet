
/**
 * We encapsulate this method separately as it is loaded from an ABI.
 */
export class EluvioLive {

  constructor(wallet) {
    this.client = wallet.client;
  }

  /**
   * Get the NFT balance for a given user address
   *
   * @namedParams
   * @param {string} addr - The NFT contract address
   * @param {string} ownerAddr - A user address to check the balance of
   * @return {Promise<Object>} - Number of tokens owned
   */
  async NftBalanceOf({addr, ownerAddr}) {
    const resp = await fetch("test/ElvTradableLocal.abi");
    const abi = await resp.text();
    let res = await this.client.CallContractMethod({
      contractAddress: addr,
      abi: JSON.parse(abi),
      methodName: "balanceOf",
      methodArgs: [ownerAddr],
      formatArguments: true,
    });

    return res;
  }
}