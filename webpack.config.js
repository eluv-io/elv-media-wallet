const webpack = require("webpack");
const Path = require("path");
const autoprefixer = require("autoprefixer");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");
const fs = require("fs");

let plugins = [
  new HtmlWebpackPlugin({
    title: "Eluvio Media Wallet",
    template: Path.join(__dirname, "src", "index.html"),
    cache: false,
    filename: "index.html",
    favicon: "./src/static/icons/favicon.png"
  }),
  new CopyWebpackPlugin([{
    from: Path.join(__dirname, "configuration.js"),
    to: Path.join(__dirname, "dist", "configuration.js")
  }]),
];

if(process.env.ANALYZE_BUNDLE) {
  plugins.push(new BundleAnalyzerPlugin());
}

module.exports = {
  entry: "./src/index.js",
  target: "web",
  output: {
    path: Path.resolve(__dirname, "dist"),
    filename: "index.js",
    chunkFilename: "[name].[contenthash].bundle.js"
  },
  devServer: {
    public: "elv-test.io",
    https: {
      key: fs.readFileSync("./https/private.key"),
      cert: fs.readFileSync("./https/dev.local.crt"),
      ca: fs.readFileSync("./https/private.pem")
    },
    disableHostCheck: true,
    inline: true,
    port: 8090,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "POST"
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
  node: {
    fs: "empty"
  },
  mode: "development",
  devtool: "eval-source-map",
  plugins,
  resolve: {
    alias: {
      Assets: Path.resolve(__dirname, "src/static"),
      Components: Path.resolve(__dirname, "src/components"),
      Routes: Path.resolve(__dirname, "src/routes"),
      Stores: Path.resolve(__dirname, "src/stores"),
      // Force webpack to use *one* copy of bn.js instead of 8
      "bn.js": Path.resolve(Path.join(__dirname, "node_modules", "bn.js"))
    },
    extensions: [".js", ".jsx", ".mjs", ".scss", ".png", ".svg"]
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        exclude: /\.(theme|font)\.(css|scss)$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 2
            }
          },
          {
            loader: "postcss-loader",
            options: {
              plugins: () => [autoprefixer({})]
            }
          },
          "sass-loader"
        ]
      },
      {
        test: /\.(theme|font)\.(css|scss)$/i,
        loader: "raw-loader"
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto"
      },
      {
        test: /\.(js|mjs)$/,
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

