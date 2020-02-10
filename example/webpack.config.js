const ExtractCSS = require('mini-css-extract-plugin');
const { plugins } = require('webpack-atoms');

module.exports = {
  entry: './index.js',
  context: __dirname,
  output: {
    publicPath: '/',
    filename: 'main.js',
    path: `${__dirname}/build`,
  },
  devServer: {
    contentBase: './build',
    disableHostCheck: true,
    historyApiFallback: true,
    stats: 'minimal',
  },
  module: {
    rules: [
      {
        test: /\.module\.css/,
        use: [
          ExtractCSS.loader,
          { loader: 'css-loader', options: { importLoaders: 1 } },
          { loader: require.resolve('../lib/loader.js'), options: {} },
        ],
      },
    ],
  },
  plugins: [plugins.html(), new ExtractCSS()],
};
