const path = require('path');
const ExtractCSS = require('mini-css-extract-plugin');
// const stripAnsi = require('strip-ansi');
const { runWebpack } = require('./helpers');

const snapshot = name => path.join(__dirname, `__file_snapshots__/${name}`);

describe('webpack integration', () => {
  function getConfig(entry) {
    return {
      devtool: false,
      mode: 'development',
      entry: {
        main: require.resolve(entry),
        // vendor: ['react', 'react-dom'],
      },
      module: {
        rules: [
          {
            test: /\.(s?)css$/,
            use: [
              ExtractCSS.loader,
              {
                loader: 'css-loader',
                options: { importLoaders: 2 },
              },
              {
                loader: require.resolve('../loader.js'),
              },
              {
                loader: 'sass-loader',
                options: { implementation: require('sass') },
              },
            ],
          },
        ],
      },
      resolve: {
        modules: ['node_modules', 'shared'],
      },
      plugins: [new ExtractCSS()],
    };
  }

  async function assetsMatchSnapshot(entry) {
    const name = path.basename(entry, path.extname(entry));

    const assets = await runWebpack(getConfig(`./integration/${entry}`));

    expect(assets['main.css'].source()).toMatchFile(
      snapshot(`${name}-styles.css`),
    );
    expect(assets['main.js'].source()).toMatchFile(snapshot(`${name}-js.js`));
  }

  it('should work for simple cases', async () => {
    await assetsMatchSnapshot('simple.js');
  });

  it('should work with externals', async () => {
    await assetsMatchSnapshot('externals.js');
  });
});
