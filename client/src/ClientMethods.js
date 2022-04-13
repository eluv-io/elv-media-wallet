/**
 * Methods for accessing information from the wallet and performing actions
 *
 * @module ElvWalletClient/Methods
 */

const Assert = (method, name, value) => {
  if(!value) {
    throw Error(`Eluvio Wallet Client: ${name} not specified in ${method} call`);
  }
};

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
 *
 * @returns {Promise<string>} - The version hash of the specified marketplace
 */
exports.SetMarketplace = async function ({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return this.SendMessage({
    action: "setMarketplace",
    params: {
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash
    }}
  );
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
 * @returns {Promise<Object>} - Information about available stock in the specified marketplace
 */
exports.MarketplaceStock = async function ({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return this.SendMessage({action: "stock", params: { tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash }});
};

/**
 * Return the current user's profile, including name, email and blockchain address.
 *
 * @methodGroup User
 * @returns {Promise<Object>} - If a user is currently logged in, the user's profile is returned.
 */
exports.UserProfile = async function () {
  return await this.SendMessage({
    action: "profile",
    params: {}
  });
};

/**
 * Retrieve the fund balances for the current user
 *
 * @methodGroup User
 * @returns {Promise<Object>} - Returns balances for the user. All values are in USD.
 <ul>
 <li>- totalWalletBalance - Total balance of the users sales and wallet balance purchases</li>
 <li>- availableWalletBalance - Balance available for purchasing items</li>
 <li>- pendingWalletBalance - Balance unavailable for purchasing items</li>
 <li>- withdrawableWalletBalance - Amount that is available for withdrawal</li>
 <li>- usedBalance - <i>(Only included if user has set up Solana link with the Phantom wallet)</i> Available USDC balance of the user's Solana wallet</li>
 </ul>
 */
exports.UserBalances = async function() {
  return await this.SendMessage({
    action: "balances",
    params: {}
  });
};

/**
 * Retrieve the full metadata for the specified marketplace object (starting from `/public/asset_metadata/info`)
 *
 * @methodGroup Marketplace
 * @namedParams
 * @param {string=} tenantSlug - Specify the URL slug of the marketplace's tenant. Required if specifying marketplace slug
 * @param {string=} marketplaceSlug - Specify the URL slug of the marketplace
 *
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
 * @methodGroup Event
 * @namedParams
 * @param {string=} tenantSlug - Specify the URL slug of the event's tenant. Required if specifying event slug
 * @param {string=} eventSlug - Specify the URL slug of the event
 * @param {string=} eventHash - Specify a specific version of a the event. Not necessary if eventSlug is specified
 *
 * @returns {Promise<Object>} - The full metadata of the event
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
 * Retrieve all items from the specified marketplace.
 *
 * Note that this includes items that may not be for displayed sale in the marketplace. For information specifically about items displayed
 * for sale, see the <a href="#.MarketplaceStorefront">MarketplaceStorefront method</a>.
 *
 * @methodGroup Marketplace
 * @namedParams
 * @param {string} tenantSlug - Specify the URL slug of the marketplace's tenant. Required if specifying marketplace slug
 * @param {string} marketplaceSlug - Specify the URL slug of the marketplace
 */
exports.MarketplaceItems = async function({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return await this.SendMessage({
    action: "marketplaceItems",
    params: {
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash
    }
  });
};

/**
 * Retrieve the specified item from the specified marketplace
 *
 * @methodGroup Marketplace
 * @namedParams
 * @param {string} tenantSlug - Specify the URL slug of the marketplace's tenant. Required if specifying marketplace slug
 * @param {string} marketplaceSlug - Specify the URL slug of the marketplace
 * @param {string} sku - The SKU of the item
 */
exports.MarketplaceItem = async function({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash, sku}) {
  return await this.SendMessage({
    action: "marketplaceItem",
    params: {
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash,
      sku
    }
  });
};


/**
 * Retrieve information about the items displayed for sale in the specified marketplace
 *
 * @methodGroup Marketplace
 * @namedParams
 * @param {string=} tenantSlug - Specify the URL slug of the marketplace's tenant. Required if specifying marketplace slug
 * @param {string=} marketplaceSlug - Specify the URL slug of the marketplace
 */
exports.MarketplaceStorefront = async function({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash}) {
  return await this.SendMessage({
    action: "marketplaceStorefront",
    params: {
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash
    }
  });
};

/**
 * <b><i>Note: Will either prompt user for consent (wallet balance) or open the third party payment flow in a new tab (stripe, coinbase)</i></b>
 *
 * Initiate purchase flow for the specified item
 *
 * @methodGroup Purchases
 * @namedParams
 * @param {string} tenantSlug - Specify the URL slug of the marketplace's tenant. Required if specifying marketplace slug
 * @param {string} marketplaceSlug - Specify the URL slug of the marketplace
 * @param {string} purchaseProvider=stripe - The payment flow to use for the purchase. Available providers:
 <ul>
 <li>- stripe - Credit card payment flow with stripe</li>
 <li>- coinbase - Crypto payment flow with Coinbase</li>
 <li>- wallet-balance - Purchase with the user's available wallet balance (<b>Requires consent prompt</b>).</li>
 </ul>
 <br />
 <b>Note</b>: Use the <a href="#.UserBalances"> UserBalances method</a> to check the user's available balance.
 * @param {string} sku - SKU ID of the item to purchase
 * @param {number=} quantity=1 - Quantity of the item to purchase. It is recommended to check the <a href="#.MarketplaceStock">MarketplaceStock API</a> to ensure enough quantity is available.
 *
 * @returns {Promise<string>} - The confirmation ID of the purchase. This ID can be used to check purchase and minting status via the <a href="#.PurchaseStatus">PurchaseStatus method</a>.
 */
exports.MarketplacePurchase = async function({tenantSlug, marketplaceSlug, marketplaceId, marketplaceHash, purchaseProvider, sku, quantity}) {
  return await this.SendMessage({
    action: "marketplacePurchase",
    params: {
      provider: purchaseProvider,
      tenantSlug,
      marketplaceSlug,
      marketplaceId,
      marketplaceHash,
      sku,
      quantity
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
 * @returns {Promise<Array<String>>} - A list of item names
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
 * @param {string=} filter - Filter results by item name.
 <br /><br />
 NOTE: This string must be an <b>exact match</b> on the item name.
 * You can retrieve all available item names from the <a href="#.ItemNames">ItemNames method</a>.
 * @param {string=} contractAddress - Filter results by contract address
 *
 * @methodGroup Items
 * @returns {Promise<Array<Object>>} - Information about the items in the user's wallet.
 */
exports.Items = async function ({
  sortBy="default",
  sortDesc=false,
  filter,
  contractAddress
}={}) {
  return await this.SendMessage({
    action: "items",
    params: {
      sortBy,
      sortDesc,
      filter,
      contractAddress
    }
  });
};

/**
 * Return info about a specific item in the user's wallet
 *
 * @methodGroup Items
 * @namedParams
 * @param {string} contractAddress - The address of the contract
 * @param {string} tokenId - The ID of the item
 *
 * @returns {Promise<Object>} - Information about the requested item. Returns undefined if the item was not found.
 */
exports.Item = async function ({contractAddress, tokenId}) {
  Assert("Item", "Contract address", contractAddress);
  Assert("Item", "Token ID", tokenId);

  return await this.SendMessage({
    action: "item",
    params: {
      contractAddress,
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
 * @param {string=} filter - Filter results by item name.
 <br /><br />
 NOTE: This string must be an <b>exact match</b> on the item name.
 * You can retrieve all available item names from the <a href="#.ItemNames">ItemNames method</a>.
 * @param {string=} tenantSlug - Specify the URL slug of a marketplace's tenant. Required if specifying marketplace slug
 * @param {string=} marketplaceSlug - Filter listings by marketplace
 * @param {string=} contractAddress - Filter results by contract address
 *
 * @returns {Promise<Object>} - Available listings and pagination information
 */
exports.Listings = async function ({
  start=0,
  limit=50,
  tenantSlug,
  marketplaceSlug,
  sortBy="created",
  sortDesc=false,
  filter,
  contractAddress
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
      contractAddress
    }
  });
};

/**
 * Retrieve all listings posted by the current user.
 *
 * @methodGroup Listings
 * @namedParams
 *
 * @returns {Promise<Array<Object>>} - The current user's listings
  */
exports.UserListings = async function () {
  return await this.SendMessage({
    action: "userListings"
  });
};

/**
 * Return info about a specific item in the user's wallet
 *
 * @methodGroup Listings
 * @namedParams
 * @param {string} listingId - The ID of the listing to retrieve
 *
 * @returns {Promise<Object>} - Information about the requested listing. Returns undefined if the item was not found.
 */
exports.Listing = async function ({listingId}) {
  Assert("Listing", "Listing ID", listingId);

  return await this.SendMessage({
    action: "listing",
    params: {
      listingId
    }
  });
};

/**
 * <b><i>Note: Prompts user for consent</i></b>
 *
 * List the specified item for sale. The item must be owned by the current user, and must not have an active hold. (`nft.details.TokenHold`)
 *
 * @methodGroup Listings
 * @param {string} contractAddress - The address of the contract
 * @param {string} tokenId - The ID of the item
 * @param {number} price - Price for the item, in USD. The maximum listing price is $10,000
 *
 * @returns {Promise<string>} - The listing ID of the item
 */
exports.ListItem = async function({contractAddress, tokenId, price}) {
  Assert("ListItem", "Contract address", contractAddress);
  Assert("ListItem", "Token ID", tokenId);
  Assert("ListItem", "Price", price);

  return await this.SendMessage({
    action: "listItem",
    params: {
      contractAddress,
      tokenId,
      price
    }
  });
};


/**
 * <b><i>Note: Prompts user for consent</i></b>
 *
 * Modify the specify listing
 *
 * @methodGroup Listings
 * @param {string} listingId - The listing ID of the listing to change
 * @param {number} price - Price for the item, in USD. The maximum listing price is $10,000
 */
exports.EditListing = async function({listingId, price}) {
  Assert("EditListing", "Listing ID", listingId);
  Assert("ListItem", "Price", price);

  return await this.SendMessage({
    action: "editListing",
    params: {
      listingId,
      price
    }
  });
};

/**
 * <b><i>Note: Prompts user for consent</i></b>
 *
 * Modify the specify listing
 *
 * @methodGroup Listings
 * @param {string} listingId - The listing ID of the listing to remove
 */
exports.RemoveListing = async function({listingId}) {
  Assert("RemoveListing", "Listing ID", listingId);

  return await this.SendMessage({
    action: "removeListing",
    params: {
      listingId
    }
  });
};

/**
 * <b><i>Note: Will either prompt user for consent (wallet balance, linked solana wallet) or open the third party payment flow in a new tab (stripe, coinbase)</i></b>
 *
 * Initiate purchase flow for the specified listing
 *
 * @methodGroup Purchases
 * @namedParams
 * @param {string} listingId - The ID of the listing to purchase
 * @param {string} purchaseProvider=stripe - The payment flow to use for the purchase. Available providers:
 <ul>
 <li>- stripe - Credit card payment flow with stripe</li>
 <li>- coinbase - Crypto payment flow with Coinbase</li>
 <li>- wallet-balance - Purchase with the user's available wallet balance (<b>Requires consent prompt</b>).</li>
 <li>- linked-wallet - Purchase item with USDC on Solana using the Phantom wallet (<b>Requires popup prompt</b>)</li>
 </ul>
 <br />
 <b>Note</b>: Use the <a href="#.UserBalances"> UserBalances method</a> to check the user's available balance.
 *
 * @returns {Promise<string>} - The confirmation ID of the purchase. This ID can be used to check purchase and minting status via the <a href="#.PurchaseStatus">PurchaseStatus method</a>.
 */
exports.ListingPurchase = async function({listingId, purchaseProvider}) {
  return await this.SendMessage({
    action: "listingPurchase",
    params: {
      listingId,
      provider: purchaseProvider
    }
  });
};

/**
 * Retrieve the status of the specified purchase.
 *
 * The returned status has two parts:
 <ul>
 <li>- purchase - The status of the purchase flow. When the user has completed the process, this status will be COMPLETED. If the user aborts the purchase flow, this status will be CANCELLED.</li>
 <li>- minting - The status of the nft minting/transfer process. When the minting/transfer has finished, this status will be COMPLETED. If the process failed, this status will be FAILED.</li>
 <ul>
 *
 * @methodGroup Purchases
 * @namedParams
 * @param {string} confirmationId - The confirmation ID of the purchase
 *
 * @return {Promise<Object>} - The status of the purchase
 */
exports.PurchaseStatus = async function({confirmationId}) {
  Assert("PurchaseStatus", "Confirmation ID", confirmationId);

  return await this.SendMessage({
    action: "purchaseStatus",
    params: {
      confirmationId
    }
  });
};
