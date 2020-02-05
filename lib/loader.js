const Processor = require('@modular-css/processor');
const { promisify } = require('util');
const { getOptions } = require('loader-utils');
const getLocalName = require('./getLocalName');

const PROCESSOR = Symbol('@modular-css processor');
const CACHE = Symbol('loadModule cache module');

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

  const options = getOptions(this) || {};

  const prefix = getLoadFilePrefix(this);

  const loadFile = promisify((file, done) => {
    if (compilation[CACHE].has(file)) {
      done(null, compilation[CACHE].get(file));
      return;
    }

    this.loadModule(`${prefix}${file}`, (err, moduleSource) => {
      const content = JSON.parse(moduleSource.toString());
      // console.log('CACHE', file)
      compilation[CACHE].set(file, content);
      done(err, content);
    });
  });

  if (!compilation[CACHE]) {
    compilation[CACHE] = new Map();
  }

  if (!compilation[PROCESSOR]) {
    compilation[PROCESSOR] = new Processor({
      ...options,
      loadFile,
      // this isn't run, b/c we don't combine css, but it'd be wrong
      // to do anyway since webpack handles it.
      rewrite: false,
      namer: (filename, localName) =>
        getLocalName(filename, localName, this, options),
      processing: [require('./plugins/icss-import-export')]
        .concat(options.processing)
        .filter(Boolean),
    });
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
