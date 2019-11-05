const Processor = require('@modular-css/processor');
const path = require('path');
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
  const dir = path.dirname(resourcePath);

  const prefix = getLoadFilePrefix(this);

  const loadFile = promisify((file, done) => {
    if (compilation[CACHE].has(file)) {
      return done(null, compilation[CACHE].get(file))
    }

    this.loadModule(`${prefix}${file}`, (err, moduleSource) => {
      const content = JSON.parse(moduleSource.toString())
      // console.log('CACHE', file)
      compilation[CACHE].set(file, content)
      done(err, content);
    })
  }
  );

  if (!compilation[CACHE]) {
    compilation[CACHE] = new Map();
  }
  if (!compilation[PROCESSOR]) {
    compilation[PROCESSOR] = new Processor({
      loadFile,
      namer: (filename, localName) => getLocalName(filename, localName, this, options),
    });
  }

  const processor = compilation[PROCESSOR];

  const process = async () => {
    const { details, exports } = await processor.string(resourcePath, src);

    const deps = processor.dependencies(resourcePath);

    const icssImport = deps.reduce(
      (acc, dep) => `${acc}@import "${path.relative(dir, dep)}";\n`,
      '',
    );

    let icssExport = ':export {\n';
    for (const [key, value] of Object.entries(exports)) {
      icssExport += `  ${key}: ${[].concat(value).join(' ')};\n`;
    }
    icssExport += '}';



    return `${details.result.css}\n\n${icssImport}\n\n${icssExport}`;
  };

  return process().then(
    r => cb(null, r),
    err => {
      cb(err);
    },
  );
}

module.exports = loader;

// module.exports.pitch = function pitch(remainingRequest) {
//   const cache = this._compilation[CACHE];

//   if (cache && cache.has(this.resourcePath)) {
//     console.log('cache hit!', this.resourcePath)
//     return loader.call(this, cache.get(this.resourcePath))
//     // return cache.get(this.resourcePath)
//   }
// }
