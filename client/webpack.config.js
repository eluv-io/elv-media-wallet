const webpack = require("webpack");
const Path = require("path");
const autoprefixer = require("autoprefixer");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const TerserPlugin = require("terser-webpack-plugin");

const plugins = [
  new webpack.optimize.LimitChunkCountPlugin({
    maxChunks: 1,
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
    filename: "index.js",
    chunkFilename: "[name].[contenthash].bundle.js"
  },
  devServer: {
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
      Stores: Path.resolve(__dirname, "src/stores"),
      // Force webpack to use *one* copy of bn.js instead of 8
      "bn.js": Path.resolve(Path.join(__dirname, "node_modules", "bn.js"))
    },
    extensions: [".js", ".jsx", ".scss", ".png", ".svg"]
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
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
        test: /\.(js|mjs)$/,
        exclude: /node_modules\/(?!elv-components-js)/,
        loader: "babel-loader",
        options: {
          presets: [
            "@babel/preset-env",
            "babel-preset-mobx"
          ],
          plugins: [
            require("@babel/plugin-proposal-object-rest-spread"),
            require("@babel/plugin-transform-regenerator"),
            require("@babel/plugin-transform-runtime")
          ]
        }
      },
      {
        test: /\.svg$/,
        loader: "svg-inline-loader"
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
      }
    ]
  }
};

