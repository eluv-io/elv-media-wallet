// Use libretranslate to automatically translate en.yml into the specified
// pyenv local 3.10
// pyenv exec libretranslate --load-only en,es,fr,it,de,pt,pt-br
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const LocalizationEN = yaml.load(fs.readFileSync(path.join(__dirname, "..", "src", "static", "localizations", "en.yml"), "UTF-8"));

const TranslateLocalization = async (en, loc, lang) => {
  if(Array.isArray(en)) {
    let result = [];
    for(let i = 0; i < en.length; i++) {
      result[i] = await TranslateLocalization(en[i], loc?.[i], lang)
    }

    return result;
  } else if(typeof en === "object") {
    let result = {};
    for(const key of Object.keys(en)) {
      result[key] = await TranslateLocalization(en[key], loc?.[key], lang);
    }

    return result;
  } else if(typeof en === typeof loc) {
    // Already localized
    return loc;
  } else if(typeof en !== "string") {
    // Don't localize things that aren't strings
    return en;
  } else {
    try {
      const response = (
        await (
          await fetch("http://127.0.0.1:5000/translate", {
            method: "POST",
            body: JSON.stringify({
              q: en,
              source: "en",
              target: "it",
              format: "text"
            }),
            headers: { "Content-Type": "application/json" }
          })
        ).json()
      ) || {};

      return response.translatedText || en;
    } catch(error) {
      console.error("Translation failed for " + en);
      console.log(error);
    }
  }
};

const lang = process.argv[2];

if(!lang) {
  console.error("Usage: node TranslateLocalization.js <lang-key>");
} else {
  let loc = {};

  try {
    const existingL10n = fs.readFileSync(path.join(__dirname, "..", "src", "static", "localizations", `${lang}.yml`), "UTF-8");
    if(existingL10n) {
      loc = yaml.load(existingL10n);
    }
  } catch(error) {
    console.warn("No existing localization file for " + lang);
  }

  TranslateLocalization(LocalizationEN, loc, lang)
    .then(result => console.log(yaml.dump(result)));
}

/*
const Test = async () => {
  const res = await fetch("http://127.0.0.1:5000/translate", {
    method: "POST",
    body: JSON.stringify({
      q: "hello",
      source: "en",
      target: "it",
      format: "text",
      //api_key: ""
    }),
    headers: { "Content-Type": "application/json" }
  });
  console.log(res);

console.log(await res.json());
}

Test();


 */
