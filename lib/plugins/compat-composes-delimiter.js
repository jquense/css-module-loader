const plugin = 'css-modules-loader-compat-composes-delimiter';

/**
 * use comma seperators for composes classes
 */
module.exports = (css) => {
  css.walkDecls('composes', (decl) => {
    const [, classes, rest = ''] = decl.value.match(/(.+?)(from.*)?$/);

    // eslint-disable-next-line no-param-reassign
    decl.value = `${classes
      .split(/,?\s+/)
      .filter(Boolean)
      .join(', ')} ${rest}`;
  });
};

module.exports.postcssPlugin = plugin;
module.exports.phase = 'before';
