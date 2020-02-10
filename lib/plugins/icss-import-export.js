const path = require('path');
const postcss = require('postcss');
const { getExports } = require('../Utils');

const plugin = 'css-modules-loader-icss-import/exports';

// We need a dummy value here so css-loader doesn't remove it
// need to pick something that is not likely to match a word in the css tho
const DUMMY_LOCAL_NAME = '____a';

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

        nodes: [postcss.decl({ prop: DUMMY_LOCAL_NAME, value: 'a' })],
      }),
    ),
  );

  css.append(
    postcss.rule({
      selector: ':export',
      nodes: Object.entries(exported).map(([prop, value]) =>
        postcss.decl({ prop, value: [].concat(value).join(' ') }),
      ),
    }),
  );

  messages.push({
    type: 'css-module-loader',
    plugin,
    imported,
    exported,
  });
};

module.exports.postcssPlugin = plugin;
module.exports.DUMMY_LOCAL_NAME = DUMMY_LOCAL_NAME;
