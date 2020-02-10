const mapValues = require('lodash/mapValues');
const findLast = require('lodash/findLast');

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

module.exports = {
  getExports,
};
