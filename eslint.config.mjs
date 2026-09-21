import path from "path";
import { fileURLToPath } from "url";
import globals from "globals";
import { defineConfig, globalIgnores } from "@eslint/config-helpers";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { fixupConfigRules } from "@eslint/compat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

  const compatWithRecommended = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
  });
export default defineConfig([
  globalIgnores([".idea/","**.DS_STORE","node_modules/","client/node_modules/","client/test/node_modules/","/configuration.js","deploy.sh","dist/","test/dist/","scratch/","!.keep","firebase-debug*","firestore-debug*","ui-debug*","dist",".eslintrc.cjs"]),
  {
    extends: fixupConfigRules(compatWithRecommended.extends(
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:react/jsx-runtime",
      "plugin:react-hooks/recommended"
    )),
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020
      },
      sourceType: "module",
      parserOptions: {
        ecmaVersion: "latest"
      }
    },
    rules: {
      "react-hooks/set-state-in-effect": 0,
      "react-hooks/immutability": 0,
      "react-hooks/exhaustive-deps": 0,
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-undef": 0,
      "no-case-declarations": 0,
      "no-async-promise-executor": 0,
      "react/prop-types": 0,
      semi: ["error", "always", { "omitLastInOneLineClassBody": true }],
      "no-console": ["error", { "allow": ["error", "info", "time", "timeEnd"] }],
      quotes: [
      "error",
      "double"
    ],
      "no-constant-binary-expression": "off",
      "no-empty-static-block": "off",
      "no-new-native-nonconstructor": "off",
      "no-unused-private-class-members": "off"
    },
  }
]);
