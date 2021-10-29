const path = require('path');

const ExtractCSS = require('mini-css-extract-plugin');

// const stripAnsi = require('strip-ansi');
const { runWebpack } = require('./helpers');

const snapshot = (name) => path.join(__dirname, `__file_snapshots__/${name}`);

describe('webpack integration', () => {
  function getConfig(entry, options, cssLoaderOptions = {}) {
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
              cssLoaderOptions.onlyLocals
                ? null
                : {
                    loader: ExtractCSS.loader,
                    options: { esModule: true },
                  },
              {
                loader: 'css-loader',
                options: {
                  ...cssLoaderOptions,
                  importLoaders: 2,
                  esModule: true,
                },
              },
              {
                loader: require.resolve('../lib/loader.js'),
                options,
              },
              {
                loader: 'sass-loader',
                options: { implementation: require('sass') },
              },
            ].filter(Boolean),
          },
        ],
      },
      resolve: {
        modules: ['node_modules', 'shared'],
      },
      plugins: [new ExtractCSS()],
    };
  }

  async function assetsMatchSnapshot(entry, { name, ...opts } = {}) {
    // eslint-disable-next-line no-param-reassign
    name = name || path.basename(entry, path.extname(entry));

    const assets = await runWebpack(getConfig(`./fixtures/${entry}`, opts));

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

  it('should work for compat mode', async () => {
    await assetsMatchSnapshot('simple.js', {
      name: 'compat-all',
      compat: true,
    });
  });

  it('should work with nested and multiple dependencies', async () => {
    await assetsMatchSnapshot('nested-deps.js');
  });

  it('should work with onlyLocals', async () => {
    const assets = await runWebpack(
      getConfig(`./fixtures/externals.js`, undefined, {
        onlyLocals: true,
      }),
    );

    expect(assets['main.js'].source()).toMatchFile(snapshot(`onlyLocals.js`));
  });

  it.each([['camelCase'], ['camelCaseOnly'], ['dashes'], ['dashesOnly']])(
    'should work with localsConvention: %s',
    async (localsConvention) => {
      const assets = await runWebpack(
        getConfig(`./fixtures/complex-names.module.scss`, undefined, {
          localsConvention,
        }),
      );

      expect(assets['main.js'].source()).toMatchFile(
        snapshot(`localsConvention-${localsConvention}.js`),
      );
    },
  );
});
