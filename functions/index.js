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
    body = body + "\tmeta property=\"" + key + "\" content=\"" + value + "\"<br/>\n";
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
