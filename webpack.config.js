const Path = require("path");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const fs = require("fs");

let plugins = [
  new HtmlWebpackPlugin({
    title: "Eluvio Media Wallet",
    template: Path.join(__dirname, "src", "index.html"),
    filename: "index.html",
    favicon: "./src/static/icons/favicon.png",
    inject: "body"
  })
];

if(process.env.ANALYZE_BUNDLE) {
  plugins.push(new BundleAnalyzerPlugin());
}

let sequential_filename = 0;

module.exports = {
  entry: "./src/index.js",
  target: "web",
  output: {
    path: Path.resolve(__dirname, "dist"),
    chunkFilename: "[name].bundle.js",
    clean: true,
    filename: (pathData) => {
      sequential_filename = sequential_filename + 1;
      return sequential_filename + ".js"
    },
  },
  devServer: {
    hot: true,
    client: {
      webSocketURL: "auto://elv-test.io/ws"
    },
    https: {
      key: fs.readFileSync("./https/private.key"),
      cert: fs.readFileSync("./https/dev.local.crt"),
      ca: fs.readFileSync("./https/private.pem")
    },
    historyApiFallback: true,
    allowedHosts: "all",
    port: 8090,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "POST"
    },
    // This is to allow configuration.js to be accessed
    static: {
      directory: __dirname
    }
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true
        }
      })
    ],
    splitChunks: {
      chunks: "all"
    }
  },
  mode: "development",
  devtool: "eval-source-map",
  plugins,
  externals: {
    crypto: "crypto",
    stream: "stream"
  },
  resolve: {
    alias: {
      Assets: Path.resolve(__dirname, "src/static"),
      Components: Path.resolve(__dirname, "src/components"),
      Routes: Path.resolve(__dirname, "src/routes"),
      Stores: Path.resolve(__dirname, "src/stores"),
      // Force webpack to use *one* copy of bn.js instead of 8
      "bn.js": Path.resolve(Path.join(__dirname, "node_modules", "bn.js"))
    },
    extensions: [".js", ".jsx", ".mjs", ".scss", ".png", ".svg"],
  },
  module: {
    rules: [
      {
        test: /\.(theme|font)\.(css|scss)$/i,
        type: "asset/source"
      },
      {
        test: /\.(css|scss)$/,
        exclude: /\.(theme|font)\.(css|scss)$/i,
        use: [
          "style-loader",
          "css-loader",
          "postcss-loader",
          "sass-loader"
        ]
      },
      {
        test: /\.(js|mjs|jsx)$/,
        exclude: /node_modules\/(?!@eluvio\/elv-embed)/,
        loader: "babel-loader",
        options: {
          presets: [
            "@babel/preset-env",
            "@babel/preset-react",
          ]
        }
      },
      {
        test: /\.svg$/,
        loader: "svg-inline-loader"
      },
      {
        test: /\.(gif|png|jpe?g|otf|woff2?|ttf)$/i,
        include: [ Path.resolve(__dirname, "src/static/public")],
        type: "asset/inline",
        generator: {
          filename: "public/[name][ext]"
        }
      },
      {
        test: /\.(gif|png|jpe?g|otf|woff2?|ttf)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(txt|bin|abi)$/i,
        type: "asset/source"
      },
      {
        test: /\.ya?ml$/,
        use: "yaml-loader"
      }
    ]
  }
};

