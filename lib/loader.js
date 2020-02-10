const path = require('path');

const Processor = require('@modular-css/processor');
const { promisify } = require('util');
const { getOptions } = require('loader-utils');
const getLocalName = require('./getLocalName');

const PROCESSOR = Symbol('@modular-css processor');
const CACHE = Symbol('loadModule cache module');

const compatPlugins = {
  scoping: require('./plugins/compat-scope-pseudos'),
  valueAliasing: require('./plugins/compat-value-aliasing'),
  icssImport: require('./plugins/compat-icss-import'),
  icssExport: require('./plugins/compat-icss-export'),
};

function getLoadFilePrefix(loaderContext) {
  // loads a file with all loaders configured after this one
  const loadersRequest = loaderContext.loaders
    .slice(loaderContext.loaderIndex + 1)
    .map(x => x.request)
    .join('!');

  return `-!${require.resolve('./stringifyLoader')}!${loadersRequest}!`;
}

function loader(src) {
  const { resourcePath, _compilation: compilation } = this;
  const cb = this.async();
  const fs = this._compilation.inputFileSystem;

  const options = getOptions(this) || {};

  const prefix = getLoadFilePrefix(this);

  const resolver = (from, file) => {
    let resolved = file.replace(/^~/, '');
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(path.dirname(from), file);
    }

    try {
      fs.statSync(resolved);
      return resolved;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const loadFile = promisify((file, done) => {
    // console.log('LOAD FILE');
    if (compilation[CACHE].has(file)) {
      done(null, compilation[CACHE].get(file));
      return;
    }

    this.loadModule(`${prefix}${file}`, (err, moduleSource) => {
      let content = '';
      if (moduleSource) {
        content = JSON.parse(moduleSource.toString());
        compilation[CACHE].set(file, content);
      }

      done(err, content);
    });
  });

  if (!compilation[CACHE]) {
    compilation[CACHE] = new Map();
  }

  if (!compilation[PROCESSOR]) {
    let compat = !options.compat ? [] : Object.entries(compatPlugins);

    if (typeof options.compat === 'object') {
      const names = new Set(
        Object.entries(options.compat)
          .filter(e => e[1])
          .map(e => e[0]),
      );

      compat = compat.filter(e => names.has(e[0]));
    }

    compat = compat.map(([, plugin]) => plugin);

    const mCssOptions = {
      exportGlobals: false,
      ...options,
      loadFile,
      // this isn't run, b/c we don't combine css, but it'd be wrong
      // to do anyway since webpack handles it.
      rewrite: false,
      resolvers: [resolver, ...(options.resolvers || [])],
      namer: (filename, localName) =>
        getLocalName(filename, localName, this, options),
      before: compat
        .filter(p => p.phase === 'before')
        .concat(options.before)
        .filter(Boolean),
      processing: []
        .concat(compat.filter(p => p.phase === 'processing'))
        .concat(require('./plugins/icss-import-export'), options.processing)
        .filter(Boolean),
    };

    compilation[PROCESSOR] = new Processor(mCssOptions);
  }

  const processor = compilation[PROCESSOR];

  return processor.string(resourcePath, src).then(
    ({ details }) => {
      const { result } = details;

      cb(null, result.css, result.map, {
        messages: result.messages,
        ast: {
          type: 'postcss',
          version: result.processor.version,
          root: result.root,
        },
      });
    },
    err => {
      cb(err);
    },
  );
}

module.exports = loader;
