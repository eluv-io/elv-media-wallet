const functions = require("firebase-functions");
const fs = require("fs");
const Path = require("path");

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.ping = functions.https.onRequest((req, res) => {
  functions.logger.info("functions access test", {host: req.hostname});
  res.status(200).send(`<!doctype html>
    <head> <title>functions test</title> </head>
    <body> functions are working </body>
  </html>
`);
});

const elv_live_data = {
  cannonball: {
    url: "https://realcannonball.com/",
    title: "The Real Cannonball Run",
    description: "Insiders know the cannonball run wasn’t just a movie. It was an illegal protest race across the US to prove national speed limits wrong…",
  },
  maskverse: {
    url: "https://maskverse.com/",
    title: "The MaskVerse",
    description: "The Masked Singer Season 8 Premieres September 21st on Fox!",
  },
  dollyverse: {
    url: "https://welcometodollyverse.com/",
    title: "Welcome to Dollyverse",
    description: "Global superstar Dolly Parton and best-selling author James Patterson welcome you to Dollyverse, an unforgettable Web3 experience, powered by Blockchain Creative Labs on Eluvio. Purchase limited-edition NFTs of Dolly’s new album, “Run, Rose, Run” and her commemorative SXSW Poster.",
  },
  "localhost:5001": {
    url: "http://localhost:5001/",
    title: "Welcome to LocalHost!",
    description: "Global superstar LocalHost welcomes you to an unforgettable Web3 experience, powered by Blockchain Creative Labs on Eluvio."
  },
  "us-central1-elv-rewriter.cloudfunctions.net": {
    url: "https://elv-rewriter.web.app/index.html",
    title: "Welcome to elv-rewriter!",
    description: "Global superstar elv-rewriter welcomes you to an unforgettable Web3 experience, powered by Blockchain Creative Labs on Eluvio."
  },
};

exports.create_index_html = functions.https.onRequest((req, res) => {
  let html = fs.readFileSync(Path.resolve(__dirname, "./index-template.html")).toString();

  // Inject metadata
  let title = JSON.stringify(req.headers);
  let description = JSON.stringify(req.headers);
  for(const [key, value] of Object.entries(elv_live_data)) {
    functions.logger.info("checking", key);
    if(req.hostname.indexOf(key) > -1 || req.headers.host.indexOf(key) > -1) {
      title = value.title;
      description = value.description;
    }
  }

  // no replaceAll, just do it twice
  html = html.replace("@@TITLE@@", title);
  html = html.replace("@@TITLE@@", title);
  html = html.replace("@@DESCRIPTION@@", description);
  html = html.replace("@@DESCRIPTION@@", description);

  res.status(200).send(html);
});
