/**
 * Methods for accessing information from the wallet and performing actions
 *
 * @module ElvWalletClient/Methods
 */


/**
 * Set the marketplace for the wallet.
 *
 * This will update the font, color scheme, bottom navigation and login customization to the settings of the marketplace specified.
 *
 * Note that this is not required if the client was initialized with a marketplace.
 *
 * @methodGroup Marketplace
 * @namedParams
 * @param {string=} tenantSlug - Specify the URL slug of your tenant. Required if specifying marketplaceSlug
 * @param {string=} marketplaceSlug - Specify the URL slug of your marketplace
 * @param {string=} marketplaceId - The ID of the marketplace
 * @param {string=} marketplaceHash - A version hash of the marketplace
 *
 * @return {Promise<string>} - The version hash of the specified marketplace
 */
exports.SetMarketplace = async function ({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return this.SendMessage({action: "setMarketplace", params: { tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash }});
};

/**
 * Set filters for the marketplace store view. When active, only items with matching tags will be shown in the marketplace
 *
 * @methodGroup Marketplace
 * @namedParams
 * @param filters - The filter(s) to be applied
 */
exports.SetMarketplaceFilters = async function ({filters=[]}) {
  return this.SendMessage({action: "setMarketplaceFilters", params: { filters }});
};

/**
 * Clear all marketplace filters
 *
 * @methodGroup Marketplace
 */
exports.ClearMarketplaceFilters = async function () {
  return this.SendMessage({action: "setMarketplaceFilters", params: { filters: [] }});
};

/**
 * Retrieve available item stock for the specified marketplace. Items are keyed by their SKU. If an item's stock is not restricted,
 * no entry will be present. If a user is currently logged in, the entry will contain the number of that item the current user owns.

 * @methodGroup Marketplace
 * @namedParams
 * @param {string=} tenantSlug - Specify the URL slug of your tenant. Required if specifying marketplaceSlug
 * @param {string=} marketplaceSlug - Specify the URL slug of your marketplace
 * @param {string=} marketplaceId - The ID of the marketplace
 * @param {string=} marketplaceHash - A version hash of the marketplace
 *
 * @return {Promise<Object>} - Information about available stock in the specified marketplace
 */
exports.MarketplaceStock = async function ({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return this.SendMessage({action: "stock", params: { tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash }});
};

/**
 * Return the current user's profile, including name, email and blockchain address.
 *
 * @methodGroup User
 * @return Promise<Object> - If a user is currently logged in, the user's profile is returned.
 */
exports.UserProfile = async function () {
  return await this.SendMessage({
    action: "profile",
    params: {}
  });
};

/**
 * Retrieve the full metadata for the specified marketplace object (starting from `/public/asset_metadata/info`)
 *
 * @methodGroup Metadata
 * @param {string=} tenantSlug - Specify the URL slug of the marketplace's tenant. Required if specifying marketplace slug
 * @param {string=} marketplaceSlug - Specify the URL slug of the marketplace
 * @param {string=} marketplaceHash - Specify a specific version of a the marketplace. Not necessary if marketplaceSlug is specified
 *
 * @return Promise<Object> - The full metadata of the marketplace
 */
exports.MarketplaceMetadata = async function ({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return await this.SendMessage({
    action: "marketplaceMetadata",
    params: {
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash
    }
  });
};

/**
 * Retrieve the full metadata for the specified event object (starting from `/public/asset_metadata`)
 *
 * @methodGroup Metadata
 * @param {string=} tenantSlug - Specify the URL slug of the event's tenant. Required if specifying event slug
 * @param {string=} eventSlug - Specify the URL slug of the event
 * @param {string=} eventHash - Specify a specific version of a the event. Not necessary if eventSlug is specified
 *
 * @return Promise<Object> - The full metadata of the event
 */
exports.EventMetadata = async function ({tenantSlug, eventSlug, eventId, eventHash}) {
  return await this.SendMessage({
    action: "eventMetadata",
    params: {
      tenantSlug,
      eventSlug,
      eventId,
      eventHash
    }
  });
};

/**
 * Retrieve names of all valid items. Full item names are required for filtering results by name.
 *
 * Specify tenant slug and marketplace slug to filter the results to only items offered in that marketplace
 *
 * @methodGroup Items
 * @namedParams
 * @param {string=} tenantSlug - Specify the URL slug of a marketplace's tenant. Required if specifying marketplace slug
 * @param {string=} marketplaceSlug - Specify the URL slug of a marketplace
 *
 * @return Promise<Array<String>> - A list of item names
 */
exports.ItemNames = async function({tenantSlug, marketplaceSlug}={}) {
  return await this.SendMessage({
    action: "itemNames",
    params: {
      tenantSlug,
      marketplaceSlug
    }
  });
};

/**
 * Return info about items in the user's wallet
 *
 * @methodGroup Items
 * @namedParams
 * @param {string=} sortBy=default - Sort order for the results - either `default` or `meta/display_name`
 * @param {boolean=} sortDesc=false - Sort in descending order
 * @param {string=} filter - Filter results by item name. NOTE: This string must be an *exact match* on the item name.
 * You can retrieve all available item names from the ItemNames method
 * @param {string=} contractAddress - Filter results by contract address
 * @param {string=} contractId - Filter results by contract ID
 *
 * @methodGroup Items
 * @return Promise<Array<Object>> - Information about the items in the user's wallet.
 */
exports.Items = async function ({
  sortBy="default",
  sortDesc=false,
  filter,
  contractAddress,
  contractId
}={}) {
  return await this.SendMessage({
    action: "items",
    params: {
      sortBy,
      sortDesc,
      filter,
      contractAddress,
      contractId
    }
  });
};

/**
 * Return info about a specific item in the user's wallet
 *
 * @methodGroup Items
 * @namedParams
 * @param {string=} contractAddress - The address of the contract. Either contractAddress or contractId is required.
 * @param {string=} contractId - The ID of the contract. Either contractAddress or contractId is required.
 * @param {string} tokenId - The ID of the item
 *
 * @return Promise<Object> - Information about the requested item. Returns undefined if the item was not found.
 */
exports.Item = async function ({contractAddress, contractId, tokenId}) {
  if(!contractAddress && !contractId) {
    throw Error("Eluvio Wallet Client: Contract information not provided in Item call");
  }

  if(!tokenId) {
    throw Error("Eluvio Wallet Client: Token ID not provided in Item call");
  }

  return await this.SendMessage({
    action: "item",
    params: {
      contractAddress,
      contractId,
      tokenId: tokenId.toString()
    }
  });
};

/**
 * Return available listings
 *
 * @methodGroup Listings
 * @namedParams
 * @param {number=} start=0 - Index to start listing at
 * @param {number=} limit=50 - Maximum number of results to return
 * @param {string=} sortBy=created - Sort order for the results. Available sort options:
 <ul>
  <li>- created</li>
  <li>- info/ordinal</li>
  <li>- price</li>
  <li>- nft/display_name</li>
 </ul>
 * @param {boolean=} sortDesc=false - Sort in descending order
 * @param {string=} filter - Filter results by item name. NOTE: This string must be an *exact match* on the item name.
 * You can retrieve all available item names from the <a href="#ItemNames">ItemNames</a> method
 * @param {string=} tenantSlug - Specify the URL slug of a marketplace's tenant. Required if specifying marketplace slug
 * @param {string=} marketplaceSlug - Filter listings by marketplace
 * @param {string=} contractAddress - Filter results by contract address
 * @param {string=} contractId - Filter results by contract ID
 *
 * @methodGroup Listings
 * @return Promise<Array<Object>> - Information about the items in the user's wallet.
 */
exports.Listings = async function ({
  start=0,
  limit=50,
  tenantSlug,
  marketplaceSlug,
  sortBy="created",
  sortDesc=false,
  filter,
  contractAddress,
  contractId
}={}) {
  return await this.SendMessage({
    action: "listings",
    params: {
      start,
      limit,
      marketplaceSlug,
      tenantSlug,
      sortBy,
      sortDesc,
      filter,
      contractAddress,
      contractId
    }
  });
};

/**
 * Return info about a specific item in the user's wallet
 *
 * @methodGroup Listings
 * @namedParams
 * @param {string=} contractAddress - The address of the contract. Either contractAddress or contractId is required.
 * @param {string=} contractId - The ID of the contract. Either contractAddress or contractId is required.
 * @param {string} tokenId - The ID of the item
 *
 * @return Promise<Object> - Information about the requested item. Returns undefined if the item was not found.
 */
exports.Listing = async function ({listingId}) {
  if(!listingId) {
    throw Error("Eluvio Wallet Client: Listing ID not provided in Listing call");
  }

  return await this.SendMessage({
    action: "listing",
    params: {
      listingId
    }
  });
};
