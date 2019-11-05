const fs = require('fs-extra');
const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const prettier = require('prettier');

function format(strings, ...values) {
  const str = strings.reduce(
    (acc, next, idx) => `${acc}${next}${values[idx] || ''}`,
    '',
  );

  return prettier.format(str, { parser: 'babel' });
}

const fixtures = fs
  .readdirSync(`${__dirname}/fixtures`)
  .map(file => `${__dirname}/fixtures/${file}`)
  .filter(f => !f.endsWith('.json'));

function runWebpack(config) {
  const compiler = webpack({
    ...config,
    output: {
      filename: '[name].js',
      path: '/build',
    },
    optimization: {
      runtimeChunk: true,
      splitChunks: {
        chunks: 'initial',
      },
    },
  });
  compiler.outputFileSystem = new MemoryFS();
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors() || stats.hasWarnings()) {
        const { errors, warnings } = stats.toJson();
        reject(
          Object.assign(
            new Error(
              `Webpack threw the following errors:\n\n ${errors.join('\n')}`,
            ),
            { errors, warnings, framesToPop: 1 },
          ),
        );
        return;
      }
      resolve(stats.compilation.assets);
    });
  });
}

module.exports = { format, fixtures, runWebpack };
