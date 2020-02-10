const path = require('path');

const fs = require('fs-extra');
const webpack = require('webpack');
const { createFsFromVolume, Volume } = require('memfs');
const prettier = require('prettier');

const loader = require('../lib/loader');

function format(strings, ...values) {
  let str = strings;
  if (Array.isArray(str))
    str = strings.reduce(
      (acc, next, idx) => `${acc}${next}${values[idx] || ''}`,
      '',
    );

  return prettier.format(str, { parser: 'css' });
}

const createFs = (files, cwd) => {
  const fakeFs = createFsFromVolume(Volume.fromJSON(files || {}, cwd));
  fakeFs.join = path.join;
  return fakeFs;
};

function createRunner({
  options: defaultOptions,
  contextExtensions,
  cwd = process.cwd(),
  files,
} = {}) {
  const fakeFs = createFs(files, cwd);
  const compiler = {};
  const compilation = {
    inputFileSystem: fakeFs,
    fileTimestamps: new Map(),
  };

  const resolveTo = (from, to) => path.relative(path.dirname(from), to);

  function runLoader(src, options, filename = './styles.css') {
    return new Promise((resolve, reject) => {
      const meta = {};
      const loaderContext = {
        ...contextExtensions,
        query: {
          ...defaultOptions,
          ...options,
        },
        loaders: [{ request: '/path/css-module-loader' }],
        loaderIndex: 0,
        context: '',
        resource: filename,
        resourcePath: filename,
        request: `css-module-loader!${filename}`,
        _compiler: compiler,
        _compilation: compilation,
        _module: {},

        loadModule(request, cb) {
          new Promise((innerResolve, innerReject) => {
            const resource = request.split('!').pop();

            const innerSrc = fakeFs.readFileSync(resource).toString();

            runLoader(innerSrc, options, resource).then(
              ([result]) => innerResolve(JSON.stringify(result)),
              innerReject,
            );
          }).then(r => cb(null, r), cb);
        },

        resolve(request, cb) {
          cb(null, resolveTo(filename, request));
        },
        async: () => (err, result) => {
          if (err) reject(err);
          else resolve([result, meta]);
        },
      };

      loader.call(loaderContext, src, null, meta);
    });
  }
  runLoader.compiler = compiler;
  runLoader.compilation = compilation;

  return runLoader;
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
  compiler.outputFileSystem = createFs();
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

module.exports = { format, fixtures, createRunner, runWebpack };
