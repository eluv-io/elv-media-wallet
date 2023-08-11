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

module.exports = {
  entry: "./src/index.js",
  target: "web",
  output: {
    path: Path.resolve(__dirname, "dist"),
    chunkFilename: "[name].[contenthash].bundle.js",
    clean: true
  },
  devServer: {
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
        test: /\.(theme|font)\.(css|scss)$/i,
        loader: "raw-loader"
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
        test: /\.(otf|woff2?|ttf)$/i,
        loader: "file-loader",
      },
      {
        test: /\.(gif|png|jpe?g)$/i,
        use: [
          "file-loader",
          {
            loader: "image-webpack-loader"
          },
        ],
      },
      {
        test: /\.(txt|bin|abi)$/i,
        loader: "raw-loader"
      },
      {
        test: /\.ya?ml$/,
        use: "yaml-loader"
      }
    ]
  }
};

