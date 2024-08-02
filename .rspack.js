const path = require('node:path');
const ReactRefreshPlugin = require("@rspack/plugin-react-refresh");

const rspack = require('@rspack/core');

const tsRule = {
  test: /\.(ts|tsx)$/,
  use: {
    loader: "builtin:swc-loader",
    options: {
      jsc: {
        parser: {
          syntax: "typescript",
          tsx: true,
        },
        transform: {
          react: {
            runtime: "automatic",
            development: true,
            refresh: true,
          },
        },
      },
    },
  },
};

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  context: __dirname,
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: 'js/[name].js',
    publicPath: "/",
    path: path.resolve(__dirname, 'build'),
    clean: true,
  },
  entry: {
    main: "./src/main.tsx",
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: "./public/index.html", filename: "index.html", chunks: ['main'] }),
    new ReactRefreshPlugin()
  ],
  module: {
    rules: [tsRule],
  },
  devServer: {
    port: 8080,
    hot: true,
    historyApiFallback: {
      index: "/"
    },
  },
  experiments: {
    asyncWebAssembly: true,
    css: true,
    rspackFuture: {
      newTreeshaking: true
    }
  }
};