import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import react from "@vitejs/plugin-react-swc";
import mkcert from "vite-plugin-mkcert";
import {analyzer} from "vite-bundle-analyzer";
import ViteYaml from "@modyfi/vite-plugin-yaml";

export default defineConfig(() => {
  let plugins = [
    react(),
    ViteYaml(),
    viteStaticCopy({
      targets: [
        {
          src: "config/configuration.js",
          dest: ""
        },
        {
          src: "src/static/icons/favicon.png",
          dest: ""
        },
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
      }
    },
    plugins,
    server: {
      port: 8091,
      host: true
    },
    resolve: {
      // Synchronize with jsonconfig.json
      alias: {
        Assets: fileURLToPath(new URL("src/static", import.meta.url)),
        Components: fileURLToPath(new URL("src/components", import.meta.url)),
        Routes: fileURLToPath(new URL("src/routes", import.meta.url)),
        Stores: fileURLToPath(new URL("src/stores", import.meta.url)),
        "@/assets": fileURLToPath(new URL("./src/static", import.meta.url)),
        "@/components": fileURLToPath(new URL("./src/components", import.meta.url)),
        "@/stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
        "@/utils": fileURLToPath(new URL("./src/utils", import.meta.url))
      }
    },
    build: {
      manifest: true,
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          assetFileNames: assetInfo => {
            const ext = assetInfo.names[0].split(".").slice(-1)[0];
            if(ext === "css") {
              return "index.css";
            } else {
              return assetInfo.originalFileName;
            }
          }
        }
      }
    }
  };
});
