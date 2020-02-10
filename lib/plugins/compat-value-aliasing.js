const postcss = require('postcss');

const plugin = 'css-modules-loader-compat-value-aliasing';

const matchImports = /^(.+?|\([\s\S]+?\))\s+from\s+("[^"]*"|'[^']*'|[\w-]+)$/;
const matchImport = /^([\w-*]+)(?:\s+as\s+([\w-]+))?/;

/**
 * Adds support for using the `@value foo as bar;` value syntax.
 */
module.exports = (css, { messages, opts }) => {
  const importAliases = [];

  css.walkAtRules('value', atRule => {
    const matches = matchImports.exec(atRule.params);
    if (matches) {
      // eslint-disable-next-line prefer-const
      let [, aliases, path] = matches;

      const imports = aliases
        .replace(/^\(\s*([\s\S]+)\s*\)$/, '$1')
        .split(/\s*,\s*/)
        .map(importValue => {
          const tokens = matchImport.exec(importValue);
          if (tokens) {
            const [, name, alias] = tokens;

            // Leave the m-css namespace imports alone
            if (name.trim() === '*') return null;

            return { name, alias };
          }

          throw new Error(`@import statement "${importValue}" is invalid!`);
        })
        .filter(Boolean);

      if (imports.length) {
        // Make sure that modular-css knows about this file by adding it to
        // the dependency graph
        messages.push({
          type: 'css-module-loader',
          plugin: 'modular-css-graph-nodes',
          dependency: opts.resolve(opts.from, path.replace(/'|"/g, '')),
        });

        importAliases.push({ path, imports });
        atRule.remove();
      }
    }
  });

  importAliases.reverse().forEach(({ path, imports }) => {
    const importRule = postcss.rule({
      selector: `:import(${path})`,
      raws: { after: '\n' },
    });

    imports.forEach(({ name, alias }) => {
      importRule.append({
        value: name,
        prop: alias || name,
        raws: { before: '\n  ' },
      });
    });

    css.prepend(importRule);
  });
};

module.exports.postcssPlugin = plugin;
module.exports.phase = 'before';
