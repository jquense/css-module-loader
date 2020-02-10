const plugin = 'css-modules-loader-compat-icss-export';

/**
 * Adds support for using the :export icss syntax.
 */
module.exports = (css, { messages }) => {
  const exported = Object.create(null);

  css.walkRules(':export', rule => {
    rule.walkDecls(decl => {
      exported[decl.prop] = decl.value;
    });

    rule.remove();
  });

  messages.push({
    type: 'css-module-loader',
    // read by modular-css
    plugin: 'modular-css-export-icss-export',
    exports: exported,
  });
};

module.exports.postcssPlugin = plugin;
module.exports.phase = 'processing';
