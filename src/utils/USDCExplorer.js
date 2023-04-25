
const USDCBlockExplorerUrl = (addr) => {
  const mainTokenExplorer = EluvioConfiguration.usdcExplorer || "https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const testTokenExplorer = EluvioConfiguration.usdcExplorer || "https://goerli.etherscan.io/token/0x07865c6e87b9f70255377e024ace6630c1eaa37f";

  return EluvioConfiguration.network === "demo" ? testTokenExplorer + "?a=" + addr : mainTokenExplorer + "?a=" + addr;
};

export default USDCBlockExplorerUrl;