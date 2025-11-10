// Use libretranslate to automatically translate en.yml into the specified
// pyenv local 3.10
// pyenv exec libretranslate
// To install translations:  pyenv exec argospm install translate-en_es

const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const LocalizationEN = yaml.load(fs.readFileSync(path.join(__dirname, "..", "src", "static", "localizations", "en.yml"), "UTF-8"));

const TranslateLocalization = async (en, loc, lang, path) => {
  if(Array.isArray(en)) {
    let result = [];
    for(let i = 0; i < en.length; i++) {
      result[i] = await TranslateLocalization(en[i], loc?.[i], lang, `${path}.${i}`);
    }

    return result;
  } else if(typeof en === "object") {
    let result = {};
    for(const key of Object.keys(en)) {
      result[key] = await TranslateLocalization(en[key], loc?.[key], lang, `${path}.${key}`);
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
      const str = en.replaceAll(/{(\w+)}/g, "<span>$1</span>");
      const originalVariables = str.match(/<span>(\w+)<\/span>/g);
      console.log("Translating", path);
      const response = (
        await (
          await fetch("http://127.0.0.1:5000/translate", {
            method: "POST",
            body: JSON.stringify({
              q: str,
              source: "en",
              target: lang,
              format: "html"
            }),
            headers: { "Content-Type": "application/json" }
          })
        ).json()
      ) || {};

      let text = en;
      if(response.translatedText) {
        text = response.translatedText;

        text = response.translatedText;
        originalVariables?.forEach(variable =>
          text = text.replace(/<span>([^<]+)<\/span>/, `{${variable.replace("<span>", "").replace("</span>", "")}}`)
        );
      }

      return text;
    } catch(error) {
      console.error("Translation failed for " + en);
      console.error(error);
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

  TranslateLocalization(LocalizationEN, loc, lang, "")
    .then(async result => {
      fs.writeFileSync(
        path.join(__dirname, "..", "src", "static", "localizations", `${lang}.yml`),
        yaml.dump(result)
      );
    });
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
