const functions = require("firebase-functions");
require("date");
const fs = require("fs");
const Path = require("path");
const axios = require("axios");

//
// Firebase cloud functions
// docs: https://firebase.google.com/docs/functions/
// logs: https://console.cloud.google.com/logs/query
//


// health check
exports.ping = functions.https.onRequest((req, res) => {
  functions.logger.info("headers dumper", {host: req.hostname});
  let body = "";
  for(const [key, value] of Object.entries(req.headers)) {
    body = body + "\t header=\"" + key + "\" val=\"" + value + "\"<br/>\n";
  }

  res.status(200).send(`<!DOCTYPE html>
    <html> <head> <title>cloud functions headers test</title> </head>
    <body> hostname ${req.hostname} /
           url ${req.url} /
           href ${req.href} /
           referrer ${req.referrer} /
           originalUrl ${req.originalUrl} /
           path ${req.path}<br/>
      ${body} </body> </html>`);
});

//
// Firebase cloud function definitions for Previewable Share URLs
// https://github.com/qluvio/elv-apps-projects/issues/210
//

// create index.html with metadata based on url path
exports.create_previewable_link = functions.https.onRequest(async (req, res) => {
  let html = fs.readFileSync(Path.resolve(__dirname, "./index-template-wallet.html")).toString();

  let title = "Eluvio: The Content Blockchain";
  let description = "Web3 native content storage, streaming, distribution, and tokenization";
  let image = "https://live.eluv.io/logo-color.png";
  let meta = "";

  let og = req.query.og;
  functions.logger.info("got og", og, "from", req.url);

  if(og) {
    // parse metadata
    const tags = JSON.parse(atob(og));
    functions.logger.info("tags", tags);

    // allow other og: items generically
    const knownKeys = ["og:title", "og:image", "og:description"];
    Object.keys(tags).forEach((key) => {
      if(!knownKeys.includes(key)) {
        functions.logger.info("custom key " + key);
        const elem = `<meta property="${key}" content="${tags[key]}" />`;
        meta = meta + "\n        " + elem;
      }
    });

    title = tags["og:title"];
    description = tags["og:description"];
    image = tags["og:image"];
  }

  // inject metadata
  html = html.replace(/@@TITLE@@/g, title);
  html = html.replace(/@@DESCRIPTION@@/g, description);
  html = html.replace(/@@IMAGE@@/g, image);
  html = html.replace(/@@META@@/g, meta);

  res.status(200).send(html);
});


//
// Firebase cloud function definitions for elv-live rewrite support
// docs: https://firebase.google.com/docs/functions/
// logs: https://console.cloud.google.com/logs/query
//

const MaxCacheAge = 1000 * 60 * 5; // 5 min in millis
let elvLiveDataCache = {};
const FabricConfiguration = {
  demov3: {
    configUrl: "https://demov3.net955210.contentfabric.io/config",
    staging: {
      siteId: "iq__2gkNh8CCZqFFnoRpEUmz7P3PaBQG",
      libId: "ilib36Wi5fJDLXix8ckL7ZfaAJwJXWGD",
    }
  },
  main: {
    configUrl: "https://main.net955305.contentfabric.io/config",
    staging: {
      siteId: "iq__inauxD1KLyKWPHargCWjdCh2ayr",
      libId: "ilib2GdaYEFxB7HyLPhSDPKMyPLhV8x9",
    },
    production: {
      siteId: "iq__suqRJUt2vmXsyiWS5ZaSGwtFU9R",
      libId: "ilib2GdaYEFxB7HyLPhSDPKMyPLhV8x9",
    }
  }
};

const getNetworkAndMode = (req) => {
  const originalHost = req.headers["x-forwarded-host"] || req.hostname;
  const network = originalHost.indexOf("demov3") > -1 ? "demov3" : "main";
  const mode = originalHost.indexOf("stg") > -1 || network == "demov3" ? "staging" : "production";

  // allow testing instance to hit both configs
  if(originalHost == "elv-rewriter.web.app") { return ["main", "staging"]; }
  if(originalHost == "elv-rewriter.firebaseapp.com") {return ["demov3", "staging"]; }

  return [network, mode];
};

const getNetworkPrefix = async (req) => {
  const [network, mode] = getNetworkAndMode(req);
  functions.logger.info("network/mode:", network, mode);
  const prefix = await getFabricApi(network);

  return [
    prefix + "/s/" + network +
    "/qlibs/" + FabricConfiguration[network][mode].libId +
    "/q/" + FabricConfiguration[network][mode].siteId,
    network + ":" + mode
  ];
};

const getFabricApi = async (network) => {
  const configUrl = FabricConfiguration[network].configUrl;

  const resp = await axios.get(configUrl);

  return resp.data["network"]["seed_nodes"]["fabric_api"][0];
};


// health check and header dump utility
exports.ping = functions.https.onRequest((req, res) => {
  functions.logger.info("headers dumper", {host: req.hostname});
  let meta = "";
  let body = "";
  for(const [key, value] of Object.entries(req.headers)) {
    meta = meta + "\t<meta property=\"og:" + key + "\" content=\"" + value + "\" />\n";
    body = body + "\tmeta property=\"og:" + key + "\" content=\"" + value + "\"<br/>\n";
  }

  res.status(200).send(`<!DOCTYPE html>
    <html> <head> <title>cloud functions headers test</title> ${meta} </head>
    <body> ${req.hostname} / ${req.url} / ${req.href} / ${req.referrer} / ${req.originalUrl} / ${req.path}<br/>
      ${body} </body> </html>`);
});

// load and return elv-live data for this network/mode
exports.load_elv_live_data = functions.https.onRequest(async (req, res) => {
  try {
    let sites = await loadElvLiveAsync(req);
    functions.logger.info("loaded elv-live sites", {sites: sites});
    res.status(200).send(sites);
  } catch(error) {
    functions.logger.info(error);
    res.status(500).send("something went wrong.");
  }
});

// create index.html with metadata based on url path
exports.create_index_html = functions.https.onRequest(async (req, res) => {
  let html = fs.readFileSync(Path.resolve(__dirname, "./index-template.html")).toString();

  let sites = {};
  try {
    sites = await loadElvLiveAsync(req);
  } catch(e) {
    functions.logger.error("cannot loadElvLiveAsync", e);
  }

  const originalHost = req.headers["x-forwarded-host"] || req.hostname;
  const originalUrl = req.headers["x-forwarded-url"] || req.url;
  const fullPath = originalHost + originalUrl;

  let title = "Eluvio: The Content Blockchain";
  let description = "Web3 native content storage, streaming, distribution, and tokenization";
  let image = "https://live.eluv.io/logo-color.png";
  let favicon = "/favicon.png";

  // Inject metadata
  functions.logger.info("compare against incoming host", originalHost, "and url", originalUrl);
  functions.logger.info("checking sites", Object.keys(sites));
  for(const [site, site_metadata] of Object.entries(sites)) {
    // match dns hostname, or match a path
    if(originalHost == site || originalUrl == ("/" + site)) {
      functions.logger.info("match", site, site_metadata);
      title = site_metadata.title;
      description = site_metadata.description;
      image = site_metadata.image;
      favicon = site_metadata.favicon;
      break;
    }
  }

  html = html.replace(/@@TITLE@@/g, title);
  html = html.replace(/@@DESCRIPTION@@/g, description);
  html = html.replace(/@@IMAGE@@/g, image);
  html = html.replace(/@@FAVICON@@/g, favicon);
  html = html.replace(/@@REWRITTEN_FROM@@/g, fullPath);

  res.status(200).send(html);
});


// load elv-live data from network or cache
const loadElvLiveAsync = async (req) => {
  const [networkPrefix, networkId] = await getNetworkPrefix(req);
  let elvLiveData = elvLiveDataCache[networkId];

  const cache_date = elvLiveData?.date;
  if(!cache_date) {
    functions.logger.info("cache is empty");
  } else {
    const age_millis = Date.now() - cache_date;
    functions.logger.info("cache is from", new Date(cache_date), "aged", age_millis/1000, "sec");
    if(age_millis > MaxCacheAge) {
      functions.logger.info("cache is old, re-fetch");
    } else {
      if(elvLiveData.data)
        return elvLiveData.data;
    }
  }

  // load sites
  const tenantsUrl = networkPrefix + "/meta/public/asset_metadata/tenants";
  functions.logger.info("using tenants url", tenantsUrl);

  const resp = await axios.get(tenantsUrl + "/?link_depth=2&resolve_ignore_errors=true");
  const tenantData = resp.data;

  let tenantsAndSite = {};
  for(const [tenant_name, tenant_obj] of Object.entries(tenantData)) {
    let sites = tenant_obj?.["sites"];
    for(const [site_name, _] of Object.entries(sites)) {
      tenantsAndSite[tenant_name + "/" + site_name] = { tenant: tenant_name, site: site_name };
    }
  }
  functions.logger.info("returning tenants+sites", tenantsAndSite);

  let ret = {};

  for(const tenantAndSite of Object.values(tenantsAndSite)) {
    const tenant_name = tenantAndSite.tenant;
    const site_name = tenantAndSite.site;
    //functions.logger.info("load site", tenant_name, site_name);

    const site = tenantData?.[tenant_name]?.["sites"]?.[site_name]?.["info"] || {};
    const event_info = site?.["event_info"] || {};

    const title = event_info?.["event_title"] || "";
    const description = event_info?.["description"] || "";
    const image = tenantsUrl + "/" + tenant_name + "/sites/" + site_name +
      "/info/event_images/hero_background?width=1200";
    let favicon = "";
    if("favicon" in site && site.favicon != null) {
      favicon = tenantsUrl + "/" + tenant_name + "/sites/" + site_name + "/info/favicon";
    }

    ret[tenant_name + "/" + site_name] = {
      "title": title,
      "description": description,
      "image": image,
      "favicon": favicon,
    };
  }

  // load featured events
  const featuredEventsUrl = networkPrefix + "/meta/public/asset_metadata/featured_events";
  functions.logger.info("using featured_events url", featuredEventsUrl);

  const fe = await axios.get(featuredEventsUrl);
  const featuredEventData = fe.data;

  for(const [idx, event] of Object.entries(featuredEventData)) {
    for(const [eventName, eventData] of Object.entries(event)) {
      //functions.logger.info("load featured_event", eventName);
      const fe = eventData?.["info"] || {};
      const event_info = fe?.["event_info"] || {};

      const title = event_info?.["event_title"] || "";
      const description = event_info?.["description"] || "";
      const image = featuredEventsUrl + "/" + idx + "/" + eventName +
        "/info/event_images/hero_background?width=1200";
      let favicon = "";
      if("favicon" in fe && fe.favicon != null) {
        favicon = featuredEventsUrl + "/" + idx + "/" + eventName + "/info/favicon";
      }

      ret[eventName] = {
        "title": title,
        "description": description,
        "image": image,
        "favicon": favicon,
      };
    }
  }

  // load DNS info
  const dnsMappingsUrl = networkPrefix + "/meta/public/asset_metadata/info/domain_map";
  functions.logger.info("using domain_map url", dnsMappingsUrl);

  const dr = await axios.get(dnsMappingsUrl);
  const dnsMappings = dr.data;
  functions.logger.info("domain map", {"domain-map": dnsMappings});

  dnsMappings.forEach(domain => {
    const t = domain["tenant_slug"];
    const e = domain["event_slug"];
    const path = t == "" ? e : t + "/" + e;
    if(ret[path]) {
      ret[domain.domain] = { ...(ret[path]) };
    }
  });

  elvLiveData = { data: ret };
  elvLiveData["date"] = new Date().getTime();
  functions.logger.info("elvLiveData", elvLiveData);

  elvLiveDataCache[networkId] = elvLiveData;
  return ret;
};


//
// Firebase cloud function definitions for Previewable Share URLs
// https://github.com/qluvio/elv-apps-projects/issues/210
//

// create index.html with metadata based on url path
exports.create_previewable_link = functions.https.onRequest(async (req, res) => {
  let html = fs.readFileSync(Path.resolve(__dirname, "./index-template-wallet.html")).toString();

  let title = "Eluvio: The Content Blockchain";
  let description = "Web3 native content storage, streaming, distribution, and tokenization";
  let image = "https://live.eluv.io/logo-color.png";

  const urlParams = new URLSearchParams(req.url);
  const og = urlParams.get('og')
  functions.logger.info("getting og", originalHost, "from", req.url);

  // Parse metadata
  const tags = JSON.parse(atob(og));
  functions.logger.info("tags", tags);
  let meta = "";
  const elems = Object.keys(tags).map(tagName => `<meta property="${tagName}" content="${tags[tagName]}" />`)
  elems.forEach((element) => meta = meta + "\n        " + m);

  // Inject metadata
  title = tags["og:title"];
  description = tags["og:description"];
  image = tags["og:image"];

  html = html.replace(/@@TITLE@@/g, title);
  html = html.replace(/@@DESCRIPTION@@/g, description);
  html = html.replace(/@@IMAGE@@/g, image);
  html = html.replace(/@@META@@/g, meta);

  res.status(200).send(html);
});
