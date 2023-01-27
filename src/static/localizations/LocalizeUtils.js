const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const LocalizationEN = yaml.load(fs.readFileSync(path.join(__dirname, "en.yml"), "UTF-8"));

const RandomizeString = (str) => {
  let varActive = false;
  return str
    .split("")
    .map(c => {
      if(["(", "{", "["].includes(c)) {
        varActive = true;
      } else if([")", "}", "]"].includes(c)) {
        varActive = false;
      } else if(!varActive && c.match(/[a-zA-Z]/)) {
        c = String.fromCharCode(0|Math.random()*26+97);
      }

      return c;
    })
    .join("");
};

const GenerateTest = (l10n) => {
  if(Array.isArray(l10n)) {
    return l10n.map(GenerateTest);
  } else if(typeof l10n === "object") {
    let newl10n = {};
    Object.keys(l10n).forEach(key => newl10n[key] = GenerateTest(l10n[key]));

    return newl10n;
  } else {
    return RandomizeString(l10n.toString());
  }
};

if(process.argv[2] === "test") {
  fs.writeFileSync(
    path.join(__dirname, "test.yml"),
    yaml.dump(GenerateTest(LocalizationEN))
  );
}
