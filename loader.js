const Processor = require('@modular-css/processor');
const path = require('path');
const { promisify } = require('util');
const { getOptions } = require('loader-utils');

const getLocalName = require('./getLocalName');

const PROCESSOR = Symbol('@modular-css processor');

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

  const loadModule = promisify((request, done) =>
    this.loadModule(request, (err, moduleSource) => {
      done(err, JSON.parse(moduleSource.toString()));
    }),
  );

  if (!compilation[PROCESSOR]) {
    compilation[PROCESSOR] = new Processor({
      namer: (_, localName) => getLocalName(localName, this, options),
      async loadFile(file) {
        // console.log('LOAD');
        const txt = await loadModule(`${prefix}${file}`);
        // console.log(txt);
        return txt;
      },
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
      icssExport += `  ${key}: ${value.join(' ')}\n`;
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
