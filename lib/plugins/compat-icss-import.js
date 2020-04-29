/* eslint-disable no-param-reassign */
const { replaceValueSymbols } = require('icss-utils');

const plugin = 'css-modules-loader-compat-icss-import';

const importPattern = /^:import\(("[^"]*"|'[^']*'|[^"']+)\)$/;

/**
 * Adds support for using the :import icss syntax.
 */
module.exports = (css, { opts }) => {
  const { files, resolve, from } = opts;

  const replacements = Object.create(null);
  // console.log(files);
  css.walkRules(/^:import/, (rule) => {
    const matches = importPattern.exec(rule.selector);

    if (!matches) return;
    // rm quotes
    const path = matches[1].replace(/'|"/g, '');

    const source = files[resolve(from, path)];

    rule.walkDecls((decl) => {
      const localName = decl.prop;
      const name = decl.value;
      if (!(name in source.values)) {
        throw rule.error(`Value ${name} is not exported from "${path}"`);
      }

      replacements[localName] = source.values[name].value;
    });

    rule.remove();
  });

  css.walk((node) => {
    if (node.type === 'decl' && node.value) {
      node.value = replaceValueSymbols(node.value.toString(), replacements);
    } else if (node.type === 'atrule' && node.params) {
      node.params = replaceValueSymbols(node.params.toString(), replacements);
    }
  });
};

module.exports.postcssPlugin = plugin;
module.exports.phase = 'processing';
