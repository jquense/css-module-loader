const plugin = 'css-modules-loader-import/exports';
const mapValues = require('lodash/mapValues');
const findLast = require('lodash/findLast');
const path = require('path');
const postcss = require('postcss');

function getExports(file, messages, opts = {}) {
  const lastClsMsg = findLast(messages, 'classes');

  return Object.assign(
    {},
    opts.exportValues ? mapValues(file.values, ({ value }) => value) : null,
    lastClsMsg.classes,
    ...messages
      .filter(m => m.plugin && m.plugin.startsWith('modular-css-export'))
      .map(m => m.exports),
  );
}

module.exports = (css, { opts, messages }) => {
  const { files, graph, from } = opts;

  const file = files[from];

  // We only want direct dependencies, since those will be required
  // in the css-loader output, the dep tree will be realized
  const imported = graph.outgoingEdges[from];
  const exported = getExports(file, messages, opts);

  imported.forEach(dep =>
    css.prepend(
      postcss.rule({
        selector: `:import("${path.relative(path.dirname(from), dep)}")`,
        // We need a dummy value here so css-loader doesn't remove it
        // need to pick something that is not likely to match a word in the css tho
        nodes: [postcss.decl({ prop: '____a', value: 'a' })],
      }),
    ),
  );

  css.append(
    postcss.rule({
      selector: `:export`,
      nodes: Object.entries(exported).map(([prop, value]) =>
        postcss.decl({ prop, value: [].concat(value).join(' ') }),
      ),
    }),
  );
};

module.exports.postcssPlugin = plugin;
