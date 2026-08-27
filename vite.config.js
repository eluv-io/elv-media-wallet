import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import {analyzer} from "vite-bundle-analyzer";
import ViteYaml from "@modyfi/vite-plugin-yaml";
import autoprefixer from "autoprefixer";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(() => {
  let plugins = [
    react(),
    nodePolyfills({
      include: ["stream", "crypto"]
    }),
    ViteYaml(),
    viteStaticCopy({
      targets: [
        {
          src: "configuration.js",
          dest: ""
        }
      ]
    }),
    mkcert(),
  ];

  if(process.env.ANALYZE_BUNDLE) {
    plugins.push(analyzer());
  }

  return {
    devServer: {

    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      },
      postcss: {
        plugins: [autoprefixer()]
      }
    },
    plugins,
    server: {
      port: 8090,
      host: true,
      https: {
        maxSessionMemory: 2000,
        peerMaxConcurrentStreams: 500
      }
    },
    resolve: {
      // Synchronize with jsonconfig.json
      alias: {
        "@/assets": fileURLToPath(new URL("./src/static", import.meta.url)),
        "@/components": fileURLToPath(new URL("./src/components", import.meta.url)),
        "@/routes": fileURLToPath(new URL("./src/routes", import.meta.url)),
        "@/stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
        "@/utils": fileURLToPath(new URL("./src/utils", import.meta.url))
      }
    },
    build: {
      manifest: true,
      modulePreload: {
        polyfill: false
      },
      rolldownOptions: {
        output: {
          codeSplitting: false,
          entryFileNames: "index.js",
          assetFileNames: assetInfo => {
            const ext = assetInfo.names[0].split(".").slice(-1)[0];
            if(ext === "css") {
              return "index.css";
            } else {
              return "assets/[hash][extname]";
            }
          }
        }
      }
    }
  };
});
