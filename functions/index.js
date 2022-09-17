const functions = require("firebase-functions");
const fs = require("fs");
const Path = require("path");

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.bigben = functions.https.onRequest((req, res) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  const hours = (new Date().getHours() % 12) + 1;
  res.status(200).send(`<!doctype html>
    <head> <title>Time</title> </head>
    <body> ${"BONG ".repeat(hours)} </body>
  </html>`);
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
};

exports.create_index_html = functions.https.onRequest((req, res) => {
  let html = fs.readFileSync(Path.resolve(__dirname, "./index-template.html")).toString();

  // Inject metadata
  let title = req.url;
  let description = req.url;
  for(const [key, value] of Object.entries(elv_live_data)) {
    functions.logger.info(key, value);
    if(req.headers.host.indexOf(key) > 0) {
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
