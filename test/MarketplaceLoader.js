/**
 *  The MarketplaceLoader class handles calling the client.AvailableMarketplaces() function,
 *  and exposing the selections in the UI.  This is separated out here because in most actual apps, the
 *  tenant and marketplace will be fixed and this will be unnecessary.
 */
export class MarketplaceLoader {

  constructor(wallet, curMarketplaceParams) {
    this.walletClient = wallet;
    this.marketplaceParams = curMarketplaceParams;
  }

  toMarketplaceString(t, m) {
    return "Selected Marketplace: " + t + "/" + m;
  }

  async loadMarketplaces() {
    await this.walletClient.AvailableMarketplaces()
      .catch(err => { return err; })
      .then(marketplaces => {
        let select = document.getElementById("marketplaceSelector");
        let defaultOption = document.getElementById("defaultMarketplaceOption");
        if(defaultOption == undefined) {
          return;
        } else {
          defaultOption?.remove();
        }
        for(const existingOption of document.getElementsByClassName("mkOption")) {
          existingOption?.remove();
        }
        window.console.log("marketplaces[", Object.keys(marketplaces).length, "]:", marketplaces);
        for(const contents of Object.values(marketplaces)) {
          for(const value of Object.values(contents)) {
            if(typeof value === "object" && "marketplaceSlug" in value && "tenantSlug" in value) {
              let el = document.createElement("option");
              el.textContent = this.toMarketplaceString(value.tenantSlug, value.marketplaceSlug);
              el.value = value.tenantSlug + "/" + value.marketplaceSlug;
              el.className = "mkOption";
              select.appendChild(el);
            }
          }
        }
        select.value = this.marketplaceParams.tenantSlug + "/" + this.marketplaceParams.marketplaceSlug;
      });
  }

  setMarketplace(event) {
    const [tenant, market] = event.target.value.split("/");
    const url = new URL(window.location.href);

    url.searchParams.set("tenant-name", tenant);
    url.searchParams.set("marketplace-name", market);
    window.history.replaceState("", "", url.toString());
    window.location = url;
  };

}
